(function() {

// The "root" object of the whole system:
var O = window.Objects = Object.create(null);
O.root = O;

// NOTE: Native functions (non-wrapped) should not refer to external entities other than
//        the global context ("window"), so that they can be edited as strings, and then
//        recreated via window.eval(funcString) without breaking their closure context.
//       Wrapped functions are called with a reference to their "parent" closure scope
//        passed in as the "env" argument, and arguments accessed as properties of env.
//        Values are returned by passing them to the "cb" (callback) argument.

// These tailcall and invoke functions drive execution of all wrapped functions, which
// run in CPS (Continuation Passing Style) (i.e. return execution/values via callbacks).
// TODO: Convert these to wrapped so that "type" and "eval" are not referenced directly.
O.tailcall = function tailcall(func, env, args, cb) {
    // NOTE: this function references external entities: type, eval
    // TODO: Optimize the case for evaling a call to eval.
    if (O.type(env) === 'array') { cb = args; args = env; env = null; }
    var ft = O.type(func);
    if (ft === 'native') {
        // Detect if func takes a cb. TODO: this better (it's a hack with potential false-positives)
        var hasCb = (''+func).replace(/^[^(]+\(/, '').replace(/\).*$/, '').substring(0,3) === 'cb,';
        var allArgs = (cb && hasCb) ? [cb] : [];
        allArgs.push.apply(allArgs, args);
        if (cb && !hasCb) { return tailcall(cb, env, [func.apply(null, allArgs)]); }
        return { func: func, args: allArgs };
    }
    if (ft !== 'object') { return null; }
    if (O.type(func.code) === 'native') {
        // If func has no parent, then assume it is a nested code-block and inherit from current execution scope:
        var env2 = {
            parent: func.parent || env || null,
            args: args
        };
        env2.scope = env2;
        if (func.parent) {
            // Nested blocks inherit (i.e. do not override) these properties of their parent scope:
            env2.caller = env;
            env2.thisFunc = func;
            // TODO: Should a "return" property be getting set here?
        }
        if (func.args) {
            for (var i = 0; i < func.args.length; i++) {
                env2[func.args[i]] = args[i];
            }
        }
        return { func: func.code, args: [cb, env2] };
    }
    // Otherwise call eval on the func object:
    var expr = [func];
    expr.push.apply(expr, args);
    var env2 = {
        thisFunc: O.eval,
        parent: O.eval.parent,
        caller: env || null,
        args: [env, expr],
        expr: expr,
        env: env
    };
    env2.scope = env2;
    return { func: O.eval.code, args: [cb, env2] };
};
O.invoke = function (tc) { // tailcall
    while(tc && tc.func) { tc = tc.func.apply(null, tc.args || []); }
};

O.newObj = function () { return Object.create(null); };
O.hasOwn = function (o, p) { return o ? (p in o) : false; };
O.keys   = function (o) { return Object.keys(o||{}) || []; };
O.len    = function (o) { return(Object.keys(o||{}) || []).length; };
O.not    = function (v) { return !v; };

O['+']  = function () { var r = arguments[0]; for(var i=1; i<arguments.length; i++) {       r +=      arguments[i];                 } return r;    };
O['-']  = function () { var r = arguments[0]; for(var i=1; i<arguments.length; i++) {       r -=      arguments[i];                 } return r;    };
O['*']  = function () { var r = arguments[0]; for(var i=1; i<arguments.length; i++) {       r *=      arguments[i];                 } return r;    };
O['/']  = function () { var r = arguments[0]; for(var i=1; i<arguments.length; i++) {       r /=      arguments[i];                 } return r;    };
O.mod   = function () { var r = arguments[0]; for(var i=1; i<arguments.length; i++) {       r %=      arguments[i];                 } return r;    };
O['=']  = function () { var r = arguments[0]; for(var i=1; i<arguments.length; i++) { if ( (r !==(    arguments[i]))) return false; } return true; };
O['<']  = function () { var r = arguments[0]; for(var i=1; i<arguments.length; i++) { if (!(r <  (r = arguments[i]))) return false; } return true; };
O['>']  = function () { var r = arguments[0]; for(var i=1; i<arguments.length; i++) { if (!(r >  (r = arguments[i]))) return false; } return true; };
O['<='] = function () { var r = arguments[0]; for(var i=1; i<arguments.length; i++) { if (!(r <= (r = arguments[i]))) return false; } return true; };
O['>='] = function () { var r = arguments[0]; for(var i=1; i<arguments.length; i++) { if (!(r >= (r = arguments[i]))) return false; } return true; };
O.and   = function () { var r = arguments[0]; for(var i=0; i<arguments.length; i++) { if (!(     (r = arguments[i]))) return r;     } return r;    };
O.or    = function () { var r = arguments[0]; for(var i=0; i<arguments.length; i++) { if ( (     (r = arguments[i]))) return r;     } return r;    };

O.type = function (o) {
    var t = (typeof o);
    if (t === 'undefined' || o === null) { return 'null'; }
    if (t === 'function') { return 'native'; }
    var s = Object.prototype.toString.call(o);
    return (s === '[object Array]' || s === '[object Arguments]') ? 'array' : t;
};
O.has = { parent: O, args: ['obj', 'prop'], code: function (cb, env) {
    if (env.args.length > 2) {
        var last = env.args.pop();
        return env.parent.tailcall(env.parent.get, env, env.args, function(obj) {
            return env.parent.tailcall(env.parent.has, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.parent;
    var h = env.parent.hasOwn(obj, env.prop);
    return env.parent.tailcall(cb, env, [h]);
}};
O.get = { parent: O, args: ['obj', 'prop'], code: function (cb, env) {
    if (env.args.length > 2) {
        var last = env.args.pop();
        return env.parent.tailcall(env.parent.get, env, env.args, function(obj) {
            return env.parent.tailcall(env.parent.get, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.parent;
    var h = env.parent.hasOwn(obj, env.prop);
    return env.parent.tailcall(cb, env, [h ? obj[env.prop] : null]);
}};
O.set = { parent: O, args: ['obj', 'prop', 'value'], code: function (cb, env) {
    if (env.args.length > 3) {
        var val = env.args.pop();
        var last = env.args.pop();
        return env.parent.tailcall(env.parent.get, env, env.args, function(obj) {
            return env.parent.tailcall(env.parent.set, env, [obj, last, val], cb);
        });
    }
    var obj = env.obj || env.caller;
    var t = env.parent.type(obj);
    if (t === 'object' || t === 'array') { obj[env.prop] = env.value; }
    return env.parent.tailcall(cb, env, [env.value]);
}};
O.delete = { parent: O, args: ['obj', 'prop'], code: function (cb, env) {
    if (env.args.length > 2) {
        var last = env.args.pop();
        return env.parent.tailcall(env.parent.get, env, env.args, function(obj) {
            return env.parent.tailcall(env.parent.delete, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.parent;
    var h = env.parent.hasOwn(obj, env.prop);
    var v = (h) ? obj[env.prop] : null;
    delete obj[env.prop];
    return env.parent.tailcall(cb, env, [v]);
}};
O.exists = { parent: O, args: ['obj', 'prop'], code: function (cb, env) {
    if (env.args.length > 2) {
        var last = env.args.pop();
        return env.parent.tailcall(env.parent.lookup, env, env.args, function(obj) {
            return env.parent.tailcall(env.parent.exists, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.caller;
    var h = env.parent.hasOwn(obj, env.prop);
    if (h) { return env.parent.tailcall(cb, env, [true]); }
    h = env.parent.hasOwn(obj, 'parent');
    if (!h) { return env.parent.tailcall(cb, env, [false]); }
    return env.parent.tailcall(env.parent.exists, env, [obj.parent, env.prop], cb);
}};
O.lookup = { parent: O, args: ['obj', 'prop'], code: function (cb, env) {
    if (env.args.length > 2) {
        var last = env.args.pop();
        return env.parent.tailcall(env.parent.lookup, env, env.args, function(obj) {
            return env.parent.tailcall(env.parent.lookup, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.caller;
    var h = env.parent.hasOwn(obj, env.prop);
    if (h) { return env.parent.tailcall(cb, env, [obj[env.prop]]); }
    h = env.parent.hasOwn(obj, 'parent');
    if (!h) { return env.parent.tailcall(cb, env, [null]); }
    return env.parent.tailcall(env.parent.lookup, env, [obj.parent, env.prop], cb);
}};
O.assign = { parent: O, args: ['obj', 'prop', 'value'], code: function (cb, env) {
    if (env.args.length > 3) {
        var val = env.args.pop();
        var last = env.args.pop();
        return env.parent.tailcall(env.parent.lookup, env, env.args, function(obj) {
            return env.parent.tailcall(env.parent.assign, env, [obj, last, val], cb);
        });
    }
    var obj = env.obj || env.caller;
    var t = env.parent.type(obj);
    if (t === 'object' || t === 'array') { obj[env.prop] = env.value; }
    return env.parent.tailcall(cb, env, [env.value]);
}};
O.remove = { parent: O, args: ['obj', 'prop'], code: function (cb, env) {
    if (env.args.length > 2) {
        var last = env.args.pop();
        return env.parent.tailcall(env.parent.lookup, env, env.args, function(obj) {
            return env.parent.tailcall(env.parent.remove, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.caller;
    var h = env.parent.hasOwn(obj, env.prop);
    if (h) {
        var v = obj[env.prop];
        delete obj[env.prop];
        return env.parent.tailcall(cb, env, [v]);
    }
    h = env.parent.hasOwn(obj, 'parent');
    if (!h) { return env.parent.tailcall(cb, env, [null, false]); }
    return env.parent.tailcall(env.parent.remove, env, [obj.parent, env.prop], cb);
}};
O.copy = { parent: O, args: ['obj'], code: function (cb, env) {
    var t = env.parent.type(env.obj);
    if (t === 'array') {
        var c = [];
        c.push.apply(c, env.obj);
        return env.parent.tailcall(cb, env, [c]);
    }
    if (t === 'object') {
        var c = env.parent.newObj();
        for(var p in env.obj) {
            if (env.parent.hasOwn(env.obj, p)) {
                c[p] = env.obj[p];
            }
        }
        return env.parent.tailcall(cb, env, [c]);
    }
    return env.parent.tailcall(cb, env, [env.obj]);
}};
O.do = { parent: O, code: function (cb, env) {
    var len = env.args.length;
    return env.parent.tailcall(cb, env, [len > 0 ? env.args[len-1] : null]);
}};
O.if = { parent: O, args: ['cond', 'T', 'F'], code: function (cb, env) {
    var f = (env.cond ? env.T : env.F);
    if (f) { return env.parent.tailcall(f, env.caller, [env.cond], cb); }
    return env.parent.tailcall(cb, env, [null]); // No valid code to run, so nothing to return
}};
O.loop = { parent: O, args: ['start', 'end', 'inc', 'code', 'value'], code: function(cb, env) {
    // code | end, code | start, end, code | start, end, inc, code
    var a = env.args;
    var start = (a.length > 2) ? a[0] : 0;
    var end = (a.length === 2) ? a[0] : (a.length > 2) ? a[1] : 0;
    var inc = (a.length > 3) ? a[2] : (a.length <= 3 && start > end) ? -1 : (a.length < 2) ? 0 : 1;
    var code = (a.length > 3) ? a[3] : (a.length > 0) ? a[a.length - 1] : null;
    if ((inc > 0 && start < end) || (inc < 0 && start > end) || inc === 0) {
        return env.parent.tailcall(code, env.caller, [start], function(v) {
            return env.parent.tailcall(env.parent.loop, env, [start+inc, end, inc, code, v], cb);
        });
    }
    return env.parent.tailcall(cb, env, [env.value]);
}};
O.each = { parent: O, args: ['container', 'code'], code: function(cb, env) {
    var c = env.container;
    var t = env.parent.type(c);
    if (t === 'array') {
        return env.parent.tailcall(env.parent.loop, env, [0, c.length, function(cb, k) {
            return env.parent.tailcall(env.code, env.caller, [k, c[k]], cb);
        }], cb);
    }
    if (t !== 'object') { return env.parent.tailcall(cb, env, [null]); }
    return env.parent.tailcall(env.parent.keys, env, [c], function(keys) {
        return env.parent.tailcall(env.parent.loop, env, [0, keys.length, function(cb, k) {
            k = keys[k];
            return env.parent.tailcall(env.code, env.caller, [k, c[k]], cb);
        }], cb);
    });
}};
O.lambda = { parent: O, args: ['argList', 'code'], code: function (cb, env) {
    var f, t = env.parent.type(env.code);
    if (t === 'object') { f = env.code; }
    else {
        f = env.parent.newObj();
        f.code = env.code;
        if (t !== 'array') { return env.parent.tailcall(cb, env, [f]); }
    }
    return env.parent.tailcall(env.parent.has, env, [f, 'parent'], function (h) {
        if (!h) { f.parent = env.caller; }
        return env.parent.tailcall(env.parent.has, env, [f, 'args'], function (h) {
            if (!h) { f.args = env.argList || []; }
            return env.parent.tailcall(cb, env, [f]);
        });
    });
}};
O.with = { parent: O, args: ['obj', 'code'], code: function(cb, env) {
    // obj, code | obj, prop..., value
    var result = env.parent.tailcall(cb, env, [env.obj]);
    if (env.args.length < 2) { return result; }
    if (env.args.length < 3) { return env.parent.tailcall(env.code, env.caller, [env.obj], function() { return result; }); }
    return env.parent.tailcall(env.parent.set, env, env.args, function() { return result; });
}};

// Eval functions:

O.eval = { parent: O, args: ['env', 'expr'], code: function (cb, env) {
    var type = env.parent.type(env.expr);
    if (type !== 'array' || env.expr.length < 1) {
        return env.parent.tailcall(cb, env, [env.expr]);
    }
    var funcExpr = env.expr[0];
    var funcType = env.parent.type(funcExpr);
    var getter = (funcType === 'string' || funcType === 'number') ? env.parent.lookup : env.parent.eval;
    return env.parent.tailcall(getter, env, [env.env, funcExpr], function(func) {
        return env.parent.tailcall(env.parent.getArgs, env, [func, env.expr.slice(1), env.env], function(args) {
            return env.parent.tailcall(env.parent.apply, env, [func, args, env.env], cb);
        });
    });
}};
O.apply = { parent: O, args: ['func', 'args', 'env'], code: function (cb, env) {
    var funcType = env.parent.type(env.func);
    if (funcType === 'native') {
        var result = null;
        try { result = env.func.apply(null, env.args); }
        catch(ex) { result = ex; }
        return env.parent.tailcall(cb, env, [result]);
    }
    if (funcType !== 'object') {
        return env.parent.tailcall(cb, env, [null]);
    }
    return env.parent.tailcall(env.parent.newEnv, env, [env.func, env.args, env.env, cb], function(env2) {
        var code = env.func.code;
        var type = env.parent.type(code);
        if (type === 'native') {
            return env.parent.tailcall(code, env, [env2], cb);
        }
        return env.parent.tailcall(env.parent.eval, env, [env2, code], cb);
    });
}};
O.newEnv = { parent: O, args: ['func', 'args', 'env', 'cc'], code: function (cb, env) {
    var env2 = env.parent.newObj();
    env2.scope = env2;
    // If func has no parent, then assume it is a nested code-block and inherit from the current execution scope:
    env2.parent = env.func.parent || env.env;
    if (env.func.parent) {
        // Nested blocks inherit (i.e. do not override) these properties of their parent scope:
        env2.caller = env.env;
        env2.thisFunc = env.func;
        env2.return = {
            parent: { parent: env.parent, cc: env.cc, env: env.env },
            code: function (cb, env) { return env.parent.parent.tailcall(env.parent.cc, env.parent.env, env.args); }
        };
    }
    var argNames = env.func.args;
    return env.parent.tailcall(env.parent.each, env, [argNames, function(cb, i, aName) {
        var nType = env.parent.type(aName);
        if (nType !== 'string') {
            return env.parent.tailcall(cb, env, []);
        }
        var aValue = env.args[i];
        env2[aName] = aValue;
        return env.parent.tailcall(cb, env, [aValue]);
    }], function() {
        env2.args = env.args;
        return env.parent.tailcall(cb, env, [env2]);
    });
}};
O.getArgs = { parent: O, args: ['func', 'args', 'env'], code: function(cb, env) {
    return env.parent.tailcall(env.parent.each, env, [env.args, function(cb, i, argExpr) {
        return env.parent.tailcall(env.parent.eval, env, [env.env, argExpr], function(argVal) {
            env.args[i] = argVal;
            return env.parent.tailcall(cb, env, []);
        });
    }], function() {
        return env.parent.tailcall(cb, env, [env.args]);
    });
}};

//TODO: 1. Compile this compile function (by running it on itself) to generate a CPS-version of it.
//      2. Re-write the above functions as objects, and run this to generate the native code.
O.compile = function compile(code) {
    if (O.type(code) === 'object') {
        if (O.type(code.code) === 'array') { code.src = code.code; }
        code.code = compile(code.src);
        return code;
    }
    if (O.type(code) !== 'array') { return null; }
    var calls = [];
    function getCalls(code) {
        if (O.type(code) !== 'array' || code.length < 1) { return code; }
        var last = [];
        for(var i = 0; i < code.length; i++) {
            var a = code[i];
            if (O.type(a) === 'array') {
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
        var t = O.type(c[0]);
        var s = "return O.tailcall(" + (
            (t !== 'string') ? "r" + c[0] :
            (c[0].charAt(0) === '"') ? "O.lookup, env, [env.env, " + c[0] + "], function (f) {\nreturn O.tailcall(f" :
            c[0]
        ) + ", env, [";
        for(var i = 1; i < c.length; i++) {
            s += (i > 1 ? ", " : "") + (O.type(c[i]) === 'number' ? "r" : "") + c[i];
        }
        src = s + "], " +
            (src.length < 1 ? "cb);" : "function(r" + calls.length + ") {\n" + src + "\n});") +
            (t === "string" && c[0].charAt(0) === '"' ? "\n});" : "");
    }
    return eval('(function(cb, env) {\n' + src + '\n})');
};

// ------------------------------------------ //
// TEMPORARY HOOKS FOR TESTING PURPOSES ONLY: //
// ------------------------------------------ //

window.Test = function (env, expr, cb) {
    cb = arguments[arguments.length - 1];
    if (typeof cb !== 'function') {
        cb = function (v) {
            if (O.type(v) === 'object') {
                var v2 = {};
                Object.keys(v).forEach(function(k){ v2[k] = v[k]; });
                v = v2;
            }
            var s = '' + v;
            try { s = JSON.stringify(v) || s; } catch(e) { }
            console.log("  --> " + s);
            return v;
        };
    }
    if (typeof env !== 'object' || !env) { env = O; }
    //Wrapping expr in a function allows return to work properly at the root level:
    O.invoke(O.tailcall(O.apply, env, [{parent:env, code:expr}, [], env], cb));
};
window.RunTests = function(tests) {
    tests = tests || window.Tests;
    console.log("Running tests:");
    for(var i = 0; i < tests.length; i++) {
        console.log("Test(null, " + tests[i] + ")");
        var result = null;
        try { window.Test(null, eval(tests[i])); }
        catch(e) { console.log("  !!! " + e) }
    }
};
window.Tests = [
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
    "['set', ['lookup', null, 'root'], 'def', function(k,v){if(Objects.type(v) === 'object' && !v.parent){v.parent=Objects;}Objects[k]=v;return v;}]",
    "['lookup', null, 'foo']",
    "['def', 'foo', 'IAmFoo']",
    "['lookup', null, 'foo']",
    "['+', 1, 2, 3, 4]",
    "['-', 43, 21]",
    "['*', 1, 2, 3, 4]",
    "['/', 128, 16]",
    "['def', 'alert', function(msg){alert(msg);}]",
    "['def', 'say', function(msg){document.body.innerHTML += ('<p>'+msg+'</p>'); return msg;}]",
    "['say', 'Howdy!']",
    "['def', 'debug', function(v){debugger;return v;}]",
    "['say', \"Try this: Test(null, ['debug', 123])\"]",
    "['say', \"Try this: Test(null, ['debug', ['+', 1, 2]])\"]",
    "['say', \"Try this: Test(null, ['+', ['debug', 1], ['debug', 2]])\"]",
    "['def', 'again', {code:function(cb, env){var r = env.parent.tailcall(cb, env, env.args); env.parent.invoke(r); return r;}}]",
    "['again', 'again']",
    "['say', ['again', 'Testing \"say again\"']]",
    "['again', ['say', 'Testing \"again say\"']]",
    "['def', 'window', window]",
    "['def', '.', function(v){for(var i=1; i<arguments.length;i++){v=v[arguments[i]];}return v;}]",
    "['def', 'clear', {code:['assign', null, 'window', 'document', 'body', 'innerHTML', '']}]",
    "['def', 'refresh', {code:['set', ['.', ['lookup', null, 'window'], 'location'], 'href', ['.', ['lookup', null, 'window'], 'location', 'href']]}]",
    "['def', 'browse', {args:['url','w','h'],code:[['lookup', null, 'window', 'open'], ['lookup', null, 'url'], '_blank', ['+', 'top=', ['/', ['-', ['lookup', null, 'window', 'screen', 'height'], ['lookup', null, 'h']], 2], ',left=', ['/', ['-', ['lookup', null, 'window', 'screen', 'width'], ['lookup', null, 'w']], 2], ',width=', ['lookup', null, 'w'], ',height=', ['lookup', null, 'h'], ',menubar=0,toolbar=0,location=0']]}]",
    "['get', ['lookup', null, 'window'], 'document']",
    "['set', ['lookup', null, 'window'], 'document', 'body', 'style', 'backgroundColor', '#CCDDFF']",
    "['assign', null, 'window', 'document', 'body', 'style', 'fontWeight', 'bold']",
    "['assign', null, 'window', 'document', 'body', 'style', 'color', '#0000DD']",
    "['say', \"Try this: Test(null, ['browse', 'https://github.com/d-cook/Objects', 1000, 750])\"]",
    "['say', \"Try this: Test(null, ['refresh'])\"]",
    "['say', \"Try this: Test(null, ['clear'])\"]",
    "['def', 'list', {code:['lookup', null, 'args']}]",
    "['list', 1, [2, 3], 'four', {five:6}]",
    "['+', 1, 2, 3, ['return', 4], 5]",
    "['def', 'ret5', {args:['a','b'], code:['+', ['lookup', null, 'a'], ['lookup', null, 'b'], ['return', 5]]}]",
    "['ret5', 1, 2]",
    "['+', 3, 4, ['ret5', 1, 2], 5]",
    "['+', 3, ['return', 4], ['ret5', 1, 2], 5]",
    "['+', 3, 4, ['rets5', 1, 2], ['return', 6]]",
    "['def', 'id', {args:['x'],code:['lookup', null, 'x']}]",
    "['if', ['<', 5, 7], {code:['id', 'T']}, {code:['id', 'F']}]",
    "['if', ['<', 7, 5], {code:['id', 'T']}, {code:['id', 'F']}]",
    "['def', 'recur', {args:['x'],code:['if', ['<', ['lookup', null, 'x'], 10], ['lambda', [], ['list', ['lookup', null, 'thisFunc'], ['list', '*', ['lookup', null, 'x'], 2]]], ['lambda', [], ['list', 'lookup', null, 'x']]]}]",
    "['recur', 1]",
    "['recur', 2]",
    "['recur', 3]",
    "['recur', 4]",
    "['recur', 5]",
    "['def', 'recur', {args:['x'],code:['if', ['<', ['lookup', null, 'x'], 10], {code:['thisFunc', ['*', ['lookup', null, 'x'], 2]]}, {code:['lookup', null, 'x']}]}]",
    "['recur', 1]",
    "['recur', 2]",
    "['recur', 3]",
    "['recur', 4]",
    "['recur', 5]",
    "['def', 'object', {args:['keys','values'],code:function(cb, env){var o = env.parent.newObj();for(var i=0; i < env.keys.length; i++){o[env.keys[i]] = (env.values&&env.values[i]);}return env.parent.tailcall(cb,env,[o]);}}]",
    "['object', ['list', 'a', 'b', 'c'], []]",
    "['object', ['list', 'a', 'b', 'c'], ['list', 1, 2]]",
    "['object', ['list', 'a', 'b', 'c'], ['list', 1, 2, 3, 4]]",
    "[['lambda', ['list', 'x'], ['list', '+', 2, ['list', 'lookup', null, 'x']]], 5]",
    "['def', '+n', {args:['n'],code:['lambda', ['list', 'x'], ['list', '+', ['list', 'lookup', null, 'n'], ['list', 'lookup', null, 'x']]]}]",
    "['def', '+_n', {args:['n'],code:['lambda', ['list', 'x'], ['list', '+', ['lookup', null, 'n'], ['list', 'lookup', null, 'x']]]}]",
    "['lookup', null, '+n', 'code']",
    "['lookup', null, '+_n', 'code']",
    "[['+n', 3], 7]",
    "[['+_n', 4], 5]",
    "['def', '+4', ['+n', 4]]",
    "['def', '+_4', ['+_n', 4]]",
    "['+4', 4]",
    "['+_4', 7]",
    "['lookup', null, '+4', 'code']",
    "['lookup', null, '+_4', 'code']",
    "[{parent:{parent:Objects,x:7}, code:['lookup', null, 'x']}]",
    "[{parent:{parent:Objects,x:7}, code:['if', true, {code:['say', ['+', 'True! X is: ', ['lookup', null, 'x']]]}, {code:['say', 'Uhoh! This code should NOT have been evaled!']}]}]",
    "[{parent:{parent:Objects,x:7}, code:['if', false, {code:['say', 'Uhoh! This code should NOT have been evaled!']}, {code:['say', ['+', 'False! X is: ', ['lookup', null, 'x']]]}]}]",
    "['loop', 4, {args:['i'],code:['say', ['+', 'loop 4: ', ['lookup', null, 'i']]]}]",
    "['loop', 1, 4, {args:['i'],code:['say', ['+', 'loop 1,4: ', ['lookup', null, 'i']]]}]",
    "['loop', 1, 4, 2, {args:['i'],code:['say', ['+', 'loop 1,4,2: ', ['lookup', null, 'i']]]}]",
    "['loop', -3, {args:['i'],code:['say', ['+', 'loop -3: ', ['lookup', null, 'i']]]}]",
    "['loop', 1, -3, {args:['i'],code:['say', ['+', 'loop 1,-3: ', ['lookup', null, 'i']]]}]",
    "['loop', 1, -3, -2, {args:['i'],code:['say', ['+', 'loop 1,-3,-2: ', ['lookup', null, 'i']]]}]",
    "['each', ['list', 11, 22, 33, 44], {args:['k', 'v'],code:['say', ['+', '(11, 22, 33, 44)[', ['lookup', null, 'k'], '] is ', ['lookup', null, 'v']]]}]",
    "['each', ['lookup', null, 'root'], {args:['k', 'v'],code:['say', ['+', ['type', ['lookup', null, 'v']], ': ', ['lookup', null, 'k']]]}]",
    "['say', ['+', '+_4 is: ', ['type', ['lookup', null, '+_4']]]]",
    "['remove', null, '+_4']",
    "['say', ['+', '+_4 has been removed, and now is: ', ['type', ['lookup', null, '+_4']]]]",
    "['do', ['set', null, 'x', 5], ['set', null, 'y', 10], ['+', ['lookup', null, 'x'], ['lookup', null, 'y']]]",
    "['do']", // Simulating an empty block of code
    "['with', {a:1, b:2, c:3}, {args:['o'], code:['set', ['lookup', null, 'o'], 'x', 5]}]",
    "['with', {a:1, b:2, c:3}, 'y', 7]",
    "['with', {a:1, b:{x:{y:{}}}, c:3}, 'b', 'x', 'y', 'z', 2]",
    "['with', {a:1, b:{x:{y:{}}}, c:3}, 'b', 'x', 3]",
    "['def', 'do', {code:['get', ['lookup', null, 'args'], ['-', ['len', ['lookup', null, 'args']], 1]]}]",
    "['do', ['set', null, 'x', 5], ['set', null, 'y', 10], ['+', ['lookup', null, 'x'], ['lookup', null, 'y']]]",
    "['do']", // Simulating an empty block of code

    // TESTING COMPILATION (by re-coding "do", and recompiling it back):

    "['def', 'test-compile', {args:['code'],code:['get', ['compile', ['lookup', null, ['lookup', null, 'code']]], 'code']}]",
    "['test-compile', 'do']",
    "['do', ['set', null, 'x', 5], ['set', null, 'y', 10], ['+', ['lookup', null, 'x'], ['lookup', null, 'y']]]",
    "['do']", // Simulating an empty block of code
    "['test-compile', 'recur']",
    "['test-compile', 'recur']", // Compile twice to verify that src gets set properly so that re-compile works properly
    "['recur', 1]",
    "['recur', 2]",
    "['recur', 3]",
    "['recur', 4]",
    "['recur', 5]",
    "['test-compile', 'list']",
    "['list', 'a', 'b', 'c', 1, 2, 3]",
    "['get', ['compile', {args:['x','y'],code:['+', ['lookup', null, 'x'], ['lookup', null, 'y']]}], 'src']",
    "['get', ['compile', {args:['x','y'],code:['+', ['lookup', null, 'x'], ['lookup', null, 'y']]}], 'code']",
    "[['compile', {args:['x','y'],code:['+', ['lookup', null, 'x'], ['lookup', null, 'y']]}], 5, 7]",
    "[['compile', {code:['if', true, {code:['id', 'TRUE!']}, {code:['id', 'FALSE!']}]}]]",
    "[['compile', {code:['if', false, {code:['id', 'TRUE!']}, {code:['id', 'FALSE!']}]}]]"
];
window.RunTests();

}());