import type { Chapter } from '../types';

export const ch2: Chapter = {
  id: 'ch2',
  order: 2,
  module: 'think',
  title: 'Errors: Failure Is Part of the Return Value',
  mentalModel: 'An expected failure is data for the caller, not a hidden jump out of the current control flow.',
  outcome: 'Return and handle an error for an expected missing result without panicking.',
  recognitionCue: 'If a caller can reasonably retry, report, substitute, or add context, represent the failure with an error return.',
  prediction: {
    prompt: 'GetUser panics for a missing record. No deferred function recovers it. What happens after the call?',
    code: `fmt.Println("before")
user := GetUser(2)
fmt.Println("user:", user)
fmt.Println("after")`,
    options: [
      {
        id: 'continues-empty',
        label: 'It prints an empty user and continues',
        explanation: 'panic does not turn into a zero value. It stops ordinary execution and begins unwinding the current goroutine’s stack.',
      },
      {
        id: 'stops-program',
        label: 'It prints before, then terminates',
        explanation: 'Correct. With no recovery in a deferred function on that goroutine, the panic reaches the top and terminates the program.',
      },
      {
        id: 'only-goroutine',
        label: 'Only that goroutine quietly exits',
        explanation: 'An unrecovered panic does not quietly discard one goroutine; reaching the top of a goroutine terminates the program.',
      },
    ],
    correctOptionId: 'stops-program',
  },
  lesson: `
    <p>Go functions commonly return a useful value followed by <code>error</code>. A nil error means the operation succeeded; a non-nil error lets the caller choose whether to return it, add context, retry, or present a fallback. The language does not force handling—you can discard a value—but the failure stays visible in the function’s contract.</p>
    <p><code>panic</code> stops normal execution and unwinds the current goroutine, running deferred calls. If no deferred function on that same goroutine recovers it, the program terminates. That mechanism is useful for broken invariants and programmer faults, not an expected “user not found” result.</p>
    <pre><code>user, err := GetUser(id)
if err != nil {
	return "Lookup failed: " + err.Error()
}
return "User: " + user</code></pre>
  `,
  challenge: {
    title: 'Make the missing result explicit',
    description: 'GetUser advertises an error return but currently reports a missing user as if the lookup succeeded with an empty name. Return errUserNotFound for every unknown ID so the caller can distinguish failure from valid data.',
  },
  starterCode: `package main

import (
	"errors"
	"fmt"
)

var errUserNotFound = errors.New("user not found")

func GetUser(id int) (string, error) {
	if id != 1 {
		// BUG: nil incorrectly tells the caller this lookup succeeded.
		return "", nil
	}
	return "Alice", nil
}

func userLabel(id int) string {
	user, err := GetUser(id)
	if err != nil {
		return "Lookup failed: " + err.Error()
	}
	return "User: " + user
}

func main() {
	fmt.Println(userLabel(1))
}`,
  hiddenTestCode: `func() {
	user, err := GetUser(1)
	if user == "Alice" && err == nil {
		println("__GO_SHIFT_TEST__\tPASS\tsuccessful lookup\tA successful lookup returns Alice and a nil error.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tsuccessful lookup\tID 1 must still return Alice with a nil error.")
	}
	user, err = GetUser(2)
	if user == "" && err != nil && err.Error() == "user not found" {
		println("__GO_SHIFT_TEST__\tPASS\tmissing user error\tThe expected failure is represented by the returned error.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tmissing user error\tReturn an empty name and the user-not-found error for an unknown ID.")
	}
	zeroUser, zeroErr := GetUser(0)
	largeUser, largeErr := GetUser(99)
	if zeroUser == "" && zeroErr != nil && largeUser == "" && largeErr != nil {
		println("__GO_SHIFT_TEST__\tPASS\tall unknown IDs\tEvery unknown ID follows the same explicit failure contract.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tall unknown IDs\tReturn a non-nil error for every ID other than 1, not only the example ID.")
	}
	if userLabel(1) == "User: Alice" && userLabel(2) == "Lookup failed: user not found" {
		println("__GO_SHIFT_TEST__\tPASS\tcaller handles error\tThe caller can choose a success or failure message explicitly.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tcaller handles error\tKeep both the success value and returned error usable by the caller.")
	}
}()`,
  testNames: ['successful lookup', 'missing user error', 'all unknown IDs', 'caller handles error'],
  hints: [
    'The function signature already returns <code>(string, error)</code>. A nil error promises success, even when the useful value is empty.',
    'The missing branch should return the zero value for the name together with a non-nil error: <code>return "", ...</code>.',
    'Use the existing sentinel value: <code>return "", errUserNotFound</code>. Leave <code>userLabel</code> to decide how the error is presented.',
  ],
  debrief: {
    title: 'The shift: expected failure stays in the contract',
    summary: 'Returning an error preserves normal control flow and gives each caller a local decision. Panic is a stack-unwinding mechanism, not a replacement for an expected result that callers can handle.',
    transfer: 'A parser sees malformed user input in one case and reaches an internal state its own code says is impossible in another. Which should return an error, and which might justify a panic?',
  },
};
