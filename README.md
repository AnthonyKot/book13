# The Go Shift

Fourteen small, executable labs for experienced developers learning to make decisions in Go.

The course is arranged around mental-model changes rather than language syntax:

- **Think in Go** — values, errors, slices, retained storage, and text
- **Solve in Go** — maps, nil-safe traversal, and standard-library contracts
- **Ship in Go** — cancellation, goroutine ownership, bounded concurrency, and dependency boundaries

Every lab asks for a prediction before code runs, compiles the learner's program in the browser,
checks behavior with hidden cases, explains individual failures, and closes with a transfer question.
Passing tests is recorded separately from opening a lesson or revealing hints.

Every lab has a stable link: `https://anthonykot.github.io/book13/#lab-4` opens Lab 4 directly, the
"Copy link" control in the lab header copies it, and the curriculum entries are ordinary links. The
lab's mental model and recognition cue appear only after the reader commits a prediction, so the
prediction is made before the answer is on screen.

## Local development

```bash
npm install
npm run dev
```

Vite serves the application at `http://localhost:5173/book13/` by default.

## Build and checks

```bash
npm run lint
npm run build
```

The Go evaluator is compiled to WebAssembly from `wasm-compiler/` and committed as
`public/yaegi.wasm`. Rebuild it after changing the bridge:

```bash
cd wasm-compiler
GOOS=js GOARCH=wasm go build -o ../public/yaegi.wasm .
```

Learner programs run in a Web Worker. A five-second guard terminates a stuck evaluator and starts a
fresh one without discarding the editor contents.

## Chapter contract

Chapter definitions live in `src/data/chapters/` and implement the shared type in
`src/data/types.ts`. A chapter contains:

1. one old instinct to replace;
2. an observable outcome and recognition cue;
3. a committed prediction;
4. a concise rule;
5. one coding task;
6. executable behavioral tests;
7. progressive hints;
8. a debrief and transfer question.

Hidden tests are evaluated after the learner program has compiled. They report structured lines with
the `__GO_SHIFT_TEST__` marker; completion is never awarded from source-text matching.

## Deployment

The Vite base path is `/book13/`. GitHub Pages deployment uses:

```bash
npm run deploy
```
