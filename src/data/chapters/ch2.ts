import type { Chapter } from '../types';

export const ch2: Chapter = {
  id: 'ch2',
  tag: 'Chapter 2',
  title: 'Error Handling & Panics',
  content: `
    <p>Unlike languages like Java, Python, or C#, Go does not use exception-handling constructs like <code>try/catch/finally</code>.</p>
    <p>In Go, <strong>errors are values</strong>. Functions that can fail return an <code>error</code> interface type as their last return value. This design forces developers to handle potential failure states explicitly right where they occur, creating clear, linear control flow without hidden exception jumps.</p>
    <h3>Why Panics Should Be Avoided</h3>
    <p>Go provides a built-in <code>panic</code> function, but it is <strong>not</strong> intended for standard application error handling. When a panic occurs, normal execution stops, the stack unwinds, and the goroutine crashes unless explicit recovery is implemented.</p>
    <p>In production Go code, <code>panic</code> should be strictly reserved for unrecoverable state anomalies or programmer errors during application initialization (e.g., invalid startup configuration). Using <code>panic</code> for expected runtime failures like "user not found", invalid input, or network timeouts is an anti-pattern.</p>
  `,
  challengeTitle: 'Refactor Panic to Idiomatic Error',
  challengeDescription: `
    <p>The code in the editor currently uses <code>panic("user not found")</code> when an invalid user ID is provided.</p>
    <p><strong>Task:</strong> Refactor <code>GetUser(id int)</code> to return <code>(string, error)</code> instead of panicking. If <code>id != 1</code>, return an empty string and <code>errors.New("user not found")</code>. Update <code>main()</code> to handle the error properly.</p>
  `,
  initialCode: `package main

import (
	"errors"
	"fmt"
)

// GetUser fetches a user by ID or panics if not found.
func GetUser(id int) string {
	if id != 1 {
		panic("user not found")
	}
	return "Alice"
}

func main() {
	user := GetUser(2)
	fmt.Println("User:", user)
}
`,
  validate: (code: string) => {
    // Check if panic keyword is still used
    if (/\bpanic\b/.test(code)) {
      return {
        success: false,
        message: '❌ Challenge not solved: Your code still uses the `panic` keyword. Refactor `GetUser` to return an `error` instead of panicking.'
      };
    }

    // Check if error type is in GetUser signature
    const hasErrorReturn = /func\s+GetUser\s*\([^)]*\)\s*\([^)]*error[^)]*\)|func\s+GetUser\s*\([^)]*\)\s*\(?.*error.*\)?/.test(code);
    if (!hasErrorReturn) {
      return {
        success: false,
        message: '❌ Challenge not solved: `GetUser` function signature must return `(string, error)` or an `error` interface.'
      };
    }

    // Check if proper error construction is used
    const usesErrorFunc = code.includes('errors.New') || code.includes('fmt.Errorf');
    if (!usesErrorFunc) {
      return {
        success: false,
        message: '❌ Challenge not solved: Make sure to return a proper error using `errors.New("user not found")` or `fmt.Errorf(...)`.'
      };
    }

    return {
      success: true,
      message: '✅ Success! You refactored panic into an explicit error return value.\n\nIn Go, returning `(T, error)` is the idiomatic pattern for error handling. It promotes explicit error checking and prevents unexpected runtime crashes.'
    };
  }
};
