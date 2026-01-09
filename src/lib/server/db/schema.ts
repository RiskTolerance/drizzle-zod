import {
	pgTable,
	integer,
	text,
	timestamp,
	pgEnum,
	real,
	jsonb,
	boolean,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

const commonFields = {
	id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
};

const zPhone = z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Format: 123-456-7890');

export const clients = pgTable('clients', {
	...commonFields,
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	email: text('email').notNull().unique(),
	phone: text('phone').notNull(),
	address: text('address'),
	city: text('city'),
	state: text('state'),
	zip: text('zip'),
	notes: text('notes')
});

export const insertClientSchema = createInsertSchema(clients);
export const selectClientSchema = createSelectSchema(clients);

export const createClientSchema = insertClientSchema
	.omit({
		createdAt: true,
		updatedAt: true
	})
	.extend({
		email: z.email(),
		phone: zPhone,
		state: z.string().length(2).optional(),
		zip: z
			.string()
			.regex(/^\d{5}(-\d{4})?$/)
			.optional()
	});

export type Client = typeof clients.$inferSelect;
export type NewClient = z.infer<typeof createClientSchema>;

export const emergency_contacts = pgTable('emergency_contacts', {
	...commonFields,
	clientId: integer('client_id')
		.notNull()
		.references(() => clients.id, { onDelete: 'cascade' }),
	priority: integer('priority').notNull(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	clientRelationship: text('client_relationship'),
	phone: text('phone').notNull(),
	email: text('email')
});

export const insertEmergencyContactSchema = createInsertSchema(emergency_contacts);
export const selectEmergencyContactSchema = createSelectSchema(emergency_contacts);

export const createEmergencyContactSchema = insertEmergencyContactSchema
	.omit({
		createdAt: true,
		updatedAt: true
	})
	.extend({
		priority: z.number().min(1).max(10),
		phone: zPhone,
		email: z.email().optional()
	});

export type EmergencyContact = typeof emergency_contacts.$inferSelect;
export type NewEmergencyContact = z.infer<typeof createEmergencyContactSchema>;

export const speciesEnum = pgEnum('speciesEnum', [
	'canine',
	'feline',
	'avian',
	'reptile',
	'small_mammal',
	'equine',
	'exotic'
]);

export const patients = pgTable('patients', {
	...commonFields,
	clientId: integer('client_id')
		.notNull()
		.references(() => clients.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	species: speciesEnum('species').notNull(),
	breed: text('breed'),
	color: text('color'),
	sex: text('sex').notNull(),
	dateOfBirth: timestamp('date_of_birth'),
	approximateAge: text('approximate_age'),
	microchipNumber: text('microchip_number'),
	rabiesTag: text('rabies_tag'),
	weightKg: real('weight_kg'),
	weightUpdatedAt: timestamp('weight_updated_at'),
	speciesData: jsonb('species_data'),
	isDeceased: boolean('is_deceased').default(false).notNull(),
	deceasedDate: timestamp('deceased_date'),
	notes: text('notes')
});

const canineDataSchema = z.object({
	species: z.literal('canine'),
	akc_registered: z.boolean().optional(),
	akc_number: z.string().optional(),
	is_working_dog: z.boolean().optional(),
	working_dog_type: z.enum(['service', 'therapy', 'search_rescue', 'other']).optional()
});

const felineDataSchema = z.object({
	species: z.literal('feline'),
	is_indoor_only: z.boolean().optional(),
	is_declawed: z.boolean().optional(),
	fiv_status: z.enum(['positive', 'negative', 'unknown']).optional(),
	felv_status: z.enum(['positive', 'negative', 'unknown']).optional()
});

const avianDataSchema = z.object({
	species: z.literal('avian'),
	bird_type: z.enum(['parrot', 'songbird', 'raptor', 'waterfowl', 'poultry', 'other']),
	is_flighted: z.boolean().optional(),
	band_number: z.string().optional()
});

const reptileDataSchema = z.object({
	species: z.literal('reptile'),
	reptile_type: z.enum(['snake', 'lizard', 'turtle', 'tortoise', 'crocodilian', 'other']),
	is_venomous: z.boolean().optional(),
	permit_number: z.string().optional(),
	enclosure_type: z.string().optional()
});

const smallMammalDataSchema = z.object({
	species: z.literal('small_mammal'),
	mammal_type: z.enum([
		'rabbit',
		'guinea_pig',
		'hamster',
		'ferret',
		'rat',
		'mouse',
		'chinchilla',
		'hedgehog',
		'other'
	])
});

const equineDataSchema = z.object({
	species: z.literal('equine'),
	registration_number: z.string().optional(),
	registry: z.string().optional(),
	use_type: z.enum(['companion', 'show', 'racing', 'working', 'breeding', 'other']),
	height_hands: z.number().optional(),
	coggins_date: z.coerce.date().optional()
});

const exoticDataSchema = z.object({
	species: z.literal('exotic'),
	exotic_type: z.string(),
	permit_required: z.boolean().default(false),
	permit_number: z.string().optional(),
	species_handling_notes: z.string().optional()
});

export const speciesDataSchema = z.discriminatedUnion('species', [
	canineDataSchema,
	felineDataSchema,
	avianDataSchema,
	reptileDataSchema,
	smallMammalDataSchema,
	equineDataSchema,
	exoticDataSchema
]);

const sexEnum = z.enum(['male', 'female', 'male_neutered', 'female_spayed', 'unknown']);

export const insertPatientSchema = createInsertSchema(patients);
export const selectPatientSchema = createSelectSchema(patients);

export const createPatientSchema = insertPatientSchema
	.omit({
		createdAt: true,
		updatedAt: true,
		weightUpdatedAt: true
	})
	.extend({
		species: z.enum(speciesEnum.enumValues),
		sex: sexEnum,
		speciesData: speciesDataSchema.optional(),
		microchipNumber: z.string().min(9).max(15).optional()
	});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = z.infer<typeof createPatientSchema>;
export type SpeciesData = z.infer<typeof speciesDataSchema>;

export const photoCategory = pgEnum('photo_category', ['profile', 'medical', 'x-ray']);

export const patient_photos = pgTable(
	'patient_photos',
	{
		...commonFields,
		patientId: integer('patient_id')
			.notNull()
			.references(() => patients.id, { onDelete: 'cascade' }),
		photoCategory: photoCategory('photo_category').notNull(),
		imagePath: text('image_path').notNull(),
		isPrimary: boolean('is_primary').default(false).notNull(),
		notes: text('notes'),
		softDelete: timestamp('soft_delete')
	},
	(table) => ({
		uniquePrimaryPerPatient: uniqueIndex('unique_primary_photo_per_patient')
			.on(table.patientId)
			.where(sql`${table.isPrimary} = true`)
	})
);

export const insertPatientPhotoSchema = createInsertSchema(patient_photos);
export const selectPatientPhotoSchema = createSelectSchema(patient_photos);

export const createPatientPhotoSchema = insertPatientPhotoSchema.omit({
	createdAt: true,
	updatedAt: true,
	softDelete: true
});

export type PatientPhoto = typeof patient_photos.$inferSelect;
export type NewPatientPhoto = z.infer<typeof createPatientPhotoSchema>;

// relations

export const clientRelations = relations(clients, ({ many }) => ({
	patients: many(patients),
	emergencyContacts: many(emergency_contacts)
}));

export const patientRelations = relations(patients, ({ one, many }) => ({
	client: one(clients, {
		fields: [patients.clientId],
		references: [clients.id]
	}),
	photos: many(patient_photos)
}));

export const emergencyContactRelations = relations(emergency_contacts, ({ one }) => ({
	client: one(clients, {
		fields: [emergency_contacts.clientId],
		references: [clients.id]
	})
}));

export const patientPhotosRelations = relations(patient_photos, ({ one }) => ({
	patient: one(patients, {
		fields: [patient_photos.patientId],
		references: [patients.id]
	})
}));
