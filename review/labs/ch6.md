# ch6 — Strings: Bytes, Runes, and Visible Text

**Verified.** Reference solution (`[]rune` two-index loop) passes all 4 hidden tests in yaegi
(`TestAllLabSolutions/ch6`) and gives the same eight answers under gc 1.22 with a scratch driver.
Prediction snippet run with `go run`: `8 3` and `0:A 1:界 4:🙂` — option "bytes-and-runes" is the
only correct one. Lesson snippet also run: `s[1] == 'A'` is `false`, `[]rune(s)[1]` is `30028`.

**Changed.**
- Starter was `return false`, a stub rather than the old instinct. It is now the byte-indexed
  loop (`s[left] != s[right]`), which passes ASCII cases and Unicode mismatches but fails
  "🙂a🙂", "界o界" and single "界" — confirmed with gc and yaegi (2 pass / 2 fail).
- Lesson printed the exact solution loop; replaced with the prediction snippet and its output,
  plus what `range` yields, `U+FFFD` for invalid bytes, and that grapheme segmentation is not in
  the standard library. Corrected my own draft that named `x/text/unicode/norm` as grapheme-aware.
- Hints now escalate (byte vs character → `[]rune` vs `range` → same loop over the rune slice);
  hint 1 previously handed over `runes := []rune(s)`.
- FAIL messages for Unicode palindromes and edge lengths now name the rejected input and the
  byte-fragment cause. Note: `\"` inside a chapter template literal reaches Go as a bare `"`;
  quotes were dropped instead.

**Unsettled.** Nothing.
