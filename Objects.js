(function() {

var hasOwn = (function() {
   var has = Object.hasOwnProperty;
   return function (obj, prop) { return has.call(obj, prop); };
}());

var createObj = (function() {
   var create = Object.create;
   return function () { return create(null); };
}());
   
var isArray = (function() {
   var tostr = Object.prototype.toString;
   return function (o) {
      var t = tostr.call(o);
      return (t === '[object Array]' || t === '[object Arguments]');
   }
}());

function noop () { }

function mArr (a) {
   var v = [];
   for (var i = 0; i < a.length; i++) { v[i] = make(a[i]); }
   return v;
}

function mObj (o) {
   var v = createObj();
   for (var p in o) { if (hasOwn(o, p)) { v[p] = make(o[p]); } }
   return v;
}

function make (v) {
   var t = typeof v;
   return (t !== 'object') ? (t === 'undefined' ? null : v) : isArray(v) ? mArr(v) : mObj(v);
}

function tailcall (func, args, cb) {
   var allArgs = cb ? [cb] : [];
   allArgs.push.apply(allArgs, args);
   return mObj({ func: func, args: allArgs });
}

function invoke (aTailcall) {
   var tc = (typeof aTailcall === 'function') ? tailcall.apply(null, arguments) : aTailcall;
   while(tc && tc.func) {
      tc = tc.func.apply(null, tc.args || []);
   }
}

var O = window.Objects = createObj();

O.typeof = function (cb, obj) {
   var t = typeof obj;
   return tailcall(cb, [
      (t === 'undefined' || obj === null) ? 'null' :
      (t === 'function') ? 'native' :
      isArray(t) ? 'array' : t
   ]);
};

// TODO: Maybe args & code & cb should be fields in env. Then "syntax" funcs would take consistent params.

O.eval = function (cb, code, env) {
   return tailcall(O.typeof, [code], function (type) {
      // Execute native JavaScript
      if (type === 'native') {
         return tailcall(code, [code, env], cb);
      }
      // If not an object or native, return it as a value (it's not runnable "code")
      if (type !== 'object') {
         return tailcall(cb, [code]);
      }
      // Execute an operation defined in env
      return tailcall(O.tryGet, ['op', code], function (hasOp, op) {
         // If there is no operation to perform, just return it as a value
         if (!hasOp) {
            return tailcall(cb, [code]);
         }
         return tailcall(O.typeof, [op], function (opType) {
            // The operation is either computed as code, or looked up as an environment property
            var computeOp = (opType === 'object') ? O.eval : O.lookup;
            return tailcall(computeOp, [op, env], function (func) {
               return tailcall(O.get, ['args', code], function (args) {
                  args = args || [];
                  var newEnv = mObj({ parent: env });
                  // TODO: instead of just setting 'args', set each args as property of newEnv
                  return tailcall(O.set, ['args', [], newEnv], function (callArgs) {
                     return tailcall(O.get, ['syntax', func], function (isSyntax) {
                        // Execute a syntax-function (operates on unevaluated arguments)
                        if (isSyntax) {
                           callArgs.push.apply(callArgs, args);
                           return tailcall(O.eval, [func, newEnv], cb);
                        }
                        // Evaluate each argument, then pass them into the operation
                        function nextArg (cb, i) {
                           // Invoke the operation once all args are evaluated:
                           if (i >= args.length) {
                              return tailcall(O.eval, [func, newEnv], cb);
                           }
                           // Evaluate the next argument:
                           return tailcall(O.eval, [argsExps[i], env], function (a) {
                              callArgs.push(a);
                              return tailcall(nextArg, [i+1], cb);
                           });
                        }
                        return tailcall(nextArg, [0], cb);
                     });
                  });
               });
            });
         });
      });
   });
};

O.has = function (cb, prop, obj) {
   return tailcall(O.typeof, [obj], function (t) {
      return tailcall(cb, [
         (t === 'object' || t === 'array') && hasOwn(obj, prop)
      ]);
   });
};

O.get = function (cb, prop, obj) {
   return tailcall(O.has, [prop, obj], function (h) {
      return tailcall(cb, [h ? obj[prop] : null]);
   });
};

O.tryGet = function (cb, prop, obj) {
   return tailcall(O.typeof, [obj], function (t) {
      var h = (t === 'object' || t === 'array') && hasOwn(obj, prop);
      var v = (h ? obj[prop] : null);
      return tailcall(cb, [h, v]);
   });
};

O.set = function (cb, prop, value, obj) {
   return tailcall(O.typeof, [obj], function (t) {
      if (t === 'object' || t === 'array') {
         obj[prop] = value;
      }
      return tailcall(cb, [value]);
   });
};

O.lookup = function (cb, prop, env) {
   return tailcall(O.tryGet, [prop, env], function (has, value) {
      if (has) { return tailcall(cb, [value]); }
      return tailcall(O.tryGet, ['parent', env], function (has, parent) {
         if (!has) { return tailcall(cb, [null]); }
         return tailcall(O.lookup, [prop, parent], cb);
      });
   });
};

// ------------------------------------------ //
// TEMPORARY HOOKS FOR TESTING PURPOSES ONLY: //
// ------------------------------------------ //

O.Test = {
   make: make,
   run: function (code, env, cb) {
      cb = arguments[arguments.length - 1];
      if (typeof cb !== 'function') { cb = function (v) { console.log(v); }; }
      if (typeof env !== 'object' || !env) { env = O; }
      code = make(code);
      invoke(O.eval, [code, env], cb); 
   }
};

}());
