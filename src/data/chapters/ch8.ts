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
    prompt: 'When heap.Pop(h) removes the minimum, which element must (*IntHeap).Pop remove and return?',
    code: `func (h *IntHeap) Pop() any {
	old := *h
	n := len(old)
	// Which slot belongs here?
}`,
    options: [
      {
        id: 'root',
        label: 'Index 0 — the heap root',
        explanation: 'That duplicates work owned by container/heap. Before calling your method, the package has already moved the selected root to the end.',
      },
      {
        id: 'last',
        label: 'Index n-1 — the final slot',
        explanation: 'Correct. The interface callback removes Len()-1; the package-level heap.Pop operation handles selecting and repositioning the root.',
      },
      {
        id: 'less',
        label: 'Whichever slot Less selects',
        explanation: 'Less defines priority ordering, but the adapter Pop callback has a fixed contract: remove and return Len()-1.',
      },
    ],
    correctOptionId: 'last',
  },
  lesson: `
    <p><code>container/heap</code> supplies heap algorithms for any type that satisfies <code>heap.Interface</code>. A slice-backed adapter provides <code>Len</code>, <code>Less</code>, and <code>Swap</code> from <code>sort.Interface</code>, plus <code>Push</code> and <code>Pop</code>. The comparison in <code>Less</code> decides whether the root is the minimum or maximum.</p>
    <p>The surprising part is ownership. Call the package functions <code>heap.Push</code> and <code>heap.Pop</code> from application code. Those functions restore the heap invariant. During a public pop, the package moves the selected root to the end and then calls your adapter’s <code>Pop</code>, whose contract is only to remove and return <code>Len()-1</code>.</p>
    <pre><code>func (h *IntHeap) Pop() any {
    old := *h
    n := len(old)
    value := old[n-1]
    *h = old[:n-1]
    return value
}</code></pre>
    <p><code>Push</code> and <code>Pop</code> use pointer receivers for this slice-backed type because appending and reslicing must update the caller’s slice header.</p>
  `,
  challenge: {
    title: 'Complete the adapter, not the heap algorithm',
    description: 'Implement the remaining <code>IntHeap</code> methods as a min-heap adapter. The package must be able to initialize unsorted values, interleave pushes and pops, preserve duplicates, and return values in ascending priority order.',
  },
  starterCode: `package main

import (
	"container/heap"
	"fmt"
)

type IntHeap []int

func (h IntHeap) Len() int { return len(h) }

func (h IntHeap) Less(i, j int) bool {
	return false
}

func (h IntHeap) Swap(i, j int) {
}

func (h *IntHeap) Push(value any) {
}

func (h *IntHeap) Pop() any {
	return nil
}

func main() {
	h := &IntHeap{2, 1, 5}
	heap.Init(h)
	heap.Push(h, 3)
	fmt.Printf("minimum: %d\\n", (*h)[0])
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
		println("__GO_SHIFT_TEST__\\tFAIL\\tordered pops\\tPop must remove Len()-1 and shrink *h; container/heap has already moved the minimum there.")
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
		println("__GO_SHIFT_TEST__\\tFAIL\\tinterleaved operations\\tUse heap.Push and heap.Pop as the public operations; each adapter callback should only perform its documented slice change.")
	}
}()`,
  testNames: ['initialize unsorted', 'ordered pops', 'push and priority', 'interleaved operations'],
  hints: [
    'For a min-heap, <code>Less(i, j)</code> returns <code>h[i] &lt; h[j]</code>. <code>Swap</code> exchanges the two indexed elements.',
    'In <code>Push</code>, assert <code>value.(int)</code> and assign <code>*h = append(*h, value)</code>. The pointer receiver lets the new slice header reach the caller.',
    'In <code>Pop</code>, save <code>old := *h</code> and <code>n := len(old)</code>, take <code>old[n-1]</code>, reslice to <code>old[:n-1]</code>, and return the saved value.',
  ],
  debrief: {
    title: 'The shift: public behavior is assembled from smaller contracts',
    summary: 'The package-level operation chooses the priority item and repairs the heap. Your adapter supplies ordering, swaps, and a final-slot append or removal. Reading those responsibilities separately prevents a plausible but incorrect root-removing Pop method.',
    transfer: 'What single change to <code>Less</code> would turn this into a max-heap, and which of the other four adapter methods would remain unchanged?',
  },
};
