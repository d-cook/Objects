(function() {

// The "root" object of the whole system:
var O = window.Objects = Object.create(null);
O.root = O;

// Functions that must be native-defined:

O.has    = function (o, p   ) { return o ? (p in o) : false; };
O.get    = function (o, p   ) { return O.has(o, p) ? o[p] : null; };
O.set    = function (o, p, v) { var t = O.type(o); if (t === 'object' || t === 'array') { o[p] = v; } return v; };
O.delete = function (o, p   ) { var v = (O.has(o, p) ? o[p] : null); delete o[p]; return v; };

O.type = function (o) {
    var t = (typeof o);
    if (t === 'undefined' || o === null) { return 'null'; }
    if (t === 'function') { return 'native'; }
    var s = Object.prototype.toString.call(o);
    return (s === '[object Array]' || s === '[object Arguments]') ? 'array' : t;
};

O.if = { parent: O, args: ['cond', 'T', 'F'], code: function (cb, env) {
    return O.tailcall((env.cond ? env.T : env.F), env.caller, [env.cond], cb);
}};

O.newObj = function ( ) { return Object.create(null); };
O.keys   = function (o) { return Object.keys(o||{}) || []; };
O.length = function (o) { return(Object.keys(o||{}) || []).length; };
O.falsey = function (v) { return !v && v !== 0 && v !== ''; };
O.truthy = function (v) { return  v || v === 0 || v === ''; };
O.not    = function (v) { return O.falsey(v); };

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
O.and   = function () { var r = arguments[0]; for(var i=0; i<arguments.length; i++) { if (O.falsey(r = arguments[i])) return r;     } return r;    };
O.or    = function () { var r = arguments[0]; for(var i=0; i<arguments.length; i++) { if (O.truthy(r = arguments[i])) return r;     } return r;    };

O.slice   = function (a,s,e) { return (O.type(a) !== 'array') ? null : [].slice  .apply(a, [].slice.call(arguments, 1)); };
O.push    = function (a    ) { return (O.type(a) !== 'array') ? null : [].push   .apply(a, [].slice.call(arguments, 1)); };
O.unshift = function (a    ) { return (O.type(a) !== 'array') ? null : [].unshift.apply(a, [].slice.call(arguments, 1)); };
O.pop     = function (a    ) { return (O.type(a) !== 'array') ? null : [].pop    .apply(a); };
O.shift   = function (a    ) { return (O.type(a) !== 'array') ? null : [].shift  .apply(a); };

// These tailcall and invoke functions drive execution of all wrapped functions, which
// run in CPS (Continuation Passing Style) (i.e. return execution/values via callbacks)
O.tailcall = function tailcall(func, env, args, cb) {
    // NOTE: this function references external entities: type, eval
    // TODO: Optimize the case for evaling a call to eval.
    if (O.type(env) === 'array') { cb = args; args = env; env = null; }
    var ft = O.type(func);
    if (ft !== 'object') {
        if (ft !== 'native') { func = (function(value){return function(){return value;}})(func); }
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
            arguments: args
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
    // Otherwise call apply on the func object:
    var env2 = {
        thisFunc: O.apply,
        parent: O.apply.parent,
        caller: env || null,
        arguments: [func, args, env],
        func: func,
        args: args,
        env: env
    };
    env2.scope = env2;
    return { func: O.apply.code, args: [cb, env2] };
};
O.invoke = function (tc) { // tailcall
    while(tc && tc.func) { tc = tc.func.apply(null, tc.args || []); }
};

//TODO: 1. Compile the compile function (by running it on itself) to generate a CPS-version of it.
//      2. Re-write the above functions as objects, and run this to generate the native code.
O.compilers = {};
O.compilers.js = {
    compile: function compile(code, innerOffset) {
        if (O.type(code) === 'object') {
            var src = O.type(code.code) === 'array' ? code.code :
                      O.type(code.src ) === 'array' ? code.src  : null;
            var cc = { code: (src && compile(src, innerOffset)) };
            if (!cc.code) { return null; }
            for(p in code) {
                if (p !== 'src' && p !== 'code') {
                    cc[p] = code[p];
                }
            }
            if (!innerOffset) { cc.src = src; }
            if (O.type(code.args) === 'array') {
                cc.args = [];
                cc.args.push.apply(cc.args, code.args);
            }
            return cc;
        }
        var src = O.compilers.js.compileSrc(code, innerOffset || 0);
        return src && eval('(function(cb, env) {\n' + (innerOffset ? '' : 'var args = env;\n') + src + '\n})');
    },
    compileSrc: function(code, innerOffset) {
        if (O.type(code) !== 'array') { return null; }
        var calls = O.compilers.js.getCalls(code, [], innerOffset);
        return O.compilers.js.buildCalls(calls, innerOffset);
    },
    getCalls: function getCalls(code, calls, innerOffset) {
        calls = calls || [];
        if (O.type(code) !== 'array' || code.length < 1) { return calls; }
        var last = [];
        for(var i = 0; i < code.length; i++) {
            var c = code[i];
            last.push(O.type(c) === 'array'
                ? getCalls(c, calls, innerOffset).length - 1 + innerOffset
                : { value: c }
            );
        }
        calls.push(last);
        return calls;
    },
    buildCalls: function(calls, innerOffset) {
        var src = '';
        for(var idx = calls.length - 1; idx >= 0; idx--) {
            var c = calls[idx];
            if (O.type(c) !== 'array') { return src; }
            for(var i = 0; i < c.length; i++) {
                var v = c[i] && c[i].value;
                if (v && v.code && !O.compilers.js.globalStr(v)) {
                    c[i].value = O.compilers.js.compile(v, calls.length - 1 + innerOffset);
                }
            }
            var f = (c.length > 2 && c[1] && c[1].value === null && c[0] && c[0].value);
            if (f && (f === O.lookup || f === O.assign || f === O.exists || f === O.remove)) {
                var vals = [];
                for(var i = 2; i < c.length; i++) { vals.push(O.compilers.js.valueStr(c[i])); }
                var s = 'args';
                var max = vals.length - (f === O.lookup ? 0 : f === O.assign ? 2 : 1);
                for(var i = 0; i < max; i++) {
                    var v = vals[i];
                    s += (i > 0 ? ' && ' + s : '') + O.compilers.js.indexStr(v);
                }
                var len = (src.length);
                if (f === O.assign) {
                    s = '(' + (max < 1 ? s : '((' + s + ')||{})') +
                        O.compilers.js.indexStr(vals[max]) + ' = ' + vals[max + 1] + ')';
                } else if (f === O.exists) {
                    s = vals[max] + ' in ' + (max < 1 ? s : '((' + s + ')||{})');
                } else if (f === O.remove) {
                    src = 'var v = ' + s + ';\n' +
                        'delete v' + O.compilers.js.indexStr(vals[max]) + ';\n' + src;
                    s = 'v' + O.compilers.js.indexStr(vals[max]);
                }
                src = (len > 0
                    ? 'var r' + (idx + innerOffset) + ' = ' + s + ';\n' + src
                    : 'return O.tailcall(cb, env, [' + s + ']);'
                );
            } else if(c[0] && c[0].value === O.do) {
                var v = O.compilers.js.valueStr(c.length > 1 ? c.pop() : null);
                src = (src.length > 0
                    ? 'var r' + (idx + innerOffset) + ' = ' + v + ';\n' + src
                    : 'return O.tailcall(cb, env, [' + v + ']);'
                );
            } else {
                var v = O.compilers.js.valueStr(c[0]);
                var str = (v.charAt(0) === '"');
                var s = 'return O.tailcall(' +
                    (!str ? v : 'O.lookup, env, [env.env, ' + v + '], function (f) {\nreturn O.tailcall(f') +
                    ', env, [';
                for(var i = 1; i < c.length; i++) {
                    s += (i > 1 ? ', ' : '') + O.compilers.js.valueStr(c[i]);
                }
                src = s + '], ' +
                    (src.length < 1 ? 'cb);' : 'function(r' + (idx + innerOffset) + ') {\n' + src + '\n});') +
                    (str ? '\n});' : '');
            }
        }
        return src;
    },
    indexStr: function(v) {
        return /^"[a-z_]\w*"$/i.test(v) ? '.' + v.substring(1, v.length-1) : '[' + v + ']';
    },
    valueStr: function (v, alias) {
        return O.type(v) === 'number' ? 'r' + v : O.compilers.js.stringify(v && v.value, alias);
    },
    stringify: function stringify(v, alias) {
        var t = O.type(v);
        var s = (alias !== false && O.compilers.js.globalStr(v)) || '';
        if (s.length > 0) { return s; }
        var a = (t !== 'object');
        if (a && t !== 'array') { return JSON.stringify(v) || '' + v; }
        for(var p in v) { s += ', ' + (a ? '' : stringify(p) + ':') + stringify(v[p], alias); }
        return a ?
            (s.length ? '[' + s.substring(1) + ']' : '[]'):
            (s.length ? '{ '+ s.substring(1) +' }' : '{}');
    },
    globalStr: function (v) {
        for(var p in O) {
            if (v === O[p]) {
                return 'O' + (/^([A-Za-z]|_)\w*$/g.test(p) ? '.' + p : '["' + p + '"]');
            }
        }
        return null;
    }
};
O.language = 'js';
O.compiler = O.compilers[O.language];
O.compile = O.compiler.compile;

// These must "exist" before the below "compile" runs, because it looks for them.
O.exists = {}; O.lookup = {}; O.assign = {}; O.remove = {}; O.apply = {}; O.do = {};

// The exists, lookup, assign, and remove are just like has, get, set, and delete,
//   except that property-search continues up the "parent" chain until it is found.
//   They also allow a series of properties to be listed, for convenience.
O.exists = O.compile({ parent: O, args: ['obj', 'prop'], code: [
    O.if, [O['>'], [O.length, [O.lookup, null, 'arguments']], 2],
        {code: [ O.do,
            [O.assign, null, 'last', [O.pop, [O.lookup, null, 'arguments']]],
            [O.exists,
                [O.apply,
                    O.lookup,
                    [O.lookup, null, 'arguments'],
                    [O.lookup, null, 'scope']
                ],
                [O.lookup, null, 'last']
            ]
        ]},
        {code: [O.do,
            [O.assign, null, 'obj', [O.or, [O.lookup, null, 'obj'], [O.lookup, null, 'caller']]],
            [O.if, [O.has, [O.lookup, null, 'obj'], [O.lookup, null, 'prop']],
                true,
                {code:[O.if, [O.has, [O.lookup, null, 'obj'], 'parent'],
                    {code:[O.exists, [O.lookup, null, 'obj', 'parent'], [O.lookup, null, 'prop']]},
                    null
                ]}
            ]
        ]}
    ]
});
O.lookup = O.compile({ parent: O, args: ['obj', 'prop'], code: [
    O.if, [O['>'], [O.length, [O.lookup, null, 'arguments']], 2],
        {code: [ O.do,
            [O.assign, null, 'last', [O.pop, [O.lookup, null, 'arguments']]],
            [O.lookup,
                [O.apply,
                    O.lookup,
                    [O.lookup, null, 'arguments'],
                    [O.lookup, null, 'scope']
                ],
                [O.lookup, null, 'last']
            ]
        ]},
        {code: [O.do,
            [O.assign, null, 'obj', [O.or, [O.lookup, null, 'obj'], [O.lookup, null, 'caller']]],
            [O.if, [O.has, [O.lookup, null, 'obj'], [O.lookup, null, 'prop']],
                {code:[O.lookup, null, 'obj', [O.lookup, null, 'prop']]},
                {code:[O.if, [O.has, [O.lookup, null, 'obj'], 'parent'],
                    {code:[O.lookup, [O.lookup, null, 'obj', 'parent'], [O.lookup, null, 'prop']]},
                    null
                ]}
            ]
        ]}
    ]
});
O.assign = O.compile({ parent: O, args: ['obj', 'prop', 'value'], code: [
    O.if, [O['>'], [O.length, [O.lookup, null, 'arguments']], 3],
        {code: [ O.do,
            [O.assign, null, 'val', [O.pop, [O.lookup, null, 'arguments']]],
            [O.assign, null, 'last', [O.pop, [O.lookup, null, 'arguments']]],
            [O.assign,
                [O.apply,
                    O.lookup,
                    [O.lookup, null, 'arguments'],
                    [O.lookup, null, 'scope']
                ],
                [O.lookup, null, 'last'],
                [O.lookup, null, 'val']
            ]
        ]},
        {code: [O.do,
            [O.assign, null, 'obj', [O.or, [O.lookup, null, 'obj'], [O.lookup, null, 'caller']]],
            [O.assign, null, 't', [O.type, [O.lookup, null, 'obj']]],
            [O.if, [O.or, ['=', [O.lookup, null, 't'], 'object'], ['=', [O.lookup, null, 't'], 'array']],
                {code:[O.set, [O.lookup, null, 'obj'], [O.lookup, null, 'prop'], [O.lookup, null, 'value']]}
            ],
            [O.lookup, null, 'value']
        ]}
    ]
});
O.remove = O.compile({ parent: O, args: ['obj', 'prop'], code: [
    O.if, [O['>'], [O.length, [O.lookup, null, 'arguments']], 2],
        {code: [ O.do,
            [O.assign, null, 'last', [O.pop, [O.lookup, null, 'arguments']]],
            [O.remove,
                [O.apply,
                    O.lookup,
                    [O.lookup, null, 'arguments'],
                    [O.lookup, null, 'scope']
                ],
                [O.lookup, null, 'last']
            ]
        ]},
        {code: [O.do,
            [O.assign, null, 'obj', [O.or, [O.lookup, null, 'obj'], [O.lookup, null, 'caller']]],
            [O.if, [O.has, [O.lookup, null, 'obj'], [O.lookup, null, 'prop']],
                {code:[O.do,
                    [O.assign, null, 'v', [O.lookup, null, 'obj', [O.lookup, null, 'prop']]],
                    [O.delete, [O.lookup, null, 'obj'], [O.lookup, null, 'prop']],
                    [O.lookup, null, 'v']
                ]},
                {code:[O.if, [O.has, [O.lookup, null, 'obj'], 'parent'],
                    {code:[O.remove, [O.lookup, null, 'obj', 'parent'], [O.lookup, null, 'prop']]},
                    null
                ]}
            ]
        ]}
    ]
});

O.list = { parent: O, code: ['lookup', null, 'arguments'] };

O.copy = { parent: O, args: ['obj'], code: function (cb, env) {
    var t = O.type(env.obj);
    if (t === 'array') {
        var c = [];
        c.push.apply(c, env.obj);
        return O.tailcall(cb, env, [c]);
    }
    if (t === 'object') {
        var c = O.newObj();
        var keys = Object.keys(env.obj);
        for(var i = 0; i < keys.length; i++) {
            c[keys[i]] = env.obj[keys[i]];
        }
        return O.tailcall(cb, env, [c]);
    }
    return O.tailcall(cb, env, [env.obj]);
}};
O.do = { parent: O, code: ['get', ['lookup', null, 'arguments'], ['-', ['length', ['lookup', null, 'arguments']], 1]]};
O.loop = { parent: O, args: ['start', 'end', 'inc', 'code', 'value'], code: function(cb, env) {
    // code | end, code | start, end, code | start, end, inc, code
    var a = env.arguments;
    var start = (a.length > 2) ? a[0] : 0;
    var end = (a.length === 2) ? a[0] : (a.length > 2) ? a[1] : 0;
    var inc = (a.length > 3) ? a[2] : (a.length <= 3 && start > end) ? -1 : (a.length < 2) ? 0 : 1;
    var code = (a.length > 3) ? a[3] : (a.length > 0) ? a[a.length - 1] : null;
    if ((inc > 0 && start < end) || (inc < 0 && start > end) || inc === 0) {
        return O.tailcall(code, env.caller, [start], function(v) {
            return O.tailcall(O.loop, env, [start+inc, end, inc, code, v], cb);
        });
    }
    return O.tailcall(cb, env, [env.value]);
}};
O.each = { parent: O, args: ['container', 'code'], code: function(cb, env) {
    var c = env.container;
    var t = O.type(c);
    if (t === 'array') {
        return O.tailcall(O.loop, env, [0, c.length, function(cb, k) {
            return O.tailcall(env.code, env.caller, [k, c[k]], cb);
        }], cb);
    }
    if (t !== 'object') { return O.tailcall(cb, env, [null]); }
    return O.tailcall(O.keys, env, [c], function(keys) {
        return O.tailcall(O.loop, env, [0, keys.length, function(cb, k) {
            k = keys[k];
            return O.tailcall(env.code, env.caller, [k, c[k]], cb);
        }], cb);
    });
}};
O.lambda = { parent: O, args: ['argList', 'code'], code: function (cb, env) {
    var f, t = O.type(env.code);
    if (t === 'object') { f = env.code; }
    else {
        f = O.newObj();
        f.code = env.code;
        if (t !== 'array') { return O.tailcall(cb, env, [f]); }
    }
    return O.tailcall(O.has, env, [f, 'parent'], function (h) {
        if (!h) { f.parent = env.caller; }
        return O.tailcall(O.has, env, [f, 'args'], function (h) {
            if (!h) { f.args = env.argList || []; }
            return O.tailcall(cb, env, [f]);
        });
    });
}};
O.with = { parent: O, args: ['obj', 'code'], code: function(cb, env) {
    // obj, code | obj, prop..., value
    var result = O.tailcall(cb, env, [env.obj]);
    if (env.arguments.length < 2) { return result; }
    if (env.arguments.length < 3) { return O.tailcall(env.code, env.caller, [env.obj], function() { return result; }); }
    return O.tailcall(O.assign, env, env.arguments, function() { return result; });
}};

// Eval functions:

O.eval = { parent: O, args: ['env', 'expr'], code: function (cb, env) {
    var type = O.type(env.expr);
    if (type !== 'array' || env.expr.length < 1) {
        return O.tailcall(cb, env, [env.expr]);
    }
    var funcExpr = env.expr[0];
    var funcType = O.type(funcExpr);
    var getter = (funcType === 'string' || funcType === 'number') ? O.lookup : O.eval;
    return O.tailcall(getter, env, [env.env, funcExpr], function(func) {
        return O.tailcall(O.getArgs, env, [func, env.expr.slice(1), env.env], function(args) {
            return O.tailcall(O.apply, env, [func, args, env.env], cb);
        });
    });
}};
O.apply = { parent: O, args: ['func', 'args', 'env'], code: function (cb, env) {
    var funcType = O.type(env.func);
    if (funcType === 'native') {
        var result = null;
        try { result = env.func.apply(null, env.args); }
        catch(ex) { result = ex; }
        return O.tailcall(cb, env, [result]);
    }
    if (funcType !== 'object') {
        return O.tailcall(cb, env, [null]);
    }
    return O.tailcall(O.newEnv, env, [env.func, env.args, env.env, cb], function(env2) {
        var code = env.func.code;
        var type = O.type(code);
        if (type === 'native') {
            return O.tailcall(code, env, [env2], cb);
        }
        return O.tailcall(O.eval, env, [env2, code], cb);
    });
}};
O.newEnv = { parent: O, args: ['func', 'args', 'env', 'cc'], code: function (cb, env) {
    var env2 = O.newObj();
    env2.scope = env2;
    // If func has no parent, then assume it is a nested code-block and inherit from the current execution scope:
    env2.parent = env.func.parent || env.env;
    if (env.func.parent) {
        // Nested blocks inherit (i.e. do not override) these properties of their parent scope:
        env2.caller = env.env;
        env2.thisFunc = env.func;
        env2.return = {
            parent: { parent: env.parent, cc: env.cc, env: env.env },
            code: function (cb, env) { return O.tailcall(env.parent.cc, env.parent.env, env.arguments); }
        };
    }
    var argNames = env.func.args;
    return O.tailcall(O.each, env, [argNames, function(cb, i, aName) {
        var nType = O.type(aName);
        if (nType !== 'string') {
            return O.tailcall(cb, env, []);
        }
        var aValue = env.args[i];
        env2[aName] = aValue;
        return O.tailcall(cb, env, [aValue]);
    }], function() {
        env2.arguments = env.args;
        return O.tailcall(cb, env, [env2]);
    });
}};
O.getArgs = { parent: O, args: ['func', 'args', 'env'], code: function(cb, env) {
    return O.tailcall(O.each, env, [env.args, function(cb, i, argExpr) {
        return O.tailcall(O.eval, env, [env.env, argExpr], function(argVal) {
            env.args[i] = argVal;
            return O.tailcall(cb, env, []);
        });
    }], function() {
        return O.tailcall(cb, env, [env.args]);
    });
}};

O.def = { parent: O, args: ['k', 'v'], code: [
    'do',
        [O.if,
            ['and',
                ['has', ['lookup', null, 'v'], 'code'],
                ['not', ['has', ['lookup', null, 'v'], 'parent']]
            ],
            { code: ['set', ['lookup', null, 'v'], 'parent', ['lookup', null, 'root'] ] }
        ],
        ['set', ['lookup', null, 'root'], ['lookup', null, 'k'], ['lookup', null, 'v']]
    ]
};

// External interface for running code
O.run = function (expr, env, cb) {
    console.log('run:', expr);
    try {
        if (typeof expr === 'string') { expr = eval(expr); }
        if (arguments.length === 2 && typeof env === 'function') { cb = env; env = null; }
        if (typeof env !== 'object' || !env) { env = O; }
        //Wrapping expr in a function allows return to work properly at the root level:
        O.invoke(O.tailcall(O.apply, env, [{parent:env, code:expr}, [], env], function (v) {
            console.log(' -->', v);
            if (typeof cb === 'function') { try { cb(v); } catch(e) { } };
            return v;
        }));
    } catch(e) { (console.warn||console.log)(' !!!' + (e.stack || e.message || e)); }
};

// ------------------------------------------ //
// TEMPORARY HOOKS FOR TESTING PURPOSES ONLY: //
// ------------------------------------------ //

window.Test = O.run;
window.RunTests = function(tests) {
    tests = tests || window.Tests;
    if (O.type(tests) !== 'array') { tests = [tests]; }
    console.log("Running tests:");
    for(var i = 0; i < tests.length; i++) { window.Test(tests[i]); }
};
window.Tests = [
    "123",
    "'test'",
    "[123]",
    "['foo']",
    "['get', {x:'xVal'}, 'x']",
    "['get', ['get', ['get', {x:{y:{z:'xyz'}}}, 'x'], 'y'], 'z']",
    "['get', ['get', ['get', {x:{parent:{y:{z:'xyz'}}}}, 'x'], 'y'], 'z']",
    "['lookup', {w:1,x:'IAmX'}, 'x']",
    "['lookup', {w:1,parent:{x:'IAmParentX'}}, 'x']",
    "['lookup', {w:1,parent:{parent:{x:'IAmParentParentX'}}}, 'x']",
    "['lookup', {x:{parent:{y:{z:'xyz'}}}}, 'x', 'y', 'z']",
    "['lookup', null, 'foo']",
    "['def', 'foo', 'IAmFoo']",
    "['lookup', null, 'foo']",
    "['+', 1, 2, 3, 4]",
    "['-', 43, 21]",
    "['*', 1, 2, 3, 4]",
    "['/', 128, 16]",
    "['def', 'alert', function(msg){alert(msg);}]",
    "['def', 'say', function(msg){var p = document.createElement('p'); if (typeof p.innerText === 'string') { p.innerText = msg; } else { p.textContent = msg; } document.body.appendChild(p); return p;}]",
    "['say', 'Howdy!']",
    "['def', 'debug', function(v){debugger;return v;}]",
    "['def', 'tryThis', function(code){var b = document.createElement('button'); if (typeof b.innerText === 'string') { b.innerText = code; } else { b.textContent = code; } b.setAttribute('onclick', 'Objects.run(' + code + ')'); var p = Objects.say('Try this: '); p.appendChild(b); document.body.appendChild(p);}]",
    "['tryThis', \"['debug', 123]\"]",
    "['tryThis', \"['debug', ['+', 1, 2]]\"]",
    "['tryThis', \"['+', ['debug', 1], ['debug', 2]]\"]",
    "['def', 'again', {code:function(cb, env){var r = O.tailcall(cb, env, env.arguments); O.invoke(r); return r;}}]",
    "['again', 'again']",
    "['say', ['again', 'Testing \"say again\"']]",
    "['again', ['say', 'Testing \"again say\"']]",
    "['def', 'window', window]",
    "['def', 'clear', {code:['assign', null, 'window', 'document', 'body', 'innerHTML', '']}]",
    "['def', 'refresh', {code:['assign', null, 'window', 'location', 'href', ['lookup', null, 'window', 'location', 'href']]}]",
    "['def', 'browse', {args:['url','w','h'],code:[['lookup', null, 'window', 'open'], ['lookup', null, 'url'], '_blank', ['+', 'top=', ['/', ['-', ['lookup', null, 'window', 'screen', 'height'], ['lookup', null, 'h']], 2], ',left=', ['/', ['-', ['lookup', null, 'window', 'screen', 'width'], ['lookup', null, 'w']], 2], ',width=', ['lookup', null, 'w'], ',height=', ['lookup', null, 'h'], ',menubar=0,toolbar=0,location=0']]}]",
    "['get', ['lookup', null, 'window'], 'document']",
    "['assign', null, 'window', 'document', 'body', 'style', 'backgroundColor', '#CCDDFF']",
    "['assign', null, 'window', 'document', 'body', 'style', 'fontWeight', 'bold']",
    "['assign', null, 'window', 'document', 'body', 'style', 'color', '#0000DD']",
    "['tryThis', \"['browse', 'https://github.com/d-cook/Objects', 1000, 750]\"]",
    "['tryThis', \"['refresh']\"]",
    "['tryThis', \"['clear']\"]",
    "['def', 'list', {code:['lookup', null, 'arguments']}]",
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
    "['def', 'object', {args:['keys','values'],code:function(cb, env){var o = O.newObj();for(var i=0; i < env.keys.length; i++){o[env.keys[i]] = (env.values&&env.values[i]);}return O.tailcall(cb,env,[o]);}}]",
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
    "['do', ['assign', null, 'x', 5], ['assign', null, 'y', 10], ['+', ['lookup', null, 'x'], ['lookup', null, 'y']]]",
    "['do']", // Simulating an empty block of code
    "['with', {a:1, b:2, c:3}, {args:['o'], code:['set', ['lookup', null, 'o'], 'x', 5]}]",
    "['with', {a:1, b:2, c:3}, 'y', 7]",
    "['with', {a:1, b:{x:{y:{}}}, c:3}, 'b', 'x', 'y', 'z', 2]",
    "['with', {a:1, b:{x:{y:{}}}, c:3}, 'b', 'x', 3]",

    // TESTING COMPILATION (by re-coding "do", and recompiling it back):

    "['def', 'test-compile', {args:['code'],code:['get', ['assign', null, ['lookup', null, 'code'], ['compile', ['lookup', null, ['lookup', null, 'code']]]], 'code']}]",
    "['test-compile', 'do']",
    "['do', ['assign', null, 'x', 5], ['assign', null, 'y', 10], ['+', ['lookup', null, 'x'], ['lookup', null, 'y']]]",
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
    "[['compile', {code:[O.if, true, {code:['id', 'TRUE!']}, {code:['id', 'FALSE!']}]}]]",
    "[['compile', {code:[O.if, false, {code:['id', 'TRUE!']}, {code:['id', 'FALSE!']}]}]]",
    "['get', ['compile', {args:['x'],code:[O.if, true, {args:['v1'],code:[O.if, true, {args:['v2'],code:['+', 'x:', ['lookup', null, 'x'], ', v1:', ['lookup', null, 'v1'], ', v2:', ['lookup', null, 'v2']]}]}]}], 'code']",
    "['get', ['compile', {code:[O.if, ['cond', 123], {code:['foo', 456]}]}], 'code']",
    "['get', ['compile', {code:[O.if, ['cond', 123], ['foo', 456]]}], 'code']"
];
window.RunTests();

}());
