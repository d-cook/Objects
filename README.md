# Objects
JavaScript POC for open-ended "sculpting" of software systems by non-programmers.

This is accomplished by facilitating ad-hoc creation & manipulation of arbitrary data-models and processes ("code") through a visual interface (e.g. as objects on your screen instead of as textual code). The entire system is itself composed of the same kind of objects, and thus everything (how it is displayed, how you can interact, and how the "code" is run) is exposed for runtime modification.

It may begin as a generic visualization of data-trees, but the idea is to create custom visualizations for different kinds of data. For example, instead of displaying numbers that describe the size & position of a ball, draw the actual ball, and allow the "data" to be edited by clicking & dragging rather than by typing numbers. (see Brett Victor's ["Magic Ink"](http://worrydream.com/MagicInk))

The underlying language is like [Scheme](https://en.wikipedia.org/wiki/Scheme_(programming_language)), but with [JSON](https://en.wikipedia.org/wiki/JSON) in place of [S-Expressions](https://en.wikipedia.org/wiki/S-expression), and with grammar defined in a runtime dictionary instead of hard-coded into the interpreter (thus allowing language to be context-dependent ([DSLs](https://en.wikipedia.org/wiki/Domain-specific_language)) and modifiable at runtime, like [Forth](https://en.wikipedia.org/wiki/Forth_(programming_language))). The end-goal is not a magic language, but a dynamic system for the end-user; though that is only possible if built upon a language/model that is itself self-modifiable. ... You might say that I want to bring the power of Lisp beyond the programmer/language level and up to the end-user level.

PLAN:

1. Make an evaluator that can execute code provided in the form of an [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) object-graph. Do not be concerned with parsing "source code" from text, but there should be sufficient means to create & run code directly in [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) form.

2. Add language features / operations to support other general purpose programming needs (enough to be able to do step 3).

3. "Bootstrap" the system by re-coding it in terms of the aforementioned language features. This consists of an object-representation of the entire system, and a bit of JavaScript (the "bootstrapper") to initially create those objects. The bootstrapper should also package (or copy) itself into said objects.

4. Create a interactive UI as the sole interface (API) for interacting with the system. (This will require a layer of UI / graphics tools be coded in JavaScript, but the system will support for embedding "native" code). This UI voids the need for a [REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop), allowing [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree) objects to be created & modified directly, rather than having to parse them from text.

5. From this point on, the system is completely self-modifying and self-describing. Thus the evaluator, the language, any underlying "native" JavaScript, and the interactive UI can all be changed (or even replaced) directly through the interactive UI.

6. At this point, a means should be created to serialize ("save") a copy of the system to the external world; otherwise everything is "reset" when the system is launched next time, since it would bootstrap the same initial objects.

7. Having fulfilled this POC, the next goal will be to apply this same concept at the machine-level, rather than just in JavaScript. This may be achievable directly from JavaScript by implementing a JIT compiler: The bootstrapper and JIT compiler would be coded in the language of the system rather in "native" JavaScript (they'd be JIT-compiled as part of the bootstrapping process, so that they can actually do their thing). The whole system could then JIT-compile itself into a program for another platform. Since the bootstrapper was written in the language of the system, the compiled system then contains a bootstrapper for that other system. Since the JIT compilers (there'd be at least 2: one for JavaScript, and another for the new platform) "come with" in this process, the whole system would be capable of transferring itself from platform to platform ... Kind of like [Ultron](https://en.wikipedia.org/wiki/Ultron) :)

HOW TO TEST / USE IT:

There is not much to "see" yet, but you can execute ad-hoc code from this [Test Page](https://rawgit.com/d-cook/Objects/master/Objects.html) (Objects.html in "raw" mode) by executing something of the following form from the F12 Developer Console:
run(YOUR_AST_OBJECT, YOUR_ENVIRONMENT, YOUR_CALLBACK)); // Either environment or callback (or both) can be omitted

(TODO: Somehow update the above "Test Page" URL to be relative to the current URL / branch ... is that even possible?)
