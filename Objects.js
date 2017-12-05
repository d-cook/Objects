(function() {

// The "root" object of the whole system:
var O = window.Objects = Object.create(null);
O.root = O;

// Native JS utilities (normal calling convention, i.e. not CPS):
// IMPORTANT: These functions should ONLY depend on the global window object so
//    that if they if they are modified as strings, their closure does not break.
O.js = {
    noop: function () { },
    newObj: function () { return Object.create(null); },
    has: function (obj, prop) { return obj ? (prop in obj) : false; },
    type: function (o) {
        var t = (typeof o);
        if (t === 'undefined' || o === null) { return 'null'; }
        if (t === 'function') { return 'native'; }
        var s = Object.prototype.toString.call(o);
        return (s === '[object Array]' || s === '[object Arguments]') ? 'array' : t;
    },
    tailcall: function (func, env, args, cb) {
        if (O.js.type(env) === 'array') { cb = args; args = env; env = null; }
        if (O.js.type(func) === 'native') {
            var allArgs = cb ? [cb] : [];
            allArgs.push.apply(allArgs, args);
            return { func: func, args: allArgs };
        }
        if (O.js.type(func) !== 'object') { return null; }
        if (O.js.type(func.body) === 'native') {
            var newEnv = {
                parent: func.scope || null,
                caller: env || null,
                args: args
            };
            if (func.args) {
                for (var i = 0; i < func.args.length; i++) {
                    newEnv[func.args[i]] = args[i];
                }
            }
            return { func: func.body, args: [cb, newEnv] };
        }
        // Otherwise call eval on the func object:
        var expr = [func];
        expr.push.apply(expr, args);
        var newEnv = {
            parent: O.eval.scope || null,
            caller: env || null,
            args: [env, expr],
            expr: expr,
            env: env
        };
        return { func: O.eval, args: [cb, newEnv] };
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
O.has = { scope: O, args: ['obj', 'prop'], body: function (cb, env) {
    if (env.args.length > 2) {
        var last = env.args.pop();
        return env.parent.js.tailcall(env.parent.get, env, env.args, function(obj) {
            return env.parent.js.tailcall(env.parent.has, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.parent;
    var h = env.parent.js.has(obj, env.prop);
    return env.parent.js.tailcall(cb, env, [h]);
}};
O.get = { scope: O, args: ['obj', 'prop'], body: function (cb, env) {
    if (env.args.length > 2) {
        var last = env.args.pop();
        return env.parent.js.tailcall(env.parent.get, env, env.args, function(obj) {
            return env.parent.js.tailcall(env.parent.get, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.parent;
    var h = env.parent.js.has(obj, env.prop);
    return env.parent.js.tailcall(cb, env, [h ? obj[env.prop] : null, h]);
}};
O.set = { scope: O, args: ['obj', 'prop', 'value'], body: function (cb, env) {
    if (env.args.length > 3) {
        var val = env.args.pop();
        var last = env.args.pop();
        return env.parent.js.tailcall(env.parent.get, env, env.args, function(obj) {
            return env.parent.js.tailcall(env.parent.set, env, [obj, last, val], cb);
        });
    }
    var obj = env.obj || env.caller;
    var t = env.parent.js.type(obj);
    if (t === 'object' || t === 'array') { obj[env.prop] = env.value; }
    return env.parent.js.tailcall(cb, env, [env.value]);
}};
O.exists = { scope: O, args: ['obj', 'prop'], body: function (cb, env) {
    if (env.args.length > 2) {
        var last = env.args.pop();
        return env.parent.js.tailcall(env.parent.lookup, env, env.args, function(obj) {
            return env.parent.js.tailcall(env.parent.exists, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.caller;
    var h = env.parent.js.has(obj, env.prop);
    if (h) { return env.parent.js.tailcall(cb, env, [true]); }
    h = env.parent.js.has(obj, 'parent');
    if (!h) { return env.parent.js.tailcall(cb, env, [false]); }
    return env.parent.js.tailcall(env.parent.exists, env, [obj.parent, env.prop], cb);
}};
O.lookup = { scope: O, args: ['obj', 'prop'], body: function (cb, env) {
    if (env.args.length > 2) {
        var last = env.args.pop();
        return env.parent.js.tailcall(env.parent.lookup, env, env.args, function(obj) {
            return env.parent.js.tailcall(env.parent.lookup, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.caller;
    var h = env.parent.js.has(obj, env.prop);
    if (h) { return env.parent.js.tailcall(cb, env, [obj[env.prop]]); }
    h = env.parent.js.has(obj, 'parent');
    if (!h) { return env.parent.js.tailcall(cb, env, [null]); }
    return env.parent.js.tailcall(env.parent.lookup, env, [obj.parent, env.prop], cb);
}};
O.assign = { scope: O, args: ['obj', 'prop', 'value'], body: function (cb, env) {
    if (env.args.length > 3) {
        var val = env.args.pop();
        var last = env.args.pop();
        return env.parent.js.tailcall(env.parent.lookup, env, env.args, function(obj) {
            return env.parent.js.tailcall(env.parent.assign, env, [obj, last, val], cb);
        });
    }
    var obj = env.obj || env.caller;
    var t = env.parent.js.type(obj);
    if (t === 'object' || t === 'array') { obj[env.prop] = env.value; }
    return env.parent.js.tailcall(cb, env, [env.value]);
}};
O.loop = { scope: O, args: ['start', 'end', 'code'], body: function(cb, env) {
    if (env.start < env.end) {
        //return env.parent.js.tailcall(env.parent.apply, env, [env.code, [env.start], env], function() {
        return env.parent.js.tailcall(env.code, env, [env.start], function() {
            return env.parent.js.tailcall(O.loop, env, [env.start+1, env.end, env.code], cb);
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
        return env.parent.js.tailcall(env.parent.eval, env, [env.env, argExpr], function(argVal) {
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
    return env.parent.js.tailcall(env.parent.newEnv, env, [env.func, env.args, env.env], function(env2) {
        var body = env.func.body;
        var type = env.parent.js.type(body);
        if (type === 'native') {
            return env.parent.js.tailcall(body, env, [env2], cb);
        }
        return env.parent.js.tailcall(O.eval, env, [env2, body], cb);
    });
}};
O.eval = { scope: O, args: ['env', 'expr'], body: function (cb, env) {
    var type = env.parent.js.type(env.expr);
    if (type !== 'array' || env.expr.length < 1) {
        return env.parent.js.tailcall(cb, env, [env.expr]);
    }
    var funcExpr = env.expr[0];
    var funcType = env.parent.js.type(funcExpr);
    var getter = (funcType === 'string' || funcType === 'number') ? env.parent.lookup : env.parent.eval;
    return env.parent.js.tailcall(getter, env, [env.env, funcExpr], function(func) {
        return env.parent.js.tailcall(env.parent.getArgs, env, [func, env.expr.slice(1), env.env], function(args) {
            return env.parent.js.tailcall(env.parent.apply, env, [func, args, env.env], cb);
        });
    });
}};
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
            (c[0].charAt(0) === '"') ? "window.Objects.lookup, env, [env.env, " + c[0] + "], function (f) {\rreturn window.Objects.js.tailcall(f" :
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

window.Test = function (env, expr, cb) {
    cb = arguments[arguments.length - 1];
    if (typeof cb !== 'function') { cb = function (v) { console.log("  --> " + v); return v; }; }
    if (typeof env !== 'object' || !env) { env = O; }
    O.js.invoke(O.js.tailcall(O.eval, env, [env, expr], cb)); 
};

(function(tests) {
    console.log("Running tests:");
    for(var i = 0; i < tests.length; i++) {
        console.log("Test(null, " + tests[i] + ")");
        var result = null;
        try { window.Test(null, eval(tests[i])); }
        catch(e) { console.log("  !!! " + e) }
    }
}([
    "123",
    "'test'",
    "[123]",
    "['foo']",
    "['get', {x:'xVal'}, 'x']",
    "['get', {x:{y:{z:'xyz'}}}, 'x', 'y', 'z']",
    "['get', {x:{parent:{y:{z:'xyz'}}}}, 'x', 'y', 'z']",
    "['lookup', {w:1,x:'IAmX'}, 'x']",
    "['lookup', {w:1,parent:{x:'IAmParentX'}}, 'x']",
    "['lookup', {w:1,parent:{parent:{x:'IAmParentParentX'}}}, 'x']",
    "['lookup', {x:{parent:{y:{z:'xyz'}}}}, 'x', 'y', 'z']",
    "['set', ['lookup', null, 'root'], 'def', function(k,v){if(Objects.js.type(v) === 'object' && !v.scope){v.scope=Objects;}Objects[k]=v;return v;}]",
    "['lookup', null, 'foo']",
    "['def', 'foo', 'IAmFoo']",
    "['lookup', null, 'foo']",
    "['def', '+', function(){var r=arguments[0];for(var i=1;i<arguments.length;i++){r+=arguments[i]}return r;}]",
    "['def', '-', {args:['a','b'], body:function(cb, env){return env.parent.js.tailcall(cb, [env.a-env.b]);}}]",
    "['def', '*', function(){var r=arguments[0];for(var i=1;i<arguments.length;i++){r*=arguments[i]}return r;}]",
    "['def', '/', {args:['a','b'], body:function(cb, env){return env.parent.js.tailcall(cb, [env.a/env.b]);}}]",
    "['+', 1, 2, 3, 4]",
    "['-', 43, 21]",
    "['*', 1, 2, 3, 4]",
    "['/', 128, 16]",
    "['def', 'alert', function(msg){alert(msg);}]",
    "['def', 'say', function(msg){document.body.innerHTML += ('<p>'+msg+'</p>'); return msg;}]",
    "['say', 'Howdy!']",
    "['def', 'again', {body:function(cb, env){var r = env.parent.js.tailcall(cb, env, env.args); env.parent.js.invoke(r); return r;}}]",
    "['again', 'again']",
    "['say', ['again', 'Testing \"say again\"']]",
    "['again', ['say', 'Testing \"again say\"']]",
    "['def', 'window', window]",
    "['def', '.', function(v){for(var i=1; i<arguments.length;i++){v=v[arguments[i]];}return v;}]",
    "['def', 'clear', {body:['assign', null, 'window', 'document', 'body', 'innerHTML', '']}]",
    "['def', 'refresh', {body:['set', ['.', ['lookup', null, 'window'], 'location'], 'href', ['.', ['lookup', null, 'window'], 'location', 'href']]}]",
    "['def', 'browse', {args:['url','w','h'],body:[['lookup', null, 'window', 'open'], ['lookup', null, 'url'], '_blank', ['+', 'top=', ['/', ['-', ['lookup', null, 'window', 'screen', 'height'], ['lookup', null, 'h']], 2], ',left=', ['/', ['-', ['lookup', null, 'window', 'screen', 'width'], ['lookup', null, 'w']], 2], ',width=', ['lookup', null, 'w'], ',height=', ['lookup', null, 'h'], ',menubar=0,toolbar=0,location=0']]}]",
    "['get', ['lookup', null, 'window'], 'document']",
    "['set', ['lookup', null, 'window'], 'document', 'body', 'style', 'backgroundColor', '#CCDDFF']",
    "['assign', null, 'window', 'document', 'body', 'style', 'fontWeight', 'bold']",
    "['assign', null, 'window', 'document', 'body', 'style', 'color', '#0000DD']",
    "['say', \"Try this: Test(null, ['browse', 'https://github.com/d-cook/Objects', 1000, 750])\"]",
    "['say', \"Try this: Test(null, ['refresh'])\"]",
    "['say', \"Try this: Test(null, ['clear'])\"]"
]));

}());
