# ch1 — Receivers: Values Have Method Sets

**Verified.** Reference solution (`wasm-compiler/shims/testdata/solutions/ch1.go`, value receiver, three lines) passes all 3 hidden tests in yaegi (`TestAllLabSolutions/ch1`) and runs under gc 1.22 (`go vet` + `go run`: `Alice Grace`). Starter still fails `original unchanged`. Prediction claim checked with gc: `var a Namer = user` is rejected with “User does not implement Namer (method GetName has pointer receiver)”; `&user` compiles. Transfer question checked: `go vet` flags a value receiver on a struct holding `sync.Mutex` (“passes lock by value”), so the answer is pointer receivers for all six methods.

**Finding — yaegi and gc disagree.** yaegi accepts `var a Namer = user` with a pointer-receiver method and runs the program. The lab's prediction is about the compiler, so I made the wording say so: prompt now “Which line does the Go compiler reject?” (was “Which statement fails”), option label “All three lines compile”, and one lesson paragraph states the interpreter is lenient here and `go build` is the authority. The shims were not touched.

**Changed.** Hints rewritten to escalate (hint 3 previously quoted the full solution: “The completed method can be three lines: … `u.Name = name`, then `return u`”). Lesson adds the mutex example and the copy-cost caveat for value receivers. Ids, order, module and test names unchanged.

**Unsettled.** A reader who keeps the pointer receiver and copies `*u` locally also passes; the tests cannot see the receiver type.
