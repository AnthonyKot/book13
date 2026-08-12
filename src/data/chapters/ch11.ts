import type { Chapter } from '../types';

export const ch11: Chapter = {
  id: 'ch11',
  tag: 'Chapter 11',
  title: 'Enterprise: Context & Timeouts',
  content: `
    <p>In enterprise Go services, <strong>every</strong> function that does I/O (database, network, file) must accept a <code>context.Context</code> as its first parameter.</p>
    <p>Context serves two critical purposes: <strong>Cancellation/Timeouts</strong> and <strong>Request-scoped Values</strong>.</p>
    <h3>Timeouts</h3>
    <p>If a client drops their connection, or a downstream microservice is hanging, you don't want your server to block forever. <code>context.WithTimeout</code> allows you to guarantee a function will return an error if it takes too long.</p>
  `,
  challengeTitle: 'Protecting the Database with Context',
  challengeDescription: `
    <p><strong>Task:</strong> The <code>FetchUser</code> function simulates a slow database query taking 100ms. Wrap it in a function called <code>SafeFetch</code> that uses <code>context.WithTimeout</code> to enforce a strict 50ms deadline.</p>
  `,
  initialCode: `package main

import (
	"context"
	"fmt"
	"time"
)

// Simulates a slow database query
func FetchUser(ctx context.Context) (string, error) {
	select {
	case <-time.After(100 * time.Millisecond):
		return "Alice", nil
	case <-ctx.Done():
		return "", ctx.Err()
	}
}

func SafeFetch() {
	// TODO: Create a context with a 50ms timeout
	ctx := context.Background() 
	
	// TODO: Pass the timeout context to FetchUser
	user, err := FetchUser(ctx)
	
	if err != nil {
		fmt.Println("Query failed:", err)
		return
	}
	fmt.Println("Success:", user)
}

func main() {
	SafeFetch()
}`,
  validate: (code: string) => {
    const hasTimeout = code.includes('context.WithTimeout(') && code.includes('50*time.Millisecond') && !code.includes('50 * time.Millisecond');
    const hasTimeoutAlt = code.includes('context.WithTimeout(') && code.includes('50 * time.Millisecond');
    const hasCancel = code.includes('defer cancel()');
    
    if ((hasTimeout || hasTimeoutAlt) && hasCancel) {
      return {
        success: true,
        message: `✅ Success! The context gracefully aborted the slow query. In production, failing fast is much better than exhausting all your server's connections!`
      };
    }
    return {
      success: false,
      message: `❌ Challenge not solved.\n\nHint: Use ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond). Don't forget to defer cancel()!`
    };
  }
};
