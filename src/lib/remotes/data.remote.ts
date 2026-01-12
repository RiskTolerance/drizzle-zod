import { db } from '$lib/server/db';
import { command, form } from '$app/server';
import * as v from 'valibot';

import {
	clients,
	patients,
	emergency_contacts,
	createClientSchema,
	createPatientSchema
} from '../server/db/schema';

import type { NewPatient, NewClient } from '../server/db/schema';

// ============================================================================
// SIMPLE TEST EXAMPLE: Optional vs Nullable
// ============================================================================

// Simple test schema to demonstrate optional() vs nullable()
const testSchemaOptional = v.object({
	name: v.string(),
	description: v.optional(v.string()) // Can be omitted (undefined)
});

const testSchemaNullable = v.object({
	name: v.string(),
	description: v.nullable(v.string()) // Must be present, but can be null
});

const testSchemaRequired = v.object({
	name: v.string(),
	description: v.string() // Required field (no optional/nullable)
});

// Test form handler - using optional schema
export const testFormOptional = form(
	testSchemaOptional,
	async (data: v.InferInput<typeof testSchemaOptional>) => {
		// Data is already validated by the schema passed to form()

		// Log what we got
		console.log('Optional test - received:', {
			name: data.name,
			description: data.description,
			descriptionType: typeof data.description,
			hasDescription: 'description' in data
		});

		// Simulate what Drizzle would do
		const insertData = {
			name: data.name,
			// If description is undefined, it's omitted from the object
			...(data.description !== undefined && { description: data.description })
		};

		console.log('What would be inserted:', insertData);
		console.log('Keys in insertData:', Object.keys(insertData));

		return { success: true, data: insertData };
	}
);

// Test form handler - using nullable schema
// Must use 'unchecked' because nullable() creates string | null type,
// and RemoteFormInput doesn't allow null values
export const testFormNullable = form('unchecked', async (data: Record<string, unknown>) => {
	// Convert empty string to null for nullable schema
	const cleanedData = {
		...data,
		description: data.description === '' ? null : data.description
	};

	const parsed = v.safeParse(testSchemaNullable, cleanedData);
	if (!parsed.success) {
		return { success: false, error: parsed.issues };
	}

	// Log what we got
	console.log('Nullable test - received:', {
		name: parsed.output.name,
		description: parsed.output.description,
		descriptionType: typeof parsed.output.description,
		descriptionIsNull: parsed.output.description === null
	});

	// Simulate what Drizzle would do - null is explicitly included
	const insertData = {
		name: parsed.output.name,
		description: parsed.output.description // null is included
	};

	console.log('What would be inserted:', insertData);
	console.log('Keys in insertData:', Object.keys(insertData));

	return { success: true, data: insertData };
});

// Test form handler - using required schema
export const testFormRequired = form(
	testSchemaRequired,
	async (data: v.InferInput<typeof testSchemaRequired>) => {
		// Data is already validated by the schema passed to form()

		// Log what we got
		console.log('Required test - received:', {
			name: data.name,
			description: data.description,
			descriptionType: typeof data.description,
			hasDescription: 'description' in data
		});

		// Simulate what Drizzle would do - both fields are always present
		const insertData = {
			name: data.name,
			description: data.description // Always present
		};

		console.log('What would be inserted:', insertData);
		console.log('Keys in insertData:', Object.keys(insertData));

		return { success: true, data: insertData };
	}
);

// ============================================================================
// END TEST EXAMPLE
// ============================================================================

// Form handler for inserting a patient
// Using 'unchecked' because RemoteFormInput doesn't support:
// 1. Complex nested objects (speciesData with dates)
// 2. Null values (but FormData sends undefined anyway)
// We validate manually with our Valibot schema and convert undefined → null for database
export const insertPatientForm = form('unchecked', async (data: Record<string, unknown>) => {
	// Convert empty strings to undefined (FormData sends "" for empty fields)
	const cleanedData = Object.fromEntries(
		Object.entries(data).map(([key, value]) => [key, value === '' ? undefined : value])
	);

	// Validate with our existing Valibot schema
	const parsed = v.safeParse(createPatientSchema, cleanedData);
	if (!parsed.success) {
		console.error(`Validation failed: ${parsed.issues}`);
		return { success: false, error: parsed.issues };
	}

	try {
		const [patient] = await db.insert(patients).values(parsed.output).returning();
		console.log(`Successfully inserted patient: ${patient.name} (ID: ${patient.id})`);
		return { success: true, patient };
	} catch (err) {
		console.error(`Issue inserting patient: ${err}`);
		return { success: false, error: err instanceof Error ? err.message : 'Database error' };
	}
});

// Insert a single patient (command version)
export const insertPatient = command(
	createPatientSchema,
	async (newPatient: v.InferOutput<typeof createPatientSchema>) => {
		// Data is already validated by the schema passed to command()
		try {
			const [patient] = await db.insert(patients).values(newPatient).returning();
			console.log(`Successfully inserted patient: ${patient.name} (ID: ${patient.id})`);
			return patient;
		} catch (err) {
			console.error(`Issue inserting patient: ${err}`);
			throw err;
		}
	}
);

// Insert an array of patients
export const insertPatients = command(
	v.array(createPatientSchema),
	async (newPatientArr: v.InferOutput<typeof createPatientSchema>[]) => {
		// Data is already validated by the schema passed to command()
		try {
			await db.insert(patients).values(newPatientArr);
			console.log(`Successfully inserted ${newPatientArr.length} patients`);
		} catch (err) {
			console.error(`Issue inserting patient data: ${err}`);
			throw err;
		}
	}
);

// Insert a single client
export const insertClient = command(
	createClientSchema,
	async (newClient: v.InferOutput<typeof createClientSchema>) => {
		// Data is already validated by the schema passed to command()
		try {
			const [client] = await db.insert(clients).values(newClient).returning();
			console.log(
				`Successfully inserted client: ${client.firstName} ${client.lastName} (ID: ${client.id})`
			);
			return client;
		} catch (err) {
			console.error(`Issue inserting client: ${err}`);
			throw err;
		}
	}
);

// Insert an array of clients
export const insertClients = command(
	v.array(createClientSchema),
	async (newClientArr: v.InferOutput<typeof createClientSchema>[]) => {
		// Data is already validated by the schema passed to command()
		try {
			await db.insert(clients).values(newClientArr);
			console.log(`Successfully inserted ${newClientArr.length} clients`);
		} catch (err) {
			console.error(`Issue inserting client data: ${err}`);
			throw err;
		}
	}
);

export const checkpoint1Insert = command(async () => {
	const clientInput = {
		firstName: 'Isaac',
		lastName: 'Druin',
		email: 'idruin@example.com',
		phone: '555-123-4567',
		address: '123 Main St',
		city: 'Sioux Falls',
		state: 'SD',
		zip: '97201'
	} satisfies NewClient;

	const clientData = v.parse(createClientSchema, clientInput);
	const [client] = await db.insert(clients).values(clientData).returning();
	console.log('created client with id: ', client.id);

	const caninePatientInput = {
		clientId: client.id,
		name: 'Felix',
		species: 'canine',
		breed: 'Australian Kelpie',
		sex: 'male_neutered',
		weightKg: 21.5,
		dateOfBirth: new Date('2020-05-15'),
		speciesData: {
			species: 'canine',
			is_working_dog: false,
			akc_registered: true,
			akc_number: '12345'
		}
	} satisfies NewPatient;

	const felinePatientInput = {
		clientId: client.id,
		name: 'Titus',
		species: 'feline',
		breed: 'tabby',
		sex: 'male',
		weightKg: 3,
		speciesData: {
			species: 'feline',
			is_declawed: false,
			is_indoor_only: false
		}
	} satisfies NewPatient;

	await insertPatients([caninePatientInput, felinePatientInput]);

	await db
		.insert(emergency_contacts)
		.values({
			clientId: client.id,
			priority: 1,
			firstName: 'Chris',
			lastName: 'Druin',
			clientRelationship: 'Mother',
			phone: '234-787-8992'
		})
		.then(() => {
			console.log(`Emergency contact created`);
		});
});
