import type { Chapter } from '../types';

export const ch19: Chapter = {
  id: 'ch19',
  order: 16,
  module: 'ship',
  title: 'Timers in a Select Loop: Reuse and Reset What You Arm',
  mentalModel: 'time.After inside a loop arms a brand-new timer on every iteration, while hoisting time.After outside the loop turns an idle timeout into a fixed wall-clock deadline; an idle window requires one time.Timer that you Reset on activity and Stop on exit.',
  outcome: 'Collect items from a channel until either the channel closes or no item arrives within an idle window, using a single stopped-and-reset timer.',
  recognitionCue: 'Whenever a select loop needs a timeout that restarts on each message, allocate one time.NewTimer before the loop, defer timer.Stop(), and call timer.Reset(idle) on each message.',
  prediction: {
    prompt: 'Ten thousand messages arrive in one second. What happens to the 10,000 time.After(time.Minute) timers created in the losing select branch?',
    code: `for {
	select {
	case msg, ok := <-inbox:
		if !ok {
			return
		}
		handle(msg)
	case <-time.After(time.Minute):
		return
	}
}`,
    options: [
      {
        id: 'canceled-by-select',
        label: 'select cancels the losing time.After timer after each iteration',
        explanation: 'select only stops waiting on the channel; it has no way to stop the underlying time.Timer that time.After created.',
      },
      {
        id: 'stay-active',
        label: 'All 10,000 timers stay armed in the runtime until their minute expires',
        explanation: 'Correct. Each evaluation of time.After(time.Minute) allocates a new timer that cannot be stopped directly. In a hot loop, thousands of timers pile up in the runtime heap until their deadlines pass.',
      },
      {
        id: 'hoisted',
        label: 'The compiler hoists time.After outside the loop automatically',
        explanation: 'Hoisting would change the program’s meaning from an idle timeout per message to a single total deadline for the whole loop.',
      },
    ],
    correctOptionId: 'stay-active',
  },
  lesson: `
    <p><code>time.After(d)</code> is a convenience wrapper around <code>time.NewTimer(d).C</code> that throws away the <code>*time.Timer</code> handle. With no handle, neither you nor <code>select</code> can call <code>Stop()</code> when another case wins.</p>
    <p>Developers who hear “do not call <code>time.After</code> in a loop” often make the opposite mistake: they hoist <code>timeout := time.After(idle)</code> above the loop. That fixes the allocation leak by breaking the behavior—now the timer measures total elapsed time since the function started, cutting off an active stream that is still delivering messages on time.</p>
    <pre><code>timer := time.NewTimer(idle)
defer timer.Stop()

for {
	select {
	case item, ok := &lt;-inbox:
		if !ok {
			return items, false // channel closed cleanly
		}
		items = append(items, item)
		timer.Reset(idle)   // activity seen: restart the idle window
	case &lt;-timer.C:
		return items, true  // no message arrived within idle
	}
}</code></pre>
    <p>One <code>*time.Timer</code> before the loop, <code>defer timer.Stop()</code> so an early close releases the timer immediately, and <code>timer.Reset(idle)</code> whenever an item arrives.</p>
  `,
  challenge: {
    title: 'Reset the idle window on every received item',
    description: '<code>CollectUntilIdle</code> reads from <code>inbox</code> until either the channel closes (returning <code>items, false</code>) or no message arrives for <code>idle</code> (returning <code>items, true</code>). The starter hoisted <code>time.After(idle)</code> outside the loop, so it times out even while messages are arriving every few milliseconds. Replace it with a reusable <code>time.NewTimer(idle)</code> that resets on each received item and stops on return.',
  },
  starterCode: `package main

import (
	"fmt"
	"time"
)

// CollectUntilIdle returns the collected items and whether it stopped due to an idle timeout.
func CollectUntilIdle(inbox <-chan string, idle time.Duration) ([]string, bool) {
	// BUG: Hoisting time.After outside the loop turns an idle window into a total deadline.
	timeout := time.After(idle)
	var items []string
	for {
		select {
		case item, ok := <-inbox:
			if !ok {
				return items, false
			}
			items = append(items, item)
		case <-timeout:
			return items, true
		}
	}
}

func main() {
	ch := make(chan string)
	go func() {
		for _, v := range []string{"a", "b", "c", "d"} {
			time.Sleep(12 * time.Millisecond)
			ch <- v
		}
		close(ch)
	}()
	items, timedOut := CollectUntilIdle(ch, 30*time.Millisecond)
	fmt.Println("items:", items, "timedOut:", timedOut)
}
`,
  hiddenTestCode: `func() {
	closedCh := make(chan string, 3)
	closedCh <- "x"
	closedCh <- "y"
	closedCh <- "z"
	close(closedCh)
	start := time.Now()
	items, timedOut := CollectUntilIdle(closedCh, 400*time.Millisecond)
	if !timedOut && len(items) == 3 && items[0] == "x" && items[2] == "z" && time.Since(start) < 200*time.Millisecond {
		println("__GO_SHIFT_TEST__\\tPASS\\tclosed channel returns all\\tDrained all items and returned false as soon as inbox closed.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tclosed channel returns all\\tWhen inbox closes, return the collected items and false without waiting for the timer.")
	}

	idleCh := make(chan string, 2)
	idleCh <- "first"
	idleCh <- "second"
	items, timedOut = CollectUntilIdle(idleCh, 15*time.Millisecond)
	if timedOut && len(items) == 2 && items[0] == "first" && items[1] == "second" {
		println("__GO_SHIFT_TEST__\\tPASS\\tidle timeout fires\\tReturned the items collected so far and true when inbox went silent.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tidle timeout fires\\tWhen no message arrives for idle, return the collected items and true.")
	}

	streamCh := make(chan string)
	go func() {
		for _, v := range []string{"m1", "m2", "m3", "m4"} {
			time.Sleep(10 * time.Millisecond)
			streamCh <- v
		}
		close(streamCh)
	}()
	items, timedOut = CollectUntilIdle(streamCh, 28*time.Millisecond)
	if !timedOut && len(items) == 4 && items[3] == "m4" {
		println("__GO_SHIFT_TEST__\\tPASS\\tactivity resets idle window\\tKept collecting while messages arrived within the 28ms idle window (40ms total stream).")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tactivity resets idle window\\tGot " + fmt.Sprint(len(items)) + " of 4 items (timedOut=" + fmt.Sprint(timedOut) + "). Call timer.Reset(idle) each time a message arrives so active streams do not time out.")
	}

	emptyCh := make(chan string)
	items, timedOut = CollectUntilIdle(emptyCh, 10*time.Millisecond)
	if timedOut && len(items) == 0 {
		println("__GO_SHIFT_TEST__\\tPASS\\tempty stream times out\\tTimed out cleanly when no messages ever arrived.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tempty stream times out\\tAn open channel that sends nothing within idle should return an empty slice and true.")
	}
}()`,
  testNames: ['closed channel returns all', 'idle timeout fires', 'activity resets idle window', 'empty stream times out'],
  hints: [
    'Run the starter: <code>main</code> sends 4 items spaced 12 ms apart (48 ms total) with a 30 ms idle window, and the starter cuts off after 2 items because <code>time.After(30ms)</code> was never reset.',
    'Replace <code>timeout := time.After(idle)</code> with <code>timer := time.NewTimer(idle)</code> and <code>defer timer.Stop()</code> right below it.',
    'Wait on <code>&lt;-timer.C</code> in the second <code>select</code> case, and call <code>timer.Reset(idle)</code> inside the first case after appending each received item.',
  ],
  debrief: {
    title: 'The shift: a timer is a resource with a handle',
    summary: 'time.After is fine for a one-shot select, and a quiet leak inside a loop. Hoisting time.After changes the meaning of the timeout from idle time to wall-clock time. Allocating one time.NewTimer, deferring Stop, and calling Reset on each message expresses an idle window without leaking timers.',
    transfer: 'Why is time.NewTicker(d) with defer ticker.Stop() preferred over for range time.Tick(d) inside a function that can return early?',
  },
};
