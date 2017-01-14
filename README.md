# Objects
JavaScript POC for open-ended "sculpting" of software systems by non-programmers.

This is accomplished by facilitating ad-hoc creation & manipulation of arbitrary data-models and processes ("code") through a visual interface (e.g. as objects on your screen instead of as textual code). The entire system is itself composed of the same kind of objects, and thus everything (how it is displayed, how you can interact, and how the "code" is run) is exposed for runtime modification.

It may begin as a generic visualization of data-trees, but the idea is to create custom visualizations for different kinds of data. For example, instead of displaying numbers that describe the size & position of a ball, draw the actual ball, and allow the "data" to be edited by clicking & dragging rather than by typing numbers. (see Brett Victor's ["Magic Ink"](http://worrydream.com/MagicInk))

The underlying language is like [Scheme](https://en.wikipedia.org/wiki/Scheme_(programming_language)), but with [JSON](https://en.wikipedia.org/wiki/JSON) in place of [S-Expressions](https://en.wikipedia.org/wiki/S-expression), and with grammar that is context-dependent ([DSLs](https://en.wikipedia.org/wiki/Domain-specific_language)) and modifiable at runtime (like [Forth](https://en.wikipedia.org/wiki/Forth_(programming_language))). Though the goal is a dynamic system for the end-user and not a "magic" language, it is that underlying dynamic language-model that makes such a system possible. ... You might say that I want to bring the power of [Lisp](https://en.wikipedia.org/wiki/Lisp_(programming_language)) beyond the programmer/language level and up to the end-user level.

PLAN:

1. **Make an interpreter** that executes code in the form of an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) object-graph (rather than parsing textual code). The operations ([grammar](https://en.wikipedia.org/wiki/Formal_grammar)) allowed in the AST consist mainly of the operations for manipulating AST objects (get property, set property, has property, delete property, etc.). These operations are defined as objects within a built-in AST, and can thus all be modified at runtime. This AST is expanded at runtime through layers of "activation frames" (call stacks), so operations only for certain contexts ([DSLs](https://en.wikipedia.org/wiki/Domain-specific_language)). The interpreter can also execute "native" (JavaScript) functions stored within AST code (this is necessary to establish a set of base operations), and thus the system can be extended with new "native" functionality at runtime. The interpreter is also inserted into the built-in AST so that it can *itself* be accessed and modified at runtime (see step 3). **This is the only part of the system coded directly in JavaScript. Everthing else following is coded as AST objects hard-coded into the JavaScript program.**

2. **Create a interactive UI** (visual interface) as the sole means for interacting (as an end-user) with the system. For now, this just provides a generic way to inspect and edit AST objects in a visual interactive fashion. (This requires some "native" code for graphics and user interaction, but *all* of it is coded into the AST). This voids the need for a [REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop), since [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) objects to be created, modified, and executed directly in a visual manner.

3. **Create a serializer** that serializes the entire runtime system into JavaScript source code. This is accomplished by serializing the whole system as a single [JSON](https://en.wikipedia.org/wiki/JSON) object, wrapped by JavaScript code which creates this object and initializes the UI (by invoking the interpreter on the UI "startup" code). **From this point, further modification of the system can be done entirely through the interactive UI.**

4. **"[Bootstrap](https://en.wikipedia.org/wiki/Bootstrapping)" the interpreter** by re-coding it as an AST object-graph (like everything else).

5. **Create a Compiler** that convert AST objects into native JavaScript code. This might only work for a certain subset of code, but it mainly just needs to work on the interpreter. (It might be possible to walk the code-to-compile and collect all the "native" code that would be executed, instead of actually exeucting it ... I'll have to look into that more).

6. ... IN THE PROCESS OF EDITING THIS ...

7. Having fulfilled this POC, the next goal will be to apply this same concept at the machine-level, rather than just in JavaScript. This may be achievable directly from JavaScript by implementing a JIT compiler: The bootstrapper and JIT compiler would be coded in the language of the system rather in "native" JavaScript (they'd be JIT-compiled as part of the bootstrapping process, so that they can actually do their thing). The whole system could then JIT-compile itself into a program for another platform. Since the bootstrapper was written in the language of the system, the compiled system then contains a bootstrapper for that other system. Since the JIT compilers (there'd be at least 2: one for JavaScript, and another for the new platform) "come with" in this process, the whole system would be capable of transferring itself from platform to platform ... Kind of like [Ultron](https://en.wikipedia.org/wiki/Ultron) :)

HOW TO TEST / USE IT:

There is not much to "see" yet, but you can execute ad-hoc code from this [Test Page](https://rawgit.com/d-cook/Objects/master/Objects.html) (Objects.html in "raw" mode) by executing something of the following form from the F12 Developer Console:
run(YOUR_AST_OBJECT, YOUR_ENVIRONMENT, YOUR_CALLBACK)); // Either environment or callback (or both) can be omitted

(TODO: Somehow update the above "Test Page" URL to be relative to the current URL / branch ... is that even possible?)
