# Objects
**JavaScript POC for a fully user-modifiable software system.**

The goal is to create a software system that escapes the rigid boundaries of conventional software tools and [programming languages](https://en.wikipedia.org/wiki/Programming_language) by empowering the end-user to create their own experience through [direct-manipulation](https://en.wikipedia.org/wiki/Direct_manipulation_interface). Everything within the system (including all parts of the system *itself*) will be composed of "objects" that can be created & modified through a visual interface, and thus everything about the system can be modified *while you are using it*. ([Discuss on forum](https://www.cemetech.net/forum/viewtopic.php?p=253206#253206), or see **Motivation** further down)

**How is this possible?**

The "things" in a computer exist only as *representations* -- in other words, it's all just structured information. Traditionally, everything is stored as raw data without any explicit structure, and each software tool must convert it into a structure that can be viewed or manipulated in some meaningful way. If instead, everything was stored in an explicit structural form *to begin with*, then you could *directly* modify everything however you want, rather than only doing what each software tool allows. This structure will consist of "objects" that can be modifed in place and combined to form any ad-hoc structure of information. And since "code" is nothing more than structured information for "what to do" ([code is data](https://blogs.mulesoft.com/dev/news-dev/code-is-data-data-is-code/)), this means creating & modifying whatever "things" and *behaviors* you want.

**What will it look like?**

All that matters here is that there is *any* interface to begin with, because the end-user can then manipulate it into whatever they want. This calls for a minimal interface just good enough to allow one to see and manipulate the structure of everything. And by making it a *visual* interface (GUI), the user's ability to modify it also means that they can create whatever *graphical* representation or tool that is most ideal for each scenario. For example, editing the size & position of a ball by clicking and dragging *a ball*, rather than by editing *numeric data* about a ball (see Brett Victor's "[Dynamic Visualizations](http://worrydream.com/DrawingDynamicVisualizationsTalk)" and "[Learnable Programming](http://worrydream.com/LearnableProgramming/)").

**Implications for Programming**

*(TO-DO: INSERT EXPLAINATION OF HOW THIS ESCAPES ANY SPECIFIC PROGRAMMING LANGUAGE)*

Every operation that can be performed on an object (and thus on any part of the system), is itself stored as an object within the system. Thus, everything that happens within the system -- whether it be from user-interaction or from running code -- is accomplished by triggering one or more of these operations. This dissolves the boundary between "programming" (API) and user-interaction (UI), because the end-user can now do anything that code can do, and vice versa.

**Motivation**

*(TO-DO: THIS)*

*(Alan Kay's "Computer revolution hasn't happened yet"; Kay, Engelbart, Alexander all tried to expand human aspects; Brett Victor; programming is generally awful, and a better interface is needed to see enough to do it right. Also, every other software tool other than programming has a better interface than text. Something non-perscriptive, but open-ended and exploratory)*

**IMPLEMENTATION PLAN / HOW IT WORKS:**

1. **Make an interpreter** that executes code provided in the form of an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) object-graph. The operations ([grammar](https://en.wikipedia.org/wiki/Formal_grammar)) allowed in the AST consist mainly of the operations for manipulating AST objects (get, set, exists, delete, etc.) is built upon a similar small set of verbs). These operations are defined as objects within a built-in AST, and can thus all be modified at runtime. This AST is expanded at runtime through layers of "activation frames" (call stacks), allowing for context-dependent operations ([DSLs](https://en.wikipedia.org/wiki/Domain-specific_language)). The interpreter can also execute "native" (JavaScript) functions stored within AST code (this is necessary to establish a set of base operations), and thus the system can be extended with new "native" functionality at runtime. The interpreter is also inserted into the built-in AST so that it can *itself* be accessed and modified at runtime (see step 3). **This interpreter is the only part of the system coded directly in JavaScript. Everthing else following is code in terms of objects within the AST.**

2. **Create an interactive UI** (visual interface) as the sole means for interacting (as an end-user) with the system. For now, this just provides a generic way to inspect and edit AST objects in a visual interactive fashion. (This requires some "native" code for graphics and user interaction, but *all* of it is coded into the AST). This voids the need for a [REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop), since [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) objects to be created, modified, and executed directly in a visual manner.

3. **Create a serializer** that serializes the entire runtime system into JavaScript source code. This is accomplished by serializing the whole system as a single [JSON](https://en.wikipedia.org/wiki/JSON) object, wrapped by JavaScript code which creates this object and initializes the UI (by invoking the interpreter on the UI "startup" code). **From this point, further modification of the system can be done entirely through the interactive UI.**

4. **Create a Compiler** that convert AST objects (*at least* the ones needed for step 5) into native JavaScript code. (It might be possible to make this work for *all* ASTs by altering the interpreter to collect (rather than execute) all the "native" code that it encounters ... I'll have to look into that more).

5. **"[Bootstrap](https://en.wikipedia.org/wiki/Bootstrapping)" the interpreter** by re-coding it as an AST object-graph (like everything else). The intpreter can now be edited entirely in AST form, and then compiled to replace the existing "native" interpreter. (The AST interpreter could also just run on top of the "native" one to test it amid modifications). **Now the *Entire* system is modifiable in AST form.**

6. By creating compilers for other platforms, the entire system can transfer itself to any other environment or machine. And since everything is written in the high-level language of the system, everything from the old system "comes with". In this way, the system becomes capable of transferring itself from platform to platform (and back again) ... Kind of like [Ultron](https://en.wikipedia.org/wiki/Ultron) :)

HOW TO TEST / USE IT:

There is not much to "see" yet, but you can execute ad-hoc code from this [Test Page](https://rawgit.com/d-cook/Objects/master/Objects.html) (Objects.html in "raw" mode) by executing something of the following form from the F12 Developer Console:
run(YOUR_AST_OBJECT, YOUR_ENVIRONMENT, YOUR_CALLBACK)); // Either environment or callback (or both) can be omitted

(TODO: Somehow update the above "Test Page" URL to be relative to the current URL / branch ... is that even possible?)
