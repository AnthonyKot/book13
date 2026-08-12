import type { Chapter } from '../types';

export const ch11: Chapter = {
  id: 'ch11',
  order: 9,
  module: 'ship',
  title: 'A Deadline Is a Signal',
  mentalModel: 'Adding a timeout around a call will stop the work when time runs out.',
  outcome: 'Propagate a caller’s lifetime into downstream work and release the derived context on every return path.',
  recognitionCue: 'When work belongs to a request and may block, accept the caller’s context and pass a derived context down the call chain.',
  prediction: {
    prompt: 'The deadline expires after 10 ms, but slowWork never checks the context. When does this program print?',
    code: `func slowWork(ctx context.Context) string {
	time.Sleep(100 * time.Millisecond)
	return "done"
}

ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
defer cancel()
fmt.Println(slowWork(ctx))`,
    options: [
      {
        id: 'at-deadline',
        label: 'At 10 ms with an error',
        explanation: 'A context does not interrupt arbitrary code or change a function’s return type. The callee must observe the signal.',
      },
      {
        id: 'after-work',
        label: 'After about 100 ms',
        explanation: 'Correct. The context is canceled at 10 ms, but slowWork ignores it, sleeps to completion, and returns normally.',
      },
      {
        id: 'never',
        label: 'It never prints',
        explanation: 'The deadline does not terminate the goroutine. slowWork still reaches its return after sleeping.',
      },
    ],
    correctOptionId: 'after-work',
  },
  lesson: `
    <p>A <code>context.Context</code> carries a cancellation signal and an optional deadline. It is cooperative: cancellation closes <code>ctx.Done()</code>, but only code that checks that channel—or calls a context-aware API—can stop early.</p>
    <p>Request-scoped work should usually accept the caller’s context as its first parameter. Derive a tighter deadline with <code>context.WithTimeout(parent, duration)</code>, pass the child downstream, and call the returned <code>cancel</code> function even when the operation finishes early.</p>
    <pre><code>ctx, cancel := context.WithTimeout(parent, timeout)
defer cancel()
return fetch(ctx)</code></pre>
    <p>Starting from <code>context.Background()</code> inside the service would sever upstream cancellation. A deadline is not a kill switch; it is a lifetime signal that the whole call chain must preserve.</p>
  `,
  challenge: {
    title: 'Keep the caller in control',
    description: 'Implement <code>safeFetch</code>. Derive a timeout from <code>parent</code>, ensure its cancel function always runs, and pass the derived context to <code>fetch</code>. Tests cover a fast result, an already-canceled caller, an expired deadline, and cleanup after an early return.',
  },
  starterCode: `package main

import (
	"context"
	"fmt"
	"time"
)

type fetchFunc func(context.Context) (string, error)

func safeFetch(parent context.Context, timeout time.Duration, fetch fetchFunc) (string, error) {
	// BUG: Starting a new root loses cancellation from parent.
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	_ = cancel // The derived context is also not released after fast work.
	return fetch(ctx)
}

func main() {
	fastFetch := func(ctx context.Context) (string, error) {
		return "Alice", nil
	}
	user, err := safeFetch(context.Background(), 50*time.Millisecond, fastFetch)
	fmt.Println(user, err)
}`,
  hiddenTestCode: `func() {
	fastCalls := 0
	fastFetch := func(ctx context.Context) (string, error) {
		fastCalls++
		return "Ada", nil
	}
	if value, err := safeFetch(context.Background(), time.Second, fastFetch); value == "Ada" && err == nil && fastCalls == 1 {
		println("__GO_SHIFT_TEST__\tPASS\tfast result\tReturned the downstream result without changing it.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tfast result\tCall fetch exactly once and return its value and error.")
	}

	parent, stopParent := context.WithCancel(context.Background())
	stopParent()
	parentFetch := func(ctx context.Context) (string, error) {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		default:
			return "still running", nil
		}
	}
	if value, err := safeFetch(parent, time.Second, parentFetch); value == "" && err == context.Canceled {
		println("__GO_SHIFT_TEST__\tPASS\tparent cancellation\tPreserved cancellation from the caller.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tparent cancellation\tDerive from parent rather than starting a new context.Background().")
	}

	deadlineFetch := func(ctx context.Context) (string, error) {
		<-ctx.Done()
		return "", ctx.Err()
	}
	if value, err := safeFetch(context.Background(), time.Millisecond, deadlineFetch); value == "" && err == context.DeadlineExceeded {
		println("__GO_SHIFT_TEST__\tPASS\tdeadline signal\tThe downstream operation observed the derived deadline.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tdeadline signal\tUse context.WithTimeout so a cooperative callee receives DeadlineExceeded.")
	}

	var observed context.Context
	captureFetch := func(ctx context.Context) (string, error) {
		observed = ctx
		return "ready", nil
	}
	value, err := safeFetch(context.Background(), time.Hour, captureFetch)
	cleaned := false
	if observed != nil {
		select {
		case <-observed.Done():
			cleaned = true
		default:
		}
	}
	if value == "ready" && err == nil && cleaned {
		println("__GO_SHIFT_TEST__\tPASS\tearly cleanup\tCanceled the derived context when fast work returned.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tearly cleanup\tCall the CancelFunc on every return path; defer cancel() immediately after WithTimeout.")
	}
}()`,
  testNames: ['fast result', 'parent cancellation', 'deadline signal', 'early cleanup'],
  hints: [
    'Call <code>context.WithTimeout(parent, timeout)</code>. It returns both a derived context and a cancel function.',
    'Place <code>defer cancel()</code> immediately after creating the derived context so fast and error returns both release its resources.',
    'Call <code>fetch(ctx)</code> with the derived context, then return its result directly.',
  ],
  debrief: {
    title: 'The shift: propagate lifetime, do not impose termination',
    summary: 'A deadline cancels a context; it does not forcibly stop code. Deriving from the caller preserves upstream cancellation, passing the child downstream makes the signal observable, and calling cancel releases resources promptly.',
    transfer: 'An HTTP handler calls a service, which calls a database. At which boundary would cancellation be lost if one function replaced its parameter with context.Background()?',
  },
};
