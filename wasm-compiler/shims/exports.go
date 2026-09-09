// Package shims registers stub packages under their REAL import paths so lab code can say
// `import "gorm.io/gorm"`. Keys follow yaegi's convention: "<import path>/<package name>".
package shims

import (
	"reflect"

	"github.com/traefik/yaegi/interp"

	"wasm-compiler/shims/gorm"
	"wasm-compiler/shims/sqlite"
)

// Symbols is passed to interp.Use after stdlib.Symbols.
var Symbols = interp.Exports{
	"gorm.io/gorm/gorm": {
		"DB":                reflect.ValueOf((*gorm.DB)(nil)),
		"Config":            reflect.ValueOf((*gorm.Config)(nil)),
		"Dialector":         reflect.ValueOf((*gorm.Dialector)(nil)),
		"Option":            reflect.ValueOf((*gorm.Option)(nil)),
		"Open":              reflect.ValueOf(gorm.Open),
		"ErrRecordNotFound": reflect.ValueOf(&gorm.ErrRecordNotFound).Elem(),
	},
	"gorm.io/driver/sqlite/sqlite": {
		"Open": reflect.ValueOf(sqlite.Open),
	},
}
