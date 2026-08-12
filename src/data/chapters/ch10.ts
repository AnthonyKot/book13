import type { Chapter } from '../types';

export const ch10: Chapter = {
  id: 'ch10',
  order: 4,
  module: 'think',
  title: 'Sub-slices: Small Views Can Retain Large Storage',
  mentalModel: 'A short slice can keep its entire backing array reachable for as long as that slice remains live.',
  outcome: 'Copy a small long-lived prefix so it no longer aliases or retains a much larger input buffer.',
  recognitionCue: 'When a small view will outlive a large buffer, compare the useful bytes with the backing storage it keeps reachable and consider copying.',
  prediction: {
    prompt: 'After data is set to nil, header is still live. Which storage can the garbage collector reclaim?',
    code: `data := make([]byte, 1_000_000)
header := data[:10]
data = nil
use(header)`,
    options: [
      {
        id: 'all-but-ten',
        label: 'Everything except ten bytes',
        explanation: 'A slice does not own a separate ten-byte allocation. It still points into the original backing array.',
      },
      {
        id: 'none-yet',
        label: 'None of that backing array yet',
        explanation: 'Correct. While header remains reachable, its backing array remains reachable too. The storage can be collected after no slice refers to it.',
      },
      {
        id: 'all-immediately',
        label: 'The entire array immediately',
        explanation: 'Setting one slice variable to nil is not enough when another live slice still refers to the same backing array.',
      },
    ],
    correctOptionId: 'none-yet',
  },
  lesson: `
    <p>Reslicing creates another view; it does not copy elements. Returning <code>data[:10]</code> can therefore keep a large backing array reachable even though the caller needs only ten bytes. This is retained backing storage, not permanent leakage: the array becomes collectible when the last referring slice is no longer reachable.</p>
    <p>A full slice expression such as <code>data[:10:10]</code> limits future append capacity but still points to the same array. To cross an ownership or lifetime boundary, allocate separate storage and copy the useful bytes.</p>
    <pre><code>prefix := make([]byte, n)
copy(prefix, data[:n])
return prefix</code></pre>
  `,
  challenge: {
    title: 'Return an independent header copy',
    description: 'GetHeader should return a copy of at most the first ten bytes. The result must not change when the source changes, and changing the result must not affect the source. Handle inputs shorter than ten bytes, including nil.',
  },
  starterCode: `package main

import "fmt"

func GetHeader(data []byte) []byte {
	limit := 10
	if len(data) < limit {
		limit = len(data)
	}
	// This view still shares data's backing array.
	return data[:limit]
}

func main() {
	data := []byte("abcdefghijklmnop")
	header := GetHeader(data)
	fmt.Println(string(header))
}`,
  hiddenTestCode: `func() {
	equalBytes := func(got []byte, want string) bool {
		if len(got) != len(want) {
			return false
		}
		for index := range got {
			if got[index] != want[index] {
				return false
			}
		}
		return true
	}

	source := []byte("abcdefghijklmnop")
	header := GetHeader(source)
	if equalBytes(header, "abcdefghij") {
		println("__GO_SHIFT_TEST__\tPASS\tfirst ten bytes\tReturned exactly the useful ten-byte prefix.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tfirst ten bytes\tReturn the first ten bytes in their original order.")
	}

	source[0] = 'Z'
	if len(header) == 10 && header[0] == 'a' {
		println("__GO_SHIFT_TEST__\tPASS\tsource independence\tChanging the source does not change the returned header.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tsource independence\tThe result still aliases the source. Allocate storage and copy the prefix.")
	}
	if len(header) > 1 {
		header[1] = 'Y'
	}
	if source[1] == 'b' {
		println("__GO_SHIFT_TEST__\tPASS\tresult independence\tChanging the returned header does not mutate the source.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tresult independence\tThe source and returned header must use independent backing storage.")
	}

	shortSource := []byte("go")
	shortHeader := GetHeader(shortSource)
	shortOK := equalBytes(shortHeader, "go")
	if len(shortHeader) > 0 {
		shortSource[0] = 'n'
		shortOK = shortOK && shortHeader[0] == 'g'
	}
	if shortOK && len(GetHeader(nil)) == 0 {
		println("__GO_SHIFT_TEST__\tPASS\tshort input\tShort and nil inputs return safe independent prefixes.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tshort input\tCopy all available bytes when the input has fewer than ten, and accept nil.")
	}
}()`,
  testNames: ['first ten bytes', 'source independence', 'result independence', 'short input'],
  hints: [
    'Limiting capacity with <code>data[:limit:limit]</code> changes append behavior, but it does not stop the result from referring to the original array.',
    'Allocate a destination with the exact useful length: <code>header := make([]byte, limit)</code>.',
    'Use <code>copy(header, data[:limit])</code>, then return <code>header</code>. The existing limit calculation already handles short and nil input.',
  ],
  debrief: {
    title: 'The shift: a view carries a lifetime',
    summary: 'A subslice keeps its backing array reachable. Copying costs one allocation and a small transfer, but it creates an ownership boundary that lets unrelated large storage become collectible sooner.',
    transfer: 'A parser returns a 20-byte token from a reusable 4 MB read buffer, and the token is cached for an hour. Would you return a view or a copy, and what tradeoff decides?',
  },
};
