package main

import "fmt"

// GetHeader returns the first ten bytes (or fewer) in storage of their own.
// A reslice would keep all of data's backing array reachable for as long as
// the header lives; copying the useful bytes cuts that tie.
func GetHeader(data []byte) []byte {
	limit := 10
	if len(data) < limit {
		limit = len(data)
	}
	header := make([]byte, limit)
	copy(header, data[:limit])
	return header
}

func main() {
	data := []byte("abcdefghijklmnop")
	header := GetHeader(data)
	fmt.Println(string(header))
}
