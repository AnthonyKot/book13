import { Chapter } from '../types';

export const ch4: Chapter = {
  id: 'ch4',
  tag: 'Chapter 4',
  title: 'Slice Internals & Two Pointers',
  content: `
    <p>If you have an algorithmic interview in Go, you <strong>must</strong> understand slices deeply. Slices are not arrays; they are lightweight descriptors containing three things: a pointer to an underlying array, a length (<code>len</code>), and a capacity (<code>cap</code>).</p>
    <p>When you pass a slice to a function, you are passing this descriptor by value. You can modify the elements of the underlying array, but if you <code>append()</code> and exceed the capacity, Go allocates a new array, and the caller's slice won't see the new elements!</p>
    <h3>The Two-Pointer Technique</h3>
    <p>Many array-based interview questions (like reversing a string, finding palindromes, or moving zeroes) are best solved in-place using two pointers (indices) iterating from opposite ends or at different speeds.</p>
  `,
  challengeTitle: 'Reverse a Slice In-Place',
  challengeDescription: `
    <p><strong>Task:</strong> Implement the <code>reverse</code> function using the two-pointer technique. It should take a slice of integers and reverse it <strong>in-place</strong> without allocating a new slice.</p>
    <p>Hint: Use <code>i, j := 0, len(nums)-1</code> and swap elements in a <code>for i &lt; j</code> loop.</p>
  `,
  initialCode: `package main

import "fmt"

// reverse reverses the slice in-place
func reverse(nums []int) {
	// TODO: Implement using two pointers
}

func main() {
	arr := []int{1, 2, 3, 4, 5}
	reverse(arr)
	fmt.Println(arr) // Should print [5 4 3 2 1]
}`,
  validate: (code: string) => {
    const hasLoop = code.includes('for');
    const hasSwap = code.includes('nums[i], nums[j] = nums[j], nums[i]') || code.includes('nums[j], nums[i] = nums[i], nums[j]');
    
    if (hasLoop && hasSwap) {
      return {
        success: true,
        message: '✅ Success! You reversed the slice in-place.\\n\\nGo\\'s multiple assignment syntax `a, b = b, a` makes swapping elements incredibly clean for two-pointer algorithms!'
      };
    }

    return {
      success: false,
      message: '❌ Challenge not solved.\\n\\nMake sure to use a `for` loop and swap elements using `nums[i], nums[j] = nums[j], nums[i]`.'
    };
  }
};
