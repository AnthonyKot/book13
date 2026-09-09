# ch3 — Every Goroutine Needs an Exit

**Verified.** Reference solution (one `select`: send case returns true, `ctx.Done()` case returns false) passes all 4 hidden tests in yaegi (3 consecutive harness runs) and under `go run -race` 5/5 with go1.22.2. Prediction re-run with gc as a handler on a long-lived caller: 2 goroutines still alive 300 ms after the handler returned, so "blocks on the send" is the only correct option. Starter fails exactly `waits for receiver`; deleting its `default` case makes `already canceled` hang, so it is not a one-line fix.

**Finding and fix — a scheduling-dependent test.** `cancel while blocked` called `stop()` immediately after `go deliver(...)`, so the sender was never parked when cancellation arrived. A wrong solution that checks `ctx.Err()` once and then does a plain blocking send passed all four tests, 5/5 under gc and 5/5 under yaegi. The test now sleeps 5 ms before `stop()` so the sender is parked on a channel nobody reads; the same wrong solution now fails 5/5 in both toolchains, and the reference's outcome does not depend on ordering. Failure-path timeouts widened 25 ms to 250 ms (the pass path never waits on them).

**Also changed.** Hint 1 said "A plain `out <- value` has only one way forward" but the starter already has a `select`; hints now escalate from the `default` case to the blocking-select rule to the two-case shape. Two FAIL messages for `cancel while blocked` now say what to change. Prediction prompt states the caller is a request handler, not `main`, so "the process exits" is not an available reading.

**Unsettled.** Nothing.
