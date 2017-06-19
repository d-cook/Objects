(function() {

// The "root" object of the whole system:
var O = window.Objects = {
   // Native JS utilities (normal calling convention, i.e. not CPS):
   js: {
      noop: function () { },
      hasOwn: function (obj, prop) { return Object.hasOwnProperty.call(obj, prop); },
      isArray: function (o) {
         var t = Object.prototype.toString.call(o);
         return (t === '[object Array]' || t === '[object Arguments]');
      },
      tailcall: function (func, args, cb) {
         var allArgs = cb ? [cb] : [];
         allArgs.push.apply(allArgs, args);
         return { func: func, args: allArgs };
      },
      invoke: function (aTailcall) {
         var tc = (typeof aTailcall === 'function') ? O.js.tailcall.apply(null, arguments) : aTailcall;
         while(tc && tc.func) { tc = tc.func.apply(null, tc.args || []); }
      }
   },

   // System functions, all written in Continuation Passing Style (CPS):
   // (values are returned by calling a callback provided by the caller)

   typeof: function (cb, obj) {
      var t = typeof obj;
      return O.js.tailcall(cb, [
         (t === 'undefined' || obj === null) ? 'null' :
         (t === 'function') ? 'native' :
         O.js.isArray(t) ? 'array' : t
      ]);
   },
   has: function (cb, prop, obj) {
      return O.js.tailcall(O.typeof, [obj], function (t) {
         return O.js.tailcall(cb, [
            (t === 'object' || t === 'array') && O.js.hasOwn(obj, prop)
         ]);
      });
   },
   get: function (cb, prop, obj) {
      return O.js.tailcall(O.has, [prop, obj], function (h) {
         return O.js.tailcall(cb, [h ? obj[prop] : null, h]);
      });
   },
   set: function (cb, prop, value, obj) {
      return O.js.tailcall(O.typeof, [obj], function (t) {
         if (t === 'object' || t === 'array') { obj[prop] = value; }
         return O.js.tailcall(cb, [value]);
      });
   },
   lookup: function (cb, prop, env) {
      return O.js.tailcall(O.get, [prop, env], function (value, has) {
         if (O.has) { return O.js.tailcall(cb, [value]); }
         return O.js.tailcall(O.get, ['parent', env], function (parent, has) {
            if (!has) { return O.js.tailcall(cb, [null]); }
            return O.js.tailcall(O.lookup, [prop, parent], cb);
         });
      });
   },
   eval: function (cb, code, env) {
      return O.js.tailcall(O.typeof, [code], function (type) {
         // Execute native JavaScript
         if (type === 'native') {
            return O.js.tailcall(code, [code, env], cb);
         }
         // If not an object or native, return it as a value (it's not runnable "code")
         if (type !== 'object') {
            return O.js.tailcall(cb, [code]);
         }
         // Execute an operation defined in env
         return O.js.tailcall(O.get, ['op', code], function (op, hasOp) {
            // If there is no operation to perform, just return it as a value
            if (!hasOp) {
               return O.js.tailcall(cb, [code]);
            }
            return O.js.tailcall(O.typeof, [op], function (opType) {
               // The operation is either computed as code, or looked up as an environment property
               var computeOp = (opType === 'object') ? O.eval : O.lookup;
               return O.js.tailcall(computeOp, [op, env], function (func) {
                  return O.js.tailcall(O.get, ['args', code], function (args) {
                     args = args || [];
                     var newEnv = { parent: env };
                     // TODO: instead of just setting 'args', set each args as property of newEnv
                     return O.js.tailcall(O.set, ['args', [], newEnv], function (callArgs) {
                        return O.js.tailcall(O.get, ['syntax', func], function (isSyntax) {
                           // Execute a syntax-function (operates on unevaluated arguments)
                           if (isSyntax) {
                              callArgs.push.apply(callArgs, args);
                              return O.js.tailcall(O.eval, [func, newEnv], cb);
                           }
                           // Evaluate each argument, then pass them into the operation
                           function nextArg (cb, i) {
                              // Invoke the operation once all args are evaluated:
                              if (i >= args.length) {
                                 return O.js.tailcall(O.eval, [func, newEnv], cb);
                              }
                              // Evaluate the next argument:
                              return O.js.tailcall(O.eval, [args[i], env], function (a) {
                                 callArgs.push(a);
                                 return O.js.tailcall(nextArg, [i+1], cb);
                              });
                           }
                           return O.js.tailcall(nextArg, [0], cb);
                        });
                     });
                  });
               });
            });
         });
      });
   }
};

// ------------------------------------------ //
// TEMPORARY HOOKS FOR TESTING PURPOSES ONLY: //
// ------------------------------------------ //

O.Test = {
   make: O.js.make,
   run: function (code, env, cb) {
      cb = arguments[arguments.length - 1];
      if (typeof cb !== 'function') { cb = function (v) { console.log(v); }; }
      if (typeof env !== 'object' || !env) { env = O; }
      code = O.js.make(code);
      O.js.invoke(O.eval, [code, env], cb); 
   }
};

}());
