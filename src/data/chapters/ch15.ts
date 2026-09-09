import type { Chapter } from '../types';

export const ch15: Chapter = {
  id: 'ch15',
  order: 15,
  module: 'serve',
  title: 'Absent, Zero and Unknown Are Three Different Things',
  mentalModel: 'To your API, a field that was not sent, a field sent as zero, and a field you never defined are three different events. To the default decoder they are one: fill what matches, zero the rest, ignore what is left, report nothing.',
  outcome: 'Parse a partial update so that absent fields stay absent, zero values are validated as sent, and misspelled fields are rejected.',
  recognitionCue: 'When a request can omit fields, decode into pointers and turn on DisallowUnknownFields. A plain int or string cannot tell you whether the client spoke.',
  prediction: {
    prompt: 'The struct has two tagged fields. This body arrives. What does Unmarshal produce?',
    code: `type Update struct {
	Name     string \`json:"name"\`
	Quantity int    \`json:"quantity"\`
}

var u Update
err := json.Unmarshal([]byte(\`{"Name": "pen", "qty": 5}\`), &u)`,
    options: [
      {
        id: 'unknown-error',
        label: 'An error: unknown field "qty"',
        explanation: 'Unmarshal ignores keys it cannot match. Rejecting them is opt-in, through a Decoder with DisallowUnknownFields.',
      },
      {
        id: 'case-error',
        label: 'An error: "Name" does not match the tag "name"',
        explanation: 'Key matching is case-insensitive in encoding/json. "Name", "name" and "NAME" all land in the same field, and there is no switch to turn that off.',
      },
      {
        id: 'lenient',
        label: 'No error. Name is "pen", Quantity is 0',
        explanation: 'Correct. The misspelled key is dropped silently, the capitalised key matches anyway, and the untouched field keeps its zero value. The caller cannot tell that the client tried to send a quantity.',
      },
    ],
    correctOptionId: 'lenient',
  },
  lesson: `
    <p>The default decoder is built to accept. Keys are matched case-insensitively, keys with no matching field are skipped, and fields with no matching key are left at their zero value. That is the right default for reading someone else's JSON. It is the wrong default for an API contract, where the three cases mean different things: a client that omitted <code>quantity</code> wants it unchanged, a client that sent <code>0</code> wants it validated, and a client that sent <code>qty</code> made a mistake you should tell them about.</p>
    <p>Two tools separate the cases. A <strong>pointer field</strong> records presence: <code>*int</code> is nil when the key was absent and non-nil, even for zero, when it was sent. A <strong>Decoder with <code>DisallowUnknownFields</code></strong> turns a misspelled key into an error instead of silence.</p>
    <pre><code>type Update struct {
	Name     *string \`json:"name"\`
	Quantity *int    \`json:"quantity"\`
}

dec := json.NewDecoder(bytes.NewReader(body))
dec.DisallowUnknownFields()
var u Update
if err := dec.Decode(&amp;u); err != nil {
	return Update{}, err          // unknown or malformed
}
if u.Quantity != nil &amp;&amp; *u.Quantity &lt;= 0 {
	return Update{}, errors.New("quantity must be positive")
}</code></pre>
    <p>The limit is worth knowing: case-insensitive matching cannot be disabled in <code>encoding/json</code>, so <code>"Name"</code> will always fill <code>name</code>. Strict key case needs a different decoder, and a contract test that says so.</p>
    <p>Notice how this rhymes with the ORM lab: a struct condition drops zero values because the struct cannot say "set to zero"; a plain struct field drops absence because it cannot say "not sent". Same shape, opposite direction, same fix: give the value a way to say it was there.</p>
  `,
  challenge: {
    title: 'Parse a partial update strictly',
    description: '<code>ParseUpdate</code> takes a JSON body and returns an <code>Update</code>. Absent fields must come back nil. A <code>quantity</code> that is present must be positive. A key that is not <code>name</code> or <code>quantity</code> must be an error, and so must malformed JSON. Keep the signature and the struct.',
  },
  starterCode: `package main

import (
	"encoding/json"
	"fmt"
)

// Update is a partial update: nil means "not sent".
type Update struct {
	Name     *string \`json:"name"\`
	Quantity *int    \`json:"quantity"\`
}

// ParseUpdate should accept only well-formed updates.
func ParseUpdate(body []byte) (Update, error) {
	var u Update
	if err := json.Unmarshal(body, &u); err != nil {
		return Update{}, err
	}
	return u, nil
}

func describe(u Update) string {
	name, quantity := "absent", "absent"
	if u.Name != nil {
		name = fmt.Sprintf("%q", *u.Name)
	}
	if u.Quantity != nil {
		quantity = fmt.Sprint(*u.Quantity)
	}
	return "name=" + name + " quantity=" + quantity
}

func main() {
	for _, body := range []string{
		\`{"name": "pen", "quantity": 3}\`,
		\`{"name": "pen"}\`,
		\`{"name": "pen", "qty": 5}\`,
		\`{"quantity": 0}\`,
	} {
		u, err := ParseUpdate([]byte(body))
		fmt.Printf("%-32s -> %s  err=%v\\n", body, describe(u), err)
	}
}
`,
  hiddenTestCode: `func() {
	parse := func(body string) (Update, error) { return ParseUpdate([]byte(body)) }

	u, err := parse(\`{"name": "pen"}\`)
	if err == nil && u.Name != nil && *u.Name == "pen" && u.Quantity == nil {
		println("__GO_SHIFT_TEST__\\tPASS\\tabsent stays absent\\tAn omitted quantity comes back nil, not zero.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tabsent stays absent\\tAn omitted field must decode to nil with no error.")
	}

	u, err = parse(\`{"name": "pen", "quantity": 3}\`)
	if err == nil && u.Name != nil && *u.Name == "pen" && u.Quantity != nil && *u.Quantity == 3 {
		println("__GO_SHIFT_TEST__\\tPASS\\tboth present\\tBoth fields decode when both are sent.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tboth present\\tA complete update must decode both fields.")
	}

	_, err = parse(\`{"name": "pen", "qty": 5}\`)
	if err != nil {
		println("__GO_SHIFT_TEST__\\tPASS\\tunknown key rejected\\tA misspelled key is an error, not silence.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tunknown key rejected\\t\\"qty\\" was accepted and dropped. Decode with a Decoder and DisallowUnknownFields.")
	}

	_, err = parse(\`{"quantity": 0}\`)
	if err != nil {
		println("__GO_SHIFT_TEST__\\tPASS\\tzero is validated\\tA quantity that was sent as 0 is rejected.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tzero is validated\\tA quantity that is present must be positive; nil means absent, 0 means sent.")
	}

	_, err = parse(\`{"name": "pen", "quantity": \`)
	if err != nil {
		println("__GO_SHIFT_TEST__\\tPASS\\tmalformed rejected\\tUnparseable JSON is an error.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tmalformed rejected\\tMalformed JSON must be an error.")
	}
}()`,
  testNames: ['absent stays absent', 'both present', 'unknown key rejected', 'zero is validated', 'malformed rejected'],
  hints: [
    'Run the starter and read the four lines it prints: the misspelled key vanishes without an error, and a quantity of 0 is accepted as if it were fine.',
    'Unmarshal has no strict mode. Build a <code>json.NewDecoder</code> over the bytes, call <code>DisallowUnknownFields()</code>, then <code>Decode</code>.',
    'Presence and validity are two checks: <code>u.Quantity != nil</code> says it was sent; <code>*u.Quantity &lt;= 0</code> says it is invalid. Only the second is an error.',
  ],
  debrief: {
    title: 'Give the value a way to say it was there',
    summary: 'The decoder cannot invent a distinction your types do not carry. A pointer carries presence; a Decoder carries strictness; a plain field carries neither and the request loses information before your code ever sees it. The ORM lab dropped a false because the struct could not say "set to zero"; this one dropped a quantity because the struct could not say "not sent". Same shape, opposite direction.',
    transfer: 'Take one request type in a service you own and list its fields. For each, answer: can a client omit it, can a client send its zero value, and does the code today tell those two apart? Every "no" on the last question is a silent contract.',
  },
};
