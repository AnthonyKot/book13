# ch9 — Bound the Scarce Thing

**Verified.** Reference solution (permit channel of capacity `limit`, acquire before `go`, release deferred inside, WaitGroup) passes all 5 hidden tests in yaegi and under `go run -race` (3/3 runs each, go1.22.2). Prediction re-run with gc: 9,170 goroutines alive right after the loop, peak 3 simultaneous `useDatabase` calls, 10,000 total, so "active database calls: three" is the only correct option. Starter fails exactly `uses concurrency`; `go vet` is clean on it.

**Finding — yaegi and gc disagree on loop variables.** yaegi 0.16.1 uses pre-Go-1.22 semantics: a goroutine that captures `id` without passing it as an argument passes all tests under gc (go 1.22 module) and fails `all tasks` in yaegi, 3/3 each way. `for id := range taskCount` does not compile-error in yaegi, it panics the interpreter (`nil type`), which the worker surfaces as an evaluator error. The challenge description now states both constraints, dated to yaegi 0.16 / Go 1.22, and the `all tasks` FAIL message says "If several goroutines ran the same ID, they share the loop variable: pass id into the goroutine as an argument."

**Also changed.** `limit one` mutated `singleActive` without the mutex; race-free for a correct solution but a data race in the test itself for a wrong one, now guarded. Lesson gained a paragraph on the WaitGroup (the task requires waiting, the lesson never mentioned it). Hints escalate instead of spelling out the code. `bounded peak` FAIL now says what to change instead of "must stay between 1 and 3".

**Unsettled.** The interpreter panic on range-over-int belongs to the bridge (`wasm-compiler/main.go`), not this lab.
