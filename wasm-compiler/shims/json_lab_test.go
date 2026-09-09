package shims

import (
	"bytes"
	"os"
	"strings"
	"testing"

	"github.com/traefik/yaegi/interp"
	"github.com/traefik/yaegi/stdlib"
)

// Lab 15 uses only the standard library; this test proves the starter and the fix through the
// interpreter using the exact code from src/data/chapters/ch15.ts.
func labField(t *testing.T, src, field string) string {
	t.Helper()
	start := strings.Index(src, field+": `")
	if start < 0 {
		t.Fatalf("field %s not found", field)
	}
	i := start + len(field) + 3
	var b strings.Builder
	for i < len(src) {
		c := src[i]
		if c == '\\' && i+1 < len(src) { // JS template-literal escapes
			switch src[i+1] {
			case 'n':
				b.WriteByte('\n')
			case 't':
				b.WriteByte('\t')
			case 'r':
				b.WriteByte('\r')
			default:
				b.WriteByte(src[i+1]) // \` \\ \$ and any other escaped char
			}
			i += 2
			continue
		}
		if c == '`' {
			return b.String()
		}
		b.WriteByte(c)
		i++
	}
	t.Fatalf("field %s not terminated", field)
	return ""
}

func TestJSONLab(t *testing.T) {
	raw, err := os.ReadFile("../../src/data/chapters/ch15.ts")
	if err != nil {
		t.Skip("chapter source not available")
	}
	src := string(raw)
	starter, tests := labField(t, src, "starterCode"), labField(t, src, "hiddenTestCode")
	run := func(code string) string {
		var out bytes.Buffer
		i := interp.New(interp.Options{Stdout: &out, Stderr: &out})
		i.Use(stdlib.Symbols)
		i.Use(Symbols)
		if _, err := i.Eval(code); err != nil {
			t.Fatalf("eval main: %v\n%s", err, out.String())
		}
		if _, err := i.Eval(tests); err != nil {
			t.Fatalf("eval tests: %v\n%s", err, out.String())
		}
		return out.String()
	}
	out := run(starter)
	if strings.Count(out, "FAIL\t") != 2 || !strings.Contains(out, "FAIL\tunknown key rejected") || !strings.Contains(out, "FAIL\tzero is validated") {
		t.Fatalf("starter should fail exactly the two strict checks:\n%s", out)
	}
	fixed := strings.Replace(starter, `	var u Update
	if err := json.Unmarshal(body, &u); err != nil {
		return Update{}, err
	}
	return u, nil`, `	dec := json.NewDecoder(bytes.NewReader(body))
	dec.DisallowUnknownFields()
	var u Update
	if err := dec.Decode(&u); err != nil {
		return Update{}, err
	}
	if u.Quantity != nil && *u.Quantity <= 0 {
		return Update{}, errors.New("quantity must be positive")
	}
	return u, nil`, 1)
	fixed = strings.Replace(fixed, "import (\n\t\"encoding/json\"\n\t\"fmt\"\n)", "import (\n\t\"bytes\"\n\t\"encoding/json\"\n\t\"errors\"\n\t\"fmt\"\n)", 1)
	out = run(fixed)
	if strings.Count(out, "PASS\t") != 5 || strings.Contains(out, "FAIL\t") {
		t.Fatalf("fix should pass all five:\n%s", out)
	}
}
