// Package sqlite is a stub of gorm.io/driver/sqlite for The Go Shift labs: Open returns a dialector
// that the gorm stub accepts. No file is touched; the store is in memory.
package sqlite

import "wasm-compiler/shims/gorm"

type dialector struct{ dsn string }

func (d dialector) Name() string { return "sqlite" }

// Open mirrors sqlite.Open(dsn).
func Open(dsn string) gorm.Dialector { return dialector{dsn: dsn} }
