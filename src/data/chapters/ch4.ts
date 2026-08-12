import type { Chapter } from '../types';

export const ch4: Chapter = {
  id: 'ch4',
  order: 3,
  module: 'think',
  title: 'Slices: Views, Not Containers',
  mentalModel: 'A slice value is a small descriptor; copying it shares elements but gives each copy its own length and capacity.',
  outcome: 'Predict when slices share writes and preserve an appended result by returning the updated slice header.',
  recognitionCue: 'Before appending through a slice, ask which backing array it views, how much capacity remains, and who receives the returned header.',
  prediction: {
    prompt: 'The first append fits in capacity; the second does not. What does the final print show?',
    code: `base := []int{1, 2}
view := base[:1]
view = append(view, 9)
view = append(view, 8)
view[0] = 7
fmt.Println(base, view)`,
    options: [
      {
        id: 'both-grow',
        label: '[7 9 8] and [7 9 8]',
        explanation: 'base keeps its own length, and the second append must allocate because view has exhausted the original capacity.',
      },
      {
        id: 'split-after-growth',
        label: '[1 9] and [7 9 8]',
        explanation: 'Correct. The first append writes 9 into the shared array. The second moves view to new storage, so changing view[0] no longer changes base.',
      },
      {
        id: 'never-shared',
        label: '[1 2] and [7 9 8]',
        explanation: 'Reslicing does not copy. The append that fits in capacity overwrites the second element of base’s backing array.',
      },
    ],
    correctOptionId: 'split-after-growth',
  },
  lesson: `
    <p>A slice describes a segment of an underlying array with a starting pointer, length, and capacity. Passing or assigning a slice copies that descriptor, not its elements. The copies can therefore observe the same element mutations while keeping independent lengths.</p>
    <p><code>append</code> returns an updated descriptor. If capacity is sufficient, it can reuse the backing array; otherwise it allocates another array and copies the existing elements. Either way, only the returned slice has the new length, so an API that may append should normally return its result.</p>
    <pre><code>func addLabel(labels []string, label string) []string {
	return append(labels, label)
}

labels = addLabel(labels, "ship")</code></pre>
  `,
  challenge: {
    title: 'Return the header that append produced',
    description: 'Implement addLabel so it appends one label and returns the resulting slice. It must work whether the input has spare capacity, must grow into new storage, or is nil. Preserve all existing labels.',
  },
  starterCode: `package main

import "fmt"

func addLabel(labels []string, label string) []string {
	// append returns a new slice header. This discards it.
	_ = append(labels, label)
	return labels
}

func main() {
	labels := []string{"read"}
	labels = addLabel(labels, "ship")
	fmt.Println(labels)
}`,
  hiddenTestCode: `func() {
	full := []string{"read"}
	fullResult := addLabel(full, "ship")
	if len(fullResult) == 2 && fullResult[0] == "read" && fullResult[1] == "ship" {
		println("__GO_SHIFT_TEST__\tPASS\tgrowth beyond capacity\tThe appended value survives when append must grow the backing storage.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tgrowth beyond capacity\tReturn the slice produced by append when the original capacity is full.")
	}

	spare := make([]string, 1, 3)
	spare[0] = "think"
	spareResult := addLabel(spare, "test")
	if len(spareResult) == 2 && spareResult[0] == "think" && spareResult[1] == "test" {
		println("__GO_SHIFT_TEST__\tPASS\tspare capacity\tThe returned header exposes the appended element in shared storage.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tspare capacity\tEven when storage is reused, the caller needs the returned length.")
	}
	if len(spare) == 1 && spare[0] == "think" {
		println("__GO_SHIFT_TEST__\tPASS\tindependent header\tThe caller’s original slice header keeps its own length.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tindependent header\tDo not replace or truncate the input element; return an updated slice header.")
	}

	emptyResult := addLabel(nil, "first")
	if len(emptyResult) == 1 && emptyResult[0] == "first" {
		println("__GO_SHIFT_TEST__\tPASS\tnil slice\tappend grows a nil slice without special-case allocation code.")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tnil slice\tA nil slice is a valid empty input to append.")
	}
}()`,
  testNames: ['growth beyond capacity', 'spare capacity', 'independent header', 'nil slice'],
  hints: [
    'The built-in <code>append</code> does not change the caller’s slice variable. It returns the slice header that describes the result.',
    'You do not need to inspect <code>cap</code> or allocate manually; <code>append</code> handles both the reuse and growth cases.',
    'Return the expression directly: <code>return append(labels, label)</code>.',
  ],
  debrief: {
    title: 'The shift: shared elements, independent headers',
    summary: 'Slice copies may share a backing array, but length and capacity live in each copied descriptor. Element mutation and append therefore have different visibility rules, and append’s return value is never optional.',
    transfer: 'A helper removes elements from a slice and may append replacements. What should its signature return so the caller sees both a changed backing array and a changed length?',
  },
};
