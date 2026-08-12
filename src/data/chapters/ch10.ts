import type { Chapter } from '../types';

export const ch10: Chapter = {
  id: 'ch10',
  tag: 'Chapter 10',
  title: 'Memory Leaks with Slices',
  content: `
    <p>We know slices are just pointers to an underlying array. But this leads to a dangerous edge case that is a favorite question in senior interviews.</p>
    <p>If you read a massive 1GB file into memory as a byte slice, and then return just the first 10 bytes (<code>return data[:10]</code>), what happens to the 1GB of memory?</p>
    <p><strong>It is never garbage collected!</strong> Because your tiny 10-byte slice still points to the exact same 1GB backing array, the GC cannot clean it up. The entire 1GB remains pinned in RAM.</p>
  `,
  challengeTitle: 'Defeating the Slice Leak',
  challengeDescription: `
    <p><strong>Task:</strong> The <code>GetHeader</code> function currently leaks memory by returning a sub-slice of a massive array. Refactor it to return a newly allocated slice containing a <em>copy</em> of the first 10 bytes.</p>
  `,
  initialCode: `package main

import "fmt"

func GetHeader(massiveData []byte) []byte {
	// BUG: This keeps massiveData pinned in memory forever!
	return massiveData[:10]
}

func main() {
	massive := make([]byte, 1000000)
	for i := range massive {
		massive[i] = 'A'
	}
	
	header := GetHeader(massive)
	fmt.Println(string(header))
}`,
  validate: (code: string) => {
    const usesCopy = code.includes('copy(');
    const usesAppend = code.includes('append([]byte{},');
    
    if (usesCopy || usesAppend) {
      return {
        success: true,
        message: `✅ Success! By explicitly allocating a new slice and copying the data, the original massive array has no active pointers and can be safely garbage collected.`
      };
    }
    return {
      success: false,
      message: `❌ Challenge not solved.\n\nHint: Create a new slice (e.g., using make) of length 10, and use the built-in copy() function to transfer the bytes.`
    };
  }
};
