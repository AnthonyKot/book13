import type { Chapter } from '../types';

export const ch18: Chapter = {
  id: 'ch18',
  order: 11,
  module: 'solve',
  title: 'Embedding Is Delegation, Not Inheritance',
  mentalModel: 'Embedding promotes an inner type’s methods for callers, but when an inner method runs, its receiver is still the inner value—it never dispatches back to methods defined on the outer struct.',
  outcome: 'Replace a broken OOP-style method override on an embedded struct with explicit composition so the outer type’s rule actually runs.',
  recognitionCue: 'When an outer struct defines a method with the same name as a helper called inside an embedded struct, stop: the embedded struct will still call its own method.',
  prediction: {
    prompt: 'Admin embeds Base and defines its own Role method. What does Admin{}.Badge() return?',
    code: `type Base struct{}
func (Base) Role() string    { return "guest" }
func (b Base) Badge() string { return "role=" + b.Role() }

type Admin struct{ Base }
func (Admin) Role() string   { return "admin" }

fmt.Println(Admin{}.Badge())`,
    options: [
      {
        id: 'admin',
        label: 'role=admin — Admin overrides Role()',
        explanation: 'Go has no subclassing or virtual method table. Promoting Badge onto Admin simply forwards the call to Admin.Base.Badge(), where the receiver b is a Base.',
      },
      {
        id: 'guest',
        label: 'role=guest — Badge’s receiver is Base, so b.Role() calls Base.Role()',
        explanation: 'Correct. Calling Admin{}.Badge() invokes Base.Badge(Admin{}.Base). Inside that method, b has static type Base and calls Base.Role(), returning "guest".',
      },
      {
        id: 'compile-error',
        label: 'Compile error — ambiguous method Role',
        explanation: 'An outer method with the same name shadows the embedded method for callers of Admin, which is legal; it just does not alter what Base.Badge calls internally.',
      },
    ],
    correctOptionId: 'guest',
  },
  lesson: `
    <p>Developers arriving from Java, C#, Python, or TypeScript often read struct embedding as inheritance and try the <em>Template Method</em> pattern: write a general algorithm on a base type (` + '`Total`' + `), call a hook method (` + '`Discount`' + `), and “override” the hook on an embedding struct (` + '`MemberCheckout`' + `).</p>
    <p>In Go, that silently fails. Embedding <code>BaseCheckout</code> inside <code>MemberCheckout</code> generates a forwarding wrapper for promoted methods:</p>
    <pre><code>// What promotion actually does for MemberCheckout.Total:
func (m MemberCheckout) Total(subtotal int) int {
	return m.BaseCheckout.Total(subtotal) // receiver is now BaseCheckout!
}</code></pre>
    <p>Once execution enters <code>BaseCheckout.Total</code>, <code>m</code> is gone; the receiver is <code>c BaseCheckout</code>, and <code>c.Discount(subtotal)</code> resolves statically to <code>BaseCheckout.Discount</code>. <code>MemberCheckout.Discount</code> is never called.</p>
    <p>To customize behavior in Go, either implement <code>Total</code> on <code>MemberCheckout</code> and delegate the shared tax calculation to <code>m.BaseCheckout.Total(discounted)</code>, or pass a discount function/interface into the calculator.</p>
  `,
  challenge: {
    title: 'Make MemberCheckout apply its member discount',
    description: '<code>MemberCheckout</code> embeds <code>BaseCheckout</code> and defines <code>Discount</code>, but calling <code>m.Total(subtotal)</code> ignores <code>FlatOff</code> completely. Implement <code>Total(subtotal int) int</code> on <code>MemberCheckout</code> so it subtracts <code>m.Discount(subtotal)</code> (clamped at 0 so a total never goes negative) and delegates the taxed total calculation to <code>BaseCheckout</code>.',
  },
  starterCode: `package main

import "fmt"

type BaseCheckout struct {
	TaxPercent int
}

func (c BaseCheckout) Discount(subtotal int) int {
	return 0
}

func (c BaseCheckout) Total(subtotal int) int {
	discounted := subtotal - c.Discount(subtotal)
	if discounted < 0 {
		discounted = 0
	}
	return discounted + (discounted*c.TaxPercent)/100
}

type MemberCheckout struct {
	BaseCheckout
	FlatOff int
}

// BUG: Defining Discount on MemberCheckout does not change what BaseCheckout.Total calls.
func (m MemberCheckout) Discount(subtotal int) int {
	return m.FlatOff
}

func main() {
	member := MemberCheckout{
		BaseCheckout: BaseCheckout{TaxPercent: 10},
		FlatOff:      20,
	}
	fmt.Println("total (want 88):", member.Total(100))
}
`,
  hiddenTestCode: `func() {
	member := MemberCheckout{
		BaseCheckout: BaseCheckout{TaxPercent: 10},
		FlatOff:      20,
	}
	if got := member.Total(100); got == 88 {
		println("__GO_SHIFT_TEST__\\tPASS\\tmember discount applied\\tApplied FlatOff of 20 before computing 10% tax (80 + 8 = 88).")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tmember discount applied\\tGot " + fmt.Sprint(got) + ", want 88. Promoted BaseCheckout.Total calls BaseCheckout.Discount (0); define Total on MemberCheckout.")
	}

	capped := MemberCheckout{
		BaseCheckout: BaseCheckout{TaxPercent: 20},
		FlatOff:      150,
	}
	if got := capped.Total(100); got == 0 {
		println("__GO_SHIFT_TEST__\\tPASS\\tdiscount clamped at zero\\tA discount larger than the subtotal clamps at 0 instead of producing negative tax.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tdiscount clamped at zero\\tWhen m.Discount(subtotal) exceeds subtotal, clamp the discounted amount to 0 before applying tax.")
	}

	base := BaseCheckout{TaxPercent: 10}
	if got := base.Total(100); got == 110 && base.Discount(100) == 0 {
		println("__GO_SHIFT_TEST__\\tPASS\\tbase checkout unchanged\\tBaseCheckout still computes full taxed totals with zero discount.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tbase checkout unchanged\\tLeave BaseCheckout.Discount and BaseCheckout.Total working for standard checkouts.")
	}

	noTax := MemberCheckout{
		BaseCheckout: BaseCheckout{TaxPercent: 0},
		FlatOff:      15,
	}
	if got := noTax.Total(50); got == 35 && member.Discount(100) == 20 {
		println("__GO_SHIFT_TEST__\\tPASS\\tdelegates cleanly\\tHandled zero-tax member totals and preserved MemberCheckout.Discount.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tdelegates cleanly\\tFor subtotal 50, FlatOff 15, and TaxPercent 0, Total should return 35.")
	}
}()`,
  testNames: ['member discount applied', 'discount clamped at zero', 'base checkout unchanged', 'delegates cleanly'],
  hints: [
    'Run the starter: <code>member.Total(100)</code> prints <code>110</code> because <code>MemberCheckout</code> has no <code>Total</code> method of its own, so Go promotes <code>BaseCheckout.Total</code>.',
    'Inside <code>BaseCheckout.Total</code>, <code>c.Discount(subtotal)</code> always calls <code>BaseCheckout.Discount</code>. Shadowing <code>Discount</code> on <code>MemberCheckout</code> only affects callers that invoke <code>Discount</code> on a <code>MemberCheckout</code>.',
    'Add <code>func (m MemberCheckout) Total(subtotal int) int</code>: subtract <code>m.Discount(subtotal)</code> from <code>subtotal</code>, clamp to <code>0</code> if negative, and return <code>m.BaseCheckout.Total(discounted)</code>.',
  ],
  debrief: {
    title: 'The shift: there is no self that points back to the outer struct',
    summary: 'Embedding saves typing by promoting fields and methods to the outer type’s method set, but the promoted methods still execute with the inner struct as their receiver. Never use embedding to override a helper called by the embedded type.',
    transfer: 'You embed sync.Mutex inside a cache struct without exporting a field name. What unexpected methods did your public cache type just expose to every caller?',
  },
};
