# ch5 — Maps: Presence Is Separate from Value

**Verified.** Reference solution (comma-ok lookup before store) passes all 5 hidden tests in yaegi
(`TestAllLabSolutions/ch5`) and returns the same valid pairs under gc 1.22 with a scratch driver.
Prediction run with `go run`: nothing printed, so "no-zero" is the only correct option. Lesson
snippet run: `found at 0`, then `false 1` (a lookup never inserts).

**Changed.**
- Starter was `return nil`; it is now the actual old instinct, `if j := seen[target-n]; j != 0`.
  Under both gc and yaegi it passes 4 tests and fails only "index zero".
- Hidden-test inputs retargeted so that only the index-zero test exercises the lesson: basic pair
  is now `[2,7,11,15]`/18 (indices 1, 2), duplicates `[1,3,3]`/6 (still catches self-pairing),
  negatives `[5,-3,4,3,90]`/0; "index zero" now checks both `[2,7,11,15]`/9 and `[0,4,3,0]`/0.
  Test names unchanged. Previously every pair began at index 0, so the starter failed 4 of 5 for one
  bug.
- Lesson: replaced the Two Sum solution snippet with comma-ok on the prediction's map; added what
  the zero value is per type and that a read never inserts.
- Prediction prompt "The map contains value 2 at index 0" reworded (the map holds key 2 → 0); panic
  option now states that a map read never panics, not even on a nil map.
- Hints escalate from the `j != 0` line to the rule to the `if v, ok := m[k]; ok` shape; FAIL
  messages name the expected indices.

**Unsettled.** Nothing.
