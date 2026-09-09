package main

import "fmt"

// addLabel returns the slice that append produced. Whether append reused
// labels' backing array or allocated a new one, only the returned header
// carries the new length, so the caller must receive it.
func addLabel(labels []string, label string) []string {
	return append(labels, label)
}

func main() {
	labels := []string{"read"}
	labels = addLabel(labels, "ship")
	fmt.Println(labels)
}
