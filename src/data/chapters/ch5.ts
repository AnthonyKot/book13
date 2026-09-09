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
    prompt: 'seen records that the value 2 was first met at index 0. Does this condition recognize that 2 was seen?',
    code: `seen := map[int]int{2: 0}
index := seen[2]
if index != 0 {
	fmt.Println("found")
}`,
    options: [
      {
        id: 'yes',
        label: 'Yes — the key exists',
        explanation: 'The key exists, but the condition tests its value rather than its presence. The stored index is 0, so nothing is printed.',
      },
      {
        id: 'no-zero',
        label: 'No — index 0 looks missing',
        explanation: 'Correct. A missing key and a key storing 0 both produce 0 from a single-value lookup, so the condition is false and nothing is printed.',
      },
      {
        id: 'panic',
        label: 'It panics on index 0',
        explanation: 'Reading a map never panics, not even a nil map or an absent key. It returns the stored value, which is 0.',
      },
    ],
    correctOptionId: 'no-zero',
  },
  lesson: `
    <p>A Go map lookup has two forms. <code>index := seen[key]</code> returns the value type’s zero value when the key is absent: <code>0</code> for an <code>int</code>, <code>""</code> for a string, <code>nil</code> for a pointer or slice, <code>false</code> for a bool. There is no <code>null</code>, no exception and no <code>Optional</code>; absence is invisible unless you ask. <code>index, ok := seen[key]</code> returns the value <em>and</em> whether the key exists, and the idiomatic place to ask is the <code>if</code> header:</p>
    <pre><code>seen := map[int]int{2: 0}
if index, ok := seen[2]; ok {
	fmt.Println("found at", index)   // found at 0
}
_, present := seen[7]
fmt.Println(present, len(seen))    // false 1: a lookup never inserts</code></pre>
    <p>The distinction matters in Two Sum because index <code>0</code> is valid data. For each number, ask whether its complement is already present; only then store the current number and index, so an element cannot pair with itself. Map operations are expected constant time, so one pass is expected <code>O(n)</code> time and <code>O(n)</code> additional space.</p>
  `,
  challenge: {
    title: 'Find the pair without losing index zero',
    description: 'The starter is a one-pass <code>twoSum</code> that treats a looked-up index of 0 as “not seen”. Fix it so it returns two distinct indices whose values add to the target, or <code>nil</code> when no pair exists. The tests include duplicates, negative numbers, and valid pairs whose first element is at index 0.',
  },
  starterCode: `package main

import "fmt"

func twoSum(nums []int, target int) []int {
	seen := make(map[int]int) // value -> index where it was first visited
	for i, n := range nums {
		// A lookup that returns 0 might mean "never seen" or "seen at index 0".
		if j := seen[target-n]; j != 0 {
			return []int{j, i}
		}
		seen[n] = i
	}
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

	if validPair([]int{2, 7, 11, 15}, 18, twoSum([]int{2, 7, 11, 15}, 18)) {
		println("__GO_SHIFT_TEST__\\tPASS\\tbasic pair\\tFound indices whose values sum to 18.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tbasic pair\\tExpected indices 1 and 2 for [2, 7, 11, 15] and target 18 (7 + 11).")
	}
	if validPair([]int{1, 3, 3}, 6, twoSum([]int{1, 3, 3}, 6)) {
		println("__GO_SHIFT_TEST__\\tPASS\\tduplicate values\\tUsed two distinct indices for duplicate values.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tduplicate values\\t[1, 3, 3] with target 6 needs indices 1 and 2, not the same index twice. Look up the complement before storing the current number.")
	}
	if validPair([]int{2, 7, 11, 15}, 9, twoSum([]int{2, 7, 11, 15}, 9)) && validPair([]int{0, 4, 3, 0}, 0, twoSum([]int{0, 4, 3, 0}, 0)) {
		println("__GO_SHIFT_TEST__\\tPASS\\tindex zero\\tKept presence separate from the stored index value.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tindex zero\\tThe partner is at index 0 ([2, 7, 11, 15] target 9 is indices 0 and 1; [0, 4, 3, 0] target 0 is 0 and 3). A lookup that returns 0 is not proof of absence: use index, ok := seen[key].")
	}
	if validPair([]int{5, -3, 4, 3, 90}, 0, twoSum([]int{5, -3, 4, 3, 90}, 0)) {
		println("__GO_SHIFT_TEST__\\tPASS\\tnegative values\\tFound a complement across negative and positive values.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tnegative values\\tExpected the -3 and 3 pair (indices 1 and 3) for target 0; target - n works for negative numbers too.")
	}
	if len(twoSum([]int{3}, 6)) == 0 && len(twoSum([]int{1, 2, 4}, 20)) == 0 {
		println("__GO_SHIFT_TEST__\\tPASS\\tno solution\\tReturned no indices when no pair exists.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tno solution\\t[3] with target 6 and [1, 2, 4] with target 20 have no pair: return nil, and never let an element pair with itself.")
	}
}()`,
  testNames: ['basic pair', 'duplicate values', 'index zero', 'negative values', 'no solution'],
  hints: [
    'Look at the condition <code>j != 0</code>. Walk <code>[2, 7, 11, 15]</code> with target 9 by hand: what does <code>seen[2]</code> hold when the loop reaches 7, and what does the condition conclude from it?',
    'The rule: a single-value lookup returns the zero value for an absent key, so <code>0</code> cannot distinguish “absent” from “stored 0”. The two-value form <code>v, ok := m[key]</code> reports presence in <code>ok</code>.',
    'Ask the map about presence in the <code>if</code> header and branch on the boolean, not on the index. Keep the lookup before the store so the current element cannot answer for itself.',
  ],
  debrief: {
    title: 'The shift: absence is not a value',
    summary: 'A map’s zero-value behavior is convenient only when zero and absence mean the same thing. The comma-ok form preserves the distinction, and checking before storing preserves the distinct-index invariant.',
    transfer: 'Suppose a cache uses <code>map[string]bool</code> and <code>false</code> is a meaningful cached result. How would you distinguish “cached false” from “not cached”?',
  },
};
