package shims

import (
	"bytes"
	"strings"
	"testing"

	"github.com/traefik/yaegi/interp"
	"github.com/traefik/yaegi/stdlib"
)

const ginStarter = `package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"

	"github.com/gin-gonic/gin"
)

type CreateOrder struct {
	SKU      string ` + "`json:\"sku\"`" + `
	Quantity int    ` + "`json:\"quantity\"`" + `
}

func RequireAPIKey(c *gin.Context) {
	if c.GetHeader("X-API-Key") != "secret" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing api key"})
	}
	c.Next()
}

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
	req, _ := http.NewRequest("POST", "/orders", strings.NewReader(` + "`" + `{"sku":"A1","quantity":0}` + "`" + `))
	req.Header.Set("X-API-Key", "secret")
	NewRouter().ServeHTTP(rec, req)
	fmt.Println("status:", rec.Code)
	fmt.Println("body:", rec.Body.String())
}
`

const ginTests = `func() {
	send := func(key, body string) (int, string) {
		rec := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/orders", strings.NewReader(body))
		if key != "" { req.Header.Set("X-API-Key", key) }
		NewRouter().ServeHTTP(rec, req)
		return rec.Code, rec.Body.String()
	}
	one := func(body string) bool { return strings.Count(body, "{") == 1 }
	code, body := send("secret", ` + "`" + `{"sku":"A1","quantity":0}` + "`" + `)
	if code == 400 && one(body) && !strings.Contains(body, "created") {
		println("__GO_SHIFT_TEST__\tPASS\tbad input answered once\tok")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tbad input answered once\t", code, body)
	}
	code, body = send("", ` + "`" + `{"sku":"A1","quantity":2}` + "`" + `)
	if code == 401 && one(body) && !strings.Contains(body, "created") {
		println("__GO_SHIFT_TEST__\tPASS\tunauthorized stops\tok")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tunauthorized stops\t", code, body)
	}
	code, body = send("secret", ` + "`" + `{"sku":"A1","quantity":2}` + "`" + `)
	if code == 200 && strings.Contains(body, "created") && strings.Contains(body, "A1") {
		println("__GO_SHIFT_TEST__\tPASS\tgood input\tok")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tgood input\t", code, body)
	}
}()`

func runGin(t *testing.T, code string) string {
	t.Helper()
	var out bytes.Buffer
	i := interp.New(interp.Options{Stdout: &out, Stderr: &out})
	i.Use(stdlib.Symbols)
	i.Use(Symbols)
	if _, err := i.Eval(code); err != nil {
		t.Fatalf("eval main: %v\n%s", err, out.String())
	}
	if _, err := i.Eval(ginTests); err != nil {
		t.Fatalf("eval tests: %v\n%s", err, out.String())
	}
	return out.String()
}

func TestGinStarterAnswersTwice(t *testing.T) {
	out := runGin(t, ginStarter)
	if !strings.Contains(out, "status: 400") || strings.Count(strings.SplitN(out, "body: ", 2)[1], "{") < 2 {
		t.Fatalf("starter should keep the 400 status and append the second body:\n%s", out)
	}
	if !strings.Contains(out, "FAIL\tbad input answered once") || !strings.Contains(out, "FAIL\tunauthorized stops") || !strings.Contains(out, "PASS\tgood input") {
		t.Fatalf("unexpected test lines:\n%s", out)
	}
}

func TestGinFixedPasses(t *testing.T) {
	code := strings.Replace(ginStarter, "c.JSON(http.StatusUnauthorized, gin.H{\"error\": \"missing api key\"})\n\t}", "c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{\"error\": \"missing api key\"})\n\t\treturn\n\t}", 1)
	code = strings.Replace(code, "c.JSON(http.StatusBadRequest, gin.H{\"error\": \"quantity must be a positive integer\"})\n\t}", "c.JSON(http.StatusBadRequest, gin.H{\"error\": \"quantity must be a positive integer\"})\n\t\treturn\n\t}", 1)
	out := runGin(t, code)
	if strings.Count(out, "PASS\t") != 3 || strings.Contains(out, "FAIL\t") {
		t.Fatalf("expected 3 passes:\n%s", out)
	}
}

func TestGinPathParams(t *testing.T) {
	code := `package main
import ("net/http"; "net/http/httptest"; "github.com/gin-gonic/gin")
func Router() *gin.Engine { r := gin.New(); r.GET("/users/:id", func(c *gin.Context) { c.String(200, "user %s", c.Param("id")) }); return r }
func Body(path string) (int, string) { rec := httptest.NewRecorder(); req, _ := http.NewRequest("GET", path, nil); Router().ServeHTTP(rec, req); return rec.Code, rec.Body.String() }
func main() {}
`
	var out bytes.Buffer
	i := interp.New(interp.Options{Stdout: &out, Stderr: &out})
	i.Use(stdlib.Symbols)
	i.Use(Symbols)
	if _, err := i.Eval(code); err != nil {
		t.Fatal(err)
	}
	v, err := i.Eval(`Body("/users/42")`)
	if err != nil {
		t.Fatal(err)
	}
	if got := v.String(); !strings.Contains(got, "user 42") && !strings.Contains(out.String(), "user 42") {
		// i.Eval returns the last value only; call through println instead
		if _, err := i.Eval(`func(){ c, b := Body("/users/42"); println(c, b); c, b = Body("/nope"); println(c, b) }()`); err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(out.String(), "200 user 42") || !strings.Contains(out.String(), "404 ") {
			t.Fatalf("path params / 404:\n%s", out.String())
		}
	}
}
