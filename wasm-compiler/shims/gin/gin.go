// Package gin is a deliberately small stub of github.com/gin-gonic/gin (v1.10 API subset) for The
// Go Shift labs. It reproduces the request-flow SEMANTICS the labs teach — writing a response does not
// stop a handler, Next runs the rest of the chain, Abort stops it, a second write appends to the body
// while the first status stands — over net/http, with no sockets. It is not Gin. Labs that use it say so.
package gin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// H is shorthand for map[string]interface{}.
type H map[string]interface{}

// HandlerFunc is a Gin handler.
type HandlerFunc func(*Context)

// ResponseWriter mirrors the part of gin.ResponseWriter the labs read.
type ResponseWriter interface {
	http.ResponseWriter
	Status() int
	Written() bool
	Size() int
}

type responseWriter struct {
	http.ResponseWriter
	status  int
	size    int
	written bool
}

func (w *responseWriter) WriteHeader(code int) {
	if w.written { // Gin: "[WARNING] Headers were already written" — the first status stands
		return
	}
	w.status = code
	w.written = true
	w.ResponseWriter.WriteHeader(code)
}

func (w *responseWriter) Write(b []byte) (int, error) {
	if !w.written {
		w.WriteHeader(http.StatusOK)
	}
	n, err := w.ResponseWriter.Write(b)
	w.size += n
	return n, err
}

func (w *responseWriter) Status() int   { return w.status }
func (w *responseWriter) Written() bool { return w.written }
func (w *responseWriter) Size() int     { return w.size }

// Param is one path parameter.
type Param struct{ Key, Value string }

// Params is the ordered parameter list.
type Params []Param

// Get returns a parameter by key.
func (ps Params) Get(name string) (string, bool) {
	for _, p := range ps {
		if p.Key == name {
			return p.Value, true
		}
	}
	return "", false
}

// ByName returns a parameter value or "".
func (ps Params) ByName(name string) string { v, _ := ps.Get(name); return v }

// Context carries the request through the handler chain.
type Context struct {
	Writer   ResponseWriter
	Request  *http.Request
	Params   Params
	handlers []HandlerFunc
	index    int
	keys     map[string]interface{}
}

const abortIndex = 1 << 30

// Next runs the remaining handlers in the chain.
func (c *Context) Next() {
	c.index++
	for c.index < len(c.handlers) {
		c.handlers[c.index](c)
		c.index++
	}
}

// Abort prevents the remaining handlers from running. It does not stop the current one.
func (c *Context) Abort() { c.index = abortIndex }

// IsAborted reports whether Abort was called.
func (c *Context) IsAborted() bool { return c.index >= abortIndex }

// AbortWithStatus writes the status and aborts.
func (c *Context) AbortWithStatus(code int) { c.Status(code); c.Writer.WriteHeader(code); c.Abort() }

// AbortWithStatusJSON writes a JSON body with the status and aborts.
func (c *Context) AbortWithStatusJSON(code int, obj interface{}) { c.Abort(); c.JSON(code, obj) }

// Status sets the response status (written on the first body write).
func (c *Context) Status(code int) { c.Writer.WriteHeader(code) }

// Header sets a response header.
func (c *Context) Header(key, value string) { c.Writer.Header().Set(key, value) }

// GetHeader reads a request header.
func (c *Context) GetHeader(key string) string { return c.Request.Header.Get(key) }

// Param returns a path parameter.
func (c *Context) Param(key string) string { return c.Params.ByName(key) }

// Query returns a URL query value.
func (c *Context) Query(key string) string { return c.Request.URL.Query().Get(key) }

// Set stores a value on the context for later handlers.
func (c *Context) Set(key string, value interface{}) {
	if c.keys == nil {
		c.keys = map[string]interface{}{}
	}
	c.keys[key] = value
}

// Get reads a value stored with Set.
func (c *Context) Get(key string) (interface{}, bool) { v, ok := c.keys[key]; return v, ok }

// GetString reads a string stored with Set, or "".
func (c *Context) GetString(key string) string { v, _ := c.keys[key].(string); return v }

// ShouldBindJSON decodes the request body into obj. Missing fields keep their zero values.
func (c *Context) ShouldBindJSON(obj interface{}) error {
	if c.Request == nil || c.Request.Body == nil {
		return fmt.Errorf("invalid request")
	}
	return json.NewDecoder(c.Request.Body).Decode(obj)
}

// BindJSON is ShouldBindJSON plus a 400 on failure, as in Gin.
func (c *Context) BindJSON(obj interface{}) error {
	if err := c.ShouldBindJSON(obj); err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return err
	}
	return nil
}

// JSON writes obj as JSON with the given status. A second call appends to the body; the first
// status stands, exactly as in Gin.
func (c *Context) JSON(code int, obj interface{}) {
	c.Writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	c.Writer.WriteHeader(code)
	b, err := json.Marshal(obj)
	if err != nil {
		panic(err)
	}
	c.Writer.Write(b)
}

// String writes a formatted text body.
func (c *Context) String(code int, format string, values ...interface{}) {
	c.Writer.Header().Set("Content-Type", "text/plain; charset=utf-8")
	c.Writer.WriteHeader(code)
	fmt.Fprintf(c.Writer, format, values...)
}

type route struct {
	method   string
	segments []string
	handlers []HandlerFunc
}

// Engine is the router.
type Engine struct {
	middleware []HandlerFunc
	routes     []route
}

// New returns an engine with no middleware.
func New() *Engine { return &Engine{} }

// Default mirrors gin.Default; the logger and recovery are omitted in the stub.
func Default() *Engine { return New() }

// Use appends global middleware.
func (e *Engine) Use(handlers ...HandlerFunc) { e.middleware = append(e.middleware, handlers...) }

func (e *Engine) handle(method, path string, handlers ...HandlerFunc) {
	e.routes = append(e.routes, route{method: method, segments: strings.Split(strings.Trim(path, "/"), "/"), handlers: handlers})
}

// GET registers a GET route. Paths may contain :param segments.
func (e *Engine) GET(path string, handlers ...HandlerFunc) {
	e.handle(http.MethodGet, path, handlers...)
}

// POST registers a POST route.
func (e *Engine) POST(path string, handlers ...HandlerFunc) {
	e.handle(http.MethodPost, path, handlers...)
}

// PUT registers a PUT route.
func (e *Engine) PUT(path string, handlers ...HandlerFunc) {
	e.handle(http.MethodPut, path, handlers...)
}

// DELETE registers a DELETE route.
func (e *Engine) DELETE(path string, handlers ...HandlerFunc) {
	e.handle(http.MethodDelete, path, handlers...)
}

func match(segments []string, path string) (Params, bool) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != len(segments) {
		return nil, false
	}
	var ps Params
	for i, seg := range segments {
		if strings.HasPrefix(seg, ":") {
			ps = append(ps, Param{Key: seg[1:], Value: parts[i]})
			continue
		}
		if seg != parts[i] {
			return nil, false
		}
	}
	return ps, true
}

// ServeHTTP runs middleware then the matched route, or writes 404 / 405 like Gin.
func (e *Engine) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
	c := &Context{Writer: rw, Request: req, index: -1}
	pathMatched := false
	for _, r := range e.routes {
		ps, ok := match(r.segments, req.URL.Path)
		if !ok {
			continue
		}
		pathMatched = true
		if r.method != req.Method {
			continue
		}
		c.Params = ps
		c.handlers = append(append([]HandlerFunc{}, e.middleware...), r.handlers...)
		c.Next()
		return
	}
	if pathMatched {
		rw.WriteHeader(http.StatusMethodNotAllowed)
		rw.Write([]byte("405 method not allowed"))
		return
	}
	rw.WriteHeader(http.StatusNotFound)
	rw.Write([]byte("404 page not found"))
}
