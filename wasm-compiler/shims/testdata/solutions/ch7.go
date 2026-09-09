package main

import "fmt"

type ListNode struct {
	Val  int
	Next *ListNode
}

// hasCycle is Floyd's tortoise and hare. The guard proves both links that the
// two-hop advance reads: fast.Next needs fast != nil, fast.Next.Next needs
// fast.Next != nil, and && evaluates left to right, stopping at the first false.
func hasCycle(head *ListNode) bool {
	slow, fast := head, head
	for fast != nil && fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next
		if slow == fast { // pointer identity, not Val
			return true
		}
	}
	return false
}

func main() {
	a := &ListNode{Val: 1}
	b := &ListNode{Val: 2}
	a.Next = b
	fmt.Println(hasCycle(a))
}
