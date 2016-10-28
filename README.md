# Objects
JavaScript POC for a self-defining open ended software system.

The underlying language is like [Scheme](https://en.wikipedia.org/wiki/Scheme_(programming_language)), but with [JSON](https://en.wikipedia.org/wiki/JSON) in place of [S-Expressions](https://en.wikipedia.org/wiki/S-expression). However, the end-goal is not a magic language, but a fully self-modifying system that can be/do whatever you want, however you want. Think [LISP macros](https://en.wikipedia.org/wiki/Macro_(computer_science)#Syntactic_macros) that map betwen code and UI rather than just between code and code. Think [AngularJS](https://en.wikipedia.org/wiki/AngularJS) (or [REACT](https://en.wikipedia.org/wiki/React_(JavaScript_library))) in reverse.

PLAN:

1. Make an evaluator that can execute code provided in the form of an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) object-graph. Do not be concerned with parsing "source code" from text, but there should be sufficient means to create & run code directly in [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) form.

2. Add language features / operations to support other general purpose programming needs (enough to be able to do step 3).

3. "Bootstrap" the system by re-coding it in terms of the aforementioned language features. This consists of an object-representation of the entire system, and a bit of JavaScript (the "bootstrapper") to initially create those objects. The bootstrapper should also package (or copy) itself into said objects.

4. Create a interactive UI as the sole interface (API) for interacting with the system. (This will require a base layer of UI / graphics tools be coded in JavaScript; but this and the specific UI built on top of it should be packaged up into objects. This UI voids the need for a [REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop) or any text parsing, by instead allowing the DIRECT creation & manipulation of [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) objects.

5. From this point on, the system is completely self-modifying and self-describing. Thus the evaluator, the language, any underlying "native" JavaScript, and the interactive UI can all be changed (or even replaced) directly through the interactive UI.

6. At this point, a means should be created to serialize ("save") a copy of the system to the external world; otherwise everything is "reset" when the system is launched next time, since it would bootstrap the same initial objects.

7. Having fulfilled this POC, the next goal will be to apply this same concept at the machine-level, rather than just in JavaScript. This may be achievable directly from JavaScript by implementing a JIT compiler: The bootstrapper and JIT compiler would be coded in the language of the system rather in "native" JavaScript (they'd be JIT-compiled as part of the bootstrapping process, so that they can actually do their thing). The whole system could then JIT-compile itself into a program for another platform. Since the bootstrapper was written in the language of the system, the compiled system then contains a bootstrapper for that other system. Since the JIT compilers (there'd be at least 2: one for JavaScript, and another for the new platform) "come with" in this process, the whole system would be capable of transferring itself from platform to platform ... Kind of like [Ultron](https://en.wikipedia.org/wiki/Ultron) :)

HOW TO TEST / USE IT:

There is not much to "see" yet, but you can execute ad-hoc code from this [Test Page](https://rawgit.com/d-cook/Objects/master/Objects.html) (Objects.html in "raw" mode) via Developer Tools (press F12 on that page) by hitting a break-point to cature a reference to the "run" function, and then executing something of the following form from the Console:
run(O.evel(YOUR_CALLBACK_HERE, YOUR_AST_CODE_HERE, O));

(TODO: Somehow update the above "Test Page" URL to be relative to the current URL / branch ... is that even possible?)
