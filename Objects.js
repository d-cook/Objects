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
         O.js.isArray(obj) ? 'array' : t
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
   loop: function(cb, start, end, code) {
      if (start < end) {
         return O.js.tailcall(code, [start], function() {
            return O.js.tailcall(O.loop, [start+1, end], cb);
         });
      }
      return O.js.tailcall(cb, []);
   },
   each: function(cb, array, code, i) {
      return O.js.tailcall(O.typeof, [array], function (type) {
         if (type !== 'array') {
            return O.js.tailcall(cb);
         }
         return O.js.tailcall(O.loop, [0, array.length, function(cb, i) {
            return O.js.tailcall(O.get, [i, array], function(value) {
               return O.js.tailcall(code, [i, value], cb);
            });
         }], cb);
      });
   },
   eval: function (cb, expr, env) {
      return O.js.tailcall(O.typeof, [expr], function (type) {
         if (type !== 'array' || expr.length < 1) {
            return O.js.tailcall(cb, [expr]);
         }
         return O.js.tailcall(O.get, [0, expr], function(opExpr) {
            return O.js.tailcall(O.eval, [opExpr, env], function(opName) {
               return O.js.tailcall(O.lookup, [opName, env], function(op) {
                  return O.js.tailcall(O.typeof, [op], function(opType) {
                     if (opType !== 'object' && opType !== 'native') {
                        return null;
                     }
                     return O.js.tailcall(O.get, ['syntax', op], function(syntax, isSyntax) {
                        // applyArgs is declared below (this does not violate JS semantics)
                        var args = expr.slice(1);
                        if (isSyntax) {
                           return O.js.tailcall(applyArgs, [], cb);
                        }
                        return O.js.tailcall(O.each, [args, function(cb, i, argExpr) {
                           return O.js.tailcall(O.eval, [argExpr, env], function(argVal) {
                              return O.js.tailcall(O.set, [i, argVal, args], cb);
                           });
                        }], function() {
                           return O.js.tailcall(applyArgs, [], cb);
                        });
                        function applyArgs(cb) {
                           if (opType === 'native') {
                              return O.js.tailcall(op, [args, env], cb);
                           }
                           return O.js.tailcall(O.get, ['body', op], function(body) {
                              return O.js.tailcall(O.typeof, [body], function(bodyType) {
                                 if (bodytype === 'native') {
                                    return O.js.tailcall(body, [args, env], cb);
                                 }
                                 return O.js.tailcall(O.js.createObj, [], function(newEnv) {
                                    return O.js.tailcall(O.set, ['parent', env, newEnv], function() {
                                       return O.js.tailcall(O.get, ['args', body], function(argNames) {
                                          return O.js.tailcall(O.each, [argNames, function(cb, i, aName) {
                                             return O.js.tailCall(O.typeof, [aName], function(nType) {
                                                if (nType !== 'string') {
                                                   return O.js.tailCall(cb);
                                                }
                                                return O.js.tailcall(O.get, [i, args], function(aValue) {
                                                   return O.js.tailcall(O.set, [aName, aValue, newEnv], cb);
                                                });
                                             });
                                          }], function() {
                                             return O.js.tailcall(O.eval, [body, env], cb);
                                          });
                                       });
                                    });
                                 });
                              });
                           });
                        }
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
   run: function (expr, env, cb) {
      cb = arguments[arguments.length - 1];
      if (typeof cb !== 'function') { cb = function (v) { console.log(v); }; }
      if (typeof env !== 'object' || !env) { env = O; }
      O.js.invoke(O.eval, [expr, env], cb); 
   }
};

}());
