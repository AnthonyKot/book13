import type { Chapter } from '../types';

export const ch6: Chapter = {
  id: 'ch6',
  order: 5,
  module: 'think',
  title: 'Strings: Bytes, Runes, and Visible Text',
  mentalModel: 'A Go string is an immutable byte sequence; rune iteration decodes code points, not necessarily user-perceived characters.',
  outcome: 'Choose code-point semantics deliberately and implement a palindrome check that works beyond ASCII.',
  recognitionCue: 'Before indexing text, name the unit the problem needs: encoded bytes, Unicode code points, or grapheme clusters.',
  prediction: {
    prompt: 'What do len, []rune, and range report for this UTF-8 string?',
    code: `s := "A界🙂"
fmt.Println(len(s), len([]rune(s)))
for index, value := range s {
	fmt.Printf("%d:%c ", index, value)
}`,
    options: [
      {
        id: 'characters-everywhere',
        label: '3, 3; indices 0, 1, 2',
        explanation: 'len counts encoded bytes, and range indices are byte offsets rather than ordinal character positions.',
      },
      {
        id: 'bytes-and-runes',
        label: '8, 3; indices 0, 1, 4',
        explanation: 'Correct. A uses one UTF-8 byte, 界 uses three, and 🙂 uses four. range decodes runes and reports each rune’s starting byte index.',
      },
      {
        id: 'all-bytes',
        label: '8, 8; indices 0 through 7',
        explanation: 'Indexing can visit individual bytes, but converting to []rune and ranging over a string decode Unicode code points.',
      },
    ],
    correctOptionId: 'bytes-and-runes',
  },
  lesson: `
    <p>A Go string is an immutable sequence of bytes, commonly containing UTF-8 text. <code>len(s)</code> reports bytes and <code>s[index]</code> selects a byte. A <code>range</code> loop decodes Unicode code points and reports each rune with the byte offset where it begins.</p>
    <p>Converting to <code>[]rune</code> provides indexable code points, which is useful for a code-point palindrome. It allocates a new slice. A rune is still not always one visible character: combining marks and multi-code-point emoji require grapheme-aware text processing when the product’s behavior depends on what a person sees.</p>
    <pre><code>runes := []rune(s)
for left, right := 0, len(runes)-1; left &lt; right; left, right = left+1, right-1 {
	if runes[left] != runes[right] { return false }
}</code></pre>
  `,
  challenge: {
    title: 'Check a code-point palindrome',
    description: 'Implement isPalindrome using Unicode code-point semantics. It should return true for empty, one-rune, ASCII, and non-ASCII palindromes, and false when code points differ. Do not normalize case, punctuation, or combining sequences.',
  },
  starterCode: `package main

import "fmt"

func isPalindrome(s string) bool {
	// Compare Unicode code points, not individual UTF-8 bytes.
	return false
}

func main() {
	fmt.Println(isPalindrome("racecar"))
	fmt.Println(isPalindrome("🙂a🙂"))
}`,
  hiddenTestCode: `func() {
	if isPalindrome("racecar") && !isPalindrome("hello") {
		println("__GO_SHIFT_TEST__\tPASS\tASCII cases\tRecognized both an ASCII palindrome and a mismatch.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tASCII cases\tReturn true only when the code-point sequence reads the same in both directions.")
	}
	if isPalindrome("🙂a🙂") && isPalindrome("界o界") {
		println("__GO_SHIFT_TEST__\tPASS\tUnicode palindromes\tMulti-byte code points are compared as complete values.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tUnicode palindromes\tByte-by-byte reversal breaks multi-byte text. Compare decoded runes instead.")
	}
	if !isPalindrome("界a🙂") && !isPalindrome("åbç") {
		println("__GO_SHIFT_TEST__\tPASS\tUnicode mismatches\tDifferent non-ASCII code points are not treated as a match.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tUnicode mismatches\tReturn false as soon as the code points at opposite ends differ.")
	}
	if isPalindrome("") && isPalindrome("界") {
		println("__GO_SHIFT_TEST__\tPASS\tedge lengths\tEmpty and one-rune strings are palindromes without indexing outside the slice.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tedge lengths\tHandle zero and one code point as completed palindromes.")
	}
}()`,
  testNames: ['ASCII cases', 'Unicode palindromes', 'Unicode mismatches', 'edge lengths'],
  hints: [
    'Decide the unit before writing the loop. For this contract, convert once with <code>runes := []rune(s)</code> so each index selects a code point.',
    'Start one index at <code>0</code> and the other at <code>len(runes)-1</code>. Continue while the left index is smaller than the right.',
    'Return false on the first unequal pair. Otherwise move both indices inward; if the loop finishes, return true.',
  ],
  debrief: {
    title: 'The shift: “character” is a requirement, not a type',
    summary: 'Strings store bytes, range decodes runes, and visible grapheme clusters may contain multiple runes. Correct text code begins by choosing the unit that matches the product contract.',
    transfer: 'For a network frame length, a source-code identifier counter, and a backspace key in a text editor, which unit—bytes, runes, or grapheme clusters—fits each job?',
  },
};
