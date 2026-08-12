import { Chapter } from '../types';

export const ch6: Chapter = {
  id: 'ch6',
  tag: 'Chapter 6',
  title: 'Strings vs Runes',
  content: `
    <p>In Go, a <code>string</code> is just a read-only slice of bytes. Calling <code>len("hello")</code> returns the number of bytes, not characters. If you have multi-byte characters (like emojis or non-ASCII characters), iterating over the string byte-by-byte will corrupt the data.</p>
    <p>To safely handle characters in interviews, convert the string to a slice of runes: <code>[]rune(s)</code>. A <code>rune</code> is simply an alias for <code>int32</code>, representing a Unicode code point.</p>
    <h3>Optimal Concatenation</h3>
    <p>Because strings are immutable, using <code>+=</code> to build a string inside a loop creates a new allocation every time (O(N^2)). Always use <code>strings.Builder</code> for optimal O(N) concatenation.</p>
  `,
  challengeTitle: 'Valid Palindrome',
  challengeDescription: `
    <p><strong>Task:</strong> Implement <code>isPalindrome</code>. Convert the string to runes, and use two pointers to verify if it reads the same forwards and backwards.</p>
  `,
  initialCode: `package main

import "fmt"

func isPalindrome(s string) bool {
	// TODO: Convert to runes and check
	return false
}

func main() {
	fmt.Println(isPalindrome("racecar")) // true
	fmt.Println(isPalindrome("hello"))   // false
}`,
  validate: (code: string) => {
    if (code.includes('[]rune')) {
      return { success: true, message: '✅ Success! Treating strings as runes is crucial for Unicode correctness in Go.' };
    }
    return { success: false, message: '❌ Challenge not solved. Make sure to convert the string to a `[]rune` slice before processing.' };
  }
};
