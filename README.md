# Objects
**JavaScript POC for a fully user-modifiable software system.**

The goal is to demonstrate / explore a way to escape the rigid boundaries imposed by conventional software tools and [Programming Languages](https://en.wikipedia.org/wiki/Programming_language) by empowering the end-user to create their own experience & models through direct-manipulation.

This POC will consist of software system for creating ad-hoc software entities by manipulating visual object-models. The entire system will *itself* be composed of these objects, so that *everything* about the system can be modified *while you are using it*. The idea is to be able to create the ideal visualization or interaction for everything, e.g. clicking and dragging a ball rather than editing numeric data *about* a ball. (Brett Victor demonstrates concept well: "[Dynamic Visualizations](http://worrydream.com/DrawingDynamicVisualizationsTalk)", "[Learnable Programming](http://worrydream.com/LearnableProgramming/)", "[Magic Ink](http://worrydream.com/MagicInk)")

In order for this system to be modifiable through a user-interface, it must be able to "see" and modify its own underlying structure. Thus the entire system -- all data *and behaviors (code)* -- is built up from generic building-blocks that can be structured to represent any data model (in other words, a [Lisp](https://en.wikipedia.org/wiki/Lisp_(programming_language)). My current implementation is a mix of [Scheme](https://en.wikipedia.org/wiki/Scheme_(programming_language)), [JSON](https://en.wikipedia.org/wiki/JSON), and [Forth](https://en.wikipedia.org/wiki/Forth_(programming_language))).*

**IMPLEMENTATION PLAN / HOW IT WORKS:**

1. **Make an interpreter** that executes code provided in the form of an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) object-graph. The operations ([grammar](https://en.wikipedia.org/wiki/Formal_grammar)) allowed in the AST consist mainly of the operations for manipulating AST objects (get, set, exists, delete, etc.) is built upon a similar small set of verbs). These operations are defined as objects within a built-in AST, and can thus all be modified at runtime. This AST is expanded at runtime through layers of "activation frames" (call stacks), allowing for context-dependent operations ([DSLs](https://en.wikipedia.org/wiki/Domain-specific_language)). The interpreter can also execute "native" (JavaScript) functions stored within AST code (this is necessary to establish a set of base operations), and thus the system can be extended with new "native" functionality at runtime. The interpreter is also inserted into the built-in AST so that it can *itself* be accessed and modified at runtime (see step 3). **This interpreter is the only part of the system coded directly in JavaScript. Everthing else following is code in terms of objects within the AST.**

2. **Create an interactive UI** (visual interface) as the sole means for interacting (as an end-user) with the system. For now, this just provides a generic way to inspect and edit AST objects in a visual interactive fashion. (This requires some "native" code for graphics and user interaction, but *all* of it is coded into the AST). This voids the need for a [REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop), since [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) objects to be created, modified, and executed directly in a visual manner.

3. **Create a serializer** that serializes the entire runtime system into JavaScript source code. This is accomplished by serializing the whole system as a single [JSON](https://en.wikipedia.org/wiki/JSON) object, wrapped by JavaScript code which creates this object and initializes the UI (by invoking the interpreter on the UI "startup" code). **From this point, further modification of the system can be done entirely through the interactive UI.**

4. **Create a Compiler** that convert AST objects (*at least* the ones needed for step 5) into native JavaScript code. (It might be possible to make this work for *all* ASTs by altering the interpreter to collect (rather than execute) all the "native" code that it encounters ... I'll have to look into that more).

5. **"[Bootstrap](https://en.wikipedia.org/wiki/Bootstrapping)" the interpreter** by re-coding it as an AST object-graph (like everything else). The intpreter can now be edited entirely in AST form, and then compiled to replace the existing "native" interpreter. (The AST interpreter could also just run on top of the "native" one to test it amid modifications). **Now the *Entire* system is modifiable in AST form.**

6. ... IN THE PROCESS OF EDITING THIS ...

7. Having fulfilled this POC, the next goal will be to apply this same concept at the machine-level, rather than just in JavaScript. This may be achievable directly from JavaScript by implementing a JIT compiler: The bootstrapper and JIT compiler would be coded in the language of the system rather in "native" JavaScript (they'd be JIT-compiled as part of the bootstrapping process, so that they can actually do their thing). The whole system could then JIT-compile itself into a program for another platform. Since the bootstrapper was written in the language of the system, the compiled system then contains a bootstrapper for that other system. Since the JIT compilers (there'd be at least 2: one for JavaScript, and another for the new platform) "come with" in this process, the whole system would be capable of transferring itself from platform to platform ... Kind of like [Ultron](https://en.wikipedia.org/wiki/Ultron) :)

HOW TO TEST / USE IT:

There is not much to "see" yet, but you can execute ad-hoc code from this [Test Page](https://rawgit.com/d-cook/Objects/master/Objects.html) (Objects.html in "raw" mode) by executing something of the following form from the F12 Developer Console:
run(YOUR_AST_OBJECT, YOUR_ENVIRONMENT, YOUR_CALLBACK)); // Either environment or callback (or both) can be omitted

(TODO: Somehow update the above "Test Page" URL to be relative to the current URL / branch ... is that even possible?)
