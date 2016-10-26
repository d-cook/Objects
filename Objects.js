(function() {

function newObject (keys, obj) {
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

var O = window.Objects = {};

O.types = {};
O.types.type   = { type: null        , name: 'type'   }; O.isType   = function (o) { return O.typeof(o) === O.types.type;   };
O.types.object = { type: O.types.type, name: 'object' }; O.isObject = function (o) { return O.typeof(o) === O.types.object; };
O.types.string = { type: O.types.type, name: 'string' }; O.isString = function (o) { return O.typeof(o) === O.types.string; };
O.types.array  = { type: O.types.type, name: 'array'  }; O.isArray  = function (o) { return O.typeof(o) === O.types.array;  };
O.types.null   = { type: O.types.type, name: 'null'   }; O.isNull   = function (o) { return O.typeof(o) === O.types.null;   };
O.types.number = { type: O.types.type, name: 'number' }; O.isNumber = function (o) { return O.typeof(o) === O.types.number; };
O.types.native = { type: O.types.type, name: 'native' }; O.isNative = function (o) { return O.typeof(o) === O.types.native; };
O.types.type.type = O.types.type;

O.null = { type: O.types.null };

O.typeof = function (obj) { return (obj && obj.type) || O.types.null; };

// TODO: Replace env[...] with recursive lookup
// TODO: Replace foo.bar with foo.value.bar, or implement a property getter

O.eval = function (cb, code, env) {
   // Execute native JavaScript
   if (O.isNative(code)) {
      return tailcall(code.func, [code, env], cb);
   }
   // Execute an operation defined in env
   if (O.isObject(code) && code.op && env[code.op]) {
      return tailcall(O.eval, [code.op, env], function (func) {
         // Execute a syntax-function (operates on unevaluated arguments)
         if (func.syntax) {
            return tailcall(func, [code, env], cb);
         }
         // Evaluate each argument, then pass them into the operation
         var args = [];
         var argExps = code.args || [];
         function nextArg (i) {
            // Invoke the operation once all args are evaluated:
            if (i >= argExps.length) {
               return tailcall(func, args, cb);
            }
            // Evaluate the next argument:
            return tailcall(O.eval, [argsExps[i], env], function (a) {
               args.push(a);
               return tailcall(nextArg, [i+1]);
            });
         }
         return tailcall(nextArg, [0]);
      });
   }
   // Otherwise, the "code" is a value ("self-evaluating")
   return tailcall(cb, [code]);
};

O.call = function (cb, code, env) {
   return tailcall(O.eval, [code, O.newObject({ parent: env })], cb);
};

}());
