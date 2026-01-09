import { db } from '../lib/server/db';
import { command } from '$app/server';
import { z } from 'zod';
import {
	clients,
	patients,
	emergency_contacts,
	createClientSchema,
	createPatientSchema
} from '../lib/server/db/schema';

export const checkpoint1Insert = command(async () => {
	console.log('day 1? More like day 2');

	const clientInput: z.infer<typeof createClientSchema> = {
		firstName: 'Isaac',
		lastName: 'Druin',
		email: 'idruin@example.com',
		phone: '555-123-4567',
		address: '123 Main St',
		city: 'Sioux Falls',
		state: 'SD',
		zip: '97201'
	};
	const clientData = createClientSchema.parse(clientInput);

	const [client] = await db.insert(clients).values(clientData).returning();

	console.log('created client with id: ', client.id);

	const caninePatientInput: z.infer<typeof createPatientSchema> = {
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
	};
	const pupper = createPatientSchema.parse(caninePatientInput);

	const felinePatientInput: z.infer<typeof createPatientSchema> = {
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
	};
	const elGato = createPatientSchema.parse(felinePatientInput);

	await db
		.insert(patients)
		.values([pupper, elGato])
		.then(() => {
			console.log(`${pupper.name} and ${elGato.name} inserted into database`);
		});

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
