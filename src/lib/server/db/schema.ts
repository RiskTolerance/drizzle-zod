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
import { createInsertSchema, createSelectSchema } from 'drizzle-valibot';
import * as v from 'valibot';

const commonFields = {
	id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
};

const vPhone = v.pipe(v.string(), v.regex(/^\d{3}-\d{3}-\d{4}$/, 'Format: 123-456-7890'));

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

const baseClientSchema = v.omit(insertClientSchema, ['createdAt', 'updatedAt']);
export const createClientSchema = v.object({
	...baseClientSchema.entries,
	email: v.pipe(v.string(), v.email()),
	phone: vPhone,
	state: v.optional(v.pipe(v.string(), v.length(2))),
	zip: v.optional(v.pipe(v.string(), v.regex(/^\d{5}(-\d{4})?$/)))
});

export type Client = typeof clients.$inferSelect;
export type NewClient = v.InferInput<typeof createClientSchema>;

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

const baseEmergencyContactSchema = v.omit(insertEmergencyContactSchema, ['createdAt', 'updatedAt']);
export const createEmergencyContactSchema = v.object({
	...baseEmergencyContactSchema.entries,
	priority: v.pipe(v.number(), v.minValue(1), v.maxValue(10)),
	phone: vPhone,
	email: v.optional(v.pipe(v.string(), v.email()))
});

export type EmergencyContact = typeof emergency_contacts.$inferSelect;
export type NewEmergencyContact = v.InferInput<typeof createEmergencyContactSchema>;

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

const canineDataSchema = v.object({
	species: v.literal('canine'),
	akc_registered: v.optional(v.boolean()),
	akc_number: v.optional(v.string()),
	is_working_dog: v.optional(v.boolean()),
	working_dog_type: v.optional(v.picklist(['service', 'therapy', 'search_rescue', 'other']))
});

const felineDataSchema = v.object({
	species: v.literal('feline'),
	is_indoor_only: v.optional(v.boolean()),
	is_declawed: v.optional(v.boolean()),
	fiv_status: v.optional(v.picklist(['positive', 'negative', 'unknown'])),
	felv_status: v.optional(v.picklist(['positive', 'negative', 'unknown']))
});

const avianDataSchema = v.object({
	species: v.literal('avian'),
	bird_type: v.picklist(['parrot', 'songbird', 'raptor', 'waterfowl', 'poultry', 'other']),
	is_flighted: v.optional(v.boolean()),
	band_number: v.optional(v.string())
});

const reptileDataSchema = v.object({
	species: v.literal('reptile'),
	reptile_type: v.picklist(['snake', 'lizard', 'turtle', 'tortoise', 'crocodilian', 'other']),
	is_venomous: v.optional(v.boolean()),
	permit_number: v.optional(v.string()),
	enclosure_type: v.optional(v.string())
});

const smallMammalDataSchema = v.object({
	species: v.literal('small_mammal'),
	mammal_type: v.picklist([
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

const equineDataSchema = v.object({
	species: v.literal('equine'),
	registration_number: v.optional(v.string()),
	registry: v.optional(v.string()),
	use_type: v.picklist(['companion', 'show', 'racing', 'working', 'breeding', 'other']),
	height_hands: v.optional(v.number()),
	coggins_date: v.optional(
		v.pipe(
			v.union([v.string(), v.number()]),
			v.transform((input) => new Date(input))
		)
	)
});

const exoticDataSchema = v.object({
	species: v.literal('exotic'),
	exotic_type: v.string(),
	permit_required: v.optional(v.boolean()),
	permit_number: v.optional(v.string()),
	species_handling_notes: v.optional(v.string())
});

export const speciesDataSchema = v.variant('species', [
	canineDataSchema,
	felineDataSchema,
	avianDataSchema,
	reptileDataSchema,
	smallMammalDataSchema,
	equineDataSchema,
	exoticDataSchema
]);

const sexEnum = v.picklist(['male', 'female', 'male_neutered', 'female_spayed', 'unknown']);

export const insertPatientSchema = createInsertSchema(patients);
export const selectPatientSchema = createSelectSchema(patients);

const basePatientSchema = v.omit(insertPatientSchema, [
	'createdAt',
	'updatedAt',
	'weightUpdatedAt'
]);
export const createPatientSchema = v.object({
	...basePatientSchema.entries,
	species: v.picklist(speciesEnum.enumValues),
	sex: sexEnum,
	speciesData: v.optional(speciesDataSchema),
	microchipNumber: v.optional(v.pipe(v.string(), v.minLength(9), v.maxLength(15)))
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = v.InferInput<typeof createPatientSchema>;
export type SpeciesData = v.InferInput<typeof speciesDataSchema>;

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

export const createPatientPhotoSchema = v.omit(insertPatientPhotoSchema, [
	'createdAt',
	'updatedAt',
	'softDelete'
]);

export type PatientPhoto = typeof patient_photos.$inferSelect;
export type NewPatientPhoto = v.InferInput<typeof createPatientPhotoSchema>;

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
