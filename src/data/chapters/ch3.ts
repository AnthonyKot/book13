import type { Chapter } from '../types';

export const ch3: Chapter = {
  id: 'ch3',
  order: 10,
  module: 'ship',
  title: 'Every Goroutine Needs an Exit',
  mentalModel: 'Once a caller returns, the runtime will clean up any goroutine it started.',
  outcome: 'Make a result-producing goroutine stop when either its value is delivered or its caller abandons the work.',
  recognitionCue: 'At every go statement, ask who waits for it, who can cancel it, and how every blocking send or receive can end.',
  prediction: {
    prompt: 'This runs inside a request handler on a long-lived server. The handler takes the timeout branch before the worker sends its result. What happens when the worker reaches the unbuffered send?',
    code: `results := make(chan string)
go func() {
	time.Sleep(100 * time.Millisecond)
	results <- "ready"
}()

select {
case value := <-results:
	fmt.Println(value)
case <-time.After(10 * time.Millisecond):
	return
}`,
    options: [
      {
        id: 'collected',
        label: 'The runtime removes it',
        explanation: 'A blocked goroutine is still live. Returning from the caller does not cancel work it started.',
      },
      {
        id: 'blocked',
        label: 'It blocks on the send',
        explanation: 'Correct. An unbuffered send needs a receiver, and the only receiver has already returned.',
      },
      {
        id: 'drops',
        label: 'The channel drops the value',
        explanation: 'Channels do not silently drop sends. An unbuffered send waits until another goroutine receives.',
      },
    ],
    correctOptionId: 'blocked',
  },
  lesson: `
    <p>Goroutines begin with small stacks that can grow, but “cheap” does not mean “ownerless.” A goroutine blocked on a channel retains its stack and anything reachable from it until it can proceed.</p>
    <p>If a caller may abandon a result, the sender needs a second exit path. Select between delivering the value and observing the caller’s cancellation:</p>
    <pre><code>select {
case out &lt;- value:
	return true
case &lt;-ctx.Done():
	return false
}</code></pre>
    <p>A buffer of one can also be correct for exactly one outstanding result because the send can finish without a receiver. That is a capacity proof, not a universal leak fix. Explicit cancellation scales to work with an open-ended lifetime.</p>
  `,
  challenge: {
    title: 'Give the sender an exit path',
    description: 'Implement <code>deliver</code>. Return <code>true</code> only when the value reaches <code>out</code>; return <code>false</code> when the context is canceled first. Do not turn this into a non-blocking send that drops a value merely because a receiver is not ready yet.',
  },
  starterCode: `package main

import (
	"context"
	"fmt"
	"time"
)

func deliver(ctx context.Context, out chan<- string, value string) bool {
	// BUG: This avoids blocking by dropping a value when no receiver is ready.
	select {
	case out <- value:
		return true
	default:
		return false
	}
}

func main() {
	_ = time.Second // time is also used by the lab's behavioral checks.
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	delivered := deliver(ctx, make(chan string), "result")
	fmt.Println("delivered:", delivered)
}`,
  hiddenTestCode: `func() {
	canceled, cancel := context.WithCancel(context.Background())
	cancel()
	if delivered := deliver(canceled, make(chan string), "unused"); !delivered {
		println("__GO_SHIFT_TEST__\tPASS\talready canceled\tExited without waiting for an abandoned receiver.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\talready canceled\tReturn false when cancellation wins before delivery.")
	}

	buffered := make(chan string, 1)
	if delivered := deliver(context.Background(), buffered, "ready"); delivered && <-buffered == "ready" {
		println("__GO_SHIFT_TEST__\tPASS\tdelivers value\tSent the exact value when the receiver path was available.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tdelivers value\tReturn true only after sending the supplied value to out.")
	}

	ctx, stop := context.WithCancel(context.Background())
	finished := make(chan bool, 1)
	go func() {
		finished <- deliver(ctx, make(chan string), "orphaned")
	}()
	time.Sleep(5 * time.Millisecond) // let the sender park on a channel nobody reads
	stop()
	select {
	case delivered := <-finished:
		if !delivered {
			println("__GO_SHIFT_TEST__\tPASS\tcancel while blocked\tCancellation released a sender that had no receiver.")
		} else {
			println("__GO_SHIFT_TEST__\tFAIL\tcancel while blocked\tReturned true although nothing received the value; return true only from the send case.")
		}
	case <-time.After(250 * time.Millisecond):
		println("__GO_SHIFT_TEST__\tFAIL\tcancel while blocked\tThe sender stayed blocked after its context was canceled. A check before the send is not enough: receive from ctx.Done() in the same select as the send.")
	}

	unbuffered := make(chan string)
	received := make(chan string, 1)
	go func() {
		time.Sleep(2 * time.Millisecond)
		received <- <-unbuffered
	}()
	waitCtx, stopWaiting := context.WithTimeout(context.Background(), 250*time.Millisecond)
	defer stopWaiting()
	if delivered := deliver(waitCtx, unbuffered, "handoff"); delivered && <-received == "handoff" {
		println("__GO_SHIFT_TEST__\tPASS\twaits for receiver\tWaited for a later receiver instead of dropping the value.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\twaits for receiver\tDo not use default: a receiver that arrives before cancellation should still receive the value.")
	}
}()`,
  testNames: ['already canceled', 'delivers value', 'cancel while blocked', 'waits for receiver'],
  hints: [
    'Look at the <code>default</code> case. It runs whenever no receiver is ready <em>at this instant</em>—which, for an unbuffered channel, is nearly always the instant of the call—so the function reports failure before anyone has had a chance to receive.',
    'A <code>select</code> with no <code>default</code> blocks until one of its cases can proceed. Cancellation is a receive on <code>ctx.Done()</code>, and it belongs in the same <code>select</code> as the send: a check before the send cannot release a sender that is already parked.',
    'Two cases and no <code>default</code>: the send case returns <code>true</code>, the <code>ctx.Done()</code> case returns <code>false</code>. Nothing else is needed.',
  ],
  debrief: {
    title: 'The shift: concurrency creates ownership',
    summary: 'Starting a goroutine creates a lifetime obligation. Every blocking operation needs a path to finish when its consumer succeeds, fails, or leaves. Here, delivery and cancellation are the only two valid terminal events.',
    transfer: 'A pipeline stage sends many values rather than one. Why would a buffer of one be insufficient, and where should the cancellation signal come from?',
  },
};
