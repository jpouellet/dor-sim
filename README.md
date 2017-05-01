# Simplex Algorithm Explainer

This web app allows you to input a simple linear program, and solves it using the Simplex algorithm showing the work for each and every step in full detail as if you were to do it on paper.

It also allows you to share your linear programs (and their worked-out solutions) by simply sharing a link.

I had originally designed this to be *way* over-ambitious, and didn't realize at first how incredibly much work it would be. As a result, the types of problems which this can actually solve are somewhat limited compared to what I initially set out to solve. This can be seen in how the first code written (representation of fractions, fractional arithmetic, generic polynomial representation, generic inequality representation, program parsing, visual representation of programs & tableaus, and even the general solver engine) were implemented in such a manner that they support much more than they are actually being used for at the moment.

## Usage Guide

### Program input

The program parser is somewhat libral in what it accepts. It was written to allow representation of a wider class of programs than the solver currently implements. See below for details.

Non-whole coeffecients can be specified in both fractional and decimal form, for example `0.5`, `.5`, and `1/2` all specify the same value. You may find the solutions produce results which are easier to follow if you use fractions, because arithmetic on fractions are kept in fractional form and reduced as appropriate.

#### Objective function

On the first line, you must provide your objective function, and whether the objective value should be minimized or maxmimized. However, currently only maximization problems are implemented by the solver.

An example of a valid objective declaration is given below:

```
max z = 60x1 + 30x2 + 20x3
```

#### Constraints

Then, provide the constraints of your program. For example:

```
8x1 + 6x2 + x3 <= 48
```

Note that in general whitespace can be provided between any tokens you like. For example, the following constraints are also valid:

```
4x1+2x2+3/2x3<=20
2 x1  +   3/2    x2     +      1/2      x3        <=         8
```

#### Variable restrictions

Finally, provide the restrictions for your variables.

At this time, only non-negative variables are supported by the solver.

For example:
```
x1 non-negative
```

Multiple variables can be specified on separate lines, or, if they have the same restriction, on the same line. For example, the following are equivelant:
- ```
  x1 non-negative
  x2 non-negative
  x3 non-negative
  ```
- ```
  x1, x2, x3 non-negative
  ```

### Sharing a program:

To share a program, simply copy the link provided below the program input box. This link encodes the exact program representation you provided. The intention is that it with this it becomes possible to e.g. provide links to solutions of problems worked out in an introductory Operations Research class, so that students who have trouble following along in class (perhaps because they didn't understand some critical intermediate step) to review the complete solution process with every intermediate step shown and fully explained.

It would likely be prohibitively expensive in terms of the instructor's time to produce full work for every example, but if it is automatically generated on the fly, you can see infinite examples fully and correctly worked out, without ever having to go to a TA.

## Implementation notes

### Solver

The solver is internally implemented by describing a graph describing the individual steps of the algorithm. Nodes represent intermediate states of solving the problem, and edges represent how to perform the corresponding step to transition from the first state to the next.

This allows you to hand any intermediate step to the solver, as well as the desired end state, and have it figure out what steps are necessary to get there. This also makes it easy to extend the solver by implementing new steps in isolation and just describing what representation they start and end with.

The following is an excerpt of the solver's internal graph illustrating the common steps necessary for solving a simple maximization problem:
```
  {from: 'program', to: 'stdprogram', cb: standardizeProgram},
  {from: 'stdprogram', to: 'unknowntableau', cb: standardProgramToTableau},
  {from: 'unknowntableau', to: 'bfstableau', cb: findBasicFeasibleSolution},
  {from: 'bfstableau', to: 'optimaltableau', cb: simplexIteration},

  {from: 'bfstableau', to: 'enteringtableau', cb: pickEnteringVariable},
  {from: 'enteringtableau', to: 'leavingtableau', cb: findLeavingVariable},
  {from: 'leavingtableau', to: 'nextbfs', cb: pivot},
  {from: 'optimaltableau', to: 'solution', cb: readObjFn},
```

### Live re-solving

This webapp is internally implemented using [React](https://facebook.github.io/react/) and [Redux](http://redux.js.org/). These web frameworks bring [functional programming](https://en.wikipedia.org/wiki/Functional_programming) paradigms to the web.

React lets you describe pure-functional "components" which transform an arbitrary JavaScript object into a [DOM](https://en.wikipedia.org/wiki/Document_Object_Model) tree (for example, an internal representation of a tableau into an HTML table correctly laying out the tableau's values).

Redux manages state of your application, letting you describe transitions lets you implement all transitions to the state of your application as "reducers", pure functions which take the current state and an action to be performed on that state, and return a new state representing the given action applied to the current state. The previous and next states can be compared to determine the minimum set of changes which need to be applied to the rendered content. This allows me to re-solve and re-render all changes on the fly, so that the solution to a linear program updates dynamically as you change its description.

### Math rendering

The rendering of the fancy math is done using the [KaTeX](https://khan.github.io/KaTeX/) library, which takes LaTeX-formatted strings and typesets them synchronously in the browser. I originally tried using [MathJax](https://www.mathjax.org/), but it was too heavy-weight and the asynchronous rendering caused issues with React.
