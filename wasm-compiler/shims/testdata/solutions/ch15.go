package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
)

type Update struct {
	Name     *string `json:"name"`
	Quantity *int    `json:"quantity"`
}

func ParseUpdate(body []byte) (Update, error) {
	dec := json.NewDecoder(bytes.NewReader(body))
	dec.DisallowUnknownFields()
	var u Update
	if err := dec.Decode(&u); err != nil {
		return Update{}, err
	}
	if u.Quantity != nil && *u.Quantity <= 0 {
		return Update{}, errors.New("quantity must be positive")
	}
	return u, nil
}

func main() {
	u, err := ParseUpdate([]byte(`{"name": "pen"}`))
	fmt.Println(u.Name != nil, u.Quantity == nil, err)
}
