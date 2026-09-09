import type { Chapter } from '../types';

export const ch9: Chapter = {
  id: 'ch9',
  order: 11,
  module: 'ship',
  title: 'Bound the Scarce Thing',
  mentalModel: 'Because goroutines are cheap, starting all available work at once is a reasonable default.',
  outcome: 'Run every task while keeping concurrent access to a scarce resource at or below a chosen limit.',
  recognitionCue: 'When downstream capacity is lower than incoming work—connections, memory, file handles, or API slots—make that capacity an explicit bound.',
  prediction: {
    prompt: 'This loop starts 10,000 goroutines, and each acquires a three-slot semaphore inside the goroutine. What does the semaphore actually bound?',
    code: `sem := make(chan struct{}, 3)
for i := 0; i < 10_000; i++ {
	go func() {
		sem <- struct{}{}
		defer func() { <-sem }()
		useDatabase()
	}()
}`,
    options: [
      {
        id: 'goroutines',
        label: 'Goroutines created: three',
        explanation: 'All 10,000 goroutines are created before they contend for the token. Most then wait on the send.',
      },
      {
        id: 'active-work',
        label: 'Active database calls: three',
        explanation: 'Correct. The channel bounds holders of a token, not the number of goroutines already created.',
      },
      {
        id: 'rate',
        label: 'Calls per second: three',
        explanation: 'A concurrency bound does not define a rate. Fast calls may complete many times per second.',
      },
    ],
    correctOptionId: 'active-work',
  },
  lesson: `
    <p>A buffered channel can represent a fixed number of permits. Sending acquires a permit; receiving releases it. When the channel is full, the next acquisition waits.</p>
    <p>Acquire before starting the goroutine when you also want the producer to stop creating more waiting goroutines. Release with <code>defer</code> inside the goroutine so every normal return gives the permit back.</p>
    <pre><code>sem &lt;- struct{}{}
go func() {
	defer func() { &lt;-sem }()
	work()
}()</code></pre>
    <p>This limits simultaneous work, not work per second. It is also not a fixed worker pool: goroutines are still created as permits become available. Pick the mechanism that matches the scarce thing you need to protect.</p>
    <p>Waiting is a separate obligation. A permit tells you a slot was free, not that the work finished; a <code>sync.WaitGroup</code>—<code>Add(1)</code> before the <code>go</code> statement, <code>Done</code> deferred inside, <code>Wait</code> after the loop—is how the caller learns that every task returned.</p>
  `,
  challenge: {
    title: 'Protect a three-slot dependency',
    description: 'Implement <code>runBounded</code>. Run each task ID from <code>0</code> through <code>taskCount-1</code> exactly once, allow no more than <code>limit</code> calls to <code>work</code> at a time, and wait for them all before returning. For an empty task set or a limit below one, return without starting work. One constraint of the tooling: the in-browser interpreter (yaegi 0.16) predates Go 1.22, so write a three-clause <code>for</code> loop rather than <code>for id := range taskCount</code>, and pass <code>id</code> into the goroutine as an argument instead of capturing it—the per-iteration loop variable that Go 1.22 introduced does not exist here.',
  },
  starterCode: `package main

import (
	"fmt"
	"sync"
	"time"
)

func runBounded(taskCount int, limit int, work func(int)) {
	_ = sync.WaitGroup{} // sync is used in the intended implementation.
	if taskCount <= 0 || limit <= 0 {
		return
	}
	// BUG: This is safe but leaves all available concurrency unused.
	for id := 0; id < taskCount; id++ {
		work(id)
	}
}

func main() {
	runBounded(5, 3, func(id int) {
		fmt.Println("task", id)
		time.Sleep(10 * time.Millisecond)
	})
}`,
  hiddenTestCode: `func() {
	var mu sync.Mutex
	active := 0
	peak := 0
	completed := 0
	seen := make(map[int]int)
	runBounded(12, 3, func(id int) {
		mu.Lock()
		active++
		if active > peak {
			peak = active
		}
		seen[id]++
		mu.Unlock()
		time.Sleep(3 * time.Millisecond)
		mu.Lock()
		active--
		completed++
		mu.Unlock()
	})
	allOnce := completed == 12 && len(seen) == 12
	for id := 0; id < 12; id++ {
		if seen[id] != 1 {
			allOnce = false
		}
	}
	if allOnce {
		println("__GO_SHIFT_TEST__\tPASS\tall tasks\tRan every task ID exactly once and waited for completion.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tall tasks\tRun IDs 0 through taskCount-1 exactly once and wait for all of them before returning. If several goroutines ran the same ID, they share the loop variable: pass id into the goroutine as an argument.")
	}
	if peak > 0 && peak <= 3 {
		println("__GO_SHIFT_TEST__\tPASS\tbounded peak\tKept simultaneous work within the three-slot capacity.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tbounded peak\tMore than limit calls to work overlapped. Acquire a permit from a channel of capacity limit before each call and release it in a defer when the call returns.")
	}
	if peak >= 2 {
		println("__GO_SHIFT_TEST__\tPASS\tuses concurrency\tUsed more than one available slot when work overlapped.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tuses concurrency\tDo not serialize all work; allow tasks to use the available capacity concurrently.")
	}

	singleActive := 0
	singlePeak := 0
	runBounded(4, 1, func(id int) {
		mu.Lock()
		singleActive++
		if singleActive > singlePeak {
			singlePeak = singleActive
		}
		mu.Unlock()
		time.Sleep(time.Millisecond)
		mu.Lock()
		singleActive--
		mu.Unlock()
	})
	if singlePeak == 1 {
		println("__GO_SHIFT_TEST__\tPASS\tlimit one\tHonored a capacity of one without deadlocking.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tlimit one\tThe limit is an input, not a constant: size the permit channel from limit so a limit of one runs exactly one task at a time.")
	}

	emptyCalls := 0
	runBounded(0, 3, func(id int) { emptyCalls++ })
	runBounded(3, 0, func(id int) { emptyCalls++ })
	if emptyCalls == 0 {
		println("__GO_SHIFT_TEST__\tPASS\tempty or invalid\tReturned safely when there was no runnable capacity or work.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tempty or invalid\tDo not invoke work when taskCount is zero or limit is below one.")
	}
}()`,
  testNames: ['all tasks', 'bounded peak', 'uses concurrency', 'limit one', 'empty or invalid'],
  hints: [
    'The loop calls <code>work</code> inline, so nothing overlaps and there is nothing to bound. You need two mechanisms the starter lacks: something that limits how many calls are in flight, and something that tells the caller they have all finished.',
    'A buffered channel of capacity <code>limit</code> is the permit pool: a send acquires, a receive releases. Acquire <em>before</em> the <code>go</code> statement and release in a <code>defer</code> inside the goroutine. A <code>sync.WaitGroup</code> tracks completion: <code>Add(1)</code> before <code>go</code>, <code>Done</code> deferred inside, <code>Wait</code> after the loop.',
    'Keep the early return. Then: make the channel and the wait group; in the loop, acquire, <code>Add(1)</code>, start a goroutine that takes <code>id</code> as a parameter and defers both <code>Done</code> and the release around <code>work(id)</code>; after the loop, <code>Wait</code>.',
  ],
  debrief: {
    title: 'The shift: name the resource you are bounding',
    summary: 'A semaphore expresses capacity: only holders may enter the scarce operation. Acquiring before starting a goroutine also applies backpressure to goroutine creation, while deferred release protects the permit on every normal return.',
    transfer: 'If a service may make at most three concurrent calls but up to one hundred calls per second, why are a semaphore and a rate limiter separate controls?',
  },
};
