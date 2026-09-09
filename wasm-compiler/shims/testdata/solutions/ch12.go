package main

import (
	"errors"
	"fmt"
)

type RealDB struct{}

func (RealDB) UserName(id int) (string, error) {
	if id != 1 {
		return "", errors.New("user not found")
	}
	return "Real Alice", nil
}

// UserStore is owned by the service and lists only what Greeting calls.
// RealDB satisfies it through its method set; nothing on RealDB changes.
type UserStore interface {
	UserName(id int) (string, error)
}

type UserService struct {
	store UserStore
}

func NewUserService(store UserStore) *UserService {
	return &UserService{store: store}
}

func (s *UserService) Greeting(id int) (string, error) {
	name, err := s.store.UserName(id)
	if err != nil {
		return "", err
	}
	return "Hello, " + name, nil
}

func main() {
	service := NewUserService(RealDB{})
	greeting, err := service.Greeting(1)
	fmt.Println(greeting, err)
}
