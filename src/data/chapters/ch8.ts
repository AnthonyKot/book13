import type { Chapter } from '../types';

export const ch8: Chapter = {
  id: 'ch8',
  tag: 'Chapter 8',
  title: 'Priority Queues & container/heap',
  content: `
    <p>Go does not have a built-in generic Priority Queue structure. If an interview question requires a Min-Heap or Max-Heap, you must implement it yourself using the <code>container/heap</code> package.</p>
    <p>You need to define a custom type (usually a slice) and implement 5 methods to satisfy <code>heap.Interface</code>: <code>Len()</code>, <code>Less(i, j)</code>, <code>Swap(i, j)</code>, <code>Push(x any)</code>, and <code>Pop() any</code>.</p>
    <p><strong>Crucial:</strong> Your <code>Push</code> and <code>Pop</code> methods must use pointer receivers because they modify the slice's length!</p>
  `,
  challengeTitle: 'Implement a Min-Heap',
  challengeDescription: `
    <p><strong>Task:</strong> Complete the implementation of <code>IntHeap</code> so it can be used with <code>heap.Init()</code>.</p>
  `,
  initialCode: `package main

import (
	"container/heap"
	"fmt"
)

type IntHeap []int

// TODO: Implement sort.Interface (Len, Less, Swap)

// TODO: Implement heap.Interface (Push, Pop)
// Hint: Push must append to the pointer receiver, Pop must slice it off.

func main() {
	h := &IntHeap{2, 1, 5}
	heap.Init(h)
	heap.Push(h, 3)
	fmt.Printf("minimum: %d\\n", (*h)[0]) // Should be 1
}`,
  validate: (code: string) => {
    const hasMethods = code.includes('Len()') && code.includes('Less(') && code.includes('Swap(') && code.includes('Push(') && code.includes('Pop()');
    if (hasMethods) {
      return { success: true, message: '✅ Success! Memorizing the heap.Interface boilerplate is an absolute must for Go interviews.' };
    }
    return { success: false, message: '❌ Challenge not solved. Ensure you implemented Len, Less, Swap, Push, and Pop.' };
  }
};
