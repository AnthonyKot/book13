package shims

import (
	"bytes"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"

	"github.com/traefik/yaegi/interp"
	"github.com/traefik/yaegi/stdlib"
)

// Every lab's starter must compile, run its hidden tests without a runtime error, report exactly
// the advertised test names, and fail at least one of them.
func TestAllLabStarters(t *testing.T) {
	files, _ := filepath.Glob("../../src/data/chapters/ch*.ts")
	if len(files) == 0 {
		t.Skip("no chapter sources")
	}
	nameRe := regexp.MustCompile(`testNames: \[(.*?)\]`)
	for _, f := range files {
		raw, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		src := string(raw)
		t.Run(filepath.Base(f), func(t *testing.T) {
			starter, tests := labField(t, src, "starterCode"), labField(t, src, "hiddenTestCode")
			var out bytes.Buffer
			i := interp.New(interp.Options{Stdout: &out, Stderr: &out})
			i.Use(stdlib.Symbols)
			i.Use(Symbols)
			if _, err := i.Eval(starter); err != nil {
				t.Fatalf("starter does not compile: %v", err)
			}
			if _, err := i.Eval(tests); err != nil {
				if strings.Contains(src, "contractFailureMessage:") {
					t.Logf("hidden tests raised as designed (dependency boundary): %v", err)
					return
				}
				t.Fatalf("hidden tests raised: %v\n%s", err, out.String())
			}
			var got []string
			pass, fail := 0, 0
			for _, line := range strings.Split(out.String(), "\n") {
				if !strings.HasPrefix(line, "__GO_SHIFT_TEST__\t") {
					continue
				}
				parts := strings.SplitN(strings.TrimPrefix(line, "__GO_SHIFT_TEST__\t"), "\t", 3)
				got = append(got, parts[1])
				if parts[0] == "PASS" {
					pass++
				} else {
					fail++
				}
			}
			var want []string
			if m := nameRe.FindStringSubmatch(src); m != nil {
				for _, n := range strings.Split(m[1], ",") {
					want = append(want, strings.Trim(strings.TrimSpace(n), "'\""))
				}
			}
			sortedGot, sortedWant := append([]string{}, got...), append([]string{}, want...)
			sort.Strings(sortedGot)
			sort.Strings(sortedWant)
			if strings.Join(sortedGot, "|") != strings.Join(sortedWant, "|") {
				t.Errorf("reported tests %v, page advertises %v", got, want)
			}
			if fail == 0 {
				t.Errorf("starter already passes all %d tests", pass)
			}
			t.Logf("%d tests: %d pass, %d fail on the starter", len(got), pass, fail)
		})
	}
}

// Every lab with a reference solution in testdata/solutions/<id>.go must pass all of its hidden
// tests with that solution. Labs without one are reported, not failed, so the gap stays visible.
func TestAllLabSolutions(t *testing.T) {
	files, _ := filepath.Glob("../../src/data/chapters/ch*.ts")
	missing := []string{}
	for _, f := range files {
		id := strings.TrimSuffix(filepath.Base(f), ".ts")
		sol, err := os.ReadFile(filepath.Join("testdata", "solutions", id+".go"))
		if err != nil {
			missing = append(missing, id)
			continue
		}
		raw, _ := os.ReadFile(f)
		src := string(raw)
		t.Run(id, func(t *testing.T) {
			tests := labField(t, src, "hiddenTestCode")
			var out bytes.Buffer
			i := interp.New(interp.Options{Stdout: &out, Stderr: &out})
			i.Use(stdlib.Symbols)
			i.Use(Symbols)
			if _, err := i.Eval(string(sol)); err != nil {
				t.Fatalf("solution does not compile: %v", err)
			}
			if _, err := i.Eval(tests); err != nil {
				t.Fatalf("hidden tests raised on the solution: %v\n%s", err, out.String())
			}
			pass, fail := strings.Count(out.String(), "__GO_SHIFT_TEST__\tPASS\t"), strings.Count(out.String(), "__GO_SHIFT_TEST__\tFAIL\t")
			if fail > 0 || pass == 0 {
				t.Fatalf("solution: %d pass, %d fail\n%s", pass, fail, out.String())
			}
			t.Logf("solution passes all %d tests", pass)
		})
	}
	if len(missing) > 0 {
		t.Logf("labs without a reference solution: %s", strings.Join(missing, ", "))
	}
}
