import { Chapter } from '../types';

export const ch7: Chapter = {
  id: 'ch7',
  tag: 'Chapter 7',
  title: 'Struct Pointers & Linked Lists',
  content: `
    <p>Linked Lists in Go are built using structs that hold pointers to other structs of the same type.</p>
    <p>The most common mistake candidates make in Go is forgetting that pointers can be <code>nil</code>. Always check <code>if node != nil</code> before dereferencing <code>node.Next</code>, or your program will panic and crash.</p>
    <h3>Tortoise & Hare</h3>
    <p>Floyd's Cycle Finding algorithm uses a slow pointer (moves 1 step) and a fast pointer (moves 2 steps). If they ever meet, the list has a cycle.</p>
  `,
  challengeTitle: 'Detect Cycle',
  challengeDescription: `
    <p><strong>Task:</strong> Implement <code>hasCycle</code> for a linked list. Use a slow and fast pointer to detect if there is a cycle.</p>
  `,
  initialCode: `package main

import "fmt"

type ListNode struct {
	Val  int
	Next *ListNode
}

func hasCycle(head *ListNode) bool {
	// TODO: Implement Tortoise & Hare
	return false
}

func main() {
	// Test it out!
	fmt.Println("Ready to test.")
}`,
  validate: (code: string) => {
    if (code.includes('.Next') && (code.includes('!= nil') || code.includes('== nil'))) {
      return { success: true, message: '✅ Success! Properly handling pointer nil checks is the core of Linked List problems in Go.' };
    }
    return { success: false, message: '❌ Challenge not solved. Make sure you traverse the list using `.Next` and perform nil checks.' };
  }
};
