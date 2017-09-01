(function() {
 
// The "root" object of the whole system:
var O = window.Objects = {
   // Native JS utilities (normal calling convention, i.e. not CPS):
   js: {
      noop: function () { },
      newObj: function () { return Object.create(null); },
      hasOwn: function (obj, prop) { return Object.hasOwnProperty.call(obj, prop); },
      isArray: function (o) {
         var t = Object.prototype.toString.call(o);
         return (t === '[object Array]' || t === '[object Arguments]');
      },
      tailcall: function (func, args, cb) {
         if (typeof func !== 'function') {
            args = [{
               parent: func.scope || null,
               caller: args.shift(),
               args: args
            }];
            if (func.args) {
               for (var i = 0; i < func.args.length; i++) {
                  args[func.args[i]] = args.args[i];
               }
            }
         }
         var allArgs = cb ? [cb] : [];
         allArgs.push.apply(allArgs, args);
         return { func: func, args: allArgs };
      },
      invoke: function (aTailcall) {
         var tc = (typeof aTailcall === 'function') ? O.js.tailcall.apply(null, arguments) : aTailcall;
         while(tc && tc.func) { tc = tc.func.apply(null, tc.args || []); }
      },
      tryCall: function (func, args) {
         try { return func.apply(null, args); }
         catch(ex) { return ex; }
      }
   },

   // System functions, all written in Continuation Passing Style (CPS):
   // (values are returned by calling a callback provided by the caller)

   typeof: { scope: O, args: ['obj'], body: function (cb, env) {
      var t = typeof env.obj;
      return env.parent.js.tailcall(cb, [
         (t === 'undefined' || env.obj === null) ? 'null' :
         (t === 'function') ? 'native' :
         env.parent.js.isArray(env.obj) ? 'array' : t
      ]);
   }},
   has: { scope: O, args: ['prop', 'obj'], body: function (cb, env) {
      return env.parent.js.tailcall(env.parent.typeof, [env, env.obj], function (t) {
         return env.parent.js.tailcall(cb, [
            (t === 'object' || t === 'array') && env.parent.js.hasOwn(env.obj, env.prop)
         ]);
      });
   }},
   get: { scope: O, args: ['prop', 'obj'], body: function (cb, env) {
      return env.parent.js.tailcall(env.parent.has, [env, env.prop, env.obj], function (h) {
         return env.parent.js.tailcall(cb, [h ? env.obj[env.prop] : null, h]);
      });
   }},
   set: { scope: O, args: ['prop', 'value', 'obj'], body: function (cb, env) {
      return env.parent.js.tailcall(env.parent.typeof, [env, env.obj], function (t) {
         if (t === 'object' || t === 'array') { env.obj[env.prop] = env.value; }
         return env.parent.js.tailcall(cb, [env.value]);
      });
   }},
   lookup: { scope: O, args: ['prop', 'env'], body: function (cb, env) {
      return env.parent.js.tailcall(env.parent.get, [env, env.prop, env.env], function (value, has) {
         if (env.parent.has) { return env.parent.js.tailcall(cb, [value]); }
         return env.parent.js.tailcall(env.parent.get, [env, 'parent', env.env], function (parent, has) {
            if (!has) { return env.parent.js.tailcall(cb, [null]); }
            return env.parent.js.tailcall(env.parent.lookup, [env, env.prop, parent], cb);
         });
      });
   }},
   loop: { scope: O, args: ['start', 'end', 'code'], body: function(cb, env) {
      if (env.start < env.end) {
         return env.parent.js.tailcall(env.code, [env, env.start], function() {
            return env.parent.js.tailcall(O.loop, [env, env.start+1, env.end], cb);
         });
      }
      return env.parent.js.tailcall(cb, []);
   }},
   each: { scope: O, args: ['array', 'code', 'i'], body: function(cb, env) {
      return env.parent.js.tailcall(env.parent.typeof, [env, env.array], function (type) {
         if (type !== 'array') {
            return env.parent.js.tailcall(cb);
         }
         return env.parent.js.tailcall(env.parent.loop, [env, 0, env.array.length, function(cb, i) {
            return env.parent.js.tailcall(env.parent.get, [env, i, env.array], function(value) {
               return env.parent.js.tailcall(code, [i, value], cb);
            });
         }], cb);
      });
   }},
   getArgs: { scope: O, args: ['func', 'args', 'env'], body: function(cb, env) {
      return env.parent.js.tailcall(env.parent.get, [env, 'syntax', env.func], function(syntax, isSyntax) {
         // TODO: Maybe the value of syntax can provide something useful?
         return env.parent.js.tailcall(env.parent.each, [env, (isSyntax ? [] : env.args), function(cb, i, argExpr) {
            return env.parent.js.tailcall(env.parent.eval, [env, argExpr, env.env], function(argVal) {
               return env.parent.js.tailcall(env.parent.set, [env, i, argVal, env.args], cb);
            });
         }], function() {
            return env.parent.js.tailcall(cb, [env.args]);
         });
      });
   }},
   newEnv: { scope: O, args: ['func', 'args', 'env'], body: function (cb, env) {
      return env.parent.js.tailcall(env.parent.js.newObj, [], function(env2) {
         return env.parent.js.tailcall(env.parent.set, [env, 'caller', env.env, env2], function() {
            return env.parent.js.tailcall(env.parent.get, [env, 'scope', env.func], function(scope) {
               return env.parent.js.tailcall(env.parent.set, [env, 'parent', scope, env2], function() {
                  return env.parent.js.tailcall(env.parent.get, [env, 'args', env.func], function(argNames) {
                     return env.parent.js.tailcall(env.parent.each, [env, argNames, function(cb, i, aName) {
                        return env.parent.js.tailCall(O.typeof, [env, aName], function(nType) {
                           if (nType !== 'string') {
                              return env.parent.js.tailCall(cb);
                           }
                           return env.parent.js.tailcall(env.parent.get, [env, i, env.args], function(aValue) {
                              return env.parent.js.tailcall(env.parent.set, [env, aName, aValue, env2], cb);
                           });
                        });
                     }], function() {
                        return env.parent.js.tailcall(env.parent.set, [env, 'args', env.args, env2], function() {
                           return env.parent.js.tailcall(cb, [env2]);
                        });
                     });
                  });
               });
            });
         });
      });
   }},
   getFunc: { scope: O, args: ['func', 'env'], body: function (cb, env) {
      return env.parent.js.tailcall(env.parent.typeof, [env, env.func], function(type) {
        if (type !== 'string' && type !== 'number') {
            return env.parent.js.tailcall(cb, [env.func]);
        }
        return env.parent.js.tailcall(env.parent.lookup, [env, env.func, env.env], cb);
      });
   }},
   apply: { scope: O, args: ['func', 'args', 'env'], body: function (cb, env) {
      return env.parent.js.tailcall(env.parent.typeof, [env, env.func], function(funcType) {
         if (funcType === 'native') {
            return env.parent.js.tailcall(cb, [env.parent.js.tryCall(env.func, env.args)]);
         }
         if (funcType !== 'object') {
            return env.parent.js.tailcall(cb, [null]);
         }
         return env.parent.js.tailcall(env.parent.get, [env, 'body', func], function(body) {
            return env.parent.js.tailcall(env.parent.newEnv, [env, body, env.args, env.env], function(env2) {
               return env.parent.js.tailcall(env.parent.typeof, [env, body], function(type) {
                  if (type === 'native') {
                     return env.parent.js.tailcall(body, [env2], cb);
                  }
                  return env.parent.js.tailcall(O.eval, [env, env.func, env2], cb);
               });
            });
         });
      });
   }},
   eval: { scope: O, args: ['expr', 'env'], body: function (cb, env) {
      return env.parent.js.tailcall(env.parent.typeof, [env, env.expr], function (type) {
         if (type !== 'array' || env.expr.length < 1) {
            return env.parent.js.tailcall(cb, [env.expr]);
         }
         return env.parent.js.tailcall(env.parent.get, [env, 0, env.expr], function(funcExpr) {
            return env.parent.js.tailcall(env.parent.eval, [env, funcExpr, env.env], function(funcVal) {
               return env.parent.js.tailcall(env.parent.getFunc, [env, funcVal], function(func) {
                  return env.parent.js.tailcall(env.parent.getArgs, [env, func, env.expr.slice(1), env.env], function(args) {
                     return env.parent.js.tailcall(env.parent.apply, [env, func, args, env.env], cb);
                  });
               })
            });
         });
      });
   }}
};

// ------------------------------------------ //
// TEMPORARY HOOKS FOR TESTING PURPOSES ONLY: //
// ------------------------------------------ //

O.Test = {
   run: function (expr, env, cb) {
      cb = arguments[arguments.length - 1];
      if (typeof cb !== 'function') { cb = function (v) { console.log(v); }; }
      if (typeof env !== 'object' || !env) { env = O; }
      O.js.invoke(O.eval, [expr, env], cb); 
   }
};

}());
