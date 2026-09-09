// Package gorm is a deliberately small stub of gorm.io/gorm (v1.25 API subset) for The Go Shift labs.
// It reproduces the query SEMANTICS the labs teach — struct conditions ignore zero values, map and
// string conditions do not, First reports ErrRecordNotFound while Find returns an empty slice — on
// an in-memory store. It is not GORM. Labs that use it say so.
package gorm

import (
	"errors"
	"fmt"
	"reflect"
	"strings"
	"unicode"
)

// ErrRecordNotFound is returned by First when no row matches.
var ErrRecordNotFound = errors.New("record not found")

// Dialector is the driver hook; the labs' sqlite stub returns one.
type Dialector interface{ Name() string }

// Config mirrors gorm.Config's role in Open; fields are accepted and ignored.
type Config struct{}

// Option mirrors gorm.Option.
type Option interface{ Apply(*Config) error }

// Apply satisfies Option so `gorm.Open(dialector, &gorm.Config{})` compiles.
func (c *Config) Apply(*Config) error { return nil }

type condition struct {
	column string
	op     string
	value  reflect.Value
	valid  bool
}

type store struct {
	tables map[string][]reflect.Value
	nextID map[string]uint64
}

// DB mirrors the parts of *gorm.DB the labs use. Chain methods return a new *DB carrying the
// accumulated conditions, as GORM does.
type DB struct {
	Error        error
	RowsAffected int64
	store        *store
	conds        []condition
	model        reflect.Type
}

// Open creates an empty in-memory database. The dialector and options are accepted for API fidelity.
func Open(d Dialector, opts ...Option) (*DB, error) {
	if d == nil {
		return nil, errors.New("gorm stub: nil dialector")
	}
	return &DB{store: &store{tables: map[string][]reflect.Value{}, nextID: map[string]uint64{}}}, nil
}

// AutoMigrate accepts models; the stub needs no schema.
func (db *DB) AutoMigrate(models ...interface{}) error { return nil }

func (db *DB) clone() *DB {
	c := &DB{store: db.store, conds: make([]condition, len(db.conds)), model: db.model}
	copy(c.conds, db.conds)
	return c
}

func snake(name string) string {
	var b strings.Builder
	for i, r := range name {
		if unicode.IsUpper(r) {
			if i > 0 && (unicode.IsLower(rune(name[i-1])) || (i+1 < len(name) && unicode.IsLower(rune(name[i+1])))) {
				b.WriteByte('_')
			}
			b.WriteRune(unicode.ToLower(r))
		} else {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func tableOf(t reflect.Type) string { return snake(t.Name()) + "s" }

// Where accepts a struct or *struct (zero-value fields are IGNORED, exactly as in GORM), a
// map[string]interface{} (every key applies, zero values included), or a SQL fragment with
// placeholders: "active = ?", "age > ?", joined by AND.
func (db *DB) Where(query interface{}, args ...interface{}) *DB {
	c := db.clone()
	switch q := query.(type) {
	case string:
		parts := strings.Split(q, " AND ")
		if len(parts) != len(args) {
			c.Error = fmt.Errorf("gorm stub: %d placeholders but %d arguments", len(parts), len(args))
			return c
		}
		for i, part := range parts {
			fields := strings.Fields(strings.TrimSpace(part))
			if len(fields) != 3 || fields[2] != "?" {
				c.Error = fmt.Errorf("gorm stub: unsupported condition %q (use `column op ?`)", part)
				return c
			}
			c.conds = append(c.conds, condition{column: fields[0], op: fields[1], value: reflect.ValueOf(args[i]), valid: true})
		}
	case map[string]interface{}:
		for k, v := range q {
			c.conds = append(c.conds, condition{column: k, op: "=", value: reflect.ValueOf(v), valid: true})
		}
	default:
		v := reflect.ValueOf(query)
		for v.Kind() == reflect.Ptr {
			v = v.Elem()
		}
		if v.Kind() != reflect.Struct {
			c.Error = fmt.Errorf("gorm stub: unsupported Where argument of type %T", query)
			return c
		}
		for i := 0; i < v.NumField(); i++ {
			f := v.Field(i)
			if !f.IsZero() { // GORM: zero-value fields do not become conditions
				c.conds = append(c.conds, condition{column: snake(v.Type().Field(i).Name), op: "=", value: f, valid: true})
			}
		}
	}
	return c
}

func fieldByColumn(rec reflect.Value, column string) (reflect.Value, bool) {
	t := rec.Type()
	for i := 0; i < t.NumField(); i++ {
		if snake(t.Field(i).Name) == column {
			return rec.Field(i), true
		}
	}
	return reflect.Value{}, false
}

func compare(field, want reflect.Value, op string) (bool, error) {
	if want.IsValid() && want.Type().ConvertibleTo(field.Type()) {
		want = want.Convert(field.Type())
	}
	switch op {
	case "=":
		return reflect.DeepEqual(field.Interface(), want.Interface()), nil
	case "<>", "!=":
		return !reflect.DeepEqual(field.Interface(), want.Interface()), nil
	case ">", "<", ">=", "<=":
		var a, b float64
		switch field.Kind() {
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
			a, b = float64(field.Int()), float64(want.Int())
		case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
			a, b = float64(field.Uint()), float64(want.Uint())
		case reflect.Float32, reflect.Float64:
			a, b = field.Float(), want.Float()
		default:
			return false, fmt.Errorf("gorm stub: %s not supported on %s", op, field.Kind())
		}
		switch op {
		case ">":
			return a > b, nil
		case "<":
			return a < b, nil
		case ">=":
			return a >= b, nil
		default:
			return a <= b, nil
		}
	}
	return false, fmt.Errorf("gorm stub: unsupported operator %q", op)
}

func (db *DB) matches(rec reflect.Value) (bool, error) {
	for _, c := range db.conds {
		f, ok := fieldByColumn(rec, c.column)
		if !ok {
			return false, fmt.Errorf("gorm stub: no column %q on %s", c.column, rec.Type().Name())
		}
		hit, err := compare(f, c.value, c.op)
		if err != nil || !hit {
			return false, err
		}
	}
	return true, nil
}

// Create stores a copy of *struct, assigning ID when it is zero.
func (db *DB) Create(value interface{}) *DB {
	c := db.clone()
	v := reflect.ValueOf(value)
	if v.Kind() != reflect.Ptr || v.Elem().Kind() != reflect.Struct {
		c.Error = fmt.Errorf("gorm stub: Create needs a pointer to a struct, got %T", value)
		return c
	}
	rec := v.Elem()
	table := tableOf(rec.Type())
	if id := rec.FieldByName("ID"); id.IsValid() && id.CanSet() && id.IsZero() {
		db.store.nextID[table]++
		switch id.Kind() {
		case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
			id.SetUint(db.store.nextID[table])
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
			id.SetInt(int64(db.store.nextID[table]))
		}
	}
	stored := reflect.New(rec.Type()).Elem()
	stored.Set(rec)
	db.store.tables[table] = append(db.store.tables[table], stored)
	c.RowsAffected = 1
	return c
}

// Find fills *[]T with every matching row, in insertion order. No match is not an error.
func (db *DB) Find(dest interface{}) *DB {
	c := db.clone()
	if c.Error != nil {
		return c
	}
	v := reflect.ValueOf(dest)
	if v.Kind() != reflect.Ptr || v.Elem().Kind() != reflect.Slice || v.Elem().Type().Elem().Kind() != reflect.Struct {
		c.Error = fmt.Errorf("gorm stub: Find needs a pointer to a slice of structs, got %T", dest)
		return c
	}
	elemType := v.Elem().Type().Elem()
	out := reflect.MakeSlice(v.Elem().Type(), 0, 0)
	for _, rec := range db.store.tables[tableOf(elemType)] {
		hit, err := db.matches(rec)
		if err != nil {
			c.Error = err
			return c
		}
		if hit {
			out = reflect.Append(out, rec)
		}
	}
	v.Elem().Set(out)
	c.RowsAffected = int64(out.Len())
	return c
}

// First fills *T with the first matching row by ID and sets ErrRecordNotFound when there is none.
func (db *DB) First(dest interface{}, conds ...interface{}) *DB {
	c := db
	if len(conds) > 0 {
		c = db.Where(conds[0], conds[1:]...)
	}
	c = c.clone()
	if c.Error != nil {
		return c
	}
	v := reflect.ValueOf(dest)
	if v.Kind() != reflect.Ptr || v.Elem().Kind() != reflect.Struct {
		c.Error = fmt.Errorf("gorm stub: First needs a pointer to a struct, got %T", dest)
		return c
	}
	for _, rec := range db.store.tables[tableOf(v.Elem().Type())] {
		hit, err := c.matches(rec)
		if err != nil {
			c.Error = err
			return c
		}
		if hit {
			v.Elem().Set(rec)
			c.RowsAffected = 1
			return c
		}
	}
	c.Error = ErrRecordNotFound
	return c
}

// Count sets *int64 to the number of matching rows in the table of the model set by Model.
func (db *DB) Count(count *int64) *DB {
	c := db.clone()
	if c.model == nil {
		c.Error = errors.New("gorm stub: Count needs Model(&T{}) first")
		return c
	}
	var n int64
	for _, rec := range db.store.tables[tableOf(c.model)] {
		hit, err := c.matches(rec)
		if err != nil {
			c.Error = err
			return c
		}
		if hit {
			n++
		}
	}
	*count = n
	return c
}

// Model records the table for Count.
func (db *DB) Model(value interface{}) *DB {
	c := db.clone()
	t := reflect.TypeOf(value)
	for t.Kind() == reflect.Ptr {
		t = t.Elem()
	}
	c.model = t
	return c
}
