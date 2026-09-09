package main

import "fmt"

// twoSum returns two distinct indices whose values add to target, or nil.
// seen maps a value to the index where it was first visited; the comma-ok
// form is what makes index 0 findable.
func twoSum(nums []int, target int) []int {
	seen := make(map[int]int, len(nums))
	for i, n := range nums {
		if j, ok := seen[target-n]; ok {
			return []int{j, i}
		}
		seen[n] = i // store after the lookup so an element cannot pair with itself
	}
	return nil
}

func main() {
	fmt.Println(twoSum([]int{2, 7, 11, 15}, 9))
}
