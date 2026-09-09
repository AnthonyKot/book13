package main

import "fmt"

type User struct {
	Name string
}

// WithName uses a value receiver: u is a copy, so renaming it leaves the
// caller's User untouched, and the method belongs to both User and *User.
func (u User) WithName(name string) User {
	u.Name = name
	return u
}

func main() {
	original := User{Name: "Alice"}
	renamed := original.WithName("Grace")
	fmt.Println(original.Name, renamed.Name)
}
