import type { Chapter } from '../types';

export const ch14: Chapter = {
  id: 'ch14',
  order: 14,
  module: 'serve',
  title: 'Writing a Response Does Not Stop the Handler',
  mentalModel: 'A response is bytes written to a connection. Writing them neither returns from your function nor stops the middleware chain. Only return ends a handler, and only Abort ends the chain.',
  outcome: 'Reject bad input and missing credentials with exactly one answer each, and explain why the first status survives a second write.',
  recognitionCue: 'Every branch that writes an error response must end with return, and in middleware with Abort. If it does not, the success path runs as well.',
  prediction: {
    prompt: 'A request arrives with quantity 0. What does the client receive?',
    code: `func CreateOrderHandler(c *gin.Context) {
	var in CreateOrder
	if err := c.ShouldBindJSON(&in); err != nil || in.Quantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "quantity must be a positive integer"})
	}
	c.JSON(http.StatusOK, gin.H{"sku": in.SKU, "quantity": in.Quantity, "status": "created"})
}`,
    options: [
      {
        id: 'error-only',
        label: 'Status 400 with the error body',
        explanation: 'That is the intent, but nothing in the code stops after the first JSON call. The function keeps going and writes the success body too.',
      },
      {
        id: 'success',
        label: 'Status 200 with the success body',
        explanation: 'The status was already sent as 400 when the first body was written. Headers go out once; a later status is ignored, and Gin logs a warning about it.',
      },
      {
        id: 'both',
        label: 'Status 400, with both bodies one after the other',
        explanation: 'Correct. The first write sends the 400 status and the error body. The second write cannot change the status, so it appends the success body. The client gets a 400 whose body is two JSON documents.',
      },
    ],
    correctOptionId: 'both',
  },
  lesson: `
    <p><code>c.JSON</code>, <code>c.String</code> and friends do one thing: they write a status and some bytes to the response. They do not return from your function. Whatever code follows still runs, and if it writes again, the second write lands on a response whose headers already went out. Gin keeps the first status, appends the second body, and logs <em>Headers were already written</em>. The client sees a 400 with two JSON documents in it, and a strict client fails to parse either.</p>
    <p>Middleware has the same shape with one more rule. A middleware that writes a 401 and then calls <code>c.Next()</code>, or simply falls off the end, lets the handler run anyway, so an unauthenticated request still creates the order. <code>c.Abort()</code> is what stops the chain; <code>c.AbortWithStatusJSON</code> writes and aborts in one call. Abort does not return from the middleware either: what follows Abort in the same function still executes, which is why it is usually followed by <code>return</code>.</p>
    <pre><code>// handler: answer, then leave
if err := c.ShouldBindJSON(&amp;in); err != nil || in.Quantity &lt;= 0 {
	c.JSON(http.StatusBadRequest, gin.H{"error": "quantity must be a positive integer"})
	return
}

// middleware: answer, stop the chain, leave
if c.GetHeader("X-API-Key") != "secret" {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing api key"})
	return
}
c.Next()</code></pre>
    <p>The shift from other frameworks is that nothing here throws. A Java or Python framework often ends the request by raising; Go hands you the writer and expects you to leave.</p>
    <p class="lab-note"><strong>About this lab.</strong> It runs on a small stub of Gin's v1.10 request flow, compiled into this page, not on Gin itself. The stub reproduces the documented behaviour above over <code>net/http</code>, so what you prove here is the semantics, not the library's implementation. Requests are sent with the standard library's <code>httptest</code> recorder; no socket is opened.</p>
  `,
  challenge: {
    title: 'Answer every request exactly once',
    description: 'Fix <code>RequireAPIKey</code> and <code>CreateOrderHandler</code> so that a missing key gets a single 401 and never reaches the handler, a bad or malformed body gets a single 400, and a good request gets a 200 with the created order. Keep both signatures and the router.',
  },
  starterCode: `package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"

	"github.com/gin-gonic/gin"
)

type CreateOrder struct {
	SKU      string \`json:"sku"\`
	Quantity int    \`json:"quantity"\`
}

// RequireAPIKey should reject requests without the key and stop the chain.
func RequireAPIKey(c *gin.Context) {
	if c.GetHeader("X-API-Key") != "secret" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing api key"})
	}
	c.Next()
}

// CreateOrderHandler should answer a bad body with one 400 and a good one with one 200.
func CreateOrderHandler(c *gin.Context) {
	var in CreateOrder
	if err := c.ShouldBindJSON(&in); err != nil || in.Quantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "quantity must be a positive integer"})
	}
	c.JSON(http.StatusOK, gin.H{"sku": in.SKU, "quantity": in.Quantity, "status": "created"})
}

func NewRouter() *gin.Engine {
	r := gin.New()
	r.Use(RequireAPIKey)
	r.POST("/orders", CreateOrderHandler)
	return r
}

func main() {
	rec := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/orders", strings.NewReader(\`{"sku":"A1","quantity":0}\`))
	req.Header.Set("X-API-Key", "secret")
	NewRouter().ServeHTTP(rec, req)
	fmt.Println("status:", rec.Code)
	fmt.Println("body:  ", rec.Body.String())
}
`,
  hiddenTestCode: `func() {
	send := func(key, body string) (int, string) {
		rec := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/orders", strings.NewReader(body))
		if key != "" {
			req.Header.Set("X-API-Key", key)
		}
		NewRouter().ServeHTTP(rec, req)
		return rec.Code, rec.Body.String()
	}
	one := func(body string) bool { return strings.Count(body, "{") == 1 }

	code, body := send("secret", \`{"sku":"A1","quantity":0}\`)
	if code == 400 && one(body) && !strings.Contains(body, "created") {
		println("__GO_SHIFT_TEST__\\tPASS\\tbad input answered once\\tA quantity of 0 gets a single 400 and nothing else.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tbad input answered once\\tGot status " + fmt.Sprint(code) + " with body " + body + ". After writing the 400, return; the success path must not run.")
	}

	code, body = send("", \`{"sku":"A1","quantity":2}\`)
	if code == 401 && one(body) && !strings.Contains(body, "created") {
		println("__GO_SHIFT_TEST__\\tPASS\\tunauthorized stops the chain\\tA missing key gets one 401 and the handler never runs.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tunauthorized stops the chain\\tGot status " + fmt.Sprint(code) + " with body " + body + ". Writing a 401 does not stop the chain; abort it and return.")
	}

	code, body = send("secret", \`{"sku":"A1","quantity":2}\`)
	if code == 200 && one(body) && strings.Contains(body, "created") && strings.Contains(body, "A1") {
		println("__GO_SHIFT_TEST__\\tPASS\\tgood input creates\\tA valid request gets one 200 with the created order.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tgood input creates\\tGot status " + fmt.Sprint(code) + " with body " + body + ". A valid body must still succeed.")
	}

	code, body = send("secret", \`{"sku": "A1", "quantity": \`)
	if code == 400 && one(body) && !strings.Contains(body, "created") {
		println("__GO_SHIFT_TEST__\\tPASS\\tmalformed body\\tUnparseable JSON gets a single 400.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tmalformed body\\tGot status " + fmt.Sprint(code) + " with body " + body + ". A bind error must be answered once and then left alone.")
	}
}()`,
  testNames: ['bad input answered once', 'unauthorized stops the chain', 'good input creates', 'malformed body'],
  hints: [
    'Run the starter and read the program output: the status is 400 and the body holds two JSON documents. The function did not stop after the first one.',
    'In the handler, follow the error write with <code>return</code>. Nothing in <code>c.JSON</code> ends the function for you.',
    'In the middleware, replace the write with <code>c.AbortWithStatusJSON(http.StatusUnauthorized, …)</code> and <code>return</code>; <code>c.Next()</code> must only run for requests that carry the key.',
  ],
  debrief: {
    title: 'You are handed the writer, and expected to leave',
    summary: 'Frameworks that raise on error let the exception end the request. Go hands you the response writer and nothing else: the first status wins, later writes append, and the function keeps running until you return. In a handler that means return after every error write; in middleware it means Abort, then return. Two words, both yours to type.',
    transfer: 'Find one handler in a service you maintain where an error branch writes a response. Does it return? Now find a middleware that rejects requests. Does it abort, or only write? Count how many of each are missing.',
  },
};
