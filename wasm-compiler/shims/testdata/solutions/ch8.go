package main

import (
	"container/heap"
	"fmt"
)

// IntHeap is a min-heap adapter over a slice. It supplies heap.Interface;
// container/heap owns the algorithm and calls back into these methods.
type IntHeap []int

func (h IntHeap) Len() int           { return len(h) }
func (h IntHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h IntHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

// Push and Pop take pointer receivers: they change the slice header, and the
// caller must see the new length.
func (h *IntHeap) Push(value any) {
	*h = append(*h, value.(int))
}

// Pop removes and returns element Len()-1. heap.Pop has already swapped the
// root into that slot and repaired the heap before calling this.
func (h *IntHeap) Pop() any {
	old := *h
	n := len(old)
	value := old[n-1]
	*h = old[:n-1]
	return value
}

func main() {
	h := &IntHeap{2, 1, 5}
	heap.Init(h)
	heap.Push(h, 3)
	fmt.Printf("minimum: %d\n", (*h)[0])
	fmt.Println("popped:", heap.Pop(h))
}
