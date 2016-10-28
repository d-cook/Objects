# Objects
JavaScript POC for a self-defining open-ended software system. It will feel a lot like [Scheme](https://en.wikipedia.org/wiki/Scheme_(programming_language)), but built with JavaScript-like objects instead of S-Expressions (lists). The end-goal is not a magic language, but a fully self-modifying system that can be/do whatever you want, however you want. Take the idea of LISP macros, but apply it to UI models rather than just the syntax of the underlying execution code.

PLAN:

1. Make a "kernel" that can evaluate ("run") code in the form of an AST object-graph (I'm not concerned with parsing "source code" from text). The parts of this kernel will (eventually) be made of the very same kind of AST objects that it manipulates, with the end-goal being a fully self-modifying system.

2. Add language features. These should come in the form of auxiliary functions built the "root" AST object-graph, such that it can be inspected & modified by the very code that the system executes.

3. "Bootstrap" the system by re-coding it all in terms of the aforementioned language features. This will involve some JavaScript that creates the initial state of the system on start-up, but then throws itself out, leaving just the system.

4. Create a UI that exposes as the sole interface (API) for interacting with the system. This voids the need for a REPL or any parsing of "source code", by instead allowing AST objects to be created, manipulated, and inspected through direct interaction.

5. From this point on, the system is completely self-modifying, because everything within it is composed of objects that it can modify. This includes all language features, the interactive UI, the core kernel (the "eval"), and any underlying "native" JavaScript. Nothing is permanent, as the old can be thrown out in place of the newly created.

6. Having fulfilled this POC, the next goal will be to apply this same concept at the machine-level, rather than just in JavaScript. This may be partially achievable from JavaScript though, supposing that the following tools are made (which can be done interactively as stated in step 5): A self-serializer is written in it (e.g. a means to "save" and "load" the system from some source); A "native" code editor (e.g. view and edit the underlying JavaScript, where applicable); A JIT compiler (e.g. code many parts in terms of the language of the system, and then have it JIT compile to native code). For example, if the bootstrapper and other "loew-level" functionality is written in the high-level language of the system, and then a JIT compiler is made to target another platform, then the system can compile itself down into another format, and then save itself off to be booted within a different machine platform. Thus, the whole system would be capable of replicating itself across different platforms, and it could even take a collection of JIT compilers with it so that it can go back & forth. ... Kind of like [Ultron](https://en.wikipedia.org/wiki/Ultron) :)

HOW TO TEST / USE IT:

There is not much to "see" yet, but you execute ad-hoc code from this [Test Page](https://rawgit.com/d-cook/Objects/master/Objects.html) (Objects.html in "raw" mode). This is currently only possible via Developer Tools (press F12 on that page), hitting a break-point to cature a reference to the "run" function, and then executing something of the following form from the Console:
run(O.evel(YOUR_CALLBACK_HERE, YOUR_AST_CODE_HERE, O));

(TODO: Somehow update the above "Test Page" URL to be relative to the current URL / branch ... is that even possible?)
