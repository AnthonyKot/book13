import type { Chapter } from '../types';

export const ch16: Chapter = {
  id: 'ch16',
  order: 6,
  module: 'think',
  title: 'Typed Nil: A Nil Pointer Is Not a Nil Interface',
  mentalModel: 'An interface value is two words: a concrete type and a value. It is nil only when both words are nil; a nil pointer stored in an interface still carries its type.',
  outcome: 'Return a true nil error interface on success while returning a concrete error pointer on failure.',
  recognitionCue: 'Never declare a concrete error pointer variable at the top of a function and return it unconditionally as an error interface.',
  prediction: {
    prompt: 'validate never assigns to err when name is non-empty. What does main print?',
    code: `type ValidationError struct{ Field string }
func (e *ValidationError) Error() string { return "invalid " + e.Field }

func validate(name string) error {
	var err *ValidationError
	if name == "" {
		err = &ValidationError{Field: "name"}
	}
	return err
}

fmt.Println(validate("Alice") == nil)`,
    options: [
      {
        id: 'true-nil',
        label: 'true — err was never assigned, so it is nil',
        explanation: 'err is a nil *ValidationError pointer, but returning it as an error wraps it in an interface whose concrete type is *ValidationError. An interface with a non-nil type is never equal to nil.',
      },
      {
        id: 'false-typed-nil',
        label: 'false — the returned error holds (*ValidationError, nil)',
        explanation: 'Correct. Converting err to the error interface records the concrete type *ValidationError alongside the nil pointer. Comparing that interface to nil returns false.',
      },
      {
        id: 'panic-call',
        label: 'It panics when boxing a nil pointer into error',
        explanation: 'Boxing a nil pointer into an interface does not panic. The trap is that it succeeds quietly and produces a non-nil interface value.',
      },
    ],
    correctOptionId: 'false-typed-nil',
  },
  lesson: `
    <p>Under the hood, a Go interface value is a pair: <code>(type, value)</code>. A bare <code>nil</code> interface has <code>(nil, nil)</code>. When a function’s return type is <code>error</code> and it returns a variable declared as <code>var err *ValidationError</code>, Go boxes that variable into the interface as <code>(*ValidationError, nil)</code>.</p>
    <p>Because the type slot is not nil, <code>err != nil</code> is <strong>true</strong> at the call site. Worse, when the caller logs <code>err.Error()</code>, Go dispatches <code>(*ValidationError).Error()</code> with a <code>nil</code> receiver and panics dereferencing <code>e.Field</code>.</p>
    <pre><code>// broken: returns (*ValidationError, nil) on success
func validate(name string) error {
	var err *ValidationError
	if name == "" {
		err = &amp;ValidationError{Field: "name"}
	}
	return err
}

// fixed: return the concrete pointer only on failure, and literal nil on success
func validate(name string) error {
	if name == "" {
		return &amp;ValidationError{Field: "name"}
	}
	return nil
}</code></pre>
    <p>If you must accumulate into a concrete pointer before returning, guard the conversion explicitly: <code>if err != nil { return err }</code> followed by <code>return nil</code>, or hold the variable as <code>var err error</code> from the start.</p>
  `,
  challenge: {
    title: 'Return a genuine nil error on valid orders',
    description: '<code>ValidateOrder</code> checks that <code>sku</code> is non-empty and <code>qty</code> is positive. Fix it so a valid order returns a <code>nil</code> <code>error</code> interface, while invalid orders still return a <code>*ValidationError</code> with the failing field and reason.',
  },
  starterCode: `package main

import "fmt"

type ValidationError struct {
	Field  string
	Reason string
}

func (e *ValidationError) Error() string {
	return e.Field + ": " + e.Reason
}

func ValidateOrder(sku string, qty int) error {
	var err *ValidationError
	if sku == "" {
		err = &ValidationError{Field: "sku", Reason: "required"}
	} else if qty <= 0 {
		err = &ValidationError{Field: "qty", Reason: "must be positive"}
	}
	// BUG: When both checks pass, this returns (*ValidationError, nil) as an error.
	return err
}

func main() {
	err := ValidateOrder("A-100", 2)
	fmt.Println("err == nil:", err == nil)
}
`,
  hiddenTestCode: `func() {
	if err := ValidateOrder("A-100", 2); err == nil {
		println("__GO_SHIFT_TEST__\\tPASS\\tvalid order is nil\\tA valid order returns a true nil error interface.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tvalid order is nil\\tValidateOrder(\\"A-100\\", 2) returned a non-nil error interface. Return literal nil when validation succeeds.")
	}

	skuErr := ValidateOrder("", 3)
	if skuErr != nil && skuErr.Error() == "sku: required" {
		println("__GO_SHIFT_TEST__\\tPASS\\tempty sku rejected\\tReported the missing SKU with the expected message.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tempty sku rejected\\tFor an empty sku, return &ValidationError{Field: \\"sku\\", Reason: \\"required\\"}.")
	}

	zeroErr := ValidateOrder("A-100", 0)
	negErr := ValidateOrder("A-100", -4)
	if zeroErr != nil && zeroErr.Error() == "qty: must be positive" && negErr != nil && negErr.Error() == "qty: must be positive" {
		println("__GO_SHIFT_TEST__\\tPASS\\tnon-positive qty rejected\\tRejected zero and negative quantities.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tnon-positive qty rejected\\tWhen sku is present and qty <= 0, return &ValidationError{Field: \\"qty\\", Reason: \\"must be positive\\"}.")
	}

	concreteOK := false
	if skuErr != nil {
		if ve, ok := skuErr.(*ValidationError); ok && ve != nil && ve.Field == "sku" && ve.Reason == "required" {
			concreteOK = true
		}
	}
	if concreteOK {
		println("__GO_SHIFT_TEST__\\tPASS\\tconcrete type preserved\\tCallers can still inspect the *ValidationError fields on failure.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tconcrete type preserved\\tOn failure, return a *ValidationError so callers can inspect Field and Reason.")
	}
}()`,
  testNames: ['valid order is nil', 'empty sku rejected', 'non-positive qty rejected', 'concrete type preserved'],
  hints: [
    'Run the starter: <code>ValidateOrder("A-100", 2) == nil</code> prints <code>false</code> even though neither <code>if</code> branch executed.',
    'Because <code>err</code> has type <code>*ValidationError</code>, returning <code>err</code> boxes its type into the <code>error</code> interface even when the pointer is <code>nil</code>.',
    'Either return <code>&amp;ValidationError{…}</code> directly inside each failing branch and <code>return nil</code> at the end, or declare <code>var err error</code> instead of <code>var err *ValidationError</code>.',
  ],
  debrief: {
    title: 'The shift: nil is a question about both type and value',
    summary: 'A pointer is nil when its address is zero. An interface is nil only when it holds no concrete type at all. Returning a typed nil pointer across an interface boundary is one of Go’s sharpest traps because the code looks obviously nil-safe until it runs.',
    transfer: 'A helper returns (*os.PathError, bool) internally and a wrapper returns its first result as error. What happens when the bool is false and the pointer is nil?',
  },
};
