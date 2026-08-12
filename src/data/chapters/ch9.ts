import type { Chapter } from '../types';

export const ch9: Chapter = {
  id: 'ch9',
  tag: 'Chapter 9',
  title: 'Real World: The Semaphore Pattern',
  content: `
    <p>In large open-source projects like Kubernetes or Docker, you often need to process hundreds of tasks concurrently, but you can't just spawn 10,000 goroutines without blowing up memory or exhausting database connections.</p>
    <p>The idiomatic Go solution isn't to use a heavy thread-pool library. Instead, we use a <strong>buffered channel as a Semaphore</strong>.</p>
    <h3>The Semaphore</h3>
    <p>By creating a buffered channel of size <code>N</code>, you can limit concurrency to exactly <code>N</code>. Before a goroutine starts work, it sends a token (usually an empty struct <code>struct{}{}</code>) into the channel. When it finishes, it receives a token out. If the channel is full, the next goroutine blocks until a token is released!</p>
  `,
  challengeTitle: 'Rate Limiting a Worker Pool',
  challengeDescription: `
    <p><strong>Task:</strong> The code below processes tasks concurrently, but it currently spawns a goroutine for every single task instantly, which would overwhelm a real server.</p>
    <p>Refactor it to use a buffered channel <code>sem</code> of size 3. Ensure no more than 3 tasks run at the exact same time.</p>
  `,
  initialCode: `package main

import (
	"fmt"
	"sync"
	"time"
)

func processTask(id int) {
	fmt.Printf("Starting %d\\n", id)
	time.Sleep(100 * time.Millisecond)
}

func main() {
	var wg sync.WaitGroup
	// TODO: Create a semaphore channel of size 3
	
	for i := 1; i <= 5; i++ {
		wg.Add(1)
		
		go func(id int) {
			defer wg.Done()
			
			// TODO: Acquire token here
			
			processTask(id)
			
			// TODO: Release token here
		}(i)
	}
	wg.Wait()
	fmt.Println("All done")
}`,
  validate: (code: string) => {
    const hasSem = code.includes('make(chan') && code.includes('3)');
    const hasAcquire = code.includes('<-');
    
    if (hasSem && hasAcquire) {
      return {
        success: true,
        message: `✅ Success! You implemented a Semaphore.\n\nUsing an empty struct channel (make(chan struct{}, 3)) is the standard way to rate-limit concurrency in Go without any external dependencies.`
      };
    }
    return {
      success: false,
      message: `❌ Challenge not solved.\n\nHint: Create a buffered channel (e.g. sem := make(chan struct{}, 3)). Send into it before processTask, and receive from it after.`
    };
  }
};
