import type { Chapter } from '../types';

export const ch1: Chapter = {
  id: 'ch1',
  order: 1,
  module: 'think',
  title: 'Receivers: Values Have Method Sets',
  mentalModel: 'A receiver is an ordinary parameter, and its type decides which method set a value offers to an interface.',
  outcome: 'Choose a receiver deliberately and implement a value-style transformation without mutating the original value.',
  recognitionCue: 'When a method must work through an interface, ask whether callers hold a T or a *T; method-call convenience does not change either method set.',
  prediction: {
    prompt: 'GetName has a pointer receiver. The direct call compiles because user is addressable. Which line does the Go compiler reject?',
    code: `type Namer interface { GetName() string }

func (u *User) GetName() string { return u.Name }

user := User{Name: "Alice"}
fmt.Println(user.GetName())
var a Namer = user
var b Namer = &user`,
    options: [
      {
        id: 'all-work',
        label: 'All three lines compile',
        explanation: 'The compiler takes an address for a direct call on an addressable value, but it does not add pointer-receiver methods to User’s method set. The browser interpreter used in these labs is more lenient here; the Go compiler is not.',
      },
      {
        id: 'value-interface-fails',
        label: 'Assigning user to a fails',
        explanation: 'Correct. *User has GetName, but User does not, so go build reports “User does not implement Namer (method GetName has pointer receiver)”. The direct call hides that distinction by automatically taking user’s address.',
      },
      {
        id: 'pointer-interface-fails',
        label: 'Assigning &user to b fails',
        explanation: '*User includes methods declared on both User and *User, so it satisfies Namer here.',
      },
    ],
    correctOptionId: 'value-interface-fails',
  },
  lesson: `
    <p>Go lets an addressable value call a pointer-receiver method: <code>user.GetName()</code> can be shorthand for <code>(&amp;user).GetName()</code>. Interfaces use method sets instead. A method declared on <code>User</code> belongs to both <code>User</code> and <code>*User</code>; one declared on <code>*User</code> belongs only to <code>*User</code>.</p>
    <p>Choose a pointer receiver when the method must mutate the receiver, the value must not be copied (it holds a <code>sync.Mutex</code>, for example), or the type’s other methods already use pointers. A small, immutable value can sensibly use value receivers. Do not decide from “getter” alone: copy safety, identity, consistency, and interface use all matter. A value receiver is a copy of the whole struct on every call, which is cheap for a few fields and a cost worth measuring for large ones.</p>
    <p>One caveat about this page: the in-browser evaluator is an interpreter and accepts <code>var a Namer = user</code> even with a pointer receiver. The Go compiler rejects it. When a lab’s point is what compiles, trust <code>go build</code>.</p>
    <pre><code>type Namer interface { GetName() string }

func (u User) GetName() string { return u.Name }

var _ Namer = User{}  // User and *User now satisfy Namer</code></pre>
  `,
  challenge: {
    title: 'Make the transformation value-oriented',
    description: 'WithName should return a renamed User while leaving the original unchanged. Change the receiver and return the modified copy. The tests exercise both User values and pointers to User without inspecting your source text.',
  },
  starterCode: `package main

import "fmt"

type User struct {
	Name string
}

func (u *User) WithName(name string) User {
	u.Name = name
	return *u
}

func main() {
	original := User{Name: "Alice"}
	renamed := original.WithName("Grace")
	fmt.Println(original.Name, renamed.Name)
}`,
  hiddenTestCode: `func() {
	original := User{Name: "Alice"}
	renamed := original.WithName("Grace")
	if original.Name == "Alice" {
		println("__GO_SHIFT_TEST__\tPASS\toriginal unchanged\tThe value-oriented method leaves its original receiver unchanged.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\toriginal unchanged\tWithName mutated the original User. Work on a value receiver copy instead.")
	}
	if renamed.Name == "Grace" {
		println("__GO_SHIFT_TEST__\tPASS\treturned transformation\tThe returned User contains the requested name.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\treturned transformation\tModify the receiver copy and return it with the requested name.")
	}
	pointer := &User{Name: "Lin"}
	pointerResult := pointer.WithName("Rob")
	if pointer.Name == "Lin" && pointerResult.Name == "Rob" {
		println("__GO_SHIFT_TEST__\tPASS\tpointer call\t*User can also call a method declared on User without gaining mutation semantics.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tpointer call\tA pointer can call the value method, but the method must still transform only its copy.")
	}
}()`,
  testNames: ['original unchanged', 'returned transformation', 'pointer call'],
  hints: [
    'Look at the receiver. <code>(u *User)</code> makes <code>u</code> alias the caller’s User, so <code>u.Name = name</code> writes through to the original.',
    'A value receiver <code>(u User)</code> receives a copy. Writes to that copy are invisible to the caller, and the method belongs to the method sets of both User and *User, so the pointer test still compiles.',
    'Change only the receiver, keep the assignment, and return the receiver itself instead of dereferencing a pointer.',
  ],
  debrief: {
    title: 'The shift: a receiver is not an object reference',
    summary: 'A value receiver works on a copy and belongs to the method sets of both User and *User. A pointer receiver aliases the original and belongs only to *User, even though automatic addressing can make direct calls look less distinct.',
    transfer: 'A type contains a <code>sync.Mutex</code> and has six methods, including three that only read fields. Which receiver type should those methods use, and why?',
  },
};
