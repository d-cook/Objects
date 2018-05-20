(function() {

// The "root" object of the whole system:
var O = window.Objects = Object.create(null);
O.root = O;

// Functions that must be native-defined:

O.has    = function (o, p   ) { try { return o ? (p in o) : false; } catch(ex) { return false; } };
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
O.and = { parent: O, args: ['L', 'R'], code: function (cb, env) {
    if (env.arguments.length < 2 || O.falsey(env.L)) {
        return O.tailcall(cb, env, [env.L]); 
    }
    return O.tailcall(env.R, env.caller, [], function(r) {
        var args = [r];
        args.push.apply(args, O.slice(env.arguments, 2));
        return O.tailcall(O.and, env.caller, args, cb);
    });
}};
O.or = { parent: O, args: ['L', 'R'], code: function (cb, env) {
    if (env.arguments.length < 2 || O.truthy(env.L)) {
        return O.tailcall(cb, env, [env.L]); 
    }
    return O.tailcall(env.R, env.caller, [], function(r) {
        var args = [r];
        args.push.apply(args, O.slice(env.arguments, 2));
        return O.tailcall(O.or, env.caller, args, cb);
    });
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

O.slice   = function (a,b,e) { return (O.type(a) !== 'array') ? null : [].slice  .apply(a, [].slice.call(arguments, 1)); };
O.push    = function (a    ) { return (O.type(a) !== 'array') ? null : [].push   .apply(a, [].slice.call(arguments, 1)); };
O.unshift = function (a    ) { return (O.type(a) !== 'array') ? null : [].unshift.apply(a, [].slice.call(arguments, 1)); };
O.pop     = function (a    ) { return (O.type(a) !== 'array') ? null : [].pop    .apply(a); };
O.shift   = function (a    ) { return (O.type(a) !== 'array') ? null : [].shift  .apply(a); };

O.charAt    = function (s,i  ) { return s.charAt(i); };
O.substring = function (s,b,e) { return (O.type(s) !== 'string') ? null : s.substring(b, e); };

O.applyNative = function (f, args) {
    if (typeof f !== 'function') { return null; }
    try { return f.apply(null, args); }
    catch(ex) { return ex; } // TODO: return null instead?
};

// These tailcall and invoke functions drive execution of all wrapped functions, which
// run in CPS (Continuation Passing Style) (i.e. return execution/values via callbacks)
O.tailcall = function tailcall(func, env, args, cb) {
    if (O.type(env) === 'array') { cb = args; args = env; env = null; }
    if (O.type(func) === 'native') {
        // Detect if func takes a cb. TODO: this better (it's a hack with potential false-positives)
        var hasCb = (''+func).replace(/^[^(]+\(/, '').replace(/\).*$/, '').substring(0,3) === 'cb,';
        var allArgs = (cb && hasCb) ? [cb] : [];
        allArgs.push.apply(allArgs, args);
        if (cb && !hasCb) { return tailcall(cb, env, [func.apply(null, allArgs)]); }
        return { func: func, args: allArgs };
    }
    if (!O.has(func, 'code')) { return { func: cb, args: [typeof(func) === 'undefined' ? null : func] }; }
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
    // (window.bpc > 100) || ((window.bpc = 1 + (window.bpc || 0)) && false)
    while(tc && tc.func) { tc = tc.func.apply(null, tc.args || []); }
};

//TODO: 1. Rewrite this native compiler ("nc") in non-native code ("nnc").
//      2. Feed nnc into nc to create a generated-native compiler ("gnc").
//      3. Manually replace nc with gnc, and verify that it works the same.
//      4. Add code that deletes the (g)nc as the final step of bootstrapping.
//      5. Create a non-native func that re-creates this entire source-code by:
//         - echo native code directly
//         - recreate gnc by running nnc on itself, and echoing the result
//         - echoing all non-native code wrapped in calls to the compiler
//      5b. ALTERNATELY, echo the compiled version of non-natives instead of
//          generating and using the gnc as part of the bootstrapping process.
O.compilers = {};
var js = O.compilers.js = {};
js.compile = { parent: js, args: ['code', 'innerOffset'], code: function (cb, env) {
    var code = env.code, innerOffset = env.innerOffset;
    if (O.type(code) === 'object') {
        var src = O.type(code.code) === 'array' ? code.code :
                  O.type(code.src ) === 'array' ? code.src  : null;
        return (function(cb) {
            return src ? O.tailcall(js.compile, env, [src, innerOffset], cb) : cb(null);
        }(function(cc) {
            if (!cc) { return O.tailcall(cb, env, [null]); }
            cc = { code: cc };
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
            return O.tailcall(cb, env, [cc]);
        }));
    }
    return O.tailcall(js.compileSrc, env, [code, innerOffset || 0], function (src) {
        return O.tailcall(cb, env, [
            src && eval('(function(cb, env) {\n' + (innerOffset ? '' : 'var args = env;\n') + src + '\n})')
        ]);
    });
}};
js.compileSrc = { parent: js, args: ['code', 'innerOffset'], code: function (cb, env) {
    var code = env.code, innerOffset = env.innerOffset;
    if (O.type(code) !== 'array') { return O.tailcall(cb, env, [null]); }
    return O.tailcall(js.getCalls, env, [code, [], innerOffset], function (calls) {
        return O.tailcall(js.buildCalls, env, [calls, innerOffset], cb);
    });
}};
js.getCalls = { parent: js, args: ['code', 'calls', 'innerOffset'], code: function (cb, env) {
    var code = env.code, calls = env.calls, innerOffset = env.innerOffset;
    if (O.type(code) !== 'array' || O.length(code) < 1) { return O.tailcall(cb, env, [calls]); }
    var last = [];
    return (function next(i) {
        if (i >= O.length(code)) {
            calls.push(last);
            return O.tailcall(cb, env, [calls]);
        }
        var c = code[i];
        return (function(cb) {
            return O.type(c) !== 'array' ? cb({ value : c }) :
                O.tailcall(js.getCalls, env, [c, calls, innerOffset], function (call) {
                    return cb(call.length - 1 + innerOffset);
                });
        }(function(call) {
            last.push(call);
            return O.tailcall(next, env, [i + 1]);
        }));
    }(0));
}};
js.buildCalls = { parent: js, args: ['calls', 'innerOffset'], code: function (cb, env) {
    var calls = env.calls, innerOffset = env.innerOffset;
    var src = '';
    return (function next(idx) {
        if (idx < 0) { return O.tailcall(cb, env, [src]); }
        var c = calls[idx];
        if (O.type(c) !== 'array') { return O.tailcall(cb, env, [src]); }
        return (function nextI(i) {
            if (i >= O.length(c)) {
                // TODO: sub this:
                var f = (O.length(c) > 2 && c[1] && c[1].value === null && c[0] && c[0].value);
                var sub = (f && (f === O.lookup || f === O.assign || f === O.exists || f === O.remove) ? js.buildCalls_lookup : js.buildCalls_other);
                return O.tailcall(sub, env, [c, idx, innerOffset, src, f], function(newSrc) {
                    src = newSrc;
                    return O.tailcall(next, env, [idx - 1]);
                });
            }
            return O.tailcall(js.buildCalls_compile, env, [c[i], innerOffset, calls], function() {
                return O.tailcall(nextI, env, [i + 1]);
            });
        }(0));
    }(O.length(calls) - 1));
}};
js.buildCalls_compile = { parent: js, args: ['ci', 'innerOffset', 'calls'], code: function (cb, env) {
    var ci = env.ci, innerOffset = env.innerOffset, calls = env.calls;
    var v = ci && ci.value
    return O.tailcall(js.buildCalls_compile_sub, env, [ci, innerOffset, calls, v, !(v && v.code)], cb);
}};
js.buildCalls_compile_sub = { parent: js, args: ['ci', 'innerOffset', 'calls', 'v', 'noCode'], code: function (cb, env) {
    var ci = env.ci, innerOffset = env.innerOffset, calls = env.calls, v = env.v, noCode = env.noCode;
    return (function(next) {
        return noCode ? next(true) : O.tailcall(js.globalStr, env, [v], next);
    }(function(ngs) {
        return ngs ? O.tailcall(cb, env, []) : O.tailcall(js.compile, env, [v, O.length(calls) - 1 + innerOffset], function(cv) {
            ci.value = cv;
            return O.tailcall(cb, env, []);
        });
    }));
}};
js.buildCalls_lookup = { parent: js, args: ['c', 'idx', 'innerOffset', 'src', 'f'], code: function (cb, env) {
    var f = env.f, c = env.c, idx = env.idx, innerOffset = env.innerOffset, src = env.src;
    var vals = [];
    return (function next(i) {
        if (i >= O.length(c)) {
            var max = O.length(vals) - (f === O.lookup ? 0 : f === O.assign ? 2 : 1);
            var s = 'args';
            return (function next(i) {
                if (i >= max) {
                    var len = O.length(src);
                    return O.tailcall(js.indexStr, env, [vals[max]], function (vs) {
                        if (f === O.assign) {
                            s = '(' + (max < 1 ? s : '((' + s + ')||{})') + vs + ' = ' + vals[max + 1] + ')';
                        } else if (f === O.exists) {
                            s = vals[max] + ' in ' + (max < 1 ? s : '((' + s + ')||{})');
                        } else if (f === O.remove) {
                            src = 'var v = ' + s + ';\n' + 'delete v' + vs + ';\n' + src;
                            s = 'v' + vs;
                        }
                        return O.tailcall(cb, env, [(len > 0
                            ? 'var r' + (idx + innerOffset) + ' = ' + s + ';\n' + src
                            : 'return O.tailcall(cb, env, [' + s + ']);'
                        )]);
                    });
                }
                return O.tailcall(js.indexStr, env, [vals[i]], function (vs) {
                    s = s + (i > 0 ? ' && ' + s : '') + vs;
                    return O.tailcall(next, env, [i + 1]);
                });
            }(0));
        }
        return O.tailcall(js.valueStr, env, [c[i]], function (vs) {
            vals.push(vs);
            return O.tailcall(next, env, [i + 1]);
        });
    }(2));
}};
js.buildCalls_other = { parent: js, args: ['c', 'idx', 'innerOffset', 'src'], code: function (cb, env) {
    var c = env.c, idx = env.idx, innerOffset = env.innerOffset, src = env.src;
    if (c[0] && c[0].value === O.do) {
        return O.tailcall(js.valueStr, env, [O.length(c) > 1 ? c.pop() : null], function (v) {
            return O.tailcall(cb, env, [(O.length(src) > 0
                ? 'var r' + (idx + innerOffset) + ' = ' + v + ';\n' + src
                : 'return O.tailcall(cb, env, [' + v + ']);'
            )]);
        });
    }
    return O.tailcall(js.valueStr, env, [c[0]], function (v) {
        var str = (O.charAt(v, 0) === '"');
        var s = 'return O.tailcall(' +
            (!str ? v : 'O.lookup, env, [env, ' + v + '], function (f) {\nreturn O.tailcall(f') +
            ', env, [';
        return (function next(i) {
            if (i >= O.length(c)) {
                src = s + '], ' +
                    (O.length(src) < 1 ? 'cb);' : 'function(r' + (idx + innerOffset) + ') {\n' + src + '\n});') +
                    (str ? '\n});' : '');
                return O.tailcall(cb, env, [src]);
            }
            return O.tailcall(js.valueStr, env, [c[i]], function (vs) {
                s += (i > 1 ? ', ' : '') + vs;
                return O.tailcall(next, env, [i + 1]);
            });
        }(1));
    });
}};
js.indexStr = { parent: js, args: ['v'], code: function (cb, env) {
    var v = env.v;
    return O.tailcall(cb, env, [
        (
            O.length(v) > 1 &&
            O.charAt(v, 0) === '"' &&
            O.charAt(v, O.length(v)-1) === '"'
        ) ? '.' + O.substring(v, 1, O.length(v)-1) : '[' + v + ']'
    ]);
}};
js.valueStr = { parent: js, args: ['v', 'alias'], code: function (cb, env) {
    var v = env.v, alias = env.alias;
    return (O.type(v) === 'number') ? O.tailcall(cb, env, ['r' + v]) :
        O.tailcall(js.stringify, env, [v && v.value, alias], cb);
}};
js.stringify = { parent: js, args: ['v', 'alias'], code: function (cb, env) {
    var v = env.v, alias = env.alias;
    var t = O.type(v);
    return (function(cb) {
        return (alias === false) ? cb(null) : O.tailcall(js.globalStr, env, [v], cb);
    }(function(s) {
        s = s || '';
        if (O.length(s) > 0) { return O.tailcall(cb, env, [s]); }
        var a = (t !== 'object');
        if (a && t !== 'array') { return O.tailcall(cb, env, [JSON.stringify(v) || '' + v]); }
        var keys = O.keys(v);
        return (function next(i) {
            if (i >= keys.length) {
                return O.tailcall(cb, env, [a ?
                    (O.length(s) ? '[' + O.substring(s, 1) + ']' : '[]'):
                    (O.length(s) ? '{ '+ O.substring(s, 1) +' }' : '{}')
                ]);
            }
            var p = keys[i];
            return (function(cb) {
                return a ? cb('') : O.tailcall(js.stringify, env, [p], function(pv) {
                    return cb(pv + ':');
                });
            }(function(pv) {
                return O.tailcall(js.stringify, env, [v[p], alias], function(vv) {
                    s += ', ' + pv + vv;
                    return O.tailcall(next, env, [i + 1]);
                });
            }));
        }(0));
    }));
}};
js.globalStr = { parent: js, args: ['v'], code: function (cb, env) {
    var v = env.v;
    for(var p in O) { if (v === O[p]) { return O.tailcall(cb, env, ['O["' + p + '"]']); } }
    return O.tailcall(cb, env, [null]);
}};

// These must "exist" before the below "compile" runs, because it looks for them.
(function() {
    var f = [
        'exists', 'lookup', 'assign', 'remove',
        'list', 'copy', 'do', 'lambda', 'with',
        'eval', 'apply', 'newEnv', 'evalArgs'
    ];
    for(var i = 0; i < f.length; i++) { O[f[i]] = {}; }
})();

function compileAssign(parent, funcName, code) {
    O.invoke(O.tailcall(js.compile, O, [code], function (cc) { parent[funcName] = cc; }));
}

function compileNonNatives() {
    // The exists, lookup, assign, and remove are just like has, get, set, and delete,
    //   except that property-search continues up the "parent" chain until it is found.
    //   They also allow a series of properties to be listed, for convenience.
    compileAssign(O, 'exists', { parent: O, args: ['obj', 'prop'], code: [
        O.if, [O['>'], [O.length, [O.lookup, null, 'arguments']], 2],
            {code: [ O.do,
                [O.assign, null, 'last', [O.pop, [O.lookup, null, 'arguments']]],
                [O.exists,
                    [O.apply, O.lookup, [O.lookup, null, 'arguments']],
                    [O.lookup, null, 'last']
                ]
            ]},
            {code: [O.do,
                [O.assign, null, 'obj', [O.or, [O.lookup, null, 'obj'], {code:[O.lookup, null, 'caller']}]],
                [O.if, [O.has, [O.lookup, null, 'obj'], [O.lookup, null, 'prop']],
                    true,
                    {code:[O.if, [O.has, [O.lookup, null, 'obj'], 'parent'],
                        {code:[O.exists, [O.lookup, null, 'obj', 'parent'], [O.lookup, null, 'prop']]}
                    ]}
                ]
            ]}
        ]
    });
    compileAssign(O, 'lookup', { parent: O, args: ['obj', 'prop'], code: [
        O.if, [O['>'], [O.length, [O.lookup, null, 'arguments']], 2],
            {code: [ O.do,
                [O.assign, null, 'last', [O.pop, [O.lookup, null, 'arguments']]],
                [O.lookup,
                    [O.apply, O.lookup, [O.lookup, null, 'arguments']],
                    [O.lookup, null, 'last']
                ]
            ]},
            {code: [O.do,
                [O.assign, null, 'obj', [O.or, [O.lookup, null, 'obj'], {code:[O.lookup, null, 'caller']}]],
                [O.if, [O.has, [O.lookup, null, 'obj'], [O.lookup, null, 'prop']],
                    {code:[O.lookup, null, 'obj', [O.lookup, null, 'prop']]},
                    {code:[O.if, [O.has, [O.lookup, null, 'obj'], 'parent'],
                        {code:[O.lookup, [O.lookup, null, 'obj', 'parent'], [O.lookup, null, 'prop']]}
                    ]}
                ]
            ]}
        ]
    });
    compileAssign(O, 'assign', { parent: O, args: ['obj', 'prop', 'value'], code: [
        O.if, [O['>'], [O.length, [O.lookup, null, 'arguments']], 3],
            {code: [ O.do,
                [O.assign, null, 'val', [O.pop, [O.lookup, null, 'arguments']]],
                [O.assign, null, 'last', [O.pop, [O.lookup, null, 'arguments']]],
                [O.assign,
                    [O.apply, O.lookup, [O.lookup, null, 'arguments']],
                    [O.lookup, null, 'last'],
                    [O.lookup, null, 'val']
                ]
            ]},
            {code: [O.do,
                [O.assign, null, 'obj', [O.or, [O.lookup, null, 'obj'], {code:[O.lookup, null, 'caller']}]],
                [O.assign, null, 't', [O.type, [O.lookup, null, 'obj']]],
                [O.if, [O.or, ['=', [O.lookup, null, 't'], 'object'], {code:['=', [O.lookup, null, 't'], 'array']}],
                    {code:[O.set, [O.lookup, null, 'obj'], [O.lookup, null, 'prop'], [O.lookup, null, 'value']]}
                ],
                [O.lookup, null, 'value']
            ]}
        ]
    });
    compileAssign(O, 'remove', { parent: O, args: ['obj', 'prop'], code: [
        O.if, [O['>'], [O.length, [O.lookup, null, 'arguments']], 2],
            {code: [ O.do,
                [O.assign, null, 'last', [O.pop, [O.lookup, null, 'arguments']]],
                [O.remove,
                    [O.apply, O.lookup, [O.lookup, null, 'arguments']],
                    [O.lookup, null, 'last']
                ]
            ]},
            {code: [O.do,
                [O.assign, null, 'obj', [O.or, [O.lookup, null, 'obj'], {code:[O.lookup, null, 'caller']}]],
                [O.if, [O.has, [O.lookup, null, 'obj'], [O.lookup, null, 'prop']],
                    {code:[O.do,
                        [O.assign, null, 'v', [O.lookup, null, 'obj', [O.lookup, null, 'prop']]],
                        [O.delete, [O.lookup, null, 'obj'], [O.lookup, null, 'prop']],
                        [O.lookup, null, 'v']
                    ]},
                    {code:[O.if, [O.has, [O.lookup, null, 'obj'], 'parent'],
                        {code:[O.remove, [O.lookup, null, 'obj', 'parent'], [O.lookup, null, 'prop']]}
                    ]}
                ]
            ]}
        ]
    });
    compileAssign(O, 'list', { parent: O, code: [O.lookup, null, 'arguments'] });
    compileAssign(O, 'copy', { parent: O, args: ['obj'], code: [O.do,
        [O.assign, null, 't', [O.type, [O.lookup, null, 'obj']]],
        [O.if, [O['='], [O.lookup, null, 't'], 'array'],
            {code:[O.slice, [O.lookup, null, 'obj']]},
            {code:[O.if, [O['='], [O.lookup, null, 't'], 'object'],
                {code:[O.do,
                    [O.assign, null, 'obj2', [O.newObj]],
                    [O.assign, null, 'keys', [O.keys, [O.lookup, null, 'obj']]],
                    [O.assign, null, 'len', [O.length, [O.lookup, null, 'keys']]],
                    [O.assign, null, 'i', 0],
                    [[O.assign, null, 'nextArg', {code:[O.if, [O['>='], [O.lookup, null, 'i'], [O.lookup, null, 'len']],
                        {code:[O.lookup, null, 'obj2']},
                        {code:[O.do,
                            [O.assign, null, 'k', [O.lookup, null, 'keys', [O.lookup, null, 'i']]],
                            [O.assign, null, 'obj2', [O.lookup, null, 'k'], [O.lookup, null, 'obj', [O.lookup, null, 'k']]],
                            [O.assign, null, 'i', [O['+'], [O.lookup, null, 'i'], 1]],
                            [[O.lookup, null, 'nextArg']]
                        ]}
                    ]}]]
                ]},
                // TODO: this does not copy native functions, it just returns them:
                {code:[O.lookup, null, 'obj']}
            ]}
        ]
    ]});
    compileAssign(O, 'do', { parent: O, code: [O.get,
        [O.lookup, null, 'arguments'],
        [O['-'], [O.length, [O.lookup, null, 'arguments']], 1]
    ]});
    compileAssign(O, 'lambda', { parent: O, args: ['argList', 'code'], code: [O.do,
        [O.assign, null, 't', [O.type, [O.lookup, null, 'code']]],
        [O.assign, null, 'f',
            [O.if, [O['='], [O.lookup, null, 't'], 'object'],
                {code:[O.lookup, null, 'code']},
                {code:[O.with, [O.newObj], 'code', [O.lookup, null, 'code']]}
            ]
        ],
        [O.if, [O.not, [O.has, [O.lookup, null, 'f'], 'parent']],
            {code:[O.assign, null, 'f', 'parent', [O.lookup, null, 'caller']]}
        ],
        [O.if, [O.not, [O.has, [O.lookup, null, 'f'], 'args']],
            {code:[O.assign, null, 'f', 'args', [O.or, [O.lookup, null, 'argList'], {code:[O.list]}]]}
        ],
        [O.lookup, null, 'f']
    ]});
    compileAssign(O, 'with', { parent: O, args: ['obj', 'code'], code: [O.do,
        [O.assign, null, 'len', [O.length, [O.lookup, null, 'arguments']]],
        [O.do,
            [O.if, [O['>='], [O.lookup, null, 'len'], 2],
                {code:[O.if, [O['<'], [O.lookup, null, 'len'], 3],
                    {code:[[O.lookup, null, 'code'], [O.lookup, null, 'obj']]},
                    {code:[O.apply, O.assign, [O.lookup, null, 'arguments']]}
                ]}
            ],
            [O.lookup, null, 'obj']
        ]
    ]});

    // Eval functions:

    compileAssign(O, 'eval', { parent: O, args: ['env', 'expr'], code: [
        O.if, [O.or,
                [O.not, [O['='], [O.type, [O.lookup, null, 'expr']], 'array']],
                {code:[O['<'], [O.length, [O.lookup, null, 'expr']], 1]}
            ],
            {code:[O.lookup, null, 'expr']},
            {code:[O.do,
                [O.assign, null, 'funcExpr', [O.lookup, null, 'expr', 0]],
                [O.assign, null, 'funcType', [O.type, [O.lookup, null, 'funcExpr']]],
                [O.assign, null, 'func',
                    [O.if, [O.or,
                            [O['='], [O.lookup, null, 'funcType'], 'string'],
                            {code:[O['='], [O.lookup, null, 'funcType'], 'number']}
                        ],
                        {code:[O.lookup, [O.lookup, null, 'env'], [O.lookup, null, 'funcExpr']]},
                        {code:[O.eval,   [O.lookup, null, 'env'], [O.lookup, null, 'funcExpr']]}
                    ]
                ],
                [O.apply,
                    [O.lookup, null, 'func'],
                    [O.evalArgs,
                        [O.lookup, null, 'func'],
                        [O.slice, [O.lookup, null, 'expr'], 1],
                        [O.lookup, null, 'env']
                    ],
                    [O.lookup, null, 'env']
                ]
            ]}
    ]});
    compileAssign(O, 'apply', { parent: O, args: ['func', 'args', 'env'], code: [O.do,
        [O.assign, null, 'funcType', [O.type, [O.lookup, null, 'func']]],
        [O.if, [O['='], [O.lookup, null, 'funcType'], 'native'],
            {code:[O.applyNative, [O.lookup, null, 'func'], [O.lookup, null, 'args']]},
            {code:[O.if, [O['='], [O.lookup, null, 'funcType'], 'object'],
                {code:[O.do,
                    [O.assign, null, 'env2',
                        [O.newEnv,
                            [O.lookup, null, 'func'],
                            [O.lookup, null, 'args'],
                            [O.or, [O.lookup, null, 'env'], {code:[O.lookup, null, 'caller']}]
                        ]
                    ],
                    [O.assign, null, 'code', [O.lookup, null, 'func', 'code']],
                    [O.assign, null, 'type', [O.type, [O.lookup, null, 'code']]],
                    [O.if, [O['='], [O.lookup, null, 'type'], 'native'],
                        {code:[[O.lookup, null, 'code'], [O.lookup, null, 'env2']]},
                        {code:[O.eval, [O.lookup, null, 'env2'], [O.lookup, null, 'code']]}
                    ]
                ]},
            ]}
        ]
    ]});
    compileAssign(O, 'newEnv', { parent: O, args: ['func', 'args', 'env'], code: [O.do,
        [O.assign, null, 'env2', [O.newObj]],
        [O.assign, null, 'env2', 'scope', [O.lookup, null, 'env2']],
        [O.assign, null, 'env2', 'parent', [O.or, [O.lookup, null, 'func', 'parent'], {code:[O.lookup, null, 'env']}]],
        [O.if, [O.lookup, null, 'func', 'parent'],
            {code:[O.do,
                [O.assign, null, 'env2', 'caller', [O.lookup, null, 'env']],
                [O.assign, null, 'env2', 'thisFunc', [O.lookup, null, 'func']]
            ]}
        ],
        [O.assign, null, 'argNames', [O.or, [O.lookup, null, 'func', 'args'], {code:[O.list]}]],
        [O.assign, null, 'i', 0],
        [O.assign, null, 'len', [O.length, [O.lookup, null, 'argNames']]],
        [[O.assign, null, 'setNextArg', {code:[O.if, [O['>='], [O.lookup, null, 'i'], [O.lookup, null, 'len']],
            {code:[O.do,
                [O.assign, null, 'env2', 'arguments', [O.lookup, null, 'args']],
                [O.lookup, null, 'env2']
            ]},
            {code:[O.do,
                [O.assign, null, 'name', [O.lookup, null, 'argNames', [O.lookup, null, 'i']]],
                [O.if, [O['='], [O.type, [O.lookup, null, 'name']], 'string'],
                    {code:[O.assign, null, 'env2', [O.lookup, null, 'name'], [O.lookup, null, 'args', [O.lookup, null, 'i']]]}
                ],
                [O.assign, null, 'i', [O['+'], [O.lookup, null, 'i'], 1]],
                [[O.lookup, null, 'setNextArg']]
            ]}
        ]}]]
    ]});
    compileAssign(O, 'evalArgs', { parent: O, args: ['func', 'args', 'env'], code: [O.do,
        [O.assign, null, 'i', 0],
        [O.assign, null, 'len', [O.length, [O.lookup, null, 'args']]],
        [[O.assign, null, 'evalNextArg', {code:[
            [O.if, [O['>='], [O.lookup, null, 'i'], [O.lookup, null, 'len']],
                {code:[O.lookup, null, 'args']},
                {code:[O.do,
                    [O.assign, null, 'args', [O.lookup, null, 'i'],
                        [O.eval, [O.lookup, null, 'env'], [O.lookup, null, 'args', [O.lookup, null, 'i']]]
                    ],
                    [O.assign, null, 'i', [O['+'], [O.lookup, null, 'i'], 1]],
                    [[O.lookup, null, 'evalNextArg']]
                ]}
            ]
        ]}]]
    ]});
}

compileNonNatives();

// Re-create all compiler functions from non-native code:

compileAssign(js, 'compile', { parent: js, args: ['code', 'innerOffset'], code: [
    O.if, [O['='], [O.type, [O.lookup, null, 'code']], 'object'],
        {code:[O.do,
            [O.assign, null, 'src',
                [O.if, [O['='], [O.type, [O.lookup, null, 'code', 'code']], 'array'],
                    {code:[O.lookup, null, 'code', 'code']},
                    {code:[
                        O.if, [O['='], [O.type, [O.lookup, null, 'code', 'src']], 'array'],
                            {code:[O.lookup, null, 'code', 'src']}
                    ]}
                ]
            ],
            [O.assign, null, 'cc_code',
                [O.if, [O.lookup, null, 'src'],
                    //TODO: fix compiler to allow a direct-reference below (js.compile instead of 'compile'):
                    {code:['compile', [O.lookup, null, 'src'], [O.lookup, null, 'innerOffset']]},
                ]
            ],
            [O.if, [O.lookup, null, 'cc_code'],
                {code:[O.do,
                    [O.assign, null, 'cc', [O.newObj]],
                    [O.assign, null, 'cc', 'code', [O.lookup, null, 'cc_code']],
                    [O.assign, null, 'keys', [O.keys, [O.lookup, null, 'code']]],
                    [O.assign, null, 'len', [O.length, [O.lookup, null, 'keys']]],
                    [O.assign, null, 'i', 0],
                    [[O.assign, null, 'nextCodeProp', {code:[
                        O.if, [O['<'], [O.lookup, null, 'i'], [O.lookup, null, 'len']],
                            {code:[O.do,
                                [O.assign, null, 'p', [O.lookup, null, 'keys', [O.lookup, null, 'i']]],
                                [O.if, [O.not, [O.or,
                                        [O['='], [O.lookup, null, 'p'], 'src'],
                                        {code:[O['='], [O.lookup, null, 'p'], 'code']}
                                    ]],
                                    {code:[O.assign, null, 'cc', [O.lookup, null, 'p'], [O.lookup, null, 'code', [O.lookup, null, 'p']]]}
                                ],
                                [O.assign, null, 'i', [O['+'], [O.lookup, null, 'i'], 1]],
                                [[O.lookup, null, 'nextCodeProp']]
                            ]}
                    ]}]],
                    [O.if, [O.not, [O['>'], [O.lookup, null, 'innerOffset'], 0]],
                        {code:[O.assign, null, 'cc', 'src', [O.lookup, null, 'src']]}
                    ],
                    [O.if, [O['='], [O.type, [O.lookup, null, 'code', 'args']], 'array'],
                        {code:[O.assign, null, 'cc', 'args', [O.copy, [O.lookup, null, 'code', 'args']]]}
                    ],
                    [O.lookup, null, 'cc']
                ]}
            ]
        ]},
        {code:[O.do,
            [O.assign, null, 'src', ['compileSrc',
                [O.lookup, null, 'code'],
                [O.or, [O.lookup, null, 'innerOffset'], 0]
            ]],
            [O.and,
                [O.lookup, null, 'src'],
                // TODO: replace this inline native eval func with a not-inline one:
                {code:[function(x){return eval(x);},
                    [O['+'],
                        '(function(cb, env) {\n',
                        [O.if, [O['>'], [O.lookup, null, 'innerOffset'], 0],
                            '',
                            'var args = env;\n'
                        ],
                        [O.lookup, null, 'src'],
                        '\n})'
                    ]
                ]}
            ]
        ]}
]});
compileAssign(js, 'compileSrc', { parent: js, args: ['code', 'innerOffset'], code: [
    O.if, [O['='], [O.type, [O.lookup, null, 'code']], 'array'],
        //TODO: fix compiler to allow a direct-reference below (i.e 'buildCalls' and 'getCalls'):
        {code:['buildCalls',
            ['getCalls', [O.lookup, null, 'code'], [O.list], [O.lookup, null, 'innerOffset']],
            [O.lookup, null, 'innerOffset']
        ]}
]});
compileAssign(js, 'getCalls', { parent: js, args: ['code', 'calls', 'innerOffset'], code: [
    O.if, [O.or,
            [O.not, [O['='], [O.type, [O.lookup, null, 'code']], 'array']],
            {code:[O['<'], [O.length, [O.lookup, null, 'code']], 1]}
        ],
        {code:[O.lookup, null, 'calls']},
        {code:[O.do,
            [O.assign, null, 'last', [O.list]],
            [O.assign, null, 'len', [O.length, [O.lookup, null, 'code']]],
            [O.assign, null, 'i', 0],
            [[O.assign, null, 'nextCodeIdx',
                {code:[O.if, [O['>='], [O.lookup, null, 'i'], [O.lookup, null, 'len']],
                    {code:[O.do,
                        [O.push, [O.lookup, null, 'calls'], [O.lookup, null, 'last']],
                        [O.lookup, null, 'calls']
                    ]},
                    {code:[O.do,
                        [O.assign, null, 'c', [O.lookup, null, 'code', [O.lookup, null, 'i']]],
                        [O.push, [O.lookup, null, 'last'], [
                            O.if, [O['='], [O.type, [O.lookup, null, 'c']], 'array'],
                                {code:[O['+'],
                                    [O.length, ['getCalls',
                                        [O.lookup, null, 'c'],
                                        [O.lookup, null, 'calls'],
                                        [O.lookup, null, 'innerOffset']
                                    ]],
                                    -1,
                                    [O.lookup, null, 'innerOffset']
                                ]},
                                {code:[O.do,
                                    [O.assign, null, 'valObj', [O.newObj]],
                                    [O.assign, null, 'valObj', 'value', [O.lookup, null, 'c']],
                                    [O.lookup, null, 'valObj']
                                ]}
                            ]
                        ],
                        [O.assign, null, 'i', [O['+'], [O.lookup, null, 'i'], 1]],
                        [[O.lookup, null, 'nextCodeIdx']]
                    ]}
                ]}
            ]]
        ]}
]});
compileAssign(js, 'buildCalls_compile_sub', { parent: js, args: ['ci', 'innerOffset', 'calls', 'v', 'noCode'], code: [
    O.if, [O.not, [O.or,
            [O.lookup, null, 'noCode'],
            {code:['globalStr', [O.lookup, null, 'v']]}
        ]],
        {code:[O.assign, null, 'ci', 'value',
            ['compile',
                [O.lookup, null, 'v'],
                [O['+'], [O.length, [O.lookup, null, 'calls']], -1, [O.lookup, null, 'innerOffset']]
            ]
        ]}
]});
compileAssign(js, 'buildCalls_lookup', { parent: js, args: ['c', 'idx', 'innerOffset', 'src', 'f'], code: [O.do,
    [O.assign, null, 'vals', [O.list]],
    [O.assign, null, 'len', [O.length, [O.lookup, null, 'c']]],
    [O.assign, null, 'i', 2],
    [[O.assign, null, 'next', {code:[
        [O.if, [O['>='], [O.lookup, null, 'i'], [O.lookup, null, 'len']],
            {code:[O.do,
                [O.assign, null, 'max', [O['-'],
                    [O.length, [O.lookup, null, 'vals']],
                    [O.if, [O['='], [O.lookup, null, 'f'], O.lookup],
                        0,
                        {code:[O.if, [O['='], [O.lookup, null, 'f'], O.assign], 2, 1]}
                    ]
                ]],
                [O.assign, null, 's', 'args'],
                [O.assign, null, 'i', 0],
                [[O.assign, null, 'nextS', {code:[
                    [O.if, [O['>='], [O.lookup, null, 'i'], [O.lookup, null, 'max']],
                        {code:[O.do,
                            [O.assign, null, 'len', [O.length, [O.lookup, null, 'src']]],
                            //TODO: fix compiler to allow a direct-reference below (i.e 'indexStr'):
                            [O.assign, null, 'vs', ['indexStr', [O.lookup, null, 'vals', [O.lookup, null, 'max']]]],
                            [O.assign, null, 's',
                                [O.if, [O['='], [O.lookup, null, 'f'], O.assign],
                                    {code:[O['+'],
                                        '(',
                                        [O.if, [O['<'], [O.lookup, null, 'max'], 1],
                                            {code:[O.lookup, null, 's']},
                                            {code:[O['+'], '((', [O.lookup, null, 's'], ')||{})']}
                                        ],
                                        [O.lookup, null, 'vs'],
                                        ' = ',
                                        [O.lookup, null, 'vals', [O['+'], [O.lookup, null, 'max'], 1]],
                                        ')'
                                    ]},
                                    {code:[O.if, [O['='], [O.lookup, null, 'f'], O.exists],
                                        {code:[O['+'],
                                            [O.lookup, null, 'vals', [O.lookup, null, 'max']],
                                            ' in ',
                                            [O.if, [O['<'], [O.lookup, null, 'max'], 1],
                                                {code:[O.lookup, null, 's']},
                                                {code:[O['+'], '((', [O.lookup, null, 's'], ')||{})']}
                                            ]
                                        ]},
                                        {code:[O.if, [O['='], [O.lookup, null, 'f'], O.remove],
                                            {code:[O.do,
                                                [O.assign, null, 'src', [O['+'],
                                                    'var v = ',
                                                    [O.lookup, null, 's'],
                                                    ';\ndelete v',
                                                    [O.lookup, null, 'vs'],
                                                    ';\n',
                                                    [O.lookup, null, 'src']
                                                ]],
                                                [O['+'], 'v', [O.lookup, null, 'vs']]
                                            ]},
                                            {code:[O.lookup, null, 's']}
                                        ]}
                                    ]}
                                ]
                            ],
                            [O.if, [O['>'], [O.lookup, null, 'len'], 0],
                                {code:[O['+'],
                                    'var r',
                                    [O['+'], [O.lookup, null, 'idx'], [O.lookup, null, 'innerOffset']],
                                    ' = ',
                                    [O.lookup, null, 's'],
                                    ';\n',
                                    [O.lookup, null, 'src']
                                ]},
                                {code:[O['+'],
                                    'return O.tailcall(cb, env, [',
                                    [O.lookup, null, 's'],
                                    ']);'
                                ]}
                            ]
                        ]},
                        {code:[O.do,
                            [O.assign, null, 's', [O['+'],
                                [O.lookup, null, 's'],
                                [O.if, [O['>'], [O.lookup, null, 'i'], 0], {code:[O['+'], ' && ', [O.lookup, null, 's']]}, ''],
                                //TODO: fix compiler to allow a direct-reference below (i.e 'indexStr'):
                                ['indexStr', [O.lookup, null, 'vals', [O.lookup, null, 'i']]]
                            ]],
                            [O.assign, null, 'i', [O['+'], [O.lookup, null, 'i'], 1]],
                            [[O.lookup, null, 'nextS']]
                        ]}
                    ]
                ]}]]
            ]},
            {code:[O.do,
                //TODO: fix compiler to allow a direct-reference below (i.e 'valueStr'):
                [O.push, [O.lookup, null, 'vals'], ['valueStr', [O.lookup, null, 'c', [O.lookup, null, 'i']]]],
                [O.assign, null, 'i', [O['+'], [O.lookup, null, 'i'], 1]],
                [[O.lookup, null, 'next']]
            ]}
        ]
    ]}]]
]});
compileAssign(js, 'buildCalls_other', { parent: js, args: ['c', 'idx', 'innerOffset', 'src'], code: [
    O.if, [O['='], [O.lookup, null, 'c', 0, 'value'], O.do],
        {code:[O.do,
            //TODO: fix compiler to allow a direct-reference below (i.e 'valueStr'):
            [O.assign, null, 'v', ['valueStr',
                [O.if, [O['>'], [O.length, [O.lookup, null, 'c']], 1],
                    {code:[O.pop, [O.lookup, null, 'c']]},
                ]
            ]],
            [O.if, [O['>'], [O.length, [O.lookup, null, 'src']], 0],
                {code:[O['+'],
                    'var r',
                    [O['+'], [O.lookup, null, 'idx'], [O.lookup, null, 'innerOffset']],
                    ' = ',
                    [O.lookup, null, 'v'],
                    ';\n',
                    [O.lookup, null, 'src']
                ]},
                {code:[O['+'],
                    'return O.tailcall(cb, env, [',
                    [O.lookup, null, 'v'],
                    ']);'
                ]}
            ]
        ]},
        {code:[O.do,
            //TODO: fix compiler to allow a direct-reference below (i.e 'valueStr'):
            [O.assign, null, 'v', ['valueStr', [O.lookup, null, 'c', 0]]],
            [O.assign, null, 'str', [O['='], [O.charAt, [O.lookup, null, 'v'], 0], '"']],
            [O.assign, null, 's', [O['+'],
                'return O.tailcall(',
                [O.if, [O.lookup, null, 'str'],
                    {code:[O['+'],
                        'O.lookup, env, [env, ',
                        [O.lookup, null, 'v'],
                        '], function (f) {\nreturn O.tailcall(f'
                    ]},
                    {code:[O.lookup, null, 'v']}
                ],
                ', env, ['
            ]],
            [O.assign, null, 'len', [O.length, [O.lookup, null, 'c']]],
            [O.assign, null, 'i', 1],
            [[O.assign, null, 'nextC',
                {code:[O.if, [O['>='], [O.lookup, null, 'i'], [O.lookup, null, 'len']],
                    {code:[O['+'],
                        [O.lookup, null, 's'],
                        '], ',
                        [O.if, [O['<'], [O.length, [O.lookup, null, 'src']], 1],
                            'cb);',
                            {code:[O['+'],
                                'function(r',
                                [O['+'], [O.lookup, null, 'idx'], [O.lookup, null, 'innerOffset']],
                                ') {\n',
                                [O.lookup, null, 'src'],
                                '\n});'
                            ]}
                        ],
                        [O.if, [O.lookup, null, 'str'], '\n});', '']
                    ]},
                    {code:[O.do,
                        [O.assign, null, 's', [O['+'],
                            [O.lookup, null, 's'],
                            [O.if, [O['>'], [O.lookup, null, 'i'], 1], ', ', ''],
                            //TODO: fix compiler to allow a direct-reference below (i.e 'valueStr'):
                            ['valueStr', [O.lookup, null, 'c', [O.lookup, null, 'i']]]
                        ]],
                        [O.assign, null, 'i', [O['+'], [O.lookup, null, 'i'], 1]],
                        [[O.lookup, null, 'nextC']]
                    ]}
                ]}
            ]]
        ]}
]});
compileAssign(js, 'indexStr', { parent: js, args: ['v'], code: [O.do,
    [O.assign, null, 'len', [O.length, [O.lookup, null, 'v']]],
    [O.assign, null, 'end', [O['-'], [O.lookup, null, 'len'], 1]],
    [O.if, [O.and,
            [O['>'], [O.lookup, null, 'len'], 1],
            {code:[O['='], [O.charAt, [O.lookup, null, 'v'], 0], '"']},
            {code:[O['='], [O.charAt, [O.lookup, null, 'v'], [O.lookup, null, 'end'], '"']]}
        ],
        {code:[O['+'], '.', [O.substring, [O.lookup, null, 'v'], 1, [O.lookup, null, 'end']]]},
        {code:[O['+'], '[', [O.lookup, null, 'v'], ']']}
    ]
]});
compileAssign(js, 'valueStr', { parent: js, args: ['v', 'alias'], code: [
    O.if, [O['='], [O.type, [O.lookup, null, 'v']], 'number'],
        {code:[O['+'], 'r', [O.lookup, null, 'v']]},
        //TODO: fix compiler to allow a direct-reference below (js.stringify instead of 'stringify'):
        {code:[O.do, ['stringify', [O.lookup, null, 'v', 'value'], [O.lookup, null, 'alias']] ]}
]});
compileAssign(js, 'stringify', { parent: js, args: ['v', 'alias'], code: [O.do,
    [O.assign, null, 's',
        [O.if, [O['='], [O.lookup, null, 'alias'], false],
            '',
            {code:[O.or, ['globalStr', [O.lookup, null, 'v']], '']}
        ]
    ],
    [O.assign, null, 'sLen', [O.length, [O.lookup, null, 's']]],
    [O.if, [O['>'], [O.lookup, null, 'sLen'], 0],
        {code:[O.lookup, null, 's']},
        {code:[O.do,
            [O.assign, null, 't', [O.type, [O.lookup, null, 'v']]],
            [O.assign, null, 'isArray', [O['='], [O.lookup, null, 't'], 'array']],
            [O.if, [O.and,
                    [O.not, [O.lookup, null, 'isArray']],
                    {code:[O.not, [O['='], [O.lookup, null, 't'], 'object']]}
                ],
                {code:[function(x){return JSON.stringify(x) || '' + x;},
                    [O.lookup, null, 'v']
                ]},
                {code:[O.do,
                    [O.assign, null, 'keys', [O.keys, [O.lookup, null, 'v']]],
                    [O.assign, null, 'len', [O.length, [O.lookup, null, 'keys']]],
                    [O.assign, null, 'i', 0],
                    [[O.assign, null, 'nextProp',
                        {code:[O.if, [O['>='], [O.lookup, null, 'i'], [O.lookup, null, 'len']],
                            {code:[O.do,
                                [O.assign, null, 'anyS', [O['>'], [O.length, [O.lookup, null, 's']], 0]],
                                [O.if, [O.lookup, null, 'isArray'],
                                    {code:[O.if, [O.lookup, null, 'anyS'],
                                        {code:[O['+'], '[', [O.substring, [O.lookup, null, 's'], 2], ']']},
                                        '[]'
                                    ]},
                                    {code:[O.if, [O.lookup, null, 'anyS'],
                                        {code:[O['+'], '{', [O.substring, [O.lookup, null, 's'], 2], '}']},
                                        '{}'
                                    ]}
                                ]
                            ]},
                            {code:[O.do,
                                [O.assign, null, 'prop', [O.lookup, null, 'keys', [O.lookup, null, 'i']]],
                                [O.assign, null, 'propStr',
                                    [O.if, [O.lookup, null, 'isArray'],
                                        '',
                                        {code:[O['+'], ['stringify', [O.lookup, null, 'prop']], ':']}
                                    ]
                                ],
                                [O.assign, null, 's', [O['+'],
                                    [O.lookup, null, 's'],
                                    ', ',
                                    [O.lookup, null, 'propStr'],
                                    ['stringify', [O.lookup, null, 'v', [O.lookup, null, 'prop']], [O.lookup, null, 'alias']]
                                ]],
                                [O.assign, null, 'i', [O['+'], [O.lookup, null, 'i'], 1]],
                                [[O.lookup, null, 'nextProp']]
                            ]}
                        ]}
                    ]]
                ]}
            ]
        ]}
    ]
]});
compileAssign(js, 'globalStr', { parent: js, args: ['v'], code: [O.do,
    [O.assign, null, 'keys', [O.keys, O]],
    [O.assign, null, 'len', [O.length, [O.lookup, null, 'keys']]],
    [O.assign, null, 'i', 0],
    [[O.assign, null, 'nextGlobalProp',
        {code:[O.if, [O['<'], [O.lookup, null, 'i'], [O.lookup, null, 'len']],
            {code:[O.do,
                [O.assign, null, 'prop', [O.lookup, null, 'keys', [O.lookup, null, 'i']]],
                [O.if, [O['='], [O.lookup, null, 'v'], [O.get, O, [O.lookup, null, 'prop']]],
                    {code:[O['+'], 'O["', [O.lookup, null, 'prop'], '"]']},
                    {code:[O.do,
                        [O.assign, null, 'i', [O['+'], [O.lookup, null, 'i'], 1]],
                        [[O.lookup, null, 'nextGlobalProp']]
                    ]}
                ]
            ]}
        ]}
    ]]
]});

O.language = 'js';
O.compiler = O.compilers[O.language];
O.compile = O.compiler.compile;

// Do this AGAIN to make sure that the bootstrapped compiler still works the same:
compileNonNatives();

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
    "['set', ['lookup', null, 'root'], 'def', { args:['k', 'v'], code:[ 'do', ['if', ['and', ['has', ['lookup', null, 'v'], 'code'], {code:['not', ['has', ['lookup', null, 'v'], 'parent']]}], {code:['set', ['lookup', null, 'v'], 'parent', ['lookup', null, 'root']]}], ['set', ['lookup', null, 'root'], ['lookup', null, 'k'], ['lookup', null, 'v']]]}]",
    "['set', ['lookup', null, 'root', 'def'], 'parent', ['lookup', null, 'root']]",
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
    "['list', 1, [2, 3], 'four', {five:6}]",
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
    "['copy', ['list', 1, 2, 3]]",
    "['copy', {x:1, y:2, z:3}]",
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
    "['test-compile', '+4']",
    "['+4', 4]",
    "['test-compile', 'recur']",
    "['test-compile', 'recur']", // Compile twice to verify that src gets set properly so that re-compile works properly
    "['recur', 1]",
    "['recur', 2]",
    "['recur', 3]",
    "['recur', 4]",
    "['recur', 5]",
    "['test-compile', 'test-compile']",
    "['test-compile', '+n']",
    "[['+n', 3], 7]",
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
