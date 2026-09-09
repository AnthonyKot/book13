# ch7 — Nil-Safe Pointer Traversal

**Verified.** Reference solution (Floyd with `fast != nil && fast.Next != nil`) passes all 5 hidden
tests in yaegi and gives identical results under gc 1.22 on empty, 1/2/3-node acyclic lists, self,
two-node and middle-entry cycles, links unchanged. Prediction run with `go run`: the unguarded loop
panics on 0, 2 and 4 nodes and exits on 1 and 3, so "panics" is the only correct option. Also
checked that yaegi runs `main()` on Eval and that a nil dereference inside `hasCycle` is caught by
the hidden tests' `recover()` in the interpreter (it is; yaegi additionally prints a
`panic: main.hasCycle(...)` line to the output).

**Changed.**
- Starter was `return false`; it is now the prediction's own guard `for fast.Next != nil` with the
  meeting check, and `main` builds a three-node list so the starter prints `false` and exits by
  parity luck. gc and yaegi: 3 pass, 2 fail (empty list, acyclic endpoints).
- "acyclic endpoints" now also tests a two-node list; before, its 1- and 3-node lists could not
  catch the unguarded loop at all. Test names unchanged.
- Lesson no longer prints the full solution; it shows unsafe vs safe guard with the parity table
  and states that a nil dereference is a panic, not a catchable exception at the call site.
- Panic FAIL message now says what to prove: "The guard reads fast.Next, so it must first prove
  fast != nil; fast = fast.Next.Next can make fast nil." Hints escalate (trace a two-node list →
  one proof per dereference, `&&` order → add the proof to the front of the condition).

**Unsettled.** Nothing.
