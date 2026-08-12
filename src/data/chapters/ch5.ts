import type { Chapter } from '../types';

export const ch5: Chapter = {
  id: 'ch5',
  order: 6,
  module: 'solve',
  title: 'Maps: Presence Is Separate from Value',
  mentalModel: 'A map lookup does not tell you whether the key was present unless you ask it to.',
  outcome: 'Implement a one-pass complement lookup without confusing a missing key with a stored zero value.',
  recognitionCue: 'When a type’s zero value is meaningful data, use the comma-ok form to ask about presence separately.',
  prediction: {
    prompt: 'The map contains value 2 at index 0. Will this condition recognize that 2 was seen?',
    code: `seen := map[int]int{2: 0}
index := seen[2]
if index != 0 {
	fmt.Println("found")
}`,
    options: [
      {
        id: 'yes',
        label: 'Yes — the key exists',
        explanation: 'The key exists, but the condition tests its value rather than its presence. Index 0 makes the condition false.',
      },
      {
        id: 'no-zero',
        label: 'No — index 0 looks missing',
        explanation: 'Correct. A missing key and a key storing 0 both produce 0 in a single-value lookup.',
      },
      {
        id: 'panic',
        label: 'It panics on index 0',
        explanation: 'Map lookup does not panic here. It returns the stored value, which is 0.',
      },
    ],
    correctOptionId: 'no-zero',
  },
  lesson: `
    <p>A Go map lookup has two useful forms. <code>index := seen[value]</code> returns a value, using the value type’s zero value when the key is absent. <code>index, ok := seen[value]</code> returns that value <em>and</em> whether the key exists.</p>
    <p>That distinction matters in Two Sum because index <code>0</code> is valid. For each number, first ask whether its complement has already been seen. Only then store the current number and index; this prevents one element from matching itself.</p>
    <pre><code>if index, ok := seen[target-number]; ok {
	return []int{index, currentIndex}
}
seen[number] = currentIndex</code></pre>
    <p>Map operations are expected constant time, so one pass gives expected <code>O(n)</code> time and <code>O(n)</code> additional space.</p>
  `,
  challenge: {
    title: 'Find the pair without losing index zero',
    description: 'Implement <code>twoSum</code> in one pass. Return two distinct indices whose values add to the target, or <code>nil</code> when no pair exists. The tests include duplicates, negative numbers, and a valid pair involving index 0.',
  },
  starterCode: `package main

import "fmt"

func twoSum(nums []int, target int) []int {
	// Keep value -> index for numbers already visited.
	return nil
}

func main() {
	fmt.Println(twoSum([]int{2, 7, 11, 15}, 9))
}`,
  hiddenTestCode: `func() {
	validPair := func(nums []int, target int, got []int) bool {
		return len(got) == 2 && got[0] != got[1] &&
			got[0] >= 0 && got[0] < len(nums) && got[1] >= 0 && got[1] < len(nums) &&
			nums[got[0]]+nums[got[1]] == target
	}

	if validPair([]int{2, 7, 11, 15}, 9, twoSum([]int{2, 7, 11, 15}, 9)) {
		println("__GO_SHIFT_TEST__\\tPASS\\tbasic pair\\tFound indices whose values sum to 9.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tbasic pair\\tExpected a valid pair for [2, 7, 11, 15] and target 9.")
	}
	if validPair([]int{3, 3}, 6, twoSum([]int{3, 3}, 6)) {
		println("__GO_SHIFT_TEST__\\tPASS\\tduplicate values\\tUsed two distinct indices for duplicate values.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tduplicate values\\tTwo equal values can form a pair, but they must come from distinct indices.")
	}
	if validPair([]int{0, 4, 3, 0}, 0, twoSum([]int{0, 4, 3, 0}, 0)) {
		println("__GO_SHIFT_TEST__\\tPASS\\tindex zero\\tKept presence separate from the stored index value.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tindex zero\\tA valid match uses index 0. Use value, ok := seen[key] instead of treating zero as missing.")
	}
	if validPair([]int{-3, 4, 3, 90}, 0, twoSum([]int{-3, 4, 3, 90}, 0)) {
		println("__GO_SHIFT_TEST__\\tPASS\\tnegative values\\tFound a complement across negative and positive values.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tnegative values\\tExpected the -3 and 3 pair for target 0.")
	}
	if len(twoSum([]int{3}, 6)) == 0 && len(twoSum([]int{1, 2, 4}, 20)) == 0 {
		println("__GO_SHIFT_TEST__\\tPASS\\tno solution\\tReturned no indices when no pair exists.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tno solution\\tReturn nil or an empty slice when no pair exists.")
	}
}()`,
  testNames: ['basic pair', 'duplicate values', 'index zero', 'negative values', 'no solution'],
  hints: [
    'Create <code>seen := make(map[int]int)</code> before the loop. The map should hold a number and the index where you saw it.',
    'Inside the loop, compute <code>need := target - number</code>, then use <code>index, ok := seen[need]</code>. Return when <code>ok</code> is true.',
    'Store <code>seen[number] = currentIndex</code> only after checking the complement. That prevents one item from matching itself.',
  ],
  debrief: {
    title: 'The shift: absence is not a value',
    summary: 'A map’s zero-value behavior is convenient only when zero and absence mean the same thing. The comma-ok form preserves the distinction, and checking before storing preserves the distinct-index invariant.',
    transfer: 'Suppose a cache uses <code>map[string]bool</code> and <code>false</code> is a meaningful cached result. How would you distinguish “cached false” from “not cached”?',
  },
};
