import type { Chapter } from '../types';

export const ch20: Chapter = {
  id: 'ch20',
  order: 20,
  module: 'serve',
  title: 'An HTTP 500 Is Not a Go Error',
  mentalModel: 'client.Do returns an error only when the transport fails to get a valid HTTP response; once headers arrive—even 404 or 503—err is nil, and you own closing resp.Body and checking resp.StatusCode.',
  outcome: 'Propagate caller context into an outbound HTTP request, always close the response body, and reject non-200 status codes as errors.',
  recognitionCue: 'At every client.Do call, verify three things in order: NewRequestWithContext was used, defer resp.Body.Close() follows the err != nil check, and resp.StatusCode is checked before decoding.',
  prediction: {
    prompt: 'The upstream server replies with HTTP 503 Service Unavailable and JSON {"error":"overloaded"}. What does checkHealth return?',
    code: `func checkHealth(client *http.Client, url string) error {
	resp, err := client.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}`,
    options: [
      {
        id: 'returns-503-err',
        label: 'A non-nil error for HTTP 503',
        explanation: 'net/http is a transport client, not an application client. Receiving a well-formed 503 response means the HTTP round-trip succeeded, so err is nil.',
      },
      {
        id: 'returns-nil',
        label: 'nil — receiving a 503 response is a transport success',
        explanation: 'Correct. client.Get and client.Do return a non-nil error only for DNS, connection, TLS, cancellation, or protocol failures. Any valid HTTP status code returns resp != nil and err == nil.',
      },
      {
        id: 'only-5xx-errors',
        label: 'nil for 4xx, but an error for 5xx',
        explanation: 'Neither 4xx nor 5xx produces a Go error from client.Do; your code must inspect resp.StatusCode explicitly.',
      },
    ],
    correctOptionId: 'returns-nil',
  },
  lesson: `
    <p>Libraries like Python’s <code>requests.raise_for_status()</code> or browser <code>fetch</code> wrappers often condition developers to equate a failed HTTP status with an exception. In Go’s <code>net/http</code>, <code>resp, err := client.Do(req)</code> reports whether <em>speaking HTTP</em> succeeded. If the server answered with <code>503 Service Unavailable</code>, speaking HTTP succeeded: <code>err</code> is <code>nil</code> and <code>resp</code> holds the 503.</p>
    <p>Every production outbound call therefore has three obligations that the default API does not do for you:</p>
    <pre><code>req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
if err != nil {
	return "", err
}
resp, err := client.Do(req)
if err != nil {
	return "", err
}
defer resp.Body.Close() // before checking StatusCode: 500s have bodies too

if resp.StatusCode != http.StatusOK {
	return "", fmt.Errorf("unexpected status: %d", resp.StatusCode)
}</code></pre>
    <p>Order matters: <code>defer resp.Body.Close()</code> must come <strong>after</strong> <code>if err != nil</code> (when <code>err != nil</code>, <code>resp</code> is nil) and <strong>before</strong> the <code>resp.StatusCode</code> check (error responses still hold an open connection that cannot be reused or freed until <code>Body.Close()</code> runs).</p>
    <p class="lab-note"><strong>About this lab.</strong> Outbound calls here run against an in-memory <code>http.RoundTripper</code> injected into <code>*http.Client</code>, so the full <code>net/http</code> request, context, status, and body lifecycle runs in the browser without opening a network socket.</p>
  `,
  challenge: {
    title: 'Harden the outbound account status client',
    description: 'Fix <code>FetchAccountStatus</code> so that it binds <code>ctx</code> to the outgoing request, closes <code>resp.Body</code> on every response (including non-200 responses), returns a non-nil error whenever <code>resp.StatusCode != http.StatusOK</code>, and decodes the <code>status</code> field on <code>200 OK</code>.',
  },
  starterCode: `package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

func FetchAccountStatus(ctx context.Context, client *http.Client, url string) (string, error) {
	// BUG 1: NewRequest ignores ctx, dropping caller cancellation and deadlines.
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	// BUG 2: resp.Body is never closed, and HTTP 500/404 responses are treated as 200 OK.
	var payload struct {
		Status string \`json:"status"\`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}
	return payload.Status, nil
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) { return f(req) }

type trackedBody struct {
	io.Reader
	Closed bool
}

func (b *trackedBody) Close() error {
	b.Closed = true
	return nil
}

func main() {
	body := &trackedBody{Reader: strings.NewReader(\`{"error":"overloaded"}\`)}
	client := &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusServiceUnavailable,
				Body:       body,
			}, nil
		}),
	}
	status, err := FetchAccountStatus(context.Background(), client, "https://api.example/account")
	fmt.Printf("503 response -> status=%q err=%v bodyClosed=%v\\n", status, err, body.Closed)
}
`,
  hiddenTestCode: `func() {
	okBody := &trackedBody{Reader: strings.NewReader(\`{"status":"active"}\`)}
	okClient := &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: http.StatusOK, Body: okBody}, nil
		}),
	}
	status, err := FetchAccountStatus(context.Background(), okClient, "https://api.example/account")
	if err == nil && status == "active" && okBody.Closed {
		println("__GO_SHIFT_TEST__\\tPASS\\t200 decodes and closes body\\tDecoded status=\\"active\\" and closed resp.Body.")
	} else if !okBody.Closed {
		println("__GO_SHIFT_TEST__\\tFAIL\\t200 decodes and closes body\\tresp.Body was left open. Defer resp.Body.Close() right after checking client.Do’s error.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\t200 decodes and closes body\\tExpected status \\"active\\" and nil error on 200 OK.")
	}

	errBody := &trackedBody{Reader: strings.NewReader(\`{"error":"upstream overloaded"}\`)}
	errClient := &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: http.StatusServiceUnavailable, Body: errBody}, nil
		}),
	}
	status503, err503 := FetchAccountStatus(context.Background(), errClient, "https://api.example/account")
	if err503 != nil && status503 == "" && errBody.Closed {
		println("__GO_SHIFT_TEST__\\tPASS\\tnon-200 rejected and closed\\tReturned an error on HTTP 503 and still closed resp.Body.")
	} else if err503 == nil {
		println("__GO_SHIFT_TEST__\\tFAIL\\tnon-200 rejected and closed\\tHTTP 503 returned a nil error. Check resp.StatusCode != http.StatusOK and return an error.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tnon-200 rejected and closed\\tDefer resp.Body.Close() before checking resp.StatusCode so error responses also close their body.")
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	ctxClient := &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			if req.Context().Err() != nil {
				return nil, req.Context().Err()
			}
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       &trackedBody{Reader: strings.NewReader(\`{"status":"active"}\`)},
			}, nil
		}),
	}
	if _, ctxErr := FetchAccountStatus(ctx, ctxClient, "https://api.example/account"); ctxErr != nil {
		println("__GO_SHIFT_TEST__\\tPASS\\tcontext propagated\\tBuilt the request with http.NewRequestWithContext so cancellation reached the transport.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tcontext propagated\\tA canceled ctx did not stop the request. Use http.NewRequestWithContext(ctx, \\"GET\\", url, nil).")
	}

	notFoundBody := &trackedBody{Reader: strings.NewReader(\`{"status":"ghost"}\`)}
	notFoundClient := &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return &http.Response{StatusCode: http.StatusNotFound, Body: notFoundBody}, nil
		}),
	}
	if s404, err404 := FetchAccountStatus(context.Background(), notFoundClient, "https://api.example/account"); err404 != nil && s404 == "" && notFoundBody.Closed {
		println("__GO_SHIFT_TEST__\\tPASS\\t404 not decoded as success\\tRejected HTTP 404 before reading the body as a valid account status.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\t404 not decoded as success\\tCheck resp.StatusCode != http.StatusOK before decoding JSON so a 404 body is never returned as a valid status.")
	}
}()`,
  testNames: ['200 decodes and closes body', 'non-200 rejected and closed', 'context propagated', '404 not decoded as success'],
  hints: [
    'Run the starter: a <code>503 Service Unavailable</code> response prints <code>status="" err=&lt;nil&gt; bodyClosed=false</code> because <code>client.Do</code> succeeded at the HTTP protocol level and <code>resp.Body</code> was never closed.',
    'Replace <code>http.NewRequest("GET", url, nil)</code> with <code>http.NewRequestWithContext(ctx, "GET", url, nil)</code> so the caller’s context travels with the request.',
    'Right after <code>if err != nil { return "", err }</code> on <code>client.Do</code>, add <code>defer resp.Body.Close()</code>, then check <code>if resp.StatusCode != http.StatusOK</code> and return an error (e.g. <code>fmt.Errorf("status %d", resp.StatusCode)</code>).',
  ],
  debrief: {
    title: 'The shift: transport success is not application success',
    summary: 'In Go, net/http separates wire-level errors from HTTP status codes and leaves body lifecycle to you. Binding the context, deferring Body.Close immediately after the transport error check, and validating StatusCode before decoding is the three-part spine of every outbound HTTP call.',
    transfer: 'In addition to request contexts, why should an http.Client constructed at startup set a non-zero Timeout or Transport header timeout instead of using the zero-value &http.Client{}?',
  },
};
