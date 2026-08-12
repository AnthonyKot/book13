import { Chapter } from '../types';

export const ch3: Chapter = {
  id: 'ch3',
  tag: 'Chapter 3',
  title: 'Concurrency & Goroutine Leaks',
  content: `
    <p>Goroutines in Go are extremely lightweight (~2KB stack to start), but they are <strong>not garbage collected automatically</strong> if they remain blocked on a channel or system call. A goroutine leak occurs when a goroutine is spawned but can never exit, keeping its memory and resources allocated indefinitely.</p>

    <h3>How Unbuffered Channels Cause Leaks</h3>
    <p>An unbuffered channel (<code>make(chan T)</code>) requires a synchronous handoff: the sender blocks until a receiver reads the value.</p>
    <p>Consider a common pattern: spawning a worker goroutine to fetch data or process background work and send the result back over an unbuffered channel. If the caller function returns early (due to a timeout, error, or fast path) before receiving the result, the worker goroutine will block on <code>ch &lt;- result</code> <strong>forever</strong>!</p>

    <h3>Prevention Strategies</h3>
    <ul>
      <li><strong>Buffered Channels:</strong> If a goroutine sends a fixed number of results and does not need to wait for the receiver, use a buffered channel (e.g. <code>make(chan T, 1)</code>). The send completes without waiting for a reader.</li>
      <li><strong>Context Cancellation:</strong> Pass a <code>context.Context</code> so worker goroutines can monitor <code>ctx.Done()</code> and abort work when cancelled.</li>
      <li><strong>Select with Default or Timeout:</strong> Use a <code>select</code> statement within the worker to send non-blockingly or handle timeouts.</li>
    </ul>
  `,
  challengeTitle: 'Fixing the Leaking Goroutine',
  challengeDescription: `
    <p>In the code below, <code>fetchData()</code> spawns a goroutine that fetches data and sends it to an unbuffered channel. However, <code>fetchData()</code> times out after 50ms, returning early. The worker goroutine (which takes 100ms) blocks on <code>ch &lt;- data</code> forever because there is no receiver remaining.</p>
    <p><strong>Task:</strong> Refactor the code to prevent the goroutine leak. You can solve this by using a <strong>buffered channel</strong> (e.g. <code>make(chan string, 1)</code>), <strong><code>context.Context</code></strong>, or a <strong><code>select</code> statement</strong> in the goroutine.</p>
  `,
  initialCode: `package main

import (
	"fmt"
	"time"
)

// fetchData starts a goroutine to fetch data.
// BUG: If main times out or returns early, the worker goroutine blocks forever on ch <- data!
func fetchData() string {
	ch := make(chan string) // unbuffered channel

	go func() {
		time.Sleep(100 * time.Millisecond)
		data := "result data"
		ch <- data // BLOCKS HERE IF NO RECEIVER!
	}()

	select {
	case res := <-ch:
		return res
	case <-time.After(50 * time.Millisecond):
		return "timeout"
	}
}

func main() {
	result := fetchData()
	fmt.Println("Result:", result)
}`,
  validate: (code: string) => {
    const bufferedChanRegex = /make\s*\(\s*chan\s+\w+\s*,\s*[1-9]\d*\s*\)/;
    const usesBufferedChan = bufferedChanRegex.test(code);
    const usesContext = code.includes('context.') || code.includes('ctx.Done()') || code.includes('"context"');
    const hasSelectInsideGoroutine = /go\s+func\s*\(\s*\)\s*\{[\s\S]*?select\s*\{/.test(code) || (code.includes('select') && code.includes('default:'));

    if (usesBufferedChan || usesContext || hasSelectInsideGoroutine) {
      return {
        success: true,
        message: '✅ Success! You fixed the goroutine leak.\n\nBy using a buffered channel, context cancellation, or a non-blocking select, the worker goroutine can now exit cleanly even if the caller returns early.'
      };
    }

    return {
      success: false,
      message: '❌ The goroutine leak is still present.\n\nHint: If the channel is unbuffered (make(chan string)), the worker goroutine will block on `ch <- data` when fetchData() times out. Try using a buffered channel (e.g., make(chan string, 1)), context cancellation, or a select statement.'
    };
  }
};
