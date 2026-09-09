package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"

	"github.com/gin-gonic/gin"
)

type CreateOrder struct {
	SKU      string `json:"sku"`
	Quantity int    `json:"quantity"`
}

func RequireAPIKey(c *gin.Context) {
	if c.GetHeader("X-API-Key") != "secret" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing api key"})
		return
	}
	c.Next()
}

func CreateOrderHandler(c *gin.Context) {
	var in CreateOrder
	if err := c.ShouldBindJSON(&in); err != nil || in.Quantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "quantity must be a positive integer"})
		return
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
	req, _ := http.NewRequest("POST", "/orders", strings.NewReader(`{"sku":"A1","quantity":0}`))
	req.Header.Set("X-API-Key", "secret")
	NewRouter().ServeHTTP(rec, req)
	fmt.Println("status:", rec.Code, "body:", rec.Body.String())
}
