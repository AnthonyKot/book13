import type { Chapter } from '../types';

export const ch12: Chapter = {
  id: 'ch12',
  tag: 'Chapter 12',
  title: 'Enterprise: Dependency Injection',
  content: `
    <p>Junior Go developers often hardcode dependencies. For example, a <code>UserService</code> might directly instantiate a SQL database connection. This makes unit testing impossible without spinning up a real database container.</p>
    <p>Enterprise Go solves this with <strong>Interfaces and Dependency Injection</strong>. You define an interface describing what the database <em>does</em>, and pass that interface into your service struct.</p>
    <p>In Go, interfaces are implicit. If a struct implements all the methods of an interface, it automatically satisfies it. No <code>implements</code> keyword required!</p>
  `,
  challengeTitle: 'Decoupling with Interfaces',
  challengeDescription: `
    <p><strong>Task:</strong> The <code>UserService</code> currently hardcodes a dependency on <code>RealDB</code>. Refactor it to accept a <code>DataStore</code> interface instead. Then, implement a <code>MockDB</code> struct so the test in <code>main()</code> passes instantly without hitting a real database.</p>
  `,
  initialCode: `package main

import "fmt"

// --- Infrastructure Layer ---
type RealDB struct{}

func (db *RealDB) GetUser(id int) string {
	fmt.Println("Connecting to real Postgres... (slow!)")
	return "RealAlice"
}

// --- Domain Layer ---
// TODO: Define a DataStore interface with GetUser(id int) string

// BUG: UserService is tightly coupled to RealDB!
type UserService struct {
	DB *RealDB // TODO: Change this to the DataStore interface
}

func (s *UserService) PrintUser(id int) {
	fmt.Println("User:", s.DB.GetUser(id))
}

// --- Testing Layer ---
// TODO: Create a MockDB struct that returns "MockAlice"

func main() {
	// TODO: Instantiate UserService with your MockDB
	service := &UserService{
		DB: &RealDB{}, 
	}
	service.PrintUser(1)
}`,
  validate: (code: string) => {
    const hasInterface = code.includes('type DataStore interface');
    const hasMock = code.includes('type MockDB struct') || code.includes('MockDB');
    const decoupling = code.includes('DB DataStore');
    
    if (hasInterface && hasMock && decoupling) {
      return {
        success: true,
        message: `✅ Success! You decoupled the business logic from the infrastructure. This is the cornerstone of writing testable, robust enterprise Go code.`
      };
    }
    return {
      success: false,
      message: `❌ Challenge not solved.\n\nHint: Create an interface, change the field in UserService to use it, and create a mock struct that returns "MockAlice".`
    };
  }
};
