package main

import (
	"errors"
	"fmt"
)

var errUserNotFound = errors.New("user not found")

// GetUser reports a missing record through the error return, so a caller can
// tell "no such user" apart from a user whose name happens to be empty.
func GetUser(id int) (string, error) {
	if id != 1 {
		return "", errUserNotFound
	}
	return "Alice", nil
}

func userLabel(id int) string {
	user, err := GetUser(id)
	if err != nil {
		return "Lookup failed: " + err.Error()
	}
	return "User: " + user
}

func main() {
	fmt.Println(userLabel(1))
	fmt.Println(userLabel(2))
}
