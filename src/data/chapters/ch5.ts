import type { Chapter } from '../types';

export const ch5: Chapter = {
  id: 'ch5',
  tag: 'Chapter 5',
  title: 'Hash Maps & Frequency Counting',
  content: `
    <p>Maps in Go (<code>map[K]V</code>) are unordered collections of key-value pairs. A critical quirk for interviews is that map iteration order is intentionally randomized. If you need ordered keys, you must extract them to a slice and sort them.</p>
    <h3>The Comma-Ok Idiom</h3>
    <p>When accessing a map, if the key doesn't exist, Go returns the zero value for the value type (e.g., <code>0</code> for ints, <code>""</code> for strings). To distinguish between a missing key and a key that actually stores a zero, use the comma-ok idiom: <code>value, ok := m[key]</code>.</p>
  `,
  challengeTitle: 'Two Sum',
  challengeDescription: `
    <p><strong>Task:</strong> Implement the classic Two Sum algorithm. Given an array of integers <code>nums</code> and an integer <code>target</code>, return the indices of the two numbers such that they add up to <code>target</code>.</p>
    <p>Use a map to store the elements you have seen so far (<code>value -> index</code>) to achieve O(N) time complexity.</p>
  `,
  initialCode: `package main

import "fmt"

func twoSum(nums []int, target int) []int {
	// TODO: Implement O(N) solution using a map
	return nil
}

func main() {
	nums := []int{2, 7, 11, 15}
	target := 9
	fmt.Println(twoSum(nums, target)) // Should print [0 1]
}`,
  validate: (code: string) => {
    if (code.includes('make(map[') || code.includes('map[')) {
      return { success: true, message: '✅ Success! Using a map for frequency counting or seen-value lookups is the key to reducing O(N^2) algorithms down to O(N).' };
    }
    return { success: false, message: '❌ Challenge not solved. Ensure you are using a `map` to achieve O(N) time complexity.' };
  }
};
