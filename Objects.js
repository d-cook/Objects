(function() {

function newObject (obj) {
   var v = Object.create(null);
   for (var p in obj) {
      if (Object.hasOwnProperty.apply(obj, p)) {
         v[p] = obj[p];
      }
   }
   var o = Object.create(null);
   o.type = O.types.object;
   o.value = v;
   return o;
}

function tailcall (func, args, cb) {
   var allArgs = cb ? [cb] : [];
   allArgs.push.apply(allArgs, args);
   return { func: func, args: allArgs };
}

function run (func) {
   var r = func();
   while(r && r.func) {
      r = r.func.apply(null, r.args || []);
   }
}
   
// TODO: Convert remaining O functions to Continuation Passing Style

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
   
O.isType   = function (o) { return O.typeof(o) === O.types.type;   };
O.isNull   = function (o) { return O.typeof(o) === O.types.null;   };
O.isBool   = function (o) { return O.typeof(o) === O.types.bool;   };
O.isNumber = function (o) { return O.typeof(o) === O.types.number; };
O.isString = function (o) { return O.typeof(o) === O.types.string; };
O.isArray  = function (o) { return O.typeof(o) === O.types.array;  };
O.isObject = function (o) { return O.typeof(o) === O.types.object; };
O.isNative = function (o) { return O.typeof(o) === O.types.native; };

O.typeof = function (obj) { return (obj && obj.type) || O.types.null; };

O.null = { type: O.types.null };

O.eval = function (cb, code, env) {
   // Execute native JavaScript
   if (O.isNative(code)) {
      return tailcall(O.get(code, 'func'), [code, env], cb);
   }
   // Execute an operation defined in env
   if (O.isObject(code) && O.has(code, 'op')) {
      function processFunc (func) {
         var args = O.get(code, 'args') || [];
         var callArgs = [];
         var newEnv = newObject({ parent: env });
         O.set(newEnv, 'args', callArgs); // TODO: instead, insert args as named props of newEnv
         // Execute a syntax-function (operates on unevaluated arguments)
         if (O.get(func, 'syntax')) {
            callArgs.push.apply(callArgs, args);
            return tailcall(O.eval, [func, newEnv], cb);
         }
         // Evaluate each argument, then pass them into the operation
         function nextArg (i) {
            // Invoke the operation once all args are evaluated:
            if (i >= args.length) {
               return tailcall(O.eval, [func, newEnv], cb);
            }
            // Evaluate the next argument:
            return tailcall(O.eval, [argsExps[i], env], function (a) {
               callArgs.push(a);
               return tailcall(nextArg, [i+1]);
            });
         }
         return tailcall(nextArg, [0]);
      }
      var op = O.get(code, 'op');
      // Compute the function to call:
      if (O.isObject(op)) {
         return tailcall(O.eval, [op, env], processFunc);
      }
      // Otherwise lookup the function to call:
      return tailcall(processFunc, [O.lookup(env, op)]);
   }
   // Otherwise, the "code" is a value ("self-evaluating")
   return tailcall(cb, [code]);
};

O.has = function (obj, prop) {
   return (O.isObject(obj) || O.isArray(obj)) && obj.value.hasOwnProperty(prop);
};

O.get = function (obj, prop) {
   return O.has(obj, prop) ? obj.value[prop] : O.null;
};

O.set = function (obj, prop, value) {
   if (O.isObject(obj) || O.isArray(obj)) {
      obj.value[prop] = value;
   }
};

O.lookup = function (env, prop) {
   if (O.has(env, prop)) { return O.get(env, prop); }
   if (O.has(env, 'parent')) { return O.lookup(O.get(env, 'parent'), prop); }
   return O.null;
};

}());
