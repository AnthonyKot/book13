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
    <p>A Go string is an immutable sequence of bytes, usually holding UTF-8 text. <code>len(s)</code> reports bytes and <code>s[index]</code> selects a byte, never a character. A <code>range</code> loop decodes one code point per iteration and reports it as a <code>rune</code> (an alias of <code>int32</code>) together with the byte offset where it begins, so the index jumps by the width of each encoded rune. Invalid bytes decode as <code>U+FFFD</code> and advance one byte.</p>
    <p>Converting with <code>[]rune(s)</code> decodes the whole string once into a new slice whose indices are code-point positions; it is the tool when an algorithm needs to index from both ends or by position. A rune is still not always one visible character: combining marks (<code>e</code> + <code>U+0301</code>) and multi-code-point emoji are several runes that a person sees as one, and only grapheme-aware segmentation (the standard library has none; <code>github.com/rivo/uniseg</code> implements it) matches what is on screen.</p>
    <pre><code>s := "A界🙂"
fmt.Println(len(s), len([]rune(s)))   // 8 3
for i, r := range s {
	fmt.Printf("%d:%c ", i, r)       // 0:A 1:界 4:🙂
}
fmt.Println(s[1] == 'A', []rune(s)[1]) // false 30028 (the code point for 界)</code></pre>
  `,
  challenge: {
    title: 'Check a code-point palindrome',
    description: 'The starter compares s[left] with s[right], which is a byte-level palindrome check: it is right for ASCII and wrong as soon as a rune spans more than one byte. Make isPalindrome use Unicode code-point semantics. It should return true for empty, one-rune, ASCII, and non-ASCII palindromes, and false when code points differ. Do not normalize case, punctuation, or combining sequences.',
  },
  starterCode: `package main

import "fmt"

func isPalindrome(s string) bool {
	// s[i] is one byte. "界" is three of them and "🙂" is four, so this loop
	// compares fragments of encodings rather than the characters they encode.
	for left, right := 0, len(s)-1; left < right; left, right = left+1, right-1 {
		if s[left] != s[right] {
			return false
		}
	}
	return true
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
		println("__GO_SHIFT_TEST__\tFAIL\tUnicode palindromes\t🙂a🙂 or 界o界 was rejected: comparing s[i] bytes reads fragments of a multi-byte encoding. Decode to runes and compare those.")
	}
	if !isPalindrome("界a🙂") && !isPalindrome("åbç") {
		println("__GO_SHIFT_TEST__\tPASS\tUnicode mismatches\tDifferent non-ASCII code points are not treated as a match.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tUnicode mismatches\tReturn false as soon as the code points at opposite ends differ.")
	}
	if isPalindrome("") && isPalindrome("界") {
		println("__GO_SHIFT_TEST__\tPASS\tedge lengths\tEmpty and one-rune strings are palindromes without indexing outside the slice.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tedge lengths\tThe empty string or 界 alone was rejected. A single three-byte rune is one code point; the loop must not compare its first and last bytes.")
	}
}()`,
  testNames: ['ASCII cases', 'Unicode palindromes', 'Unicode mismatches', 'edge lengths'],
  hints: [
    'Look at what <code>s[left]</code> is: a <code>byte</code>, not a character. Run the starter on <code>"界"</code> alone and ask why a one-character string fails.',
    'The rule: <code>[]rune(s)</code> decodes the string once into a slice indexed by code point, so position arithmetic works; <code>range</code> also decodes but yields byte offsets, so it cannot walk in from both ends.',
    'Keep the two-index loop exactly as it is, but run it over the rune slice: bounds come from <code>len(runes)</code> and the comparison is between two runes.',
  ],
  debrief: {
    title: 'The shift: “character” is a requirement, not a type',
    summary: 'Strings store bytes, range decodes runes, and visible grapheme clusters may contain multiple runes. Correct text code begins by choosing the unit that matches the product contract.',
    transfer: 'For a network frame length, a source-code identifier counter, and a backspace key in a text editor, which unit—bytes, runes, or grapheme clusters—fits each job?',
  },
};
