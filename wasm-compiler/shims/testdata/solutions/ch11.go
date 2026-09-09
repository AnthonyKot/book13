package main

import (
	"context"
	"fmt"
	"time"
)

type fetchFunc func(context.Context) (string, error)

// safeFetch derives the timeout from the caller's context so upstream
// cancellation still reaches fetch, and releases the derived context on
// every return path.
func safeFetch(parent context.Context, timeout time.Duration, fetch fetchFunc) (string, error) {
	ctx, cancel := context.WithTimeout(parent, timeout)
	defer cancel()
	return fetch(ctx)
}

func main() {
	fastFetch := func(ctx context.Context) (string, error) {
		return "Alice", nil
	}
	user, err := safeFetch(context.Background(), 50*time.Millisecond, fastFetch)
	fmt.Println(user, err)
}
