package main

import "fmt"

// isPalindrome compares Unicode code points, not UTF-8 bytes: 🙂 is four bytes
// that only match themselves when compared as one rune.
func isPalindrome(s string) bool {
	runes := []rune(s)
	for left, right := 0, len(runes)-1; left < right; left, right = left+1, right-1 {
		if runes[left] != runes[right] {
			return false
		}
	}
	return true
}

func main() {
	fmt.Println(isPalindrome("racecar"))
	fmt.Println(isPalindrome("🙂a🙂"))
}
