package main

import (
	"fmt"
	"sync"
	"time"
)

// runBounded runs every task while at most limit calls to work overlap.
// The buffered channel holds the permits; acquiring before the go
// statement also stops the loop from creating goroutines that would
// only wait.
func runBounded(taskCount int, limit int, work func(int)) {
	if taskCount <= 0 || limit <= 0 {
		return
	}
	sem := make(chan struct{}, limit)
	var wg sync.WaitGroup
	for id := 0; id < taskCount; id++ {
		sem <- struct{}{}
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			defer func() { <-sem }()
			work(id)
		}(id)
	}
	wg.Wait()
}

func main() {
	runBounded(5, 3, func(id int) {
		fmt.Println("task", id)
		time.Sleep(10 * time.Millisecond)
	})
}
