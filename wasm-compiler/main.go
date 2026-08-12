package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
	"syscall/js"

	"github.com/traefik/yaegi/interp"
	"github.com/traefik/yaegi/stdlib"
)

const testMarker = "__GO_SHIFT_TEST__\t"

type testResult struct {
	Name    string `json:"name"`
	Passed bool   `json:"passed"`
	Message string `json:"message"`
}

type runResult struct {
	Status string       `json:"status"`
	Stdout string       `json:"stdout"`
	Error  string       `json:"error,omitempty"`
	Tests  []testResult `json:"tests"`
}

func encodeResult(result runResult) string {
	encoded, err := json.Marshal(result)
	if err != nil {
		return `{"status":"runtime_error","stdout":"","error":"Could not encode the execution result.","tests":[]}`
	}
	return string(encoded)
}

func collectOutput(raw string) (string, []testResult) {
	visible := make([]string, 0)
	tests := make([]testResult, 0)

	for _, line := range strings.Split(raw, "\n") {
		if !strings.HasPrefix(line, testMarker) {
			visible = append(visible, line)
			continue
		}

		parts := strings.SplitN(strings.TrimPrefix(line, testMarker), "\t", 3)
		if len(parts) < 2 {
			continue
		}
		message := ""
		if len(parts) == 3 {
			message = parts[2]
		}
		tests = append(tests, testResult{
			Name:    parts[1],
			Passed: parts[0] == "PASS",
			Message: message,
		})
	}

	return strings.TrimSpace(strings.Join(visible, "\n")), tests
}

func runGoCode(_ js.Value, args []js.Value) any {
	if len(args) < 2 {
		return encodeResult(runResult{Status: "runtime_error", Error: "The lab did not provide code and tests.", Tests: []testResult{}})
	}

	code := args[0].String()
	hiddenTests := args[1].String()
	var output bytes.Buffer
	runner := interp.New(interp.Options{Stdout: &output, Stderr: &output})
	runner.Use(stdlib.Symbols)

	if _, err := runner.Eval(code); err != nil {
		return encodeResult(runResult{
			Status: "compile_error",
			Stdout: strings.TrimSpace(output.String()),
			Error:  err.Error(),
			Tests:  []testResult{},
		})
	}

	if _, err := runner.Eval(hiddenTests); err != nil {
		stdout, tests := collectOutput(output.String())
		return encodeResult(runResult{
			Status: "runtime_error",
			Stdout: stdout,
			Error:  err.Error(),
			Tests:  tests,
		})
	}

	stdout, tests := collectOutput(output.String())
	status := "passed"
	if len(tests) == 0 {
		status = "runtime_error"
	} else {
		for _, test := range tests {
			if !test.Passed {
				status = "failed"
				break
			}
		}
	}

	result := runResult{Status: status, Stdout: stdout, Tests: tests}
	if len(tests) == 0 {
		result.Error = fmt.Sprintf("The lab ran, but reported no tests.")
	}
	return encodeResult(result)
}

func main() {
	js.Global().Set("runGoCode", js.FuncOf(runGoCode))
	<-make(chan struct{})
}
