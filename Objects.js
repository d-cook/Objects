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
O.tailcall = function (func, env, args, cb) {
    // NOTE: this function references external entities: type, eval
    // TODO: Optimize the case for evaling a call to eval.
    if (O.type(env) === 'array') { cb = args; args = env; env = null; }
    var ft = O.type(func);
    if (ft === 'native') {
        var allArgs = cb ? [cb] : [];
        allArgs.push.apply(allArgs, args);
        return { func: func, args: allArgs };
    }
    if (ft !== 'object') { return null; }
    if (O.type(func.body) === 'native') {
        var env2 = {
            thisFunc: func,
            parent: func.parent || null,
            caller: env || null,
            args: args
        };
        env2.scope = env2;
        if (func.args) {
            for (var i = 0; i < func.args.length; i++) {
                env2[func.args[i]] = args[i];
            }
        }
        return { func: func.body, args: [cb, env2] };
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
    return { func: O.eval.body, args: [cb, env2] };
};
O.invoke = function (tc) { // tailcall
    while(tc && tc.func) { tc = tc.func.apply(null, tc.args || []); }
};

O.newObj = function () { return Object.create(null); };
O.hasOwn = function (o, p) { return o ? (p in o) : false; };
O.keys   = function (o) { return Object.keys(o||{}) || []; };
O.len    = function (o) { return(Object.keys(o||{}) || []).length; };
O.not    = function (v) { return !v; };

// TODO: Correct usages of these ops to reflect changed argument(s) (e.g. ['+',[1,2,3]] instead of ['+',1,2,3])
O['+']  = function (args) { var r = args[0]; for(var i=1; i<args.length; i++) {       r +=      args[i];                 } return r;    };
O['-']  = function (args) { var r = args[0]; for(var i=1; i<args.length; i++) {       r -=      args[i];                 } return r;    };
O['*']  = function (args) { var r = args[0]; for(var i=1; i<args.length; i++) {       r *=      args[i];                 } return r;    };
O['/']  = function (args) { var r = args[0]; for(var i=1; i<args.length; i++) {       r /=      args[i];                 } return r;    };
O.mod   = function (args) { var r = args[0]; for(var i=1; i<args.length; i++) {       r %=      args[i];                 } return r;    };
O['=']  = function (args) { var r = args[0]; for(var i=1; i<args.length; i++) { if ( (r !==(    args[i]))) return false; } return true; };
O['<']  = function (args) { var r = args[0]; for(var i=1; i<args.length; i++) { if (!(r <  (r = args[i]))) return false; } return true; };
O['>']  = function (args) { var r = args[0]; for(var i=1; i<args.length; i++) { if (!(r >  (r = args[i]))) return false; } return true; };
O['<='] = function (args) { var r = args[0]; for(var i=1; i<args.length; i++) { if (!(r <= (r = args[i]))) return false; } return true; };
O['>='] = function (args) { var r = args[0]; for(var i=1; i<args.length; i++) { if (!(r >= (r = args[i]))) return false; } return true; };
O.and   = function (args) { var r = args[0]; for(var i=0; i<args.length; i++) { if (!(     (r = args[i]))) return r;     } return r;    };
O.or    = function (args) { var r = args[0]; for(var i=0; i<args.length; i++) { if ( (     (r = args[i]))) return r;     } return r;    };

O.type = function (o) {
    var t = (typeof o);
    if (t === 'undefined' || o === null) { return 'null'; }
    if (t === 'function') { return 'native'; }
    var s = Object.prototype.toString.call(o);
    return (s === '[object Array]' || s === '[object Arguments]') ? 'array' : t;
};
O.has = { parent: O, args: ['obj', 'prop'], body: function (cb, env) {
    var p = (env.parent.type(env.prop) === 'array') ? env.prop : [env.prop];
    var last = p.pop();
    if (p.length > 0) {
        return env.parent.tailcall(env.parent.get, env, [env.obj, p], function(obj) {
            return env.parent.tailcall(env.parent.has, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.parent;
    var h = env.parent.hasOwn(obj, last);
    return env.parent.tailcall(cb, env, [h]);
}};
O.get = { parent: O, args: ['obj', 'prop'], body: function (cb, env) {
    var p = (env.parent.type(env.prop) === 'array') ? env.prop : [env.prop];
    var last = p.pop();
    if (p.length > 0) {
        return env.parent.tailcall(env.parent.get, env, [env.obj, p], function(obj) {
            return env.parent.tailcall(env.parent.get, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.parent;
    var h = env.parent.hasOwn(obj, last);
    return env.parent.tailcall(cb, env, [h ? obj[last] : null]);
}};
O.set = { parent: O, args: ['obj', 'prop', 'value'], body: function (cb, env) {
    var p = (env.parent.type(env.prop) === 'array') ? env.prop : [env.prop];
    var last = p.pop();
    if (p.length > 0) {
        return env.parent.tailcall(env.parent.get, env, [env.obj, p], function(obj) {
            return env.parent.tailcall(env.parent.set, env, [obj, last, val], cb);
        });
    }
    var obj = env.obj || env.caller;
    var t = env.parent.type(obj);
    if (t === 'object' || t === 'array') { obj[last] = env.value; }
    return env.parent.tailcall(cb, env, [env.value]);
}};
O.exists = { parent: O, args: ['obj', 'prop'], body: function (cb, env) {
    var p = (env.parent.type(env.prop) === 'array') ? env.prop : [env.prop];
    var last = p.pop();
    if (p.length > 0) {
        return env.parent.tailcall(env.parent.lookup, env, [env.obj, p], function(obj) {
            return env.parent.tailcall(env.parent.exists, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.caller;
    var h = env.parent.hasOwn(obj, last);
    if (h) { return env.parent.tailcall(cb, env, [true]); }
    h = env.parent.hasOwn(obj, 'parent');
    if (!h) { return env.parent.tailcall(cb, env, [false]); }
    return env.parent.tailcall(env.parent.exists, env, [obj.parent, last], cb);
}};
O.lookup = { parent: O, args: ['obj', 'prop'], body: function (cb, env) {
    var p = (env.parent.type(env.prop) === 'array') ? env.prop : [env.prop];
    var last = p.pop();
    if (p.length > 0) {
        return env.parent.tailcall(env.parent.lookup, env, [env.obj, p], function(obj) {
            return env.parent.tailcall(env.parent.lookup, env, [obj, last], cb);
        });
    }
    var obj = env.obj || env.caller;
    var h = env.parent.hasOwn(obj, last);
    if (h) { return env.parent.tailcall(cb, env, [obj[last]]); }
    h = env.parent.hasOwn(obj, 'parent');
    if (!h) { return env.parent.tailcall(cb, env, [null]); }
    return env.parent.tailcall(env.parent.lookup, env, [obj.parent, last], cb);
}};
O.assign = { parent: O, args: ['obj', 'prop', 'value'], body: function (cb, env) {
    var p = (env.parent.type(env.prop) === 'array') ? env.prop : [env.prop];
    var last = p.pop();
    if (p.length > 0) {
        return env.parent.tailcall(env.parent.lookup, env, [env.obj, p], function(obj) {
            return env.parent.tailcall(env.parent.assign, env, [obj, last, env.value], cb);
        });
    }
    var obj = env.obj || env.caller;
    var t = env.parent.type(obj);
    if (t === 'object' || t === 'array') { obj[last] = env.value; }
    return env.parent.tailcall(cb, env, [env.value]);
}};
O.copy = { parent: O, args: ['obj'], body: function (cb, env) {
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
O.if = { parent: O, args: ['cond', 'T', 'F'], body: function (cb, env) {
    var f = (env.cond ? env.T : env.F);
    if (f) { return env.parent.tailcall(env.parent.eval, env.caller, [f], cb); }
    return env.parent.tailcall(cb, env, [f]);
}};
O.loop = { parent: O, args: ['bounds', 'code', 'value'], body: function(cb, env) {
    // bounds: [] | [end] | [start, end] | [start, end, inc] | ['var', ..(any previous)..]
    var b = env.bounds;
    if (env.parent.type(b) !== 'array') { b = [b]; }
    var i = (b.length > 0 && env.parent.type(b[0]) === 'string') ? ''+b.shift() : 'i';
    var start = (b.length > 1) ? b[0] : 0;
    var end = (b.length === 1) ? b[0] : (b.length > 1) ? b[1] : 0;
    var inc = (b.length > 2) ? b[2] : (b.length < 3 && start > end) ? -1 : 1;
    if ((inc > 0 && start < end) || (inc < 0 && start > end)) {
        return env.parent.tailcall(env.parent.nestedEnv, env, [env.caller], function(env2) {
            env2[''+i] = start;
            return env.parent.tailcall(env.parent.eval, env, [env2, env.code], function(v) {
                return env.parent.tailcall(env.parent.loop, env, [[i, start+inc, end], env.code, v], cb);
            });
        });
    }
    return env.parent.tailcall(cb, env, [env.value]);
}};
// TODO: Correct usages of each to match the changed arguments (e.g. code is now a block instead of a func):
O.each = { parent: O, args: ['vars', 'container', 'code'], body: function(cb, env) {
    // vars: [] | [v] | [k, v]
    var v = (env.parent.type(env.vars) === 'array') ? env.vars : [env.vars];
    var k = (v.length > 1) ? v[0] : 'k';
    v = (v.length > 0) ? v.pop() : 'v';
    var c = env.container;
    var t = env.parent.type(c);
    if (t !== 'object' && t !== 'array') {
        return env.parent.tailcall(cb, env, [null]);
    }
    function result(code, len) {
        code.push.apply(code, ['set', null, [v], 'get', c, [k]]);
        code.push.apply(code, env.code);
        // Have to spoof env.caller so that nestedEnv gets created for caller of each:
        return env.parent.tailcall(env.parent.loop, env.caller, [[k, 0, len], code], cb);
    }
    if (t === 'array') { return result([], c.length); }
    return env.parent.tailcall(env.parent.keys, env, [c], function(keys) {
        return result(['set', null, [k], 'get', keys, 'get', null, [k]], keys.length);
    });
}};
O.lambda = { parent: O, args: ['argList', 'body'], body: function (cb, env) {
    var f, t = env.parent.type(env.body);
    if (t === 'object') { f = env.body; }
    else {
        f = env.parent.newObj();
        f.body = env.body;
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

// Eval functions:

//TODO: Use the following example for parsing a REBOL expression, to update O.eval to do likewise:
var proc = function(code) {
    var i = 0;
    var e = {a:1,b:2,c:3};
    return (function next() {
        var op = code[i++];
        if (!e[op]) { return op; }
        var res = [op];
        for(var j=0; j<e[op]; j++) { res.push(next()); }
        return res;
    }());
}
//TODO: And this can be used to get the length of a function (does not work on browser-native
//      funcs, so for those you may need to call ['apply', func, [args]]):
var funLen = function(func) { return ('' + func).replace(/^[^\(]+\(|\).*$/gi, '').split(',').length; };
//TODO: And because all strings are interpreted as commands, the following is needed to prevent that:
O.str = function(list) { return list && list[0] || ''; }; // ['str', ['value']]

O.eval = { parent: O, args: ['env', 'expr'], body: function (cb, env) {
    // TODO: expr may now be a block containing MULTIPLE expressions. If so, then lookup the function in
    //       the first position to determine how many arguments to take. Repeat from the next position.
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
O.apply = { parent: O, args: ['func', 'args', 'env'], body: function (cb, env) {
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
        var body = env.func.body;
        var type = env.parent.type(body);
        if (type === 'native') {
            return env.parent.tailcall(body, env, [env2], cb);
        }
        // TODO: Revisit how this applies to blocks
        return env.parent.tailcall(env.parent.eval, env, [env2, body], cb);
    });
}};
O.nestedEnv = { parent: O, args: ['env'], body: function (cb, env) {
    return env.parent.tailcall(env.parent.copy, env, [env.env], function(env2) {
        env2.parent = env.env;
        return env.parent.tailcall(cb, env, [env2]);
    });
}};
O.newEnv = { parent: O, args: ['func', 'args', 'env', 'cc'], body: function (cb, env) {
    var env2 = env.parent.newObj();
    env2.scope = env2;
    env2.caller = env.env;
    env2.parent = env.func.parent;
    env2.thisFunc = env.func;
    env2.return = {
        parent: { parent: env.parent, cc: env.cc, env: env.env },
        body: function (cb, env) { return env.parent.parent.tailcall(env.parent.cc, env.parent.env, env.args); }
    };
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
O.getArgs = { parent: O, args: ['func', 'args', 'env'], body: function(cb, env) {
    return env.parent.tailcall(env.parent.each, env, [env.args, function(cb, i, argExpr) {
        return env.parent.tailcall(env.parent.eval, env, [env.env, argExpr], function(argVal) {
            env.args[i] = argVal;
            return env.parent.tailcall(cb, env, []);
        });
    }], function() {
        return env.parent.tailcall(cb, env, [env.args]);
    });
}};

//TODO: Reform this to work with the new REBOL-style syntax & semantics.
//TODO: 1. Compile this compile function (by running it on itself) to generate a CPS-version of it.
//      2. Re-write the above functions as objects, and run this to generate the native code.
O.compile = function(code) {
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
        var t = getType(c[0]);
        var s = "return window.Objects.tailcall(" + (
            (t !== 'string') ? "r" + c[0] :
            (c[0].charAt(0) === '"') ? "window.Objects.lookup, env, [env.env, " + c[0] + "], function (f) {\rreturn window.Objects.tailcall(f" :
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
    O.invoke(O.tailcall(O.apply, env, [{parent:env, body:expr}, [], env], cb));
};

// TODO: Reform these tests to the new REBOL-style syntax & semantics
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
    "['get', {x:'xVal'}, ['x']]",
    "['get', {x:{y:{z:'xyz'}}}, ['x', 'y', 'z']]",
    "['get', {x:{parent:{y:{z:'xyz'}}}}, ['x', 'y', 'z']]",
    "['lookup', {w:1,x:'IAmX'}, ['x']]",
    "['lookup', {w:1,parent:{x:'IAmParentX'}}, ['x']]",
    "['lookup', {w:1,parent:{parent:{x:'IAmParentParentX'}}}, ['x']]",
    "['lookup', {x:{parent:{y:{z:'xyz'}}}}, ['x', 'y', 'z']]",
    "['set', 'root', ['def'], function(k,v){if(Objects.type(v) === 'object' && !v.parent){v.parent=Objects;}Objects[k[0]]=v;return v;}]",
    "['foo']",
    "['def', ['foo'], 'str', ['IAmFoo']]",
    "['foo']",
    "['+', 1, 2, 3, 4]",
    "['-', 43, 21]",
    "['*', 1, 2, 3, 4]",
    "['/', 128, 16]",
    "['def', ['alert'], function(msg){alert(msg);}]",
    "['def', ['say'], function(msg){document.body.innerHTML += ('<p>'+msg+'</p>'); return msg;}]",
    "['say', 'str', ['Howdy!']]",
    "['def', ['debug'], function(v){debugger;return v;}]",
    "['say', 'str', ['Try this: Test(null, [\\'debug\\', 123])']]",
    "['say', 'str', ['Try this: Test(null, [\\'debug\\', '+', 1, 2])']]",
    "['say', 'str', ['Try this: Test(null, [\\'+\\', \\'debug\\', 1, \\'debug\\', 2])']]",
    "['def', ['again'], {body:function(cb, env){var r = env.parent.tailcall(cb, env, env.args); env.parent.invoke(r); return r;}}]",
    "['again', 'str', ['again']]",
    "['say', 'again', 'str', ['Testing \"say again\"']]",
    "['again', 'say', 'str', ['Testing \"again say\"']]",
    "['def', ['window'], window]",
    "['def', ['clear'], {body:['assign', 'window', ['document', 'body', 'innerHTML'], 'str', ['']}]",
    "['def', ['refresh'], {body:['set', 'window', ['location', 'href'], 'lookup', 'window', ['location', 'href']]}]",
    "['def', ['browse'], {args:['url','w','h'],body:['lookup', 'window', ['open'], 'url', 'str', ['_blank'], '+', 'str', ['top='], '/', '-', 'lookup', 'window', ['screen', 'height'], 'h', 2, '+', 'str', [',left='], '/', '-', 'lookup', 'window', ['screen', 'width'], 'w', 2, '+', 'str', [',width='], 'w', '+', 'str', [',height='], 'h', 'str', [',menubar=0,toolbar=0,location=0']]}]",
    "['get', 'window', ['document']]",
    "['set', 'window', ['document', 'body', 'style', 'backgroundColor'], 'str', ['#CCDDFF']]",
    "['assign', 'window', ['document', 'body', 'style', 'fontWeight'], 'str', ['bold']]",
    "['assign', 'window', ['document', 'body', 'style', 'color'], 'str', ['#0000DD']]",
    "['say', 'str', ['Try this: Test(null, [\\'browse\\', \\'str\\', [\\'https://github.com/d-cook/Objects\\'], 1000, 750])']]",
    "['say', 'str', ['Try this: Test(null, [\\'refresh\\'])']]",
    "['say', 'str', ['Try this: Test(null, [\\'clear\\'])']]",
    "['+', 1, 2, 3, 'return', 4, 5]",
    "['def', ['ret5'], {args:['a','b'], body:['+', 'a', '+', 'b', 'return', 5]}]",
    "['ret5', 1, 2]",
    "['+', 3, 4, 'ret5', 1, 2, 5]",
    "['+', 3, 'return', 4, 'ret5', 1, 2, 5]",
    "['+', 3, 4, 'rets5', 1, 2, 'return', 6]",
    "['if', '<', 5, 7, ['str', ['T']], ['str', ['F']]]",
    "['if', '<', 7, 5, ['str', ['T']], ['str', ['F']]]",
    "['def', ['recur'], {args:['x'],body:['if', '<', 'x', 10, ['lookup', 'parent', ['thisFunc'], '*', 'x', 2], ['x']]}]",
    "['recur', 1]",
    "['recur', 2]",
    "['recur', 3]",
    "['recur', 4]",
    "['recur', 5]",
    "['def', ['object'], {args:['keys','values'],body:function(cb, env){var o = env.parent.newObj();for(var i=0; i < env.keys.length; i++){o[env.keys[i]] = (env.values&&env.values[i]);}return env.parent.tailcall(cb,env,[o]);}}]",
    "['object', ['a', 'b', 'c'], []]",
    "['object', ['a', 'b', 'c'], [1, 2]]",
    "['object', ['a', 'b', 'c'], [1, 2, 3, 4]]",
    "['lambda', ['x'], ['+', 2, 'x'], 5]",
    "['def', ['+n'], {args:['n'],body:['lambda', ['x'], ['+', 'n', 'x']]}]",
    //"['def', ['+_n'], {args:['n'],body:['lambda', ['x'], 'list', ['str', ['+'], 'n', 'str', ['x']]]}]",
    "['lookup', null, ['+n', 'body']]",
    //"['lookup', null, ['+_n', 'body']]",
    "['+n', 3, 7]",
    //"['+_n', 4, 5]",
    "['def', ['+4'], '+n', 4]",
    //"['def', ['+_4'], '+_n', 4]",
    "['+4', 4]",
    //"['+_4', 7]",
    "['lookup', null, ['+4', 'body']]",
    //"['lookup', null, ['+_4', 'body']]"
]));

}());
