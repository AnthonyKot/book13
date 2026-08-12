package main

import (
	"bytes"
	"fmt"
	"syscall/js"

	"github.com/traefik/yaegi/interp"
	"github.com/traefik/yaegi/stdlib"
)

func runGoCode(this js.Value, args []js.Value) any {
	if len(args) == 0 {
		return "No code provided"
	}
	code := args[0].String()

	var buf bytes.Buffer
	i := interp.New(interp.Options{
		Stdout: &buf,
		Stderr: &buf,
	})
	
	// Import the standard library so algorithms can use fmt, sort, math, etc.
	i.Use(stdlib.Symbols)

	_, err := i.Eval(code)
	if err != nil {
		fmt.Fprintf(&buf, "\nError: %v", err)
	}

	return buf.String()
}

func main() {
	// Expose the Go function to the global JavaScript window object
	js.Global().Set("runGoCode", js.FuncOf(runGoCode))
	
	// Prevent the Go WASM process from exiting immediately
	c := make(chan struct{})
	<-c
}
