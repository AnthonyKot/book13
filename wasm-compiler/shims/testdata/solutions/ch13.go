package main

import (
	"fmt"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type User struct {
	ID     uint
	Name   string
	Active bool
}

func InactiveUsers(db *gorm.DB) ([]User, error) {
	var users []User
	err := db.Where("active = ?", false).Find(&users).Error
	return users, err
}

func main() {
	db, _ := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
	db.Create(&User{Name: "ana", Active: true})
	db.Create(&User{Name: "bo", Active: false})
	users, err := InactiveUsers(db)
	fmt.Println("inactive users:", len(users), "error:", err)
}
