This GORM query returns every user. It was written to return the inactive ones.

var users []User
db.Where(&User{Active: false}).Find(&users)

Three users, one inactive. Result: three. No error, no warning.

A struct condition tells GORM which fields are set, not which values you want. Zero values, false, 0, "", count as unset and are dropped from the query. With every field at its zero value the struct contributes no WHERE at all. The query succeeds with the wrong rows, which is the worst way to fail.

Say the value explicitly and it works:

db.Where("active = ?", false).Find(&users)
db.Where(map[string]interface{}{"active": false}).Find(&users)

I made it a lab you can run in the browser, no install: predict how many users come back, then fix the function and watch the tests pass. It runs on a small stub of GORM's query API compiled into the page, reproducing the documented rule on an in-memory store, and the lab says exactly that.

https://anthonykot.github.io/book13/#lab-13

Where else does "zero means unset" apply silently in your stack? JSON with omitempty, protobuf defaults, SQL NULL against Go zero values. Name one place a false you meant to send is being dropped today.
