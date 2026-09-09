import type { Chapter } from '../types';

export const ch12: Chapter = {
  id: 'ch12',
  order: 12,
  module: 'ship',
  title: 'Interfaces Belong to Consumers',
  mentalModel: 'A dependency should publish a broad interface so downstream code can mock it.',
  outcome: 'Define a narrow behavior boundary where it is consumed and substitute a test implementation without a framework or implements declaration.',
  recognitionCue: 'Introduce an interface when a consumer needs behavior from more than one implementation, and include only the methods that consumer calls.',
  prediction: {
    prompt: 'MemoryStore declares no relationship to UserReader. Does the assignment compile?',
    code: `type UserReader interface {
	UserName(id int) (string, error)
}

type MemoryStore struct{}

func (MemoryStore) UserName(id int) (string, error) {
	return "Ada", nil
}

var reader UserReader = MemoryStore{}`,
    options: [
      {
        id: 'implements-needed',
        label: 'No — it needs implements',
        explanation: 'Go has no implements declaration. Satisfaction is determined from the method set.',
      },
      {
        id: 'implicit',
        label: 'Yes — the method is enough',
        explanation: 'Correct. MemoryStore’s method set satisfies the consumer’s one-method interface implicitly.',
      },
      {
        id: 'same-package-only',
        label: 'Only in the same package',
        explanation: 'Implicit satisfaction works across package boundaries. Export rules affect visibility, not the implements relationship.',
      },
    ],
    correctOptionId: 'implicit',
  },
  lesson: `
    <p>Dependency injection in Go is usually ordinary construction: pass a dependency into a function or struct. It can be a concrete type. Add an interface only when the consuming code benefits from a behavior boundary.</p>
    <p>Because interfaces are satisfied implicitly, the consumer can describe only what it needs:</p>
    <pre><code>type UserStore interface {
	UserName(id int) (string, error)
}</code></pre>
    <p>The database package can keep returning a concrete type. The service owns the small interface, and a test can supply a local fake with the same method. Avoid defining speculative producer-side interfaces solely “for mocking”; concrete dependencies are simpler when no substitution is needed.</p>
    <p>Two details of the method-set rule matter in practice. A method with a pointer receiver belongs to <code>*T</code>, not <code>T</code>, so a fake written with pointer receivers must be passed as a pointer. And when you want the compiler to state that a type still satisfies an interface, write the assertion instead of a declaration: <code>var _ UserStore = RealDB{}</code> costs nothing at runtime and fails the build the moment the method set drifts.</p>
  `,
  challenge: {
    title: 'Move the boundary to the service',
    description: 'Define the one-method <code>UserStore</code> interface and refactor <code>UserService</code> plus <code>NewUserService</code> to accept it. Keep <code>Greeting</code> behavior unchanged: forward the requested ID, return <code>"Hello, " + name</code> on success, and propagate a store error.',
  },
  starterCode: `package main

import (
	"errors"
	"fmt"
)

type RealDB struct{}

func (RealDB) UserName(id int) (string, error) {
	if id != 1 {
		return "", errors.New("user not found")
	}
	return "Real Alice", nil
}

// Define the service-owned UserStore interface here.

type UserService struct {
	store RealDB
}

func NewUserService(store RealDB) *UserService {
	return &UserService{store: store}
}

func (s *UserService) Greeting(id int) (string, error) {
	name, err := s.store.UserName(id)
	if err != nil {
		return "", err
	}
	return "Hello, " + name, nil
}

func main() {
	service := NewUserService(RealDB{})
	greeting, err := service.Greeting(1)
	fmt.Println(greeting, err)
}`,
  hiddenTestCode: `type goShiftMemoryStore struct {
	users map[int]string
	requested []int
}

func (store *goShiftMemoryStore) UserName(id int) (string, error) {
	store.requested = append(store.requested, id)
	name, ok := store.users[id]
	if !ok {
		return "", errors.New("missing test user")
	}
	return name, nil
}

var goShiftInterfaceTestsRan = func() bool {
	fake := &goShiftMemoryStore{users: map[int]string{7: "Grace", 42: "Lin"}}
	service := NewUserService(fake)
	if greeting, err := service.Greeting(7); greeting == "Hello, Grace" && err == nil {
		println("__GO_SHIFT_TEST__\tPASS\tconsumer substitute\tAccepted a test-local implementation through the service boundary.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tconsumer substitute\tGreeting should use the injected store and return Hello, Grace.")
	}

	if len(fake.requested) == 1 && fake.requested[0] == 7 {
		println("__GO_SHIFT_TEST__\tPASS\tforwards id\tAsked the dependency for the caller’s exact user ID.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tforwards id\tForward the requested ID to store.UserName exactly once.")
	}

	if greeting, err := service.Greeting(42); greeting == "Hello, Lin" && err == nil {
		println("__GO_SHIFT_TEST__\tPASS\tvarying data\tUsed dependency behavior rather than a hard-coded user name.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tvarying data\tBuild the greeting from the name returned by the injected store.")
	}

	if greeting, err := service.Greeting(99); greeting == "" && err != nil {
		println("__GO_SHIFT_TEST__\tPASS\terror path\tPropagated the dependency error without inventing a greeting.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\terror path\tWhen UserName fails, return an empty greeting and the error.")
	}

	realService := NewUserService(RealDB{})
	if greeting, err := realService.Greeting(1); greeting == "Hello, Real Alice" && err == nil {
		println("__GO_SHIFT_TEST__\tPASS\treal implementation\tThe same narrow boundary still accepts the production dependency.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\treal implementation\tGreeting on the production RealDB must still return Hello, Real Alice for ID 1: do not special-case the store type inside the service.")
	}
return true
}()`,
  contractFailureMessage: 'The test substitute cannot enter the service yet. Change both the UserService field and NewUserService parameter from RealDB to the consumer-owned UserStore interface.',
  testNames: ['consumer substitute', 'forwards id', 'varying data', 'error path', 'real implementation'],
  hints: [
    'Find every place that names <code>RealDB</code> outside its own method: the struct field and the constructor parameter. Those two spots are the boundary; <code>Greeting</code> and <code>main</code> need no change.',
    'Any type whose method set includes an interface’s methods satisfies it, with no declaration on the type. So the interface lives next to the consumer and lists only what the consumer calls—here, one method with <code>RealDB</code>’s exact <code>UserName</code> signature.',
    'Declare a one-method interface at the marked comment, then make the field and the parameter that interface type. The body of <code>Greeting</code> stays as it is; <code>RealDB</code> is not touched.',
  ],
  debrief: {
    title: 'The shift: abstract at the point of need',
    summary: 'Passing a dependency is already injection. A consumer-owned interface adds a narrow substitution boundary without coupling implementations to it. Both the real database and a test fake satisfy that boundary through their method sets.',
    transfer: 'If UserService later needs only DeleteUser from a large generated database client, what is the smallest interface the service should own?',
  },
};
