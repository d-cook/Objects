(function() {

var hasOwn = (function() {
   var has = Object.hasOwnPropery;
   return function (obj, prop) { return has.apply(obj, prop); };
}());

var createObj = (function() {
   var create = Object.create;
   return function () { return create(null); };
}());

function noop () { }

function newObject (obj) {
   var v = createObj();
   for (var p in obj) {
      if (hasOwn(obj, p)) {
         v[p] = obj[p];
      }
   }
   var o = createObj();
   o.type = O.types.object;
   o.value = v;
   return o;
}

function tailcall (func, args, cb) {
   var allArgs = [ cb || noop ];
   allArgs.push.apply(allArgs, args);
   return { func: func, args: allArgs };
}

function invoke (aTailcall) {
   var tc = (typeof aTailcall === 'function') ? tailcall.apply(null, arguments) : tc;
   while(tc && tc.func) {
      tc = tc.func.apply(null, tc.args || []);
   }
}

var O = window.Objects = {};

O.types = {};
O.types.type   = { type: null        , name: 'type'   };
O.types.null   = { type: O.types.type, name: 'null'   };
O.types.bool   = { type: O.types.type, name: 'bool'   };
O.types.number = { type: O.types.type, name: 'number' };
O.types.string = { type: O.types.type, name: 'string' };
O.types.array  = { type: O.types.type, name: 'array'  };
O.types.object = { type: O.types.type, name: 'object' };
O.types.native = { type: O.types.type, name: 'native' };
O.types.type.type = O.types.type;
   
O.isType   = function (cb, o) { return tailcall(O.typeof, [o], function (cb, t) { return tailcall(cb, [t === O.types.type  ]); }); };
O.isNull   = function (cb, o) { return tailcall(O.typeof, [o], function (cb, t) { return tailcall(cb, [t === O.types.null  ]); }); };
O.isBool   = function (cb, o) { return tailcall(O.typeof, [o], function (cb, t) { return tailcall(cb, [t === O.types.bool  ]); }); };
O.isNumber = function (cb, o) { return tailcall(O.typeof, [o], function (cb, t) { return tailcall(cb, [t === O.types.number]); }); };
O.isString = function (cb, o) { return tailcall(O.typeof, [o], function (cb, t) { return tailcall(cb, [t === O.types.string]); }); };
O.isArray  = function (cb, o) { return tailcall(O.typeof, [o], function (cb, t) { return tailcall(cb, [t === O.types.array ]); }); };
O.isObject = function (cb, o) { return tailcall(O.typeof, [o], function (cb, t) { return tailcall(cb, [t === O.types.object]); }); };
O.isNative = function (cb, o) { return tailcall(O.typeof, [o], function (cb, t) { return tailcall(cb, [t === O.types.native]); }); };

O.typeof = function (cb, obj) { return tailcall(cb, [(obj && obj.type) || O.types.null]); };

// TODO: Update funcs to return wrapped values (e.g. O.null, O.true, O.false instead of null, true, false)

O.null  = { type: O.types.null };
O.true  = { type: O.types.bool };
O.false = { type: O.types.bool };

O.eval = function (cb, code, env) {
   return tailcall(O.getType, [code], function (type) {
      // Execute native JavaScript
      if (type === O.types.native) {
         return tailcall(O.get, [code, 'func'], function (cb, func) {
            return tailcall(func, [code, env], cb);
         });
      }
      // If not an object or native, return it as a value (it's not runnable "code")
      if (type !== O.types.object) {
         return tailcall(cb, [code]);
      }
      // Execute an operation defined in env
      return tailcall(O.tryGet, ['op'], function (cb, hasOp, op) {
         // If there is no operation to perform, just return it as a value
         if (!hasOp) {
            return tailcall(cb, [code]);
         }
         return tailcall(O.typeof, [op], function (cb, opType) {
            // The operation is either computed as code, or looked up as an environment property
            var computeOp = (opType === O.types.object) ? O.eval : O.lookup;
            return tailcall(computeOp, [op, env], function (cb, func) {
               return tailcall(O.get, [code, 'args'], function (cb, args) {
                  args = args || [];
                  var newEnv = newObject({ parent: env });
                  // TODO: instead of just setting 'args', set each args as property of newEnv
                  return tailcall(O.set, [newEnv, 'args', []], function (cb, callArgs) {
                     return tailcall(O.get, [func, 'syntax'], function (cb, isSyntax) {
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
                           return tailcall(O.eval, [argsExps[i], env], function (cb, a) {
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

O.has = function (cb, obj, prop) {
   return tailcall(O.typeof, [obj], function (cb, t) {
      return tailcall(cb, [
         (t === O.types.object || t === O.types.array) && hasOwn(obj.value, prop)
      ]);
   });
};

O.get = function (cb, obj, prop) {
   return tailcall(O.has, [obj, prop], function (cb, h) {
      return tailcall(cb, [h ? obj.value[prop] : O.null]);
   });
};

O.tryGet = function (cb, obj, prop) {
   return tailcall(O.typeof, [obj], function (cb, t) {
      var h = (t === O.types.object || t === O.types.array) && hasOwn(obj.value, prop);
      var v = (h ? obj.value[prop] : O.null);
      return tailcall(cb, [h, v]);
   });
};

O.set = function (cb, obj, prop, value) {
   return tailcall(O.typeof, [obj], function (cb, t) {
      if (t === O.types.object || t === O.types.array) {
         obj.value[prop] = value;
      }
      return tailcall(cb, [value]);
   });
};

O.lookup = function (cb, prop, env) {
   return tailcall(O.tryGet, [env, prop], function (cb, has, value) {
      if (has) { return tailcall(cb, [value]); }
      return tailcall(O.tryGet, [env, 'parent'], function (cb, has, parent) {
         if (!has) { return tailcall(cb, [O.null]); }
         return tailcall(O.lookup, [parent, prop], cb);
      });
   });
};

// ------------------------------------------ //
// TEMPORARY HOOKS FOR TESTING PURPOSES ONLY: //
// ------------------------------------------ //

O.Test = {
   parse: function (o) {
      var t = typeof o;
      if (t === 'undefined' || o === null) { return O.null; }
      if (t === 'boolean' ) { return o ? O.true : O.false; }
      if (t === 'number'  ) { return { type: O.types.number, value: o }; }
      if (t === 'string'  ) { return { type: O.types.string, value: o }; }
      if (t === 'function') { return { type: O.types.native, value: o }; }
      if (t === 'object') {
         return (Object.prototype.toString.call(o) === '[object Array]'
            ? { type: O.types.array, value: o } // TODO: call parse for each property
            : { type: O.types.object, value: o } // TODO: call parse for each property
         );
      }
      return O.null;
   },
   run: function (code, env, cb) {
      cb = arguments[arguments.length];
      if (typeof arguments !== 'function') { cb = noop; }
      if (typeof env !== 'object' || !env) { env = O; }
      code = O.Test.parse(code);
      invoke(O.eval, [code, env], cb); 
   }
};

}());
