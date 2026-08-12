import type { Chapter } from '../types';

export const ch1: Chapter = {
  id: 'ch1',
  tag: 'Chapter 1',
  title: 'The Go Mindset: Unlearning OOP',
  content: `
    <p>Welcome to Book13. Since you are an experienced developer, we won't waste time explaining variables and loops. We are going straight into what makes Go unique.</p>
    <p>Go is not an Object-Oriented language in the traditional sense. It has structs, but no classes. It has interfaces, but no <code>implements</code> keyword. And importantly, it avoids inheritance in favor of composition.</p>
    <h3>Pointer Receivers vs Value Receivers</h3>
    <p>Developers coming from Java or C++ often overuse pointers in Go because they treat them like object references.</p>
    <p>In Go, you should use a <strong>value receiver</strong> unless you explicitly need to modify the struct, or the struct is exceptionally large to copy.</p>
  `,
  challengeTitle: 'Idiomatic Refactor',
  challengeDescription: `
    <p>The code in the editor uses a pointer receiver <code>(u *User)</code> for a simple getter method. This is a common Java-ism.</p>
    <p><strong>Task:</strong> Refactor the <code>GetName()</code> method to use a value receiver instead, and run the code to verify.</p>
  `,
  initialCode: `package main\n\nimport "fmt"\n\ntype User struct {\n\tName string\n}\n\n// TODO: Refactor this to idiomatic Go\nfunc (u *User) GetName() string {\n\treturn u.Name\n}\n\nfunc main() {\n\tuser := User{Name: "Alice"}\n\tfmt.Println(user.GetName())\n}`,
  validate: (code: string) => {
    if (code.includes('func (u User) GetName()') || !code.includes('func (u *User) GetName()')) {
      return { success: true, message: `✅ Success! You replaced the pointer receiver with a value receiver.\n\nIn Go, if a method doesn't modify the struct, it's idiomatic to use a value receiver. This prevents unexpected mutations and can sometimes reduce heap allocations.` };
    }
    return { success: false, message: `❌ Compilation successful, but the challenge is not solved yet.\n\nHint: Look closely at the receiver on GetName(). Does it really need a pointer if it's just reading data?` };
  }
};
