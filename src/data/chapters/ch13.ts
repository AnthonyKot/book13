import type { Chapter } from '../types';

export const ch13: Chapter = {
  id: 'ch13',
  order: 13,
  module: 'serve',
  title: 'Struct Conditions Drop Your Zero Values',
  mentalModel: 'A struct condition tells the ORM which fields are set, not which values you want. Zero values — false, 0, "" — count as unset and are silently dropped from the query.',
  outcome: 'Query for inactive users with a condition form that keeps false, and explain why the struct form cannot.',
  recognitionCue: 'When a filter value can legitimately be false, zero or empty, never pass it inside a struct condition; use a map or a placeholder query.',
  prediction: {
    prompt: 'Three users are stored, one of them inactive. How many does this query return?',
    code: `db.Create(&User{Name: "ana", Active: true})
db.Create(&User{Name: "bo", Active: false})
db.Create(&User{Name: "cy", Active: true})

var users []User
db.Where(&User{Active: false}).Find(&users)`,
    options: [
      {
        id: 'one',
        label: 'One user: bo',
        explanation: 'That is what the code says, and it is not what the ORM does. A struct condition is built only from fields that are not their zero value, and false is the zero value of bool, so Active never becomes a condition.',
      },
      {
        id: 'three',
        label: 'All three users',
        explanation: 'Correct. With every field at its zero value the struct contributes no conditions at all. The query has no WHERE clause and returns the whole table.',
      },
      {
        id: 'error',
        label: 'An error: cannot filter on a boolean',
        explanation: 'Nothing fails. That is the dangerous part: the filter is dropped silently and the query succeeds with the wrong rows.',
      },
    ],
    correctOptionId: 'three',
  },
  lesson: `
    <p>GORM offers three ways to say <em>where</em>, and they treat zero values differently. A <strong>struct condition</strong> — <code>Where(&amp;User{Active: false})</code> — is read as "the fields that are set". GORM's own documentation states the rule: when querying with a struct, only non-zero fields are used. <code>false</code>, <code>0</code> and <code>""</code> are zero, so they vanish from the query. There is no warning, because from the ORM's point of view you set nothing.</p>
    <p>A <strong>map condition</strong> keeps every key, zero or not: <code>Where(map[string]interface{}{"active": false})</code>. A <strong>placeholder query</strong> does the same with SQL text: <code>Where("active = ?", false)</code>. Either form says what you mean.</p>
    <pre><code>// dropped: Active is false, the zero value of bool
db.Where(&amp;User{Active: false}).Find(&amp;users)

// kept: the map says exactly which keys apply
db.Where(map[string]interface{}{"active": false}).Find(&amp;users)

// kept: the placeholder binds the value as given
db.Where("active = ?", false).Find(&amp;users)</code></pre>
    <p>The same rule shapes two neighbours you will meet in the challenge: <code>First</code> reports <code>gorm.ErrRecordNotFound</code> when nothing matches, while <code>Find</code> into a slice returns an empty slice and a nil error. Absence is an error for one and a normal result for the other.</p>
    <p class="lab-note"><strong>About this lab.</strong> It runs on a small stub of GORM's v1.25 query API, compiled into this page, not on GORM itself. The stub reproduces the documented rules above on an in-memory store, so what you prove here is the semantics, not the library's implementation.</p>
  `,
  challenge: {
    title: 'Return only the inactive users',
    description: '<code>InactiveUsers</code> must return every user whose <code>Active</code> is false, in insertion order, and an empty slice with a nil error when there are none. Keep the signature. The starter compiles and runs; it is simply wrong.',
  },
  starterCode: `package main

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

// InactiveUsers should return the users whose Active is false.
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

	users, err := InactiveUsers(db)
	fmt.Println("inactive users:", len(users), "error:", err)
	for _, u := range users {
		fmt.Println(" -", u.Name)
	}
}
`,
  hiddenTestCode: `func() {
	seed := func() *gorm.DB {
		db, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
		if err != nil {
			panic(err)
		}
		db.Create(&User{Name: "ana", Active: true})
		db.Create(&User{Name: "bo", Active: false})
		db.Create(&User{Name: "cy", Active: true})
		db.Create(&User{Name: "dee", Active: false})
		return db
	}

	db := seed()
	users, err := InactiveUsers(db)
	if err == nil && len(users) == 2 && users[0].Name == "bo" && users[1].Name == "dee" {
		println("__GO_SHIFT_TEST__\\tPASS\\tonly inactive\\tReturned exactly the two inactive users, in insertion order.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tonly inactive\\tExpected bo and dee; the condition on Active was not applied. A false inside a struct condition is treated as unset.")
	}

	active := seed()
	var actives []User
	active.Where("active = ?", true).Find(&actives)
	if len(actives) == 2 {
		println("__GO_SHIFT_TEST__\\tPASS\\tactive untouched\\tThe active users still query correctly.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tactive untouched\\tQuerying active users should still return two.")
	}

	empty, err := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	empty.Create(&User{Name: "solo", Active: true})
	none, err := InactiveUsers(empty)
	if err == nil && len(none) == 0 {
		println("__GO_SHIFT_TEST__\\tPASS\\tnone is not an error\\tNo inactive users gives an empty slice and a nil error.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tnone is not an error\\tWhen nobody is inactive, return an empty slice and nil; Find does not report absence as an error.")
	}

	var missing User
	if err := db.First(&missing, "name = ?", "zed").Error; err == gorm.ErrRecordNotFound {
		println("__GO_SHIFT_TEST__\\tPASS\\tFirst reports absence\\tFirst returns gorm.ErrRecordNotFound when nothing matches.")
	} else {
		println("__GO_SHIFT_TEST__\\tFAIL\\tFirst reports absence\\tFirst should return gorm.ErrRecordNotFound for a missing row.")
	}
}()`,
  testNames: ['only inactive', 'active untouched', 'none is not an error', 'First reports absence'],
  hints: [
    'Run the starter and read the program output: it prints three inactive users. The condition on Active never reached the query.',
    'GORM builds a struct condition only from non-zero fields. <code>false</code> is the zero value of <code>bool</code>, so <code>&amp;User{Active: false}</code> contributes nothing.',
    'Say the value explicitly: <code>db.Where("active = ?", false)</code> or <code>db.Where(map[string]interface{}{"active": false})</code>. Both keep false.',
  ],
  debrief: {
    title: 'Zero means unset, unless you say otherwise',
    summary: 'The struct form is convenient because it lets you omit fields, and that convenience is exactly what deletes a false, a zero or an empty string from your filter. When a filter value can be zero, choose a form that carries every key: a map or a placeholder. The same distinction runs through First and Find: one treats absence as an error, the other as a result.',
    transfer: 'Where else in your stack does "zero means unset" apply silently? JSON with omitempty, protobuf defaults, SQL NULL against Go zero values. Name one place where a false or a 0 you meant to send is being dropped today.',
  },
};
