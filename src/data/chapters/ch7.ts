import type { Chapter } from '../types';

export const ch7: Chapter = {
  id: 'ch7',
  order: 7,
  module: 'solve',
  title: 'Nil-Safe Pointer Traversal',
  mentalModel: 'A loop guard must prove every pointer in the next dereference chain is safe, not merely the first one.',
  outcome: 'Detect a linked-list cycle while making the two-hop fast-pointer dereference safe for every list shape.',
  recognitionCue: 'When one iteration follows more than one link, establish that each intermediate pointer is non-nil before advancing.',
  prediction: {
    prompt: 'On a two-node list with no cycle, what eventually happens with this loop guard?',
    code: `slow, fast := head, head
for fast.Next != nil {
	slow = slow.Next
	fast = fast.Next.Next
}`,
    options: [
      {
        id: 'returns-false',
        label: 'It exits safely',
        explanation: 'After the first iteration, fast is nil. The next guard tries to read fast.Next before it can exit.',
      },
      {
        id: 'finds-cycle',
        label: 'It reports a cycle',
        explanation: 'The two pointers do not meet on this list. The failure occurs when the next guard dereferences nil.',
      },
      {
        id: 'panics',
        label: 'It panics on the next guard',
        explanation: 'Correct. A two-hop advance can leave fast nil, so the next guard must check fast before reading fast.Next.',
      },
    ],
    correctOptionId: 'panics',
  },
  lesson: `
    <p>A pointer’s zero value is <code>nil</code>. Reading <code>fast.Next</code> requires <code>fast != nil</code>; reading <code>fast.Next.Next</code> also requires <code>fast.Next != nil</code>. Go evaluates <code>&amp;&amp;</code> from left to right and stops at the first false operand, so the order of this guard establishes both facts safely.</p>
    <pre><code>slow, fast := head, head
for fast != nil &amp;&amp; fast.Next != nil {
    slow = slow.Next
    fast = fast.Next.Next
    if slow == fast {
        return true
    }
}
return false</code></pre>
    <p>The equality check compares pointers: two pointers meeting means they refer to the same node, even when several nodes contain the same value. An acyclic fast pointer eventually reaches <code>nil</code>; inside a cycle, the faster pointer eventually catches the slower one.</p>
  `,
  challenge: {
    title: 'Detect a cycle without outrunning the guard',
    description: 'Implement <code>hasCycle</code> with a slow pointer and a fast pointer. It must return safely for empty, one-node, and acyclic lists, detect cycles of different shapes, and leave the links unchanged.',
  },
  starterCode: `package main

import "fmt"

type ListNode struct {
	Val  int
	Next *ListNode
}

func hasCycle(head *ListNode) bool {
	// Advance one pointer by one link and the other by two.
	return false
}

func main() {
	a := &ListNode{Val: 1}
	b := &ListNode{Val: 2}
	a.Next = b
	fmt.Println(hasCycle(a))
}`,
  hiddenTestCode: `func() {
	call := func(head *ListNode) (bool, bool) {
		got := false
		panicked := false
		func() {
			defer func() {
				if recover() != nil {
					panicked = true
				}
			}()
			got = hasCycle(head)
		}()
		return got, panicked
	}

	run := func(name string, head *ListNode, want bool, passMessage string, failMessage string) {
		got, panicked := call(head)

		if !panicked && got == want {
			println("__GO_SHIFT_TEST__\\tPASS\\t" + name + "\\t" + passMessage)
		} else if panicked {
			println("__GO_SHIFT_TEST__\\tFAIL\\t" + name + "\\tTraversal panicked. Prove fast and fast.Next are non-nil before advancing two links.")
		} else {
			println("__GO_SHIFT_TEST__\\tFAIL\\t" + name + "\\t" + failMessage)
		}
	}

	run("empty list", nil, false,
		"Handled a nil head without dereferencing it.",
		"An empty list has no cycle.")

	single := &ListNode{Val: 1}
	a := &ListNode{Val: 1}
	b := &ListNode{Val: 1}
	c := &ListNode{Val: 1}
	a.Next, b.Next = b, c
	singleResult, singlePanic := call(single)
	longResult, longPanic := call(a)
	if !singlePanic && !longPanic && !singleResult && !longResult {
		println("__GO_SHIFT_TEST__\\tPASS\\tacyclic endpoints\\tStopped safely at both one-node and longer acyclic endpoints.")
	} else if singlePanic || longPanic {
		println("__GO_SHIFT_TEST__\\tFAIL\\tacyclic endpoints\\tTraversal panicked at an acyclic endpoint. Check fast before fast.Next.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tacyclic endpoints\\tEqual node values do not make a cycle; pointer identity and nil termination do.")
	}

	self := &ListNode{Val: 7}
	self.Next = self
	run("self cycle", self, true,
		"Detected a node whose next link returns to itself.",
		"A one-node self-loop is a cycle.")

	first := &ListNode{Val: 4}
	second := &ListNode{Val: 5}
	first.Next, second.Next = second, first
	run("two-node cycle", first, true,
		"Detected a cycle whose pointers alternate between two nodes.",
		"The fast pointer must also detect a two-node cycle.")

	n1 := &ListNode{Val: 10}
	n2 := &ListNode{Val: 20}
	n3 := &ListNode{Val: 30}
	n4 := &ListNode{Val: 40}
	n1.Next, n2.Next, n3.Next, n4.Next = n2, n3, n4, n2
	detected, middlePanic := call(n1)
	unchanged := n1.Next == n2 && n2.Next == n3 && n3.Next == n4 && n4.Next == n2
	if !middlePanic && detected && unchanged {
		println("__GO_SHIFT_TEST__\\tPASS\\tmiddle-entry cycle\\tDetected a cycle after an acyclic prefix without rewriting links.")
	} else if middlePanic {
		println("__GO_SHIFT_TEST__\\tFAIL\\tmiddle-entry cycle\\tTraversal panicked before the pointers could meet inside the cycle.")
	} else if !unchanged {
		println("__GO_SHIFT_TEST__\\tFAIL\\tmiddle-entry cycle\\tDetect the cycle with pointer movement; do not break or rewrite the list.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tmiddle-entry cycle\\tThe pointers must meet even when the cycle begins after an acyclic prefix.")
	}
}()`,
  testNames: ['empty list', 'acyclic endpoints', 'self cycle', 'two-node cycle', 'middle-entry cycle'],
  hints: [
    'Initialize both pointers to <code>head</code>. Your loop can continue only while <code>fast != nil &amp;&amp; fast.Next != nil</code>.',
    'Inside the loop, advance <code>slow = slow.Next</code> and <code>fast = fast.Next.Next</code>. The guard makes both assignments safe.',
    'After advancing, return <code>true</code> when <code>slow == fast</code>. If the loop ends first, return <code>false</code>.',
  ],
  debrief: {
    title: 'The shift: guards establish dereference invariants',
    summary: 'A nil check is not a ritual attached to pointers. It is proof that the exact dereference chain used next is valid. Floyd’s algorithm adds a second idea: compare node identity, not stored values.',
    transfer: 'If the fast pointer advanced three links per iteration, which pointers would the loop guard need to prove non-nil before that assignment?',
  },
};
