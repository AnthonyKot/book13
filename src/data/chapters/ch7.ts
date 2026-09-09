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
    prompt: 'head is a two-node list with no cycle. What happens to this loop?',
    code: `slow, fast := head, head
for fast.Next != nil {
	slow = slow.Next
	fast = fast.Next.Next
}`,
    options: [
      {
        id: 'returns-false',
        label: 'It exits safely',
        explanation: 'After the first iteration fast is nil (b.Next). The guard then reads fast.Next, which dereferences nil before the loop can exit. A three-node list would exit safely; a two-node list does not.',
      },
      {
        id: 'finds-cycle',
        label: 'It reports a cycle',
        explanation: 'The two pointers never meet on an acyclic list, and this loop does not even compare them. The failure is the second guard evaluation dereferencing a nil fast.',
      },
      {
        id: 'panics',
        label: 'It panics on the next guard',
        explanation: 'Correct. fast = fast.Next.Next lands on nil after one iteration, and the guard reads fast.Next from it: a nil pointer dereference panic. The same loop exits safely on a one- or three-node list, which is why this bug survives small tests.',
      },
    ],
    correctOptionId: 'panics',
  },
  lesson: `
    <p>A pointer’s zero value is <code>nil</code>, and dereferencing it is a runtime panic, not an exception you can catch at the call site the way Java or TypeScript code does. Every field read in a chain needs its own proof: reading <code>fast.Next</code> requires <code>fast != nil</code>; reading <code>fast.Next.Next</code> additionally requires <code>fast.Next != nil</code>. Go evaluates <code>&amp;&amp;</code> from left to right and stops at the first false operand, so a guard can state both facts in order and the second is only evaluated once the first holds.</p>
    <pre><code>// unsafe: proves only the first link of a two-link read
for fast.Next != nil { fast = fast.Next.Next }
//   0 nodes: panic    1 node: exits    2 nodes: panic    3 nodes: exits    4 nodes: panic

// safe: one proof per dereference, in evaluation order
for fast != nil &amp;&amp; fast.Next != nil { fast = fast.Next.Next }</code></pre>
    <p>The parity pattern is the point: an unguarded intermediate pointer is a bug that passes a one- or three-node test and crashes on the next shape. Floyd’s algorithm adds a second idea. The meeting test compares pointers with <code>==</code>: two pointers are equal when they refer to the same node, even when several nodes store the same <code>Val</code>. On an acyclic list the fast pointer reaches <code>nil</code>; inside a cycle it gains one node per iteration on the slow pointer and must catch it.</p>
  `,
  challenge: {
    title: 'Detect a cycle without outrunning the guard',
    description: 'The starter is a slow/fast cycle detector whose guard checks only <code>fast.Next</code>. It prints <code>false</code> for the three-node list in <code>main</code> and panics on a two-node or empty one. Fix the guard so <code>hasCycle</code> returns safely for empty, one-node, and acyclic lists of any length, detects cycles of different shapes, and leaves the links unchanged.',
  },
  starterCode: `package main

import "fmt"

type ListNode struct {
	Val  int
	Next *ListNode
}

func hasCycle(head *ListNode) bool {
	slow, fast := head, head
	// The guard proves fast.Next is readable. It says nothing about fast itself,
	// which is exactly what fast = fast.Next.Next can turn into nil.
	for fast.Next != nil {
		slow = slow.Next
		fast = fast.Next.Next
		if slow == fast {
			return true
		}
	}
	return false
}

func main() {
	a := &ListNode{Val: 1}
	b := &ListNode{Val: 2}
	c := &ListNode{Val: 3}
	a.Next, b.Next = b, c
	fmt.Println(hasCycle(a)) // false — and it exits only because the list has an odd length
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
			println("__GO_SHIFT_TEST__\\tFAIL\\t" + name + "\\thasCycle panicked on a nil dereference. The guard reads fast.Next, so it must first prove fast != nil; fast = fast.Next.Next can make fast nil.")
		} else {
			println("__GO_SHIFT_TEST__\\tFAIL\\t" + name + "\\t" + failMessage)
		}
	}

	run("empty list", nil, false,
		"Handled a nil head without dereferencing it.",
		"An empty list has no cycle.")

	single := &ListNode{Val: 1}
	pair := &ListNode{Val: 1}
	pair.Next = &ListNode{Val: 1}
	a := &ListNode{Val: 1}
	b := &ListNode{Val: 1}
	c := &ListNode{Val: 1}
	a.Next, b.Next = b, c
	singleResult, singlePanic := call(single)
	pairResult, pairPanic := call(pair)
	longResult, longPanic := call(a)
	if !singlePanic && !pairPanic && !longPanic && !singleResult && !pairResult && !longResult {
		println("__GO_SHIFT_TEST__\\tPASS\\tacyclic endpoints\\tStopped safely at one-, two- and three-node acyclic endpoints.")
	} else if singlePanic || pairPanic || longPanic {
		println("__GO_SHIFT_TEST__\\tFAIL\\tacyclic endpoints\\thasCycle panicked on an acyclic list of length 1, 2 or 3. After a two-link advance fast can be nil, so the guard must check fast before reading fast.Next.")
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
    'Change <code>main</code> to build a two-node list and run it. Then trace the guard by hand: after <code>fast = fast.Next.Next</code> on that list, what is <code>fast</code>, and what does the guard read from it?',
    'The rule: each dereference in a chain needs its own nil check, in the order the chain is read. <code>&amp;&amp;</code> short-circuits left to right, so a guard can state “fast is not nil, and then fast.Next is not nil” and the second test is only reached when the first is true.',
    'Add the missing proof to the front of the loop condition; nothing inside the loop needs to change. The empty list then falls out for free, because a nil head fails the first test before anything is read.',
  ],
  debrief: {
    title: 'The shift: guards establish dereference invariants',
    summary: 'A nil check is not a ritual attached to pointers. It is proof that the exact dereference chain used next is valid. Floyd’s algorithm adds a second idea: compare node identity, not stored values.',
    transfer: 'If the fast pointer advanced three links per iteration, which pointers would the loop guard need to prove non-nil before that assignment?',
  },
};
