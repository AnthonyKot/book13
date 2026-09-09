import type { Chapter } from '../types';

export const ch8: Chapter = {
  id: 'ch8',
  order: 8,
  module: 'solve',
  title: 'The container/heap Contract',
  mentalModel: 'The public heap operation and your interface callback have different responsibilities.',
  outcome: 'Implement a slice-backed min-heap adapter and explain why its Pop method removes the final slice element rather than the root.',
  recognitionCue: 'When a library owns an algorithm but asks your type for callbacks, read the callback contract separately from the public operation’s behavior.',
  prediction: {
    prompt: 'Application code calls heap.Pop(h) to take the minimum. Which element must your adapter method (*IntHeap).Pop remove and return?',
    code: `func (h *IntHeap) Pop() any {
	old := *h
	n := len(old)
	// Which slot belongs here?
}`,
    options: [
      {
        id: 'root',
        label: 'Index 0 — the heap root',
        explanation: 'That duplicates work owned by container/heap. Before calling your method, heap.Pop has already swapped the root into the last slot and sifted the replacement down; removing index 0 now discards the wrong element and leaves the minimum in the slice.',
      },
      {
        id: 'last',
        label: 'Index n-1 — the final slot',
        explanation: 'Correct. heap.Interface documents Pop as “remove and return element Len() - 1”. The package-level heap.Pop selects the root, moves it to the end, repairs the heap, and only then calls your Pop to trim that slot.',
      },
      {
        id: 'less',
        label: 'Whichever slot Less selects',
        explanation: 'Less defines the ordering that heap.Pop uses to repair the heap; the adapter’s Pop callback has a fixed contract regardless of ordering: remove and return Len()-1.',
      },
    ],
    correctOptionId: 'last',
  },
  lesson: `
    <p><code>container/heap</code> supplies the heap algorithms for any type that satisfies <code>heap.Interface</code>: <code>Len</code>, <code>Less</code>, and <code>Swap</code> from <code>sort.Interface</code>, plus <code>Push(x any)</code> and <code>Pop() any</code> (<code>interface{}</code> before Go 1.18; same contract since Go 1.0). There is no heap class to extend, as in Java’s <code>PriorityQueue</code>; the library owns the algorithm and calls back into your type. The comparison in <code>Less</code> decides whether the root is the minimum or the maximum.</p>
    <p>The surprising part is ownership. Application code calls the package functions <code>heap.Push</code> and <code>heap.Pop</code>, and those are what maintain the invariant. The whole of <code>heap.Pop</code> is:</p>
    <pre><code>func Pop(h Interface) any {
	n := h.Len() - 1
	h.Swap(0, n)      // the root goes to the last slot
	down(h, 0, n)     // the heap is repaired without that slot
	return h.Pop()    // your callback: remove and return element Len()-1
}</code></pre>
    <p>So your <code>Pop</code> never chooses which element leaves; by the time it runs, the package has already placed the priority item at the end. <code>heap.Push</code> is the mirror image: it calls your <code>Push</code> to append, then sifts the new last element up. <code>Push</code> and <code>Pop</code> take pointer receivers on a slice-backed type because appending and reslicing change the slice header, and the caller must see the new length.</p>
  `,
  challenge: {
    title: 'Complete the adapter, not the heap algorithm',
    description: 'The starter’s <code>IntHeap</code> orders, swaps and appends correctly, but its <code>Pop</code> removes the root at index 0: the plausible reading of “pop the minimum”. Run it: <code>main</code> reports a minimum of 1 and then pops 2. Fix the adapter so the package can initialize unsorted values, interleave pushes and pops, preserve duplicates, and return values in ascending priority order.',
  },
  starterCode: `package main

import (
	"container/heap"
	"fmt"
)

type IntHeap []int

func (h IntHeap) Len() int { return len(h) }

func (h IntHeap) Less(i, j int) bool { return h[i] < h[j] }

func (h IntHeap) Swap(i, j int) { h[i], h[j] = h[j], h[i] }

func (h *IntHeap) Push(value any) {
	*h = append(*h, value.(int))
}

// Pop takes the root, because the root is the minimum. Or is that heap.Pop's job?
func (h *IntHeap) Pop() any {
	old := *h
	value := old[0]
	*h = old[1:]
	return value
}

func main() {
	h := &IntHeap{2, 1, 5}
	heap.Init(h)
	heap.Push(h, 3)
	fmt.Printf("minimum: %d\\n", (*h)[0])
	fmt.Println("popped:", heap.Pop(h))
}`,
  hiddenTestCode: `func() {
	equalInts := func(got []int, want []int) bool {
		if len(got) != len(want) {
			return false
		}
		for index := range got {
			if got[index] != want[index] {
				return false
			}
		}
		return true
	}

	popN := func(h *IntHeap, count int) ([]int, bool) {
		values := make([]int, 0, count)
		for index := 0; index < count; index++ {
			value, ok := heap.Pop(h).(int)
			if !ok {
				return values, false
			}
			values = append(values, value)
		}
		return values, true
	}

	initialized := &IntHeap{5, 1, 3, 1, -2}
	heap.Init(initialized)
	if initialized.Len() == 5 && (*initialized)[0] == -2 {
		println("__GO_SHIFT_TEST__\\tPASS\\tinitialize unsorted\\theap.Init established the min-heap invariant for unsorted input.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tinitialize unsorted\\tLess and Swap must let heap.Init move the minimum value to index 0.")
	}

	ordered, orderedTypes := popN(initialized, 5)
	if orderedTypes && initialized.Len() == 0 && equalInts(ordered, []int{-2, 1, 1, 3, 5}) {
		println("__GO_SHIFT_TEST__\\tPASS\\tordered pops\\tRepeated public pops returned every value in ascending priority order.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tordered pops\\tFive heap.Pop calls on {5, 1, 3, 1, -2} did not return -2, 1, 1, 3, 5 with an empty heap left. Your Pop must remove and return element Len()-1 and shrink *h; heap.Pop has already swapped the minimum into that slot.")
	}

	pushed := &IntHeap{}
	heap.Init(pushed)
	heap.Push(pushed, 4)
	heap.Push(pushed, -1)
	heap.Push(pushed, 4)
	heap.Push(pushed, 0)
	if pushed.Len() == 4 && (*pushed)[0] == -1 {
		println("__GO_SHIFT_TEST__\\tPASS\\tpush and priority\\tPush grew the caller's slice and Less kept the minimum at the root.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tpush and priority\\tAppend through *h in Push, and make Less return h[i] < h[j] for a min-heap.")
	}

	first, firstOK := heap.Pop(pushed).(int)
	heap.Push(pushed, -3)
	rest, restOK := popN(pushed, 4)
	if firstOK && restOK && first == -1 && pushed.Len() == 0 && equalInts(rest, []int{-3, 0, 4, 4}) {
		println("__GO_SHIFT_TEST__\\tPASS\\tinterleaved operations\\tThe adapter preserved its contract across interleaved public pushes and pops.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tinterleaved operations\\tAfter pushing 4, -1, 4, 0, popping once should give -1, and after pushing -3 the rest should come out as -3, 0, 4, 4. Each adapter callback must perform only its documented slice change (append in Push, drop the last slot in Pop); the package selects and repositions the root.")
	}
}()`,
  testNames: ['initialize unsorted', 'ordered pops', 'push and priority', 'interleaved operations'],
  hints: [
    'The initialize and push tests pass, so <code>Less</code>, <code>Swap</code> and <code>Push</code> are fine. Look at <code>Pop</code>, and read the four lines of <code>heap.Pop</code> in the lesson: what has already happened to index 0 by the time your method runs?',
    'The rule is in the <code>heap.Interface</code> documentation: Pop must “remove and return element Len() - 1”. The package chooses the priority item and moves it; your callback only trims the slice.',
    'Read the last element, reslice <code>*h</code> to drop it, and return the value you read. Do not touch index 0 and do not call <code>Less</code>; the pointer receiver is what lets the shorter slice reach the caller.',
  ],
  debrief: {
    title: 'The shift: public behavior is assembled from smaller contracts',
    summary: 'The package-level operation chooses the priority item and repairs the heap. Your adapter supplies ordering, swaps, and a final-slot append or removal. Reading those responsibilities separately prevents a plausible but incorrect root-removing Pop method.',
    transfer: 'What single change to <code>Less</code> would turn this into a max-heap, and which of the other four adapter methods would remain unchanged?',
  },
};
