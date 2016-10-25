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

O.eval = function (cb, code, env) {
   // Execute JavaScript
   if (O.isNative(code)) {
      return { func: code.func, args: [cb, code, env] }; // :: code.func(cb, code, env)
   }
   // Execute some other operation (as defined in env)
   if (O.isObject(code) && code.op && env[code.op]) {
      return { func: env[code.op], args: [cb, code, env] }; // :: env[code.op](cb, code, env)
   }
   // Otherwise, the "code" is a value ("self-evaluating")
   return { func: cb, args: [code] }; // :: cb(code)
};

O.call = function (cb, code, env) {
   return { func: O.eval, args: [cb, code, O.newObject({ parent: env })] };
};

}());
