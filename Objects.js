(function() {
 
// The "root" object of the whole system:
var O = window.Objects = {
   // Native JS utilities (normal calling convention, i.e. not CPS):
   // IMPORTANT: These functions should ONLY depend on the global window object so
   //   that if they if they are modified as strings, their closure does not break.
   js: {
      noop: function () { },
      newObj: function () { return Object.create(null); },
      has: function (obj, prop) { return Object.hasOwnProperty.call(obj, prop); },
      type: function (o) {
         var t = (typeof o);
         if (t === 'undefined' || o === null) { return 'null'; }
         if (t === 'function') { return 'native'; }
         var s = Object.prototype.toString.call(o);
         return (s === '[object Array]' || s === '[object Arguments]') ? 'array' : t;
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
      invoke: function (tc) { // tailcall
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
      return env.parent.js.tailcall(cb, [env.parent.js.type(env.obj)]);
   }},
   has: { scope: O, args: ['prop', 'obj'], body: function (cb, env) {
      var t = env.parent.js.type(env.obj);
      return env.parent.js.tailcall(cb, [
         (t === 'object' || t === 'array') && env.parent.js.has(env.obj, env.prop)
      ]);
   }},
   get: { scope: O, args: ['prop', 'obj'], body: function (cb, env) {
      var h = env.parent.js.has(env.prop, env.obj);
      return env.parent.js.tailcall(cb, [h ? env.obj[env.prop] : null, h]);
   }},
   set: { scope: O, args: ['prop', 'value', 'obj'], body: function (cb, env) {
      var t = env.parent.js.type(env.obj);
      if (t === 'object' || t === 'array') { env.obj[env.prop] = env.value; }
      return env.parent.js.tailcall(cb, [env.value]);
   }},
   lookup: { scope: O, args: ['prop', 'env'], body: function (cb, env) {
      var e = env.env || env;
      var h = env.parent.js.has(e, env.prop);
      if (h) { return env.parent.js.tailcall(cb, [e[env.prop]]); }
      h = env.parent.js.has('parent', e);
      if (!h) { return env.parent.js.tailcall(cb, [null]); }
      return env.parent.js.tailcall(env.parent.lookup, [env, env.prop, e.parent], cb);
   }},
   loop: { scope: O, args: ['start', 'end', 'code'], body: function(cb, env) {
      if (env.start < env.end) {
         //TODO: should probably call apply(code) rather than just code()
         return env.parent.js.tailcall(env.code, [env, env.start], function() {
            return env.parent.js.tailcall(O.loop, [env, env.start+1, env.end], cb);
         });
      }
      return env.parent.js.tailcall(cb, []);
   }},
   each: { scope: O, args: ['array', 'code'], body: function(cb, env) {
      var type = env.parent.js.type(env.array);
      if (type !== 'array') { return env.parent.js.tailcall(cb); }
      return env.parent.js.tailcall(env.parent.loop, [env, 0, env.array.length, function(cb, i) {
         return env.parent.js.tailcall(env.code, [i, env.array[i]], cb);
      }], cb);
   }},
   getArgs: { scope: O, args: ['func', 'args', 'env'], body: function(cb, env) {
      var isSyntax = env.parent.js.has(env.func, 'syntax');
      return env.parent.js.tailcall(env.parent.each, [env, (isSyntax ? [] : env.args), function(cb, i, argExpr) {
         return env.parent.js.tailcall(env.parent.eval, [env, argExpr, env.env], function(argVal) {
            env.args[i] = argVal;
            return env.parent.js.tailcall(cb, []);
         });
      }], function() {
         return env.parent.js.tailcall(cb, [env.args]);
      });
   }},
   newEnv: { scope: O, args: ['func', 'args', 'env'], body: function (cb, env) {
      var env2 = env.parent.js.newObj();
      env2.caller = env.env;
      env2.parent = env.func.scope;
      var argNames = env.func.args;
      return env.parent.js.tailcall(env.parent.each, [env, argNames, function(cb, i, aName) {
         var nType = env.parent.js.type(aName);
         if (nType !== 'string') {
            return env.parent.js.tailCall(cb);
         }
         var aValue = env.args[i];
         env2[aName] = aValue;
         return env.parent.js.tailcall(cb, [aValue]);
      }], function() {
         env2.args = env.args;
         return env.parent.js.tailcall(cb, [env2]);
      });
   }},
   getFunc: { scope: O, args: ['func', 'env'], body: function (cb, env) {
      var type = env.parent.js.type(env.func);
      if (type !== 'string' && type !== 'number') {
         return env.parent.js.tailcall(cb, [env.func]);
      }
      return env.parent.js.tailcall(env.parent.lookup, [env, env.func, env.env], cb);
   }},
   apply: { scope: O, args: ['func', 'args', 'env'], body: function (cb, env) {
      var funcType = env.parent.js.type(env.func);
      if (funcType === 'native') {
         return env.parent.js.tailcall(cb, [env.parent.js.tryCall(env.func, env.args)]);
      }
      if (funcType !== 'object') {
         return env.parent.js.tailcall(cb, [null]);
      }
      var body = env.func.body;
      return env.parent.js.tailcall(env.parent.newEnv, [env, body, env.args, env.env], function(env2) {
         var type = env.parent.js.type(body);
         if (type === 'native') {
            return env.parent.js.tailcall(body, [env2], cb);
         }
         return env.parent.js.tailcall(O.eval, [env, env.func, env2], cb);
      });
   }},
   eval: { scope: O, args: ['expr', 'env'], body: function (cb, env) {
      var type = env.parent.js.type(env.expr);
      if (type !== 'array' || env.expr.length < 1) {
         return env.parent.js.tailcall(cb, [env.expr]);
      }
      var funcExpr = env.expr[0];
      return env.parent.js.tailcall(env.parent.eval, [env, funcExpr, env.env], function(funcVal) {
         return env.parent.js.tailcall(env.parent.getFunc, [env, funcVal], function(func) {
            return env.parent.js.tailcall(env.parent.getArgs, [env, func, env.expr.slice(1), env.env], function(args) {
               return env.parent.js.tailcall(env.parent.apply, [env, func, args, env.env], cb);
            });
         });
      });
   }},
   // This probably does not work right at all, but here's what I have so far:
   compile: { scope: O, args: ['code', inner], body: function (cb, env) {
      var type = O.js.type(env.code);
      if (type !== 'array' || env.code.length < 1) { return O.js.tailcall(cb, JSON.stringify(env.code)); }
      var op = env.code[0];
      var opType = O.js.type(op);
      var src = (opType === 'array') ? "window.Objects.js.tailcall(r1" :
          (opType === 'object' || opType === 'native') ? "window.Objects.js.tailcall(" + JSON.stringify(op) :
          "window.Objects.lookup, [env, " + JSON.stringify(op) + ", env.env], function(r1) {\nwindow.Objects.js.tailcall(r1, [";
      var types = [];
      return O.js.tailcall(O.loop, [env, 1, env.code.length, function(cb, i) {
         var t = O.js.type(env.code[i]);
         types.push(t);
         src += (i > 0 ? ", " : "") + (t === 'array' ? "r" + (i+1) : JSON.stringify(env.code[i]));
      }], function() {
         src += "], " + (inner || "cb") + ");" + (opType === 'object' || opType === 'native' ? "\n});" : "");
         return O.js.tailcall(O.each, [env, types, function(cb, i, t) {
            if (t === 'array') {
               return O.js.tailcall(O.compile, [env, env.code[i+1], src], function (s) {
                  src = s;
                  O.js.tailcall(cb);
               });
            }
            return O.js.tailcall(cb);
         }], function() {
            return O.js.tailcall(cb, [env, src]);
         });
      });
   }}
};
 
//TODO: Use the following to generate a CPS-version of itself, and replace the "compile" function above with the result:
 var getType = function (o) {
   var t = (typeof o);
   if (t === 'undefined' || o === null) { return 'null'; }
   if (t === 'function') { return 'native'; }
   var s = Object.prototype.toString.call(o);
   return (s === '[object Array]' || s === '[object Arguments]') ? 'array' : t;
};

var compile = function(code) {
   var calls = [];
   function getCalls(code) {
      if (getType(code) !== 'array' || code.length < 1) { return code; }
      var last = [];
      for(var i = 0; i < code.length; i++) {
         var a = code[i];
         if (getType(a) === 'array') {
           getCalls(a);
            last.push(calls.length - 1);
         } else {
            last.push(JSON.stringify(a) || '' + a);
         }
      }
      calls.push(last);
   }
   getCalls(code);
   var src = "";
   while(calls.length) {
      var c = calls.pop();
      var t = getType(c[0]);
      var s = "return window.Objects.js.tailcall(" + (
         (t !== 'string') ? "r" + c[0] :
         (c[0].charAt(0) === '"') ? "window.Objects.lookup, [env, " + c[0] + ", env.env], function (f) {\rreturn window.Objects.tailcall(f" :
         c[0]
      ) + ", [env, ";
      for(var i = 1; i < c.length; i++) {
         s += (i > 1 ? ", " : "") + (getType(c[i]) === 'number' ? "r" : "") + c[i];
      }
      src = s + "], " +
         (src.length < 1 ? "cb]);" : "function(r" + calls.length + ") {\r" + src + "\r});") +
         (t === "string" && c[0].charAt(0) === '"' ? "\r});" : "");
   }
   return src;
};

// ------------------------------------------ //
// TEMPORARY HOOKS FOR TESTING PURPOSES ONLY: //
// ------------------------------------------ //

O.Test = {
   run: function (expr, env, cb) {
      cb = arguments[arguments.length - 1];
      if (typeof cb !== 'function') { cb = function (v) { console.log(v); }; }
      if (typeof env !== 'object' || !env) { env = O; }
      O.js.invoke(O.js.tailcall(O.eval, [O, expr, env], cb)); 
   }
};

}());
