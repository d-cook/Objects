(function() {

// The "root" object of the whole system:
var O = window.Objects = Object.create(null);

// Native JS utilities (normal calling convention, i.e. not CPS):
// IMPORTANT: These functions should ONLY depend on the global window object so
//    that if they if they are modified as strings, their closure does not break.
O.js = {
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
    tailcall: function (func, env, args, cb) {
        if (O.js.type(env) === 'array') { cb = args; args = env; env = null; }
        if (typeof func !== 'function') {
            env = { parent: O.apply.scope, args: args, func: func, args: args, env: env };
            return O.js.tailcall(O.apply.body, env, [env], cb);
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
};

// System functions, all written in Continuation Passing Style (CPS):
// (values are returned by calling a callback provided by the caller)

O.type = { scope: O, args: ['obj'], body: function (cb, env) {
    return env.parent.js.tailcall(cb, env, [env.parent.js.type(env.obj)]);
}};
O.has = { scope: O, args: ['prop', 'obj'], body: function (cb, env) {
    var t = env.parent.js.type(env.obj);
    return env.parent.js.tailcall(cb, env, [
        (t === 'object' || t === 'array') && env.parent.js.has(env.obj, env.prop)
    ]);
}};
O.get = { scope: O, args: ['prop', 'obj'], body: function (cb, env) {
    var h = env.parent.js.has(env.prop, env.obj);
    return env.parent.js.tailcall(cb, env, [h ? env.obj[env.prop] : null, h]);
}};
O.set = { scope: O, args: ['prop', 'value', 'obj'], body: function (cb, env) {
    var t = env.parent.js.type(env.obj);
    if (t === 'object' || t === 'array') { env.obj[env.prop] = env.value; }
    return env.parent.js.tailcall(cb, env, [env.value]);
}};
O.lookup = { scope: O, args: ['prop', 'env'], body: function (cb, env) {
    var e = env.env || env;
    var h = env.parent.js.has(e, env.prop);
    if (h) { return env.parent.js.tailcall(cb, env, [e[env.prop]]); }
    h = env.parent.js.has('parent', e);
    if (!h) { return env.parent.js.tailcall(cb, env, [null]); }
    return env.parent.js.tailcall(env.parent.lookup, env, [env.prop, e.parent], cb);
}};
O.loop = { scope: O, args: ['start', 'end', 'code'], body: function(cb, env) {
    if (env.start < env.end) {
        //return env.parent.js.tailcall(env.parent.apply, env, [env.code, [env.start], env], function() {
        return env.parent.js.tailcall(env.code, env, [env.start], function() {
            return env.parent.js.tailcall(O.loop, env, [env.start+1, env.end], cb);
        });
    }
    return env.parent.js.tailcall(cb, env, []);
}};
O.each = { scope: O, args: ['array', 'code'], body: function(cb, env) {
    var type = env.parent.js.type(env.array);
    if (type !== 'array') { return env.parent.js.tailcall(cb, env, []); }
    return env.parent.js.tailcall(env.parent.loop, env, [0, env.array.length, function(cb, i) {
        return env.parent.js.tailcall(env.code, env, [i, env.array[i]], cb);
    }], cb);
}};
O.getArgs = { scope: O, args: ['func', 'args', 'env'], body: function(cb, env) {
    return env.parent.js.tailcall(env.parent.each, env, [env.args, function(cb, i, argExpr) {
        return env.parent.js.tailcall(env.parent.eval, env, [argExpr, env.env], function(argVal) {
            env.args[i] = argVal;
            return env.parent.js.tailcall(cb, env, []);
        });
    }], function() {
        return env.parent.js.tailcall(cb, env, [env.args]);
    });
}};
O.newEnv = { scope: O, args: ['func', 'args', 'env'], body: function (cb, env) {
    var env2 = env.parent.js.newObj();
    env2.caller = env.env;
    env2.parent = env.func.scope;
    var argNames = env.func.args;
    return env.parent.js.tailcall(env.parent.each, env, [argNames, function(cb, i, aName) {
        var nType = env.parent.js.type(aName);
        if (nType !== 'string') {
            return env.parent.js.tailCall(cb, env, []);
        }
        var aValue = env.args[i];
        env2[aName] = aValue;
        return env.parent.js.tailcall(cb, env, [aValue]);
    }], function() {
        env2.args = env.args;
        return env.parent.js.tailcall(cb, env, [env2]);
    });
}};
O.apply = { scope: O, args: ['func', 'args', 'env'], body: function (cb, env) {
    var funcType = env.parent.js.type(env.func);
    if (funcType === 'native') {
        return env.parent.js.tailcall(cb, env, [env.parent.js.tryCall(env.func, env.args)]);
    }
    if (funcType !== 'object') {
        return env.parent.js.tailcall(cb, env, [null]);
    }
    var body = env.func.body;
    return env.parent.js.tailcall(env.parent.newEnv, env, [body, env.args, env.env], function(env2) {
        var type = env.parent.js.type(body);
        if (type === 'native') {
            return env.parent.js.tailcall(body, env, [env2], cb);
        }
        return env.parent.js.tailcall(O.eval, env, [env.func, env2], cb);
    });
}};
O.eval = { scope: O, args: ['expr', 'env'], body: function (cb, env) {
    var type = env.parent.js.type(env.expr);
    if (type !== 'array' || env.expr.length < 1) {
        return env.parent.js.tailcall(cb, env, [env.expr]);
    }
    var funcExpr = env.expr[0];
    var funcType = env.parent.js.type(funcExpr);
    var getter = (funcType === 'string' || funcType === 'number') ? env.parent.lookup : env.parent.eval;
    return env.parent.js.tailcall(getter, env, [funcExpr, env.env], function(func) {
        return env.parent.js.tailcall(env.parent.getArgs, env, [func, env.expr.slice(1), env.env], function(args) {
            return env.parent.js.tailcall(env.parent.apply, env, [func, args, env.env], cb);
        });
    });
}};
// This probably does not work right at all, but here's what I have so far:
O.compile = { scope: O, args: ['code', 'inner'], body: function (cb, env) {
    // TODO: rewrite the non-CPS implementation of "compile" (below) in CPS form, here.
    //      Can be done by rewriting as code-objects, and then having it compile itself.
}};
 
//TODO: Use the following to generate a CPS-version of itself, and replace the "compile" function above with the result:
var compile = function(code) {
    var calls = [];
    function getCalls(code) {
        if (O.js.type(code) !== 'array' || code.length < 1) { return code; }
        var last = [];
        for(var i = 0; i < code.length; i++) {
            var a = code[i];
            if (O.js.type(a) === 'array') {
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
            (c[0].charAt(0) === '"') ? "window.Objects.lookup, env, [" + c[0] + ", env.env], function (f) {\rreturn window.Objects.js.tailcall(f" :
            c[0]
        ) + ", env, [";
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
        O.js.invoke(O.js.tailcall(O.eval, env, [expr, env], cb)); 
    }
};

}());
