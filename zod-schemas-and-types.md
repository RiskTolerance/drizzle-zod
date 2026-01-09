# Zod Schemas and TypeScript Types: Why You Need Both

## Overview

When working with Drizzle ORM and Zod, you create schemas that serve **two critical purposes**:

1. **Runtime Validation** - Protecting your application from invalid data
2. **Type Inference** - Providing TypeScript types for compile-time safety

Understanding both purposes is essential for building robust applications.

## The Dual Purpose of Schemas

### Runtime Validation (Primary Purpose)

Schemas validate data **at runtime** - when your application is actually running. This is crucial because:

- TypeScript types are **erased** at runtime (they don't exist in JavaScript)
- User input from forms, APIs, or databases can be anything
- Invalid data could crash your app or corrupt your database

### Type Inference (Bonus Benefit)

TypeScript can extract types from Zod schemas using `z.infer<typeof schema>`. This gives you:

- Type safety at compile time
- Autocomplete in your IDE
- Types that automatically stay in sync with your validation rules

## Example Schema Setup

```typescript
// Database table definition
export const clients = pgTable('clients', {
	id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	email: text('email').notNull().unique(),
	phone: text('phone').notNull(),
	// ... more fields
});

// Schema for inserting into database
export const insertClientSchema = createInsertSchema(clients);

// Schema for selecting from database
export const selectClientSchema = createSelectSchema(clients);

// Schema for user input (with custom validation rules)
export const createClientSchema = insertClientSchema
	.omit({
		createdAt: true,
		updatedAt: true
	})
	.extend({
		email: z.email(),  // Custom validation: must be valid email
		phone: zPhone,     // Custom validation: must match regex
		state: z.string().length(2).optional(),
		zip: z.string().regex(/^\d{5}(-\d{4})?$/).optional()
	});

// TypeScript types extracted from schemas
export type Client = typeof clients.$inferSelect;
export type NewClient = z.infer<typeof createClientSchema>;
```

## Why You Need Both: A Comparison

### ❌ TypeScript Types Alone - NO Runtime Protection

```typescript
// TypeScript types are erased at runtime!
const clientInput: NewClient = {
	email: "not-an-email",  // TypeScript says OK, but it's invalid!
	phone: "123"            // TypeScript says OK, but doesn't match regex!
	firstName: "John",
	lastName: "Doe"
};

// This would compile fine, but crash at runtime or insert bad data
await db.insert(clients).values(clientInput);
```

**Problems:**
- TypeScript only checks types at compile time
- Invalid data passes through unchecked
- Your database could be corrupted
- Your application could crash

### ✅ Schema Validation - Catches Errors at Runtime

```typescript
// User submits form data (could be anything!)
const formData = await request.formData();

// Validate it at runtime - throws ZodError if invalid
const validated = createClientSchema.parse({
	email: formData.get('email'),
	phone: formData.get('phone'),
	firstName: formData.get('firstName'),
	lastName: formData.get('lastName'),
	// ...
});

// Now you KNOW it's safe to insert into database
await db.insert(clients).values(validated);
```

**Benefits:**
- Invalid data is caught before it reaches your database
- You get helpful error messages
- Your application stays stable
- Data integrity is maintained

## Understanding `z.infer<typeof schema>`

### What is `z.infer`?

`z.infer` is a **type-level operation** (not runtime code) that extracts TypeScript types from Zod schemas.

```typescript
// This is a TYPE, not a value - it only exists at compile time
type ClientType = z.infer<typeof createClientSchema>;
```

### How It Works

1. `typeof createClientSchema` - Gets the TypeScript type of the schema object
2. `z.infer<...>` - Extracts the output type from the schema's internal structure
3. The result is a TypeScript type you can use for annotations

### Using It for Type Annotations

```typescript
// Option 1: Extract type inline
const clientInput: z.infer<typeof createClientSchema> = {
	firstName: 'Sarah',
	lastName: 'Johnson',
	email: 'sarah@example.com',
	phone: '555-123-4567',
	// ...
};

// Option 2: Use the exported type alias
const clientInput: NewClient = {
	firstName: 'Sarah',
	// ...
};

// Option 3: Use `satisfies` (TypeScript 4.9+) - best of both worlds
const clientInput = {
	firstName: 'Sarah',
	// ...
} satisfies z.infer<typeof createClientSchema>;
```

## Real-World Usage Pattern

Here's how you'd typically use schemas in a real application:

```typescript
// 1. User submits form data
async function handleFormSubmission(request: Request) {
	const formData = await request.formData();
	
	// 2. Validate at runtime with schema
	try {
		const validated = createClientSchema.parse({
			email: formData.get('email'),
			phone: formData.get('phone'),
			firstName: formData.get('firstName'),
			lastName: formData.get('lastName'),
			// ...
		});
		
		// 3. Now safe to insert into database
		const [newClient] = await db.insert(clients)
			.values(validated)
			.returning();
		
		// 4. Return validated data
		return { success: true, client: newClient };
		
	} catch (error) {
		// 5. Handle validation errors gracefully
		if (error instanceof z.ZodError) {
			return { 
				success: false, 
				errors: error.errors 
			};
		}
		throw error;
	}
}
```

## Schema Types Explained

### `insertClientSchema`
- **Purpose**: Validates data before inserting into database
- **Use case**: When creating new records
- **Type**: `z.infer<typeof insertClientSchema>`

### `selectClientSchema`
- **Purpose**: Validates data coming FROM database
- **Use case**: When reading records (less common, but useful for API responses)
- **Type**: `z.infer<typeof selectClientSchema>`

### `createClientSchema`
- **Purpose**: Validates user input with custom business rules
- **Use case**: Form submissions, API endpoints
- **Type**: `z.infer<typeof createClientSchema>` or `NewClient`
- **Features**: Includes custom validations (email format, phone regex, etc.)

## Key Takeaways

1. **Schemas are for runtime validation** - They protect your app from invalid data
2. **Types are for compile-time safety** - They give you autocomplete and type checking
3. **You need both** - Types alone don't protect you at runtime
4. **`z.infer` extracts types** - It's a type-level operation, not runtime code
5. **Always validate user input** - Use `.parse()` before inserting into database

## Common Patterns

### Pattern 1: Validate then Insert
```typescript
const input: NewClient = { /* ... */ };
const validated = createClientSchema.parse(input);
await db.insert(clients).values(validated);
```

### Pattern 2: Extract Type for Function Parameters
```typescript
function createClient(data: z.infer<typeof createClientSchema>) {
	const validated = createClientSchema.parse(data);
	return db.insert(clients).values(validated);
}
```

### Pattern 3: Use Type Alias for Clarity
```typescript
// In schema.ts
export type NewClient = z.infer<typeof createClientSchema>;

// In your code
function createClient(data: NewClient) {
	const validated = createClientSchema.parse(data);
	return db.insert(clients).values(validated);
}
```

## Summary

- **Schemas** = Runtime validation (protects your app)
- **Types** = Compile-time safety (helps you code)
- **`z.infer`** = Extracts types from schemas (type-level operation)
- **Always validate** = Use `.parse()` before database operations

Remember: TypeScript types are erased at runtime. Only Zod schemas can protect you from invalid data when your application is running!
