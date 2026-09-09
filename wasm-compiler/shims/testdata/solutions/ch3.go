package main

import (
	"context"
	"fmt"
	"time"
)

// deliver blocks until the value is received or the caller gives up.
// Both cases live in one select, so a sender parked with no receiver
// is released the moment the context is canceled.
func deliver(ctx context.Context, out chan<- string, value string) bool {
	select {
	case out <- value:
		return true
	case <-ctx.Done():
		return false
	}
}

func main() {
	_ = time.Second // time is also used by the lab's behavioral checks.
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	delivered := deliver(ctx, make(chan string), "result")
	fmt.Println("delivered:", delivered)
}
