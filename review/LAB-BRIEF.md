# The Go Shift — lab verification and improvement brief (2026-09-09)

You own four labs of the course in /home/diablo/book13. Read README.md and this file first. Two
other agents work on other labs in the same repo at the same time: touch only your labs' files.

## Per lab, in this order (save each output the moment it exists)

1. **Reference solution → `wasm-compiler/shims/testdata/solutions/<id>.go`** (id = ch1 … ch12).
   A complete `package main` program that replaces the starter, keeps every exported signature the
   hidden tests call, and is the solution a careful senior engineer would write: idiomatic, no
   cleverness, comments only where the lab's idea shows. Prove it two ways:
   - `cd wasm-compiler && go test ./shims/ -run 'TestAllLabSolutions/<id>$' -v` must report
     "solution passes all N tests" (this runs it in yaegi, the browser interpreter).
   - `go run` it (or `go vet` + a scratch main) with the real toolchain in a scratch dir under
     /tmp/claude-1000/-home-diablo/ca321aaf-51cf-4ac4-a9ff-7e902bbb0802/scratchpad/<id>/ to
     confirm the real compiler agrees. If yaegi and gc disagree, that is a finding: record it and
     make the lab's claims true for both.
2. **Read the lab as a cold reader** — the persona: experienced developer arriving from Java,
   Python or TypeScript, twenty minutes, will not open a reference. Check, and fix in
   `src/data/chapters/<id>.ts` where needed:
   - The prediction has exactly one correct option and its explanation is true of real Go; verify
     any runtime claim (ordering, panics, zero values, capacity growth) by running it with `go run`.
   - The lesson's claims are true and dated where they depend on a Go version; no hedging.
   - The starter compiles, is honestly wrong in the way the lab says, and is not solvable by
     deleting a line.
   - Hidden-test FAIL messages tell the reader what to change, not only that it failed.
   - Hints escalate: 1 = where to look, 2 = the rule, 3 = the shape of the fix (not the code).
   - The debrief's transfer question is answerable at work in one sitting.
   - Keep `id`, `order`, `module`, `testNames` and every hidden-test name unchanged.
3. **Review note → `review/labs/<id>.md`** (≤ 200 words): what you verified and how, what you
   changed and why, anything you could not settle. Quote any sentence you corrected.
4. **Checks before commit:** `cd wasm-compiler && go test ./shims/` (all green, including
   TestAllLabStarters for your lab: starter must still fail ≥ 1 test), then from the repo root
   `npm run lint && npm run build`.
5. **Commit only your files:** `git add src/data/chapters/<id>.ts wasm-compiler/shims/testdata/solutions/<id>.go review/labs/<id>.md && git commit -m "<id>: reference solution and review"`.
   Retry on index.lock (sleep 5, up to 5 times). Never push. Never `git add -A`.

## Rules
- Do not change what a lab teaches or its tests' names. Improve wording, truth, hints and messages.
- Do not touch App.tsx, index.css, types.ts, chapters/index.ts, the shims, or other labs.
- Extraction detail: chapter code lives in TypeScript template literals; a backtick inside code is
  written \` and a tab as \t. The harness already handles this; when you edit code inside a
  chapter, keep those escapes.

## Final report (≤ 150 words)
Per lab: solution verified in yaegi and gc (yes/no), claims corrected (count + one example),
anything unresolved.
