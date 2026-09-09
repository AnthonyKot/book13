# ch8 — The container/heap Contract

**Verified.** Reference solution (min-heap adapter, `Pop` removes `Len()-1`) passes all 4 hidden
tests in yaegi and produces the same sequences under gc 1.22 with a scratch driver replicating the
tests (`-2 1 1 3 5`; `-1` then `-3 0 4 4`). Prediction checked against the standard library source:
`heap.Pop` is `Swap(0, n); down(h, 0, n); return h.Pop()`, so "last" is the only correct option.
Version claims checked: `any` since Go 1.18, the Push/Pop contract unchanged since Go 1.0.

**Changed.**
- Starter was five empty stubs; it is now a correct Len/Less/Swap/Push with the lab's named wrong
  instinct, a `Pop` that removes index 0. Its `main` prints `minimum: 1` and then `popped: 2`.
  gc and yaegi: 2 pass (initialize, push and priority), 2 fail (ordered pops, interleaved).
- Lesson no longer prints the adapter `Pop` answer; it shows the four lines of the library's
  `heap.Pop` and `heap.Push`, which is the contract the lab is about.
- "root" option explanation now says what goes wrong: "removing index 0 now discards the wrong
  element and leaves the minimum in the slice."
- FAIL messages for ordered pops and interleaved operations state the expected sequences and
  which slot each callback owns. Hints escalate (tests already passing point at Pop → the
  documented contract → read last, reslice, return; do not touch index 0).
- Challenge description rewritten from "implement the remaining methods" to the actual task.

**Unsettled.** Nothing.
