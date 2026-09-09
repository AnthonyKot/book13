package shims

import (
	"bytes"
	"strings"
	"testing"

	"github.com/traefik/yaegi/interp"
	"github.com/traefik/yaegi/stdlib"
)

const labMain = `package main

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
	err := db.Where(&User{Active: false}).Find(&users).Error
	return users, err
}

func main() {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	db.AutoMigrate(&User{})
	db.Create(&User{Name: "ana", Active: true})
	db.Create(&User{Name: "bo", Active: false})
	db.Create(&User{Name: "cy", Active: true})
	users, _ := InactiveUsers(db)
	fmt.Println("inactive:", len(users))
}
`

const fixed = `func InactiveUsers(db *gorm.DB) ([]User, error) {
	var users []User
	err := db.Where("active = ?", false).Find(&users).Error
	return users, err
}`

const hiddenTests = `func() {
	db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
	if err != nil { panic(err) }
	db.Create(&User{Name: "ana", Active: true})
	db.Create(&User{Name: "bo", Active: false})
	db.Create(&User{Name: "cy", Active: true})
	users, err := InactiveUsers(db)
	if err == nil && len(users) == 1 && users[0].Name == "bo" {
		println("__GO_SHIFT_TEST__\tPASS\tonly inactive\tok")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tonly inactive\tgot", len(users))
	}
	var first User
	if err := db.First(&first, "active = ?", false).Error; err == nil && first.Name == "bo" {
		println("__GO_SHIFT_TEST__\tPASS\tfirst\tok")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tfirst\t", err)
	}
	var none User
	if err := db.First(&none, "name = ?", "zed").Error; err == gorm.ErrRecordNotFound {
		println("__GO_SHIFT_TEST__\tPASS\tnot found\tok")
	} else {
		println("__GO_SHIFT_TEST__\tFAIL\tnot found\t", err)
	}
}()`

func run(t *testing.T, code string) string {
	t.Helper()
	var out bytes.Buffer
	i := interp.New(interp.Options{Stdout: &out, Stderr: &out})
	i.Use(stdlib.Symbols)
	i.Use(Symbols)
	if _, err := i.Eval(code); err != nil {
		t.Fatalf("eval main: %v\n%s", err, out.String())
	}
	if _, err := i.Eval(hiddenTests); err != nil {
		t.Fatalf("eval tests: %v\n%s", err, out.String())
	}
	return out.String()
}

func TestStarterFailsOnlyInactive(t *testing.T) {
	out := run(t, labMain)
	if !strings.Contains(out, "inactive: 3") {
		t.Fatalf("struct condition should ignore the zero value and return 3, got:\n%s", out)
	}
	if !strings.Contains(out, "FAIL\tonly inactive") || !strings.Contains(out, "PASS\tfirst") || !strings.Contains(out, "PASS\tnot found") {
		t.Fatalf("unexpected test lines:\n%s", out)
	}
}

func TestFixedPasses(t *testing.T) {
	code := strings.Replace(labMain, "err := db.Where(&User{Active: false}).Find(&users).Error", "err := db.Where(\"active = ?\", false).Find(&users).Error", 1)
	out := run(t, code)
	if strings.Count(out, "PASS\t") != 3 || strings.Contains(out, "FAIL\t") {
		t.Fatalf("expected 3 passes:\n%s", out)
	}
	if !strings.Contains(out, "inactive: 1") {
		t.Fatalf("expected 1 inactive:\n%s", out)
	}
}

func TestMapConditionIncludesZero(t *testing.T) {
	code := strings.Replace(labMain, "db.Where(&User{Active: false})", "db.Where(map[string]interface{}{\"active\": false})", 1)
	out := run(t, code)
	if !strings.Contains(out, "inactive: 1") {
		t.Fatalf("map condition must include zero values:\n%s", out)
	}
}
