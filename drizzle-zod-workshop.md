# Drizzle + Zod Workshop: Veterinary Practice Database

A multi-day, hands-on workshop to master Drizzle ORM and Zod validation through building a complete veterinary practice management system.

## Workshop Overview

**Time Commitment:** 20-25 hours over 5 days
**Prerequisites:** Basic TypeScript, PostgreSQL running
**End Goal:** A working database schema with type-safe CRUD operations

---

## Setup

### Initial Project Setup

```bash
mkdir vet-clinic-db && cd vet-clinic-db
bun init -y
bun add drizzle-orm drizzle-zod zod postgres dotenv
bun add -d drizzle-kit @types/postgres
```

### Database Setup

```bash
# Start PostgreSQL
docker run --name vet-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=vet_practice \
  -p 5432:5432 -d postgres:16
```

**`.env`:**
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/vet_practice
```

**`drizzle.config.ts`:**
```typescript
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**`src/db/index.ts`:**
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

---

## Day 1: Core Tables and Relations

### Overview

Today you'll create:
- Client management (owners)
- Patient management (animals)
- Emergency contacts
- Patient photos with primary photo system
- Relations between all tables

**Key concepts:**
- Auto-incrementing IDs
- Foreign keys and cascading deletes
- Discriminated unions for species-specific data
- Partial unique indexes
- Drizzle relations

---

### Checkpoint 1.1: Clients Table

**Goal:** Create the clients (pet owners) table with Zod validation.

**Create `src/db/schema/clients.ts`:**

```typescript
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const clients = pgTable('clients', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

export const insertClientSchema = createInsertSchema(clients);
export const selectClientSchema = createSelectSchema(clients);

export const createClientSchema = insertClientSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    email: z.string().email(),
    phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Format: 123-456-7890'),
    state: z.string().length(2).optional(),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  });

export type Client = typeof clients.$inferSelect;
export type NewClient = z.infer<typeof createClientSchema>;
```

---

### Checkpoint 1.2: Emergency Contacts

**Create `src/db/schema/emergency_contacts.ts`:**

```typescript
import { pgTable, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { clients } from './clients';

export const emergency_contacts = pgTable('emergency_contacts', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  clientId: integer('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  priority: integer('priority').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  clientRelationship: text('client_relationship'),
  phone: text('phone').notNull(),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

export const insertEmergencyContactSchema = createInsertSchema(emergency_contacts);
export const selectEmergencyContactSchema = createSelectSchema(emergency_contacts);

export const createEmergencyContactSchema = insertEmergencyContactSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    priority: z.number().min(1).max(10),
    email: z.string().email().optional(),
  });

export type EmergencyContact = typeof emergency_contacts.$inferSelect;
export type NewEmergencyContact = z.infer<typeof createEmergencyContactSchema>;
```

---

### Checkpoint 1.3: Patients Table with Species Data

**Create `src/db/schema/patients.ts`:**

```typescript
import { pgTable, text, integer, real, timestamp, jsonb, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { clients } from './clients';

export const speciesEnum = pgEnum('species', [
  'canine',
  'feline',
  'avian',
  'reptile',
  'small_mammal',
  'equine',
  'exotic',
]);

export const patients = pgTable('patients', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  clientId: integer('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'restrict' }),
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
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

// Species-specific data schemas
const canineDataSchema = z.object({
  species: z.literal('canine'),
  akc_registered: z.boolean().optional(),
  akc_number: z.string().optional(),
  is_working_dog: z.boolean().optional(),
  working_dog_type: z.enum(['service', 'therapy', 'police', 'search_rescue', 'other']).optional(),
});

const felineDataSchema = z.object({
  species: z.literal('feline'),
  is_indoor_only: z.boolean().optional(),
  is_declawed: z.boolean().optional(),
  fiv_status: z.enum(['positive', 'negative', 'unknown']).optional(),
  felv_status: z.enum(['positive', 'negative', 'unknown']).optional(),
});

const avianDataSchema = z.object({
  species: z.literal('avian'),
  bird_type: z.enum(['parrot', 'songbird', 'raptor', 'waterfowl', 'poultry', 'other']),
  is_flighted: z.boolean().optional(),
  band_number: z.string().optional(),
  hatch_certificate: z.boolean().optional(),
});

const reptileDataSchema = z.object({
  species: z.literal('reptile'),
  reptile_type: z.enum(['snake', 'lizard', 'turtle', 'tortoise', 'crocodilian', 'other']),
  is_venomous: z.boolean().default(false),
  permit_number: z.string().optional(),
  enclosure_type: z.string().optional(),
});

const smallMammalDataSchema = z.object({
  species: z.literal('small_mammal'),
  mammal_type: z.enum(['rabbit', 'guinea_pig', 'hamster', 'ferret', 'rat', 'mouse', 'chinchilla', 'hedgehog', 'other']),
});

const equineDataSchema = z.object({
  species: z.literal('equine'),
  registration_number: z.string().optional(),
  registry: z.string().optional(),
  use_type: z.enum(['companion', 'show', 'racing', 'working', 'breeding', 'other']).optional(),
  height_hands: z.number().optional(),
  coggins_date: z.coerce.date().optional(),
});

const exoticDataSchema = z.object({
  species: z.literal('exotic'),
  exotic_type: z.string(),
  permit_required: z.boolean().default(false),
  permit_number: z.string().optional(),
  species_handling_notes: z.string().optional(),
});

export const speciesDataSchema = z.discriminatedUnion('species', [
  canineDataSchema,
  felineDataSchema,
  avianDataSchema,
  reptileDataSchema,
  smallMammalDataSchema,
  equineDataSchema,
  exoticDataSchema,
]);

const sexEnum = z.enum(['male', 'female', 'male_neutered', 'female_spayed', 'unknown']);

export const insertPatientSchema = createInsertSchema(patients);
export const selectPatientSchema = createSelectSchema(patients);

export const createPatientSchema = insertPatientSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    weightUpdatedAt: true,
  })
  .extend({
    species: z.enum(speciesEnum.enumValues),
    sex: sexEnum,
    speciesData: speciesDataSchema.optional(),
    microchipNumber: z.string().min(9).max(15).optional(),
  });

export type Patient = typeof patients.$inferSelect;
export type NewPatient = z.infer<typeof createPatientSchema>;
export type SpeciesData = z.infer<typeof speciesDataSchema>;
```

---

### Checkpoint 1.4: Patient Photos

**Create `src/db/schema/patient_photos.ts`:**

```typescript
import { pgTable, text, integer, timestamp, pgEnum, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { patients } from './patients';

export const photoCategory = pgEnum('photo_category', [
  'profile',
  'medical',
  'x-ray',
]);

export const patient_photos = pgTable('patient_photos', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  patientId: integer('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  photoCategory: photoCategory('photo_category').notNull(),
  imagePath: text('image_path').notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  notes: text('notes'),
  softDelete: timestamp('soft_delete'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  // Only one primary photo per patient
  uniquePrimaryPerPatient: uniqueIndex('unique_primary_photo_per_patient')
    .on(table.patientId)
    .where(sql`${table.isPrimary} = true`),
}));

export const insertPatientPhotoSchema = createInsertSchema(patient_photos);
export const selectPatientPhotoSchema = createSelectSchema(patient_photos);

export const createPatientPhotoSchema = insertPatientPhotoSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    softDelete: true,
  });

export type PatientPhoto = typeof patient_photos.$inferSelect;
export type NewPatientPhoto = z.infer<typeof createPatientPhotoSchema>;
```

**Key concept:** The `uniqueIndex` with a `where` clause is a **partial unique index**. It only enforces uniqueness when `isPrimary = true`, meaning a patient can have multiple photos with `isPrimary = false`, but only ONE with `isPrimary = true`. This prevents multiple primary photos at the database level.

---

### Checkpoint 1.5: Create Schema Index and Migrate

**Create `src/db/schema/index.ts`:**

```typescript
export * from './clients';
export * from './emergency_contacts';
export * from './patients';
export * from './patient_photos';
```

**Generate and run migrations:**

```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

You should see:
```
4 tables
clients 12 columns 0 indexes 0 fks
emergency_contacts 11 columns 0 indexes 1 fks
patient_photos 9 columns 1 indexes 1 fks
patients 19 columns 0 indexes 1 fks
```

✅ **Checkpoint: All tables created in database**

---

### Checkpoint 1.6: Define Relations

**Goal:** Set up Drizzle relations so you can query clients with their patients, patients with their photos, etc.

**Create `src/db/schema/relations.ts`:**
```typescript
import { relations } from 'drizzle-orm';
import { clients } from './clients';
import { patients } from './patients';
import { emergency_contacts } from './emergency_contacts';
import { patient_photos } from './patient_photos';

// Client relations
export const clientsRelations = relations(clients, ({ many }) => {
  return {
    patients: many(patients),
    emergencyContacts: many(emergency_contacts),
  };
});

// Patient relations
export const patientsRelations = relations(patients, ({ one, many }) => {
  return {
    client: one(clients, {
      fields: [patients.clientId],
      references: [clients.id],
    }),
    photos: many(patient_photos),
  };
});

// Emergency contact relations
export const emergencyContactsRelations = relations(emergency_contacts, ({ one }) => {
  return {
    client: one(clients, {
      fields: [emergency_contacts.clientId],
      references: [clients.id],
    }),
  };
});

// Patient photos relations
export const patientPhotosRelations = relations(patient_photos, ({ one }) => {
  return {
    patient: one(patients, {
      fields: [patient_photos.patientId],
      references: [patients.id],
    }),
  };
});
```

**Update `src/db/schema/index.ts`:**
```typescript
export * from './clients';
export * from './emergency_contacts';
export * from './patients';
export * from './patient_photos';
export * from './relations';
```

**Generate and run migrations:**
```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

---

### Checkpoint 1.7: Test Basic Relations

**Create `src/checkpoints/day1-checkpoint1.ts`:**
```typescript
import { db } from '../db';
import { clients, patients, emergency_contacts, createClientSchema, createPatientSchema } from '../db/schema';

async function checkpoint1() {
  console.log('🧪 Day 1 Checkpoint 1.7: Basic Relations\n');
  
  // Test 1: Create client with validation
  const clientData = createClientSchema.parse({
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah@example.com',
    phone: '555-123-4567',
    address: '123 Main St',
    city: 'Portland',
    state: 'OR',
    zip: '97201',
  });
  
  const [client] = await db.insert(clients).values(clientData).returning();
  console.log('✅ Created client:', client.id);
  
  // Test 2: Create patients for this client
  const dog = createPatientSchema.parse({
    clientId: client.id,
    name: 'Max',
    species: 'canine',
    breed: 'Golden Retriever',
    sex: 'male_neutered',
    weightKg: 32.5,
    dateOfBirth: new Date('2020-05-15'),
    speciesData: {
      species: 'canine',
      akc_registered: true,
      akc_number: 'DN12345678',
    },
  });
  
  const cat = createPatientSchema.parse({
    clientId: client.id,
    name: 'Luna',
    species: 'feline',
    breed: 'Siamese',
    sex: 'female_spayed',
    weightKg: 4.2,
    speciesData: {
      species: 'feline',
      is_indoor_only: true,
      fiv_status: 'negative',
      felv_status: 'negative',
    },
  });
  
  await db.insert(patients).values([dog, cat]);
  console.log('✅ Created 2 patients');
  
  // Test 3: Create emergency contact
  await db.insert(emergency_contacts).values({
    clientId: client.id,
    priority: 1,
    firstName: 'John',
    lastName: 'Johnson',
    clientRelationship: 'Spouse',
    phone: '555-987-6543',
    email: 'john@example.com',
  });
  console.log('✅ Created emergency contact');
  
  // Test 4: Query with relations
  const clientWithData = await db.query.clients.findFirst({
    where: (clients, { eq }) => eq(clients.id, client.id),
    with: {
      patients: true,
      emergencyContacts: true,
    },
  });
  
  console.log('\n📊 Client with relations:');
  console.log(`   Name: ${clientWithData?.firstName} ${clientWithData?.lastName}`);
  console.log(`   Patients: ${clientWithData?.patients.length}`);
  console.log(`   Emergency Contacts: ${clientWithData?.emergencyContacts.length}`);
  
  // Test 5: Query patient with client
  const patientWithOwner = await db.query.patients.findFirst({
    where: (patients, { eq }) => eq(patients.name, 'Max'),
    with: {
      client: true,
    },
  });
  
  console.log(`\n📊 Patient "Max" owner: ${patientWithOwner?.client.firstName} ${patientWithOwner?.client.lastName}`);
  
  console.log('\n✅ Checkpoint 1.7 complete!');
  process.exit(0);
}

checkpoint1().catch(console.error);
```

**Run it:**
```bash
bun src/checkpoints/day1-checkpoint1.ts
```

**Expected output:**
```
🧪 Day 1 Checkpoint 1.7: Basic Relations

✅ Created client: 1
✅ Created 2 patients
✅ Created emergency contact

📊 Client with relations:
   Name: Sarah Johnson
   Patients: 2
   Emergency Contacts: 1

📊 Patient "Max" owner: Sarah Johnson

✅ Checkpoint 1.7 complete!
```

---

### 🎯 YOUR TASK 1.1: Species-Specific Data Validation

**Goal:** Test that species-specific JSONB data validates correctly.

**Create `src/checkpoints/day1-task1.ts`:**
```typescript
import { db } from '../db';
import { clients, patients, createClientSchema, createPatientSchema } from '../db/schema';

async function task1() {
  console.log('🎯 Task 1.1: Species Data Validation\n');
  
  // Setup: Create a client
  const [client] = await db.insert(clients).values(
    createClientSchema.parse({
      firstName: 'Test',
      lastName: 'Owner',
      email: 'test@example.com',
      phone: '555-000-0000',
    })
  ).returning();
  
  // TODO: Test 1 - Create a horse with equine-specific data
  // - Include registration_number, height_hands, use_type
  // - Verify it saves correctly
  
  // TODO: Test 2 - Create a reptile with permit info
  // - Include reptile_type, is_venomous, permit_number
  // - Verify it saves correctly
  
  // TODO: Test 3 - Try to create a patient with WRONG species data
  // - Create a canine but pass feline species data
  // - This should FAIL validation
  // - Catch the error and verify it's a Zod validation error
  
  // TODO: Test 4 - Create a patient WITHOUT species data
  // - Species data is optional
  // - Verify this works (some patients don't need extra data)
  
  console.log('\n✅ Task 1.1 complete!');
  process.exit(0);
}

task1().catch(console.error);
```

**Your job:**
1. Implement all four TODO tests
2. Make sure Test 3 properly catches the validation error
3. Verify discriminated union is working (canine data can't be used for feline patient)

**Success criteria:**
- All 4 tests pass
- Test 3 properly rejects mismatched species data
- You understand how `z.discriminatedUnion` validates based on the discriminator field

---

### 🎯 YOUR TASK 1.2: Photo Management

**Goal:** Work with the patient photos system including primary photo logic.

**Requirements:**
1. Create a patient
2. Upload 3 photos for that patient (medical, profile, x-ray)
3. Set one as primary
4. Query patient with their photos
5. Ensure only ONE photo can be primary per patient

**Create `src/checkpoints/day1-task2.ts`:**
```typescript
import { db } from '../db';
import { clients, patients, patient_photos, createClientSchema, createPatientSchema } from '../db/schema';
import { eq, and } from 'drizzle-orm';

async function task2() {
  console.log('🎯 Task 1.2: Photo Management\n');
  
  // Setup
  const [client] = await db.insert(clients).values(
    createClientSchema.parse({
      firstName: 'Photo',
      lastName: 'Test',
      email: 'photo@example.com',
      phone: '555-111-2222',
    })
  ).returning();
  
  const [patient] = await db.insert(patients).values(
    createPatientSchema.parse({
      clientId: client.id,
      name: 'Bella',
      species: 'canine',
      sex: 'female',
    })
  ).returning();
  
  // TODO: 1. Insert 3 photos for this patient
  // - One profile photo (set as primary)
  // - One medical photo
  // - One x-ray photo
  
  // TODO: 2. Write a function to set primary photo
  // This function should:
  // - Set isPrimary = false for all photos of this patient
  // - Set isPrimary = true for the specified photo
  // - Do this in a transaction (both operations succeed or both fail)
  
  // TODO: 3. Test changing primary photo
  // - Set medical photo as primary
  // - Verify only one photo has isPrimary = true
  
  // TODO: 4. Query patient with primary photo
  // - Use Drizzle query builder to get patient with photos
  // - Filter/find the primary photo
  // - Console log the primary photo path
  
  console.log('\n✅ Task 1.2 complete!');
  process.exit(0);
}

task2().catch(console.error);
```

**Hints:**
- Use `db.transaction()` for atomic operations
- Query all photos then filter in JS, or use subquery
- Consider creating a helper function: `setPrimaryPhoto(patientId, photoId)`

---

### Checkpoint 1.8: Complex Queries

**Goal:** Practice advanced Drizzle query patterns.

**Create `src/checkpoints/day1-checkpoint2.ts`:**
```typescript
import { db } from '../db';
import { clients, patients } from '../db/schema';
import { sql, eq, and, or, gt, isNull } from 'drizzle-orm';

async function checkpoint2() {
  console.log('🧪 Day 1 Checkpoint 2: Complex Queries\n');
  
  // Query 1: Find all canine patients heavier than 20kg
  const heavyDogs = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.species, 'canine'),
        gt(patients.weightKg, 20)
      )
    );
  
  console.log(`✅ Found ${heavyDogs.length} dogs over 20kg`);
  
  // Query 2: Find clients with multiple pets
  const clientsWithMultiplePets = await db
    .select({
      clientId: clients.id,
      clientName: sql<string>`${clients.firstName} || ' ' || ${clients.lastName}`,
      petCount: sql<number>`COUNT(${patients.id})`,
    })
    .from(clients)
    .leftJoin(patients, eq(clients.id, patients.clientId))
    .groupBy(clients.id)
    .having(sql`COUNT(${patients.id}) > 1`);
  
  console.log(`✅ Found ${clientsWithMultiplePets.length} clients with multiple pets`);
  
  // Query 3: Find patients without date of birth (unknown age)
  const unknownAge = await db
    .select()
    .from(patients)
    .where(
      and(
        isNull(patients.dateOfBirth),
        isNull(patients.approximateAge)
      )
    );
  
  console.log(`✅ Found ${unknownAge.length} patients with unknown age`);
  
  // Query 4: Calculate average weight by species
  const avgWeightBySpecies = await db
    .select({
      species: patients.species,
      avgWeight: sql<number>`AVG(${patients.weightKg})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(patients)
    .where(sql`${patients.weightKg} IS NOT NULL`)
    .groupBy(patients.species);
  
  console.log('\n📊 Average weight by species:');
  avgWeightBySpecies.forEach(row => {
    console.log(`   ${row.species}: ${row.avgWeight?.toFixed(2)}kg (n=${row.count})`);
  });
  
  console.log('\n✅ Checkpoint 2 complete!');
  process.exit(0);
}

checkpoint2().catch(console.error);
```

---

### 🎯 YOUR TASK 1.3: Emergency Contact Priority System

**Goal:** Implement logic to enforce unique priorities per client.

**Requirements:**
1. Each client's emergency contacts should have unique priority values (no two contacts with priority 1)
2. When adding a new contact with priority N, shift existing contacts down if needed
3. Write validation to prevent duplicate priorities

**Create `src/checkpoints/day1-task3.ts`:**
```typescript
import { db } from '../db';
import { clients, emergency_contacts, createClientSchema } from '../db/schema';
import { eq, and, gte } from 'drizzle-orm';

async function task3() {
  console.log('🎯 Task 1.3: Emergency Contact Priority\n');
  
  // Setup
  const [client] = await db.insert(clients).values(
    createClientSchema.parse({
      firstName: 'Priority',
      lastName: 'Test',
      email: 'priority@example.com',
      phone: '555-333-4444',
    })
  ).returning();
  
  // TODO: 1. Create function to add emergency contact with auto-priority adjustment
  async function addEmergencyContact(
    clientId: number,
    contactData: { firstName: string; lastName: string; phone: string },
    desiredPriority: number
  ) {
    // Steps:
    // 1. Check if priority already exists for this client
    // 2. If yes, shift all contacts at >= desiredPriority down by 1
    // 3. Insert new contact with desiredPriority
    // 4. Use a transaction for atomicity
  }
  
  // TODO: 2. Add 3 contacts with priorities 1, 2, 3
  
  // TODO: 3. Add a new contact with priority 1
  // - This should shift the others to 2, 3, 4
  
  // TODO: 4. Verify final priorities are: 1, 2, 3, 4 (no duplicates)
  
  // TODO: 5. Query and display all contacts in priority order
  
  console.log('\n✅ Task 1.3 complete!');
  process.exit(0);
}

task3().catch(console.error);
```

**Bonus challenge:** Handle the case where someone tries to set priority 10 when only 3 contacts exist. Should you allow gaps? Or auto-adjust to priority 4?

---

## Day 1 Summary

**What you've accomplished:**
- ✅ Created clients table with Zod validation
- ✅ Created emergency contacts with foreign keys
- ✅ Built patients table with species-specific JSONB data
- ✅ Added patient photos with partial unique index for primary photo
- ✅ Set up Drizzle relations for easy querying
- ✅ Tested species-specific JSONB validation
- ✅ Implemented photo management with primary photo logic
- ✅ Wrote complex queries with aggregations and joins
- ✅ Built priority system with automatic adjustment

**Key concepts learned:**
- `generatedAlwaysAsIdentity()` for auto-increment IDs
- Foreign keys with `onDelete` cascade/restrict
- `relations()` for defining table relationships
- Discriminated unions in Zod for polymorphic data
- Partial unique indexes with `where` clauses
- JSONB columns for flexible species-specific data
- Transactions for atomic multi-step operations
- Aggregation queries with `GROUP BY` and `HAVING`

**Tomorrow:** Medical records (visits, vitals, diagnoses)

---

## Day 2: Medical Records System

### Overview

Today you'll build:
- Visits table (SOAP notes)
- Vitals recording system
- Diagnoses tracking
- Procedures table

### Checkpoint 2.1: Visits Table

**Create `src/db/schema/visits.ts`:**
```typescript
import { pgTable, integer, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { patients } from './patients';
import { clients } from './clients';

export const visitTypeEnum = pgEnum('visit_type', [
  'wellness',
  'sick',
  'emergency',
  'surgery',
  'dental',
  'follow_up',
]);

export const visitStatusEnum = pgEnum('visit_status', [
  'scheduled',
  'checked_in',
  'in_progress',
  'completed',
  'no_show',
  'cancelled',
]);

export const visits = pgTable('visits', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  patientId: integer('patient_id')
    .notNull()
    .references(() => patients.id),
  clientId: integer('client_id')
    .notNull()
    .references(() => clients.id),
  
  visitType: visitTypeEnum('visit_type').notNull(),
  status: visitStatusEnum('status').notNull().default('scheduled'),
  
  scheduledAt: timestamp('scheduled_at').notNull(),
  checkedInAt: timestamp('checked_in_at'),
  completedAt: timestamp('completed_at'),
  
  // SOAP notes
  subjective: text('subjective'), // What owner reports
  objective: text('objective'),   // What vet observes
  assessment: text('assessment'), // Diagnosis/assessment
  plan: text('plan'),            // Treatment plan
  
  chiefComplaint: text('chief_complaint'),
  internalNotes: text('internal_notes'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
});

export const insertVisitSchema = createInsertSchema(visits);
export const selectVisitSchema = createSelectSchema(visits);

export const createVisitSchema = insertVisitSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    visitType: z.enum(visitTypeEnum.enumValues),
    status: z.enum(visitStatusEnum.enumValues).default('scheduled'),
    scheduledAt: z.coerce.date(),
  });

export type Visit = typeof visits.$inferSelect;
export type NewVisit = z.infer<typeof createVisitSchema>;
```

**Add to `src/db/schema/relations.ts`:**
```typescript
import { visits } from './visits';

export const visitsRelations = relations(visits, ({ one }) => ({
  patient: one(patients, {
    fields: [visits.patientId],
    references: [patients.id],
  }),
  client: one(clients, {
    fields: [visits.clientId],
    references: [clients.id],
  }),
}));

// Add to patientsRelations:
export const patientsRelations = relations(patients, ({ one, many }) => ({
  client: one(clients, {
    fields: [patients.clientId],
    references: [clients.id],
  }),
  photos: many(patient_photos),
  visits: many(visits), // NEW
}));
```

**Run migration:**
```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

---

### 🎯 YOUR TASK 2.1: Visit Workflow

**Goal:** Implement a complete visit workflow from scheduling to completion.

**Create `src/checkpoints/day2-task1.ts`:**
```typescript
import { db } from '../db';
import { visits, createVisitSchema } from '../db/schema';
import { eq } from 'drizzle-orm';

async function task1() {
  console.log('🎯 Task 2.1: Visit Workflow\n');
  
  // TODO: 1. Create a scheduled visit
  // - Use an existing patient from Day 1
  // - Schedule for tomorrow at 2pm
  // - visitType: 'wellness'
  // - chiefComplaint: "Annual checkup"
  
  // TODO: 2. Simulate check-in
  // - Update visit status to 'checked_in'
  // - Set checkedInAt to current time
  
  // TODO: 3. Record SOAP notes
  // - subjective: "Owner reports patient eating and playing normally. No concerns."
  // - objective: "Alert and responsive. Heart rate 90 bpm. Temperature 101.5°F. Weight 33kg."
  // - assessment: "Healthy dog. No abnormalities detected."
  // - plan: "Continue current diet. DHPP vaccine administered. Return in 1 year."
  
  // TODO: 4. Complete the visit
  // - Update status to 'completed'
  // - Set completedAt to current time
  
  // TODO: 5. Query and display the completed visit
  // - Include patient name and client name
  // - Show all SOAP notes
  
  console.log('\n✅ Task 2.1 complete!');
  process.exit(0);
}

task1().catch(console.error);
```

**Bonus:** Create a helper function `updateVisitStatus(visitId, newStatus)` that automatically sets the appropriate timestamp field.

---

### Checkpoint 2.2: Vitals Recording

**Create `src/db/schema/vitals.ts`:**
```typescript
import { pgTable, integer, real, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { patients } from './patients';
import { visits } from './visits';

export const vital_records = pgTable('vital_records', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  patientId: integer('patient_id')
    .notNull()
    .references(() => patients.id),
  visitId: integer('visit_id')
    .references(() => visits.id), // Nullable - vitals can be taken outside visits
  
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
  
  // Core vitals (most species)
  weightKg: real('weight_kg'),
  temperatureCelsius: real('temperature_celsius'),
  heartRateBpm: integer('heart_rate_bpm'),
  respiratoryRate: integer('respiratory_rate'),
  
  // Species-specific vitals
  speciesVitals: jsonb('species_vitals'),
  
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Zod schemas for species-specific vitals
const canineVitalsSchema = z.object({
  capillary_refill_seconds: z.number().min(0).max(10).optional(),
  mucous_membrane_color: z.enum(['pink', 'pale', 'white', 'blue', 'yellow']).optional(),
  hydration_status: z.enum(['normal', 'mild', 'moderate', 'severe']).optional(),
});

const avianVitalsSchema = z.object({
  keel_score: z.number().min(1).max(5).optional(), // Breast muscle condition
  feather_condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  crop_status: z.enum(['empty', 'full', 'impacted']).optional(),
});

const reptileVitalsSchema = z.object({
  ambient_temperature_celsius: z.number().optional(),
  humidity_percent: z.number().min(0).max(100).optional(),
  shedding_status: z.enum(['normal', 'retained', 'incomplete']).optional(),
  last_feeding: z.coerce.date().optional(),
});

export const speciesVitalsSchema = z.union([
  canineVitalsSchema,
  avianVitalsSchema,
  reptileVitalsSchema,
  z.object({}), // Empty object for species without specific vitals
]);

export const createVitalRecordSchema = createInsertSchema(vital_records)
  .omit({ id: true, createdAt: true })
  .extend({
    recordedAt: z.coerce.date().default(() => new Date()),
    weightKg: z.number().positive().optional(),
    temperatureCelsius: z.number().min(35).max(45).optional(), // Reasonable range for most species
    heartRateBpm: z.number().positive().max(500).optional(), // Up to 500 for small birds
    respiratoryRate: z.number().positive().max(200).optional(),
    speciesVitals: speciesVitalsSchema.optional(),
  });

export type VitalRecord = typeof vital_records.$inferSelect;
export type NewVitalRecord = z.infer<typeof createVitalRecordSchema>;
```

---

### 🎯 YOUR TASK 2.2: Vitals Recording and Weight Tracking

**Goal:** Record vitals during a visit and update patient weight.

**Create `src/checkpoints/day2-task2.ts`:**
```typescript
import { db } from '../db';
import { vital_records, patients, createVitalRecordSchema } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

async function task2() {
  console.log('🎯 Task 2.2: Vitals and Weight Tracking\n');
  
  // TODO: 1. Record vitals for a canine patient during a visit
  // Include:
  // - weightKg, temperatureCelsius, heartRateBpm, respiratoryRate
  // - speciesVitals with canine-specific data (capillary_refill_seconds, mucous_membrane_color)
  
  // TODO: 2. Update patient's current weight
  // After recording vitals with new weight:
  // - Update patients.weightKg
  // - Update patients.weightUpdatedAt
  
  // TODO: 3. Query weight history for this patient
  // - Get last 5 weight measurements from vital_records
  // - Calculate weight change from first to last measurement
  // - Display as a trend: "Weight change: +2.5kg over 6 months"
  
  // TODO: 4. Find patients with concerning weight loss
  // - Compare current weight to weight 3 months ago
  // - Flag any patient who lost > 10% body weight
  // - This requires comparing vitals across time
  
  console.log('\n✅ Task 2.2 complete!');
  process.exit(0);
}

task2().catch(console.error);
```

**Challenge:** Write a function that calculates "weight trend" for a patient over time. Should return: gaining, stable, losing, or unknown.

---

### Checkpoint 2.3: Diagnoses

**Create `src/db/schema/diagnoses.ts`:**
```typescript
import { pgTable, integer, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { patients } from './patients';
import { visits } from './visits';

export const diagnosisStatusEnum = pgEnum('diagnosis_status', [
  'suspected',
  'confirmed',
  'ruled_out',
  'resolved',
  'chronic_managed',
]);

export const diagnoses = pgTable('diagnoses', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  patientId: integer('patient_id')
    .notNull()
    .references(() => patients.id),
  visitId: integer('visit_id')
    .references(() => visits.id),
  
  code: text('code'), // SNOMED-CT or internal code
  description: text('description').notNull(),
  
  status: diagnosisStatusEnum('status').notNull().default('suspected'),
  
  diagnosedAt: timestamp('diagnosed_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
  
  isChronicCondition: boolean('is_chronic_condition').default(false).notNull(),
  
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const createDiagnosisSchema = createInsertSchema(diagnoses)
  .omit({ id: true, createdAt: true })
  .extend({
    status: z.enum(diagnosisStatusEnum.enumValues).default('suspected'),
    diagnosedAt: z.coerce.date().default(() => new Date()),
    resolvedAt: z.coerce.date().optional(),
  })
  .refine(
    (data) => !data.resolvedAt || data.resolvedAt > data.diagnosedAt,
    { message: 'Resolved date must be after diagnosed date', path: ['resolvedAt'] }
  );

export type Diagnosis = typeof diagnoses.$inferSelect;
export type NewDiagnosis = z.infer<typeof createDiagnosisSchema>;
```

---

### 🎯 YOUR TASK 2.3: Diagnosis Management

**Goal:** Track diagnoses through their lifecycle from suspected to resolved/managed.

**Create `src/checkpoints/day2-task3.ts`:**
```typescript
import { db } from '../db';
import { diagnoses, createDiagnosisSchema } from '../db/schema';
import { eq, and } from 'drizzle-orm';

async function task3() {
  console.log('🎯 Task 2.3: Diagnosis Management\n');
  
  // TODO: 1. Create a suspected diagnosis during a visit
  // - Patient has been limping
  // - Suspected: "Soft tissue injury" or "Fracture"
  // - Status: 'suspected'
  
  // TODO: 2. After x-rays, confirm diagnosis
  // - Update status to 'confirmed'
  // - Update description if needed
  
  // TODO: 3. Create a chronic condition diagnosis
  // - Example: "Chronic kidney disease" or "Diabetes mellitus"
  // - Set isChronicCondition: true
  // - Status: 'chronic_managed'
  
  // TODO: 4. Query all active diagnoses for a patient
  // - Active = status NOT IN ('ruled_out', 'resolved')
  // - Include visit information
  // - Sort by diagnosedAt DESC
  
  // TODO: 5. Generate a "patient history" report
  // - Show all diagnoses (even resolved ones)
  // - Group by: chronic conditions, resolved conditions, active conditions
  // - Include resolution dates for resolved conditions
  
  console.log('\n✅ Task 2.3 complete!');
  process.exit(0);
}

task3().catch(console.error);
```

---

## Day 2 Summary

**What you've built:**
- ✅ Complete visit workflow with SOAP notes
- ✅ Vitals recording system with species-specific data
- ✅ Weight tracking over time
- ✅ Diagnosis management with status lifecycle

**Key Drizzle patterns learned:**
- Multiple enum types in one schema
- Nullable foreign keys (vitals without visits)
- Time-based queries (comparing dates)
- Complex WHERE conditions with AND/OR

**Tomorrow:** Medications, prescriptions, and controlled substances

---

## Day 3: Medications and Prescriptions

### Overview

Today's focus:
- Drug formulary (master medication list)
- Prescriptions with dose calculations
- Controlled substance tracking
- Drug interactions

### Checkpoint 3.1: Medications Formulary

**Create `src/db/schema/medications.ts`:**
```typescript
import { pgTable, integer, text, real, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const drugScheduleEnum = pgEnum('drug_schedule', [
  'otc',          // Over the counter
  'rx',           // Prescription
  'schedule_2',   // High abuse potential
  'schedule_3',
  'schedule_4',
  'schedule_5',
]);

export const medications = pgTable('medications', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  
  name: text('name').notNull(),
  genericName: text('generic_name'),
  brandNames: text('brand_names').array(),
  
  drugClass: text('drug_class'), // "NSAID", "antibiotic", "antihistamine"
  schedule: drugScheduleEnum('schedule').notNull().default('rx'),
  
  concentration: real('concentration'),
  concentrationUnit: text('concentration_unit'), // "mg/ml", "mg/tablet"
  
  forms: text('forms').array(), // ["tablet", "chewable", "injectable"]
  
  // Species safety
  approvedSpecies: text('approved_species').array(), // null = all species
  contraindicatedSpecies: text('contraindicated_species').array(),
  
  warnings: text('warnings'),
  isActive: boolean('is_active').default(true).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const createMedicationSchema = createInsertSchema(medications)
  .omit({ id: true, createdAt: true })
  .extend({
    schedule: z.enum(drugScheduleEnum.enumValues).default('rx'),
    concentration: z.number().positive().optional(),
    forms: z.array(z.string()).optional(),
    approvedSpecies: z.array(z.string()).optional(),
    contraindicatedSpecies: z.array(z.string()).optional(),
  });

export type Medication = typeof medications.$inferSelect;
export type NewMedication = z.infer<typeof createMedicationSchema>;
```

**Seed some medications - Create `src/seed/medications.ts`:**
```typescript
import { db } from '../db';
import { medications, createMedicationSchema } from '../db/schema';

export async function seedMedications() {
  const meds = [
    {
      name: 'Carprofen',
      genericName: 'carprofen',
      brandNames: ['Rimadyl', 'Novox'],
      drugClass: 'NSAID',
      schedule: 'rx' as const,
      concentration: 75,
      concentrationUnit: 'mg/tablet',
      forms: ['tablet', 'chewable'],
      approvedSpecies: ['canine'],
      contraindicatedSpecies: ['feline'],
      warnings: 'May cause GI upset. Monitor liver enzymes with long-term use.',
    },
    {
      name: 'Amoxicillin',
      genericName: 'amoxicillin',
      drugClass: 'antibiotic',
      schedule: 'rx' as const,
      concentration: 250,
      concentrationUnit: 'mg/capsule',
      forms: ['capsule', 'liquid'],
      warnings: 'Complete full course even if symptoms improve.',
    },
    {
      name: 'Buprenorphine',
      genericName: 'buprenorphine',
      brandNames: ['Simbadol'],
      drugClass: 'opioid',
      schedule: 'schedule_3' as const,
      concentration: 1.8,
      concentrationUnit: 'mg/ml',
      forms: ['injectable'],
      warnings: 'DEA controlled substance. Requires detailed logging.',
    },
  ];
  
  await db.insert(medications).values(meds);
  console.log(`✅ Seeded ${meds.length} medications`);
}
```

---

### Checkpoint 3.2: Prescriptions

**Create `src/db/schema/prescriptions.ts`:**
```typescript
import { pgTable, integer, text, real, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { patients } from './patients';
import { visits } from './visits';
import { medications } from './medications';

export const prescriptionStatusEnum = pgEnum('prescription_status', [
  'pending',
  'dispensed',
  'completed',
  'cancelled',
  'expired',
]);

export const prescriptions = pgTable('prescriptions', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  patientId: integer('patient_id')
    .notNull()
    .references(() => patients.id),
  visitId: integer('visit_id')
    .references(() => visits.id),
  medicationId: integer('medication_id')
    .notNull()
    .references(() => medications.id),
  
  // Prescription details
  dose: real('dose').notNull(),
  doseUnit: text('dose_unit').notNull(), // "mg", "ml"
  frequency: text('frequency').notNull(), // "q12h" (every 12 hours), "BID" (twice daily)
  route: text('route').notNull(), // "PO" (by mouth), "SQ", "IM", "IV", "topical"
  duration: text('duration'), // "14 days", "until gone"
  
  quantity: real('quantity').notNull(),
  quantityUnit: text('quantity_unit').notNull(), // "tablets", "ml"
  
  refillsAuthorized: integer('refills_authorized').default(0).notNull(),
  refillsRemaining: integer('refills_remaining').default(0).notNull(),
  
  status: prescriptionStatusEnum('status').notNull().default('pending'),
  
  instructions: text('instructions'), // "Give 1 tablet by mouth twice daily with food"
  
  // Controlled substances
  isControlled: boolean('is_controlled').default(false).notNull(),
  deaNumber: text('dea_number'), // Prescriber's DEA number
  
  prescribedAt: timestamp('prescribed_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const createPrescriptionSchema = createInsertSchema(prescriptions)
  .omit({ id: true, createdAt: true, refillsRemaining: true })
  .extend({
    dose: z.number().positive(),
    quantity: z.number().positive(),
    frequency: z.string().min(1),
    route: z.enum(['PO', 'SQ', 'IM', 'IV', 'topical', 'ophthalmic', 'otic']),
    prescribedAt: z.coerce.date().default(() => new Date()),
    expiresAt: z.coerce.date().optional(),
  })
  .refine(
    (data) => !data.isControlled || data.deaNumber,
    { message: 'DEA number required for controlled substances', path: ['deaNumber'] }
  )
  .refine(
    (data) => !data.isControlled || data.refillsAuthorized <= 5,
    { message: 'Controlled substances limited to 5 refills', path: ['refillsAuthorized'] }
  );

export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = z.infer<typeof createPrescriptionSchema>;
```

---

### 🎯 YOUR TASK 3.1: Prescription Creation with Validation

**Goal:** Create prescriptions with proper species safety checking.

**Create `src/checkpoints/day3-task1.ts`:**
```typescript
import { db } from '../db';
import { prescriptions, medications, patients, createPrescriptionSchema } from '../db/schema';
import { eq } from 'drizzle-orm';

async function task1() {
  console.log('🎯 Task 3.1: Prescription with Safety Checks\n');
  
  // TODO: 1. Write a function to validate prescription safety
  async function validatePrescriptionSafety(
    patientId: number,
    medicationId: number
  ): Promise<{ safe: boolean; warnings: string[] }> {
    // Steps:
    // 1. Get patient species
    // 2. Get medication contraindications
    // 3. Check if patient's species is in contraindicatedSpecies
    // 4. Return { safe: false, warnings: [...] } if contraindicated
    // 5. Check if species is in approvedSpecies (if list exists)
    // 6. Add warning if not explicitly approved
  }
  
  // TODO: 2. Try to prescribe Carprofen to a CAT
  // - This should fail safety check (contraindicated for felines)
  // - Don't create the prescription, just log the warning
  
  // TODO: 3. Prescribe Amoxicillin to a dog
  // - Run safety check (should pass)
  // - Create the prescription
  // - Dose: 10mg/kg twice daily for 14 days
  // - Calculate quantity needed (dog weighs 30kg)
  
  // TODO: 4. Create a controlled substance prescription
  // - Buprenorphine for post-surgery pain
  // - Include DEA number
  // - Test validation (should require DEA number)
  
  console.log('\n✅ Task 3.1 complete!');
  process.exit(0);
}

task1().catch(console.error);
```

**Dose calculation help:**
- Dog weighs 30kg
- Dose is 10mg/kg
- Total daily dose: 30kg × 10mg/kg = 300mg
- Frequency: twice daily = 150mg per dose
- Amoxicillin comes in 250mg capsules
- Need 1 capsule per dose (can't split capsules)
- Duration: 14 days, 2 doses/day = 28 capsules

---

### Checkpoint 3.3: Prescription Fills (Audit Trail)

**Create `src/db/schema/prescription_fills.ts`:**
```typescript
import { pgTable, integer, real, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { prescriptions } from './prescriptions';

export const prescription_fills = pgTable('prescription_fills', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  prescriptionId: integer('prescription_id')
    .notNull()
    .references(() => prescriptions.id),
  
  quantityDispensed: real('quantity_dispensed').notNull(),
  
  // Lot tracking for recalls
  lotNumber: text('lot_number'),
  expirationDate: timestamp('expiration_date'),
  
  // DEA logging for controlled substances
  controlledSubstanceLog: jsonb('controlled_substance_log'),
  
  dispensedAt: timestamp('dispensed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const createPrescriptionFillSchema = createInsertSchema(prescription_fills)
  .omit({ id: true, createdAt: true })
  .extend({
    quantityDispensed: z.number().positive(),
    dispensedAt: z.coerce.date().default(() => new Date()),
    expirationDate: z.coerce.date().optional(),
  });

export type PrescriptionFill = typeof prescription_fills.$inferSelect;
export type NewPrescriptionFill = z.infer<typeof createPrescriptionFillSchema>;
```

---

### 🎯 YOUR TASK 3.2: Complete Prescription Workflow

**Goal:** Implement the full workflow from prescription to dispensing.

**Create `src/checkpoints/day3-task2.ts`:**
```typescript
import { db } from '../db';
import { prescriptions, prescription_fills } from '../db/schema';
import { eq } from 'drizzle-orm';

async function task2() {
  console.log('🎯 Task 3.2: Prescription Workflow\n');
  
  // TODO: 1. Create a prescription (from previous task or new)
  
  // TODO: 2. Write a function to dispense prescription
  async function dispensePrescription(
    prescriptionId: number,
    quantity: number,
    lotNumber: string
  ) {
    // Steps:
    // 1. Get prescription details
    // 2. Check if quantity <= remaining authorized quantity
    // 3. Create prescription_fill record
    // 4. Update prescription status to 'dispensed'
    // 5. Decrement refillsRemaining if this is a refill
    // 6. Use a transaction for atomicity
  }
  
  // TODO: 3. Dispense the prescription
  // - Full quantity
  // - Lot number: "LOT12345"
  // - Expiration: 2 years from now
  
  // TODO: 4. Try to dispense a refill
  // - Check if refills are authorized
  // - If yes, dispense
  // - Verify refillsRemaining decremented
  
  // TODO: 5. Try to dispense when refills exhausted
  // - Should fail with clear error message
  
  // TODO: 6. Query prescription history
  // - Show prescription with all fills
  // - Calculate total quantity dispensed
  // - Show remaining authorized refills
  
  console.log('\n✅ Task 3.2 complete!');
  process.exit(0);
}

task2().catch(console.error);
```

---

## Day 3 Summary

**What you've built:**
- ✅ Drug formulary with species safety data
- ✅ Prescription system with dose validation
- ✅ Controlled substance tracking
- ✅ Dispensing workflow with audit trail
- ✅ Refill management

**Key patterns learned:**
- Array columns for lists (brand names, forms)
- Complex Zod refinements (conditional validation)
- Transaction patterns for multi-step operations
- Audit trail design (immutable fill records)

**Tomorrow:** Vaccinations and scheduling system

---

## Day 4: Vaccinations and Scheduling

### Overview

Today's systems:
- Vaccine definitions
- Vaccination records with due date calculation
- Appointment scheduling
- Staff and resource management

### Checkpoint 4.1: Vaccines

**Create `src/db/schema/vaccines.ts`:**
```typescript
import { pgTable, integer, text, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const vaccineTypeEnum = pgEnum('vaccine_type', [
  'core',           // Required for all animals of species
  'non_core',       // Lifestyle-dependent
  'not_recommended', // Proven ineffective/risky
]);

export const vaccines = pgTable('vaccines', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  
  name: text('name').notNull(),
  abbreviation: text('abbreviation'), // "DHPP", "FVRCP"
  manufacturer: text('manufacturer'),
  
  species: text('species').notNull(),
  vaccineType: vaccineTypeEnum('vaccine_type').notNull(),
  
  diseasesProtected: text('diseases_protected').array(),
  
  // Initial series schedule
  initialSeriesDoses: integer('initial_series_doses').default(1).notNull(),
  initialSeriesIntervalDays: integer('initial_series_interval_days'),
  minimumAgeWeeks: integer('minimum_age_weeks'),
  
  // Booster schedule
  boosterIntervalMonths: integer('booster_interval_months'),
  
  // Legal requirements
  isLegallyRequired: boolean('is_legally_required').default(false).notNull(),
  legalValidityMonths: integer('legal_validity_months'),
  
  route: text('route').default('SQ').notNull(), // SQ, IM, intranasal
  contraindications: text('contraindications'),
  
  isActive: boolean('is_active').default(true).notNull(),
});

export const createVaccineSchema = createInsertSchema(vaccines)
  .extend({
    vaccineType: z.enum(vaccineTypeEnum.enumValues),
    initialSeriesDoses: z.number().min(1).max(5),
    boosterIntervalMonths: z.number().positive().optional(),
  });

export type Vaccine = typeof vaccines.$inferSelect;
export type NewVaccine = z.infer<typeof createVaccineSchema>;
```

**Seed vaccines - Create `src/seed/vaccines.ts`:**
```typescript
import { db } from '../db';
import { vaccines } from '../db/schema';

export async function seedVaccines() {
  const vaccineData = [
    {
      name: 'Canine Distemper-Parvo',
      abbreviation: 'DHPP',
      species: 'canine',
      vaccineType: 'core' as const,
      diseasesProtected: ['distemper', 'hepatitis', 'parvovirus', 'parainfluenza'],
      initialSeriesDoses: 3,
      initialSeriesIntervalDays: 21, // Every 3 weeks
      minimumAgeWeeks: 6,
      boosterIntervalMonths: 36, // Every 3 years
      route: 'SQ',
    },
    {
      name: 'Rabies',
      abbreviation: 'RAB',
      species: 'canine',
      vaccineType: 'core' as const,
      diseasesProtected: ['rabies'],
      initialSeriesDoses: 1,
      minimumAgeWeeks: 12,
      boosterIntervalMonths: 36,
      isLegallyRequired: true,
      legalValidityMonths: 36,
      route: 'SQ',
    },
    {
      name: 'Feline Viral Rhinotracheitis-Calicivirus-Panleukopenia',
      abbreviation: 'FVRCP',
      species: 'feline',
      vaccineType: 'core' as const,
      diseasesProtected: ['rhinotracheitis', 'calicivirus', 'panleukopenia'],
      initialSeriesDoses: 3,
      initialSeriesIntervalDays: 21,
      minimumAgeWeeks: 6,
      boosterIntervalMonths: 36,
      route: 'SQ',
    },
  ];
  
  await db.insert(vaccines).values(vaccineData);
  console.log(`✅ Seeded ${vaccineData.length} vaccines`);
}
```

---

### Checkpoint 4.2: Vaccination Records

**Create `src/db/schema/vaccinations.ts`:**
```typescript
import { pgTable, integer, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { patients } from './patients';
import { visits } from './visits';
import { vaccines } from './vaccines';

export const vaccinations = pgTable('vaccinations', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  patientId: integer('patient_id')
    .notNull()
    .references(() => patients.id),
  vaccineId: integer('vaccine_id')
    .notNull()
    .references(() => vaccines.id),
  visitId: integer('visit_id')
    .references(() => visits.id),
  
  administeredAt: timestamp('administered_at').defaultNow().notNull(),
  
  // Product details for THIS administration
  lotNumber: text('lot_number'),
  expirationDate: timestamp('expiration_date'),
  serialNumber: text('serial_number'), // For rabies certificates
  
  // Injection site (important for feline sarcoma tracking)
  injectionSite: text('injection_site'),
  
  // When is this valid until?
  validUntil: timestamp('valid_until').notNull(),
  
  // Rabies certificate info
  rabiesTagNumber: text('rabies_tag_number'),
  certificateNumber: text('certificate_number'),
  
  // Reaction tracking
  reactionOccurred: boolean('reaction_occurred').default(false).notNull(),
  reactionDetails: text('reaction_details'),
  reactionSeverity: text('reaction_severity'), // 'mild', 'moderate', 'severe'
  
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const createVaccinationSchema = createInsertSchema(vaccinations)
  .omit({ id: true, createdAt: true })
  .extend({
    administeredAt: z.coerce.date().default(() => new Date()),
    validUntil: z.coerce.date(),
    expirationDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => data.validUntil > data.administeredAt,
    { message: 'Valid until must be after administration date', path: ['validUntil'] }
  );

export type Vaccination = typeof vaccinations.$inferSelect;
export type NewVaccination = z.infer<typeof createVaccinationSchema>;
```

---

### 🎯 YOUR TASK 4.1: Vaccination Due Date System

**Goal:** Calculate when vaccinations are due and send reminders.

**Create `src/checkpoints/day4-task1.ts`:**
```typescript
import { db } from '../db';
import { vaccinations, vaccines, patients, createVaccinationSchema } from '../db/schema';
import { eq, lt, and, sql } from 'drizzle-orm';

async function task1() {
  console.log('🎯 Task 4.1: Vaccination Due Dates\n');
  
  // TODO: 1. Write function to calculate validUntil date
  function calculateValidUntil(
    administeredAt: Date,
    boosterIntervalMonths: number
  ): Date {
    // Add boosterIntervalMonths to administeredAt
    // Return the resulting date
  }
  
  // TODO: 2. Administer initial DHPP vaccine to a puppy
  // - Use vaccine from seed data
  // - Calculate validUntil (3 years from now)
  // - Record vaccination
  
  // TODO: 3. Write function to find vaccinations due in next N days
  async function findVaccinationsDue(daysAhead: number) {
    // Query vaccinations where:
    // - validUntil is between NOW and NOW + daysAhead
    // - Include patient, client, and vaccine information
    // - Return list of due vaccinations with owner contact info
  }
  
  // TODO: 4. Create vaccination reminder report
  // - Find all vaccinations due in next 30 days
  // - Group by client (one reminder per client for all their pets)
  // - Format as: "Dear [Client], [Pet1] and [Pet2] are due for [vaccines]"
  
  // TODO: 5. Find overdue vaccinations
  // - validUntil < NOW
  // - Patient is not deceased
  // - Group by urgency (how many days overdue)
  
  console.log('\n✅ Task 4.1 complete!');
  process.exit(0);
}

task1().catch(console.error);
```

**Bonus:** Handle initial vaccine series logic. If a puppy needs 3 DHPP doses, track which dose number this is and schedule the next one.

---

### Checkpoint 4.3: Scheduling System

**Create `src/db/schema/staff.ts`:**
```typescript
import { pgTable, integer, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const staffRoleEnum = pgEnum('staff_role', [
  'veterinarian',
  'technician',
  'assistant',
  'receptionist',
]);

export const staff = pgTable('staff', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  
  role: staffRoleEnum('role').notNull(),
  
  // For veterinarians
  licenseNumber: text('license_number'),
  licenseState: text('license_state'),
  deaNumber: text('dea_number'),
  
  // Capabilities
  specialties: text('specialties').array(),
  
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const createStaffSchema = createInsertSchema(staff)
  .omit({ id: true, createdAt: true })
  .extend({
    role: z.enum(staffRoleEnum.enumValues),
    email: z.string().email(),
  });

export type Staff = typeof staff.$inferSelect;
export type NewStaff = z.infer<typeof createStaffSchema>;
```

**Create `src/db/schema/appointments.ts`:**
```typescript
import { pgTable, integer, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { patients } from './patients';
import { clients } from './clients';
import { staff } from './staff';

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'scheduled',
  'confirmed',
  'checked_in',
  'completed',
  'no_show',
  'cancelled',
]);

export const appointments = pgTable('appointments', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  
  patientId: integer('patient_id')
    .notNull()
    .references(() => patients.id),
  clientId: integer('client_id')
    .notNull()
    .references(() => clients.id),
  staffId: integer('staff_id')
    .references(() => staff.id),
  
  scheduledStart: timestamp('scheduled_start').notNull(),
  scheduledEnd: timestamp('scheduled_end').notNull(),
  
  status: appointmentStatusEnum('status').notNull().default('scheduled'),
  
  appointmentType: text('appointment_type').notNull(), // 'wellness', 'sick', 'surgery'
  reason: text('reason'),
  notes: text('notes'),
  
  confirmedAt: timestamp('confirmed_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const createAppointmentSchema = createInsertSchema(appointments)
  .omit({ id: true, createdAt: true })
  .extend({
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
    status: z.enum(appointmentStatusEnum.enumValues).default('scheduled'),
  })
  .refine(
    (data) => data.scheduledEnd > data.scheduledStart,
    { message: 'End time must be after start time', path: ['scheduledEnd'] }
  );

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = z.infer<typeof createAppointmentSchema>;
```

---

### 🎯 YOUR TASK 4.2: Appointment Booking with Conflict Detection

**Goal:** Implement smart appointment scheduling.

**Create `src/checkpoints/day4-task2.ts`:**
```typescript
import { db } from '../db';
import { appointments, staff, createAppointmentSchema } from '../db/schema';
import { eq, and, or, gte, lte, lt, gt } from 'drizzle-orm';

async function task2() {
  console.log('🎯 Task 4.2: Smart Scheduling\n');
  
  // TODO: 1. Write function to check if staff is available
  async function isStaffAvailable(
    staffId: number,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    // Query appointments for this staff member
    // Check for overlaps with requested time
    // Overlap logic:
    //   Conflict if any of these are true:
    //   - Existing appointment starts during requested time
    //   - Existing appointment ends during requested time
    //   - Existing appointment completely contains requested time
  }
  
  // TODO: 2. Book an appointment (should succeed)
  // - Tomorrow at 2pm, 30 minute duration
  // - Assign to a veterinarian from staff table
  
  // TODO: 3. Try to book overlapping appointment (should detect conflict)
  // - Tomorrow at 2:15pm, 30 minute duration
  // - Same staff member
  // - Call isStaffAvailable first
  // - Don't create appointment if conflict detected
  
  // TODO: 4. Write function to find available time slots
  async function findAvailableSlots(
    staffId: number,
    date: Date,
    durationMinutes: number
  ): Promise<Date[]> {
    // For a given date (9am-5pm), find all available slots
    // That don't conflict with existing appointments
    // Return array of start times
  }
  
  // TODO: 5. Test finding available slots
  // - For a specific staff member and date
  // - 30-minute appointment slots
  // - Should skip times where appointments exist
  
  console.log('\n✅ Task 4.2 complete!');
  process.exit(0);
}

task2().catch(console.error);
```

---

## Day 4 Summary

**What you've built:**
- ✅ Vaccine management with due date calculation
- ✅ Vaccination records with reaction tracking
- ✅ Staff management system
- ✅ Appointment scheduling with conflict detection
- ✅ Available time slot finder

**Key patterns:**
- Date math in PostgreSQL vs JavaScript
- Complex overlap detection logic
- Array columns for lists of data
- Enum types for fixed value sets

**Tomorrow:** Billing, invoicing, and payments

---

## Day 5: Billing and Business Logic

### Overview

Final day covers:
- Service catalog
- Invoice generation
- Payment processing
- Business reports

### Checkpoint 5.1: Services and Billing

**Create `src/db/schema/services.ts`:**
```typescript
import { pgTable, integer, text, real, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const services = pgTable('services', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // 'exam', 'surgery', 'lab', 'pharmacy'
  
  defaultPrice: real('default_price').notNull(),
  
  isTaxable: boolean('is_taxable').default(false).notNull(),
  
  // Species-specific pricing
  speciesPricing: jsonb('species_pricing'), // { canine: 75, feline: 70 }
  
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const createServiceSchema = createInsertSchema(services)
  .omit({ id: true, createdAt: true })
  .extend({
    defaultPrice: z.number().positive(),
    code: z.string().min(1),
  });

export type Service = typeof services.$inferSelect;
export type NewService = z.infer<typeof createServiceSchema>;
```

**Create `src/db/schema/invoices.ts`:**
```typescript
import { pgTable, integer, text, real, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { clients } from './clients';
import { visits } from './visits';

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'pending',
  'paid',
  'partial',
  'void',
]);

export const invoices = pgTable('invoices', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  
  invoiceNumber: text('invoice_number').notNull().unique(),
  clientId: integer('client_id')
    .notNull()
    .references(() => clients.id),
  visitId: integer('visit_id')
    .references(() => visits.id),
  
  status: invoiceStatusEnum('status').notNull().default('draft'),
  
  // Denormalized totals
  subtotal: real('subtotal').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  total: real('total').notNull().default(0),
  amountPaid: real('amount_paid').notNull().default(0),
  amountDue: real('amount_due').notNull().default(0),
  
  dueDate: timestamp('due_date'),
  
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  finalizedAt: timestamp('finalized_at'),
  paidAt: timestamp('paid_at'),
});

export const createInvoiceSchema = createInsertSchema(invoices)
  .omit({ id: true, createdAt: true });

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = z.infer<typeof createInvoiceSchema>;
```

**Create `src/db/schema/invoice_line_items.ts`:**
```typescript
import { pgTable, integer, text, real, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { invoices } from './invoices';
import { services } from './services';

export const invoice_line_items = pgTable('invoice_line_items', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  invoiceId: integer('invoice_id')
    .notNull()
    .references(() => invoices.id),
  
  serviceId: integer('service_id')
    .references(() => services.id),
  
  // Denormalized for historical accuracy
  description: text('description').notNull(),
  quantity: real('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull(),
  
  discountAmount: real('discount_amount').default(0),
  
  isTaxable: boolean('is_taxable').default(false).notNull(),
  
  lineTotal: real('line_total').notNull(),
  
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const createLineItemSchema = createInsertSchema(invoice_line_items)
  .omit({ id: true, createdAt: true })
  .extend({
    quantity: z.number().positive(),
    unitPrice: z.number(),
    lineTotal: z.number(),
  });

export type InvoiceLineItem = typeof invoice_line_items.$inferSelect;
export type NewInvoiceLineItem = z.infer<typeof createLineItemSchema>;
```

---

### 🎯 YOUR TASK 5.1: Invoice Generation from Visit

**Goal:** Automatically generate invoice from completed visit.

**Create `src/checkpoints/day5-task1.ts`:**
```typescript
import { db } from '../db';
import { invoices, invoice_line_items, services, visits } from '../db/schema';
import { eq } from 'drizzle-orm';

async function task1() {
  console.log('🎯 Task 5.1: Invoice Generation\n');
  
  // TODO: 1. Create helper function to generate invoice number
  function generateInvoiceNumber(): string {
    // Format: INV-YYYY-NNNNNN
    // Example: INV-2024-000123
    // Use current year and sequential number
  }
  
  // TODO: 2. Create service catalog entries
  // - Wellness exam: $75
  // - Vaccination: $35
  // - Blood work: $120
  
  // TODO: 3. Write function to generate invoice from visit
  async function generateInvoiceFromVisit(visitId: number) {
    // Steps:
    // 1. Get visit with patient/client data
    // 2. Create invoice (status: 'draft')
    // 3. Add line items:
    //    - Base exam fee (from service catalog)
    //    - Query prescriptions for this visit, add pharmacy charges
    //    - Query vaccinations for this visit, add vaccination charges
    // 4. Calculate totals (subtotal, tax, total)
    // 5. Update invoice with totals
    // 6. Return invoice
  }
  
  // TODO: 4. Test with a completed visit
  // - Visit should have:
  //   - Wellness exam
  //   - 2 vaccinations
  //   - 1 prescription
  // - Generate invoice
  // - Verify all line items present
  // - Verify totals calculated correctly
  
  // TODO: 5. Finalize the invoice
  // - Change status from 'draft' to 'pending'
  // - Set finalizedAt timestamp
  // - Draft invoices can be edited, finalized cannot
  
  console.log('\n✅ Task 5.1 complete!');
  process.exit(0);
}

task1().catch(console.error);
```

**Tax calculation:**
```typescript
const TAX_RATE = 0.08; // 8% sales tax

function calculateLineTax(lineItem: { lineTotal: number; isTaxable: boolean }): number {
  return lineItem.isTaxable ? lineItem.lineTotal * TAX_RATE : 0;
}
```

---

### Checkpoint 5.2: Payments

**Create `src/db/schema/payments.ts`:**
```typescript
import { pgTable, integer, text, real, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { invoices } from './invoices';

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'credit',
  'debit',
  'check',
  'care_credit',
  'other',
]);

export const payments = pgTable('payments', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  invoiceId: integer('invoice_id')
    .notNull()
    .references(() => invoices.id),
  
  amount: real('amount').notNull(),
  method: paymentMethodEnum('method').notNull(),
  
  // Card payments
  lastFour: text('last_four'),
  authorizationCode: text('authorization_code'),
  
  // Checks
  checkNumber: text('check_number'),
  
  // Refunds
  isRefund: boolean('is_refund').default(false).notNull(),
  refundReason: text('refund_reason'),
  
  processedAt: timestamp('processed_at').defaultNow().notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const createPaymentSchema = createInsertSchema(payments)
  .omit({ id: true, createdAt: true })
  .extend({
    amount: z.number(),
    method: z.enum(paymentMethodEnum.enumValues),
    processedAt: z.coerce.date().default(() => new Date()),
  });

export type Payment = typeof payments.$inferSelect;
export type NewPayment = z.infer<typeof createPaymentSchema>;
```

---

### 🎯 YOUR TASK 5.2: Payment Processing

**Goal:** Handle payments and update invoice status.

**Create `src/checkpoints/day5-task2.ts`:**
```typescript
import { db } from '../db';
import { payments, invoices, createPaymentSchema } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

async function task2() {
  console.log('🎯 Task 5.2: Payment Processing\n');
  
  // TODO: 1. Write function to process payment
  async function processPayment(
    invoiceId: number,
    amount: number,
    method: 'cash' | 'credit' | 'check',
    details?: { lastFour?: string; checkNumber?: string }
  ) {
    // Steps:
    // 1. Get invoice
    // 2. Create payment record
    // 3. Update invoice:
    //    - amountPaid += amount
    //    - amountDue = total - amountPaid
    //    - status = 'paid' if amountDue <= 0, 'partial' if > 0
    //    - paidAt = now() if status = 'paid'
    // 4. Use transaction
  }
  
  // TODO: 2. Test full payment
  // - Create/use invoice with total $250
  // - Process payment of $250
  // - Verify status changes to 'paid'
  // - Verify paidAt timestamp set
  
  // TODO: 3. Test partial payment
  // - Create invoice with total $500
  // - Process payment of $200
  // - Verify status = 'partial'
  // - Verify amountDue = $300
  
  // TODO: 4. Complete partial payment
  // - Process second payment of $300
  // - Verify status changes to 'paid'
  
  // TODO: 5. Test refund
  // - Process refund of $50
  // - Create payment with isRefund: true, amount: -50
  // - Update invoice accordingly
  
  console.log('\n✅ Task 5.2 complete!');
  process.exit(0);
}

task2().catch(console.error);
```

---

### 🎯 YOUR TASK 5.3: Business Reports

**Goal:** Generate useful reports from your data.

**Create `src/checkpoints/day5-task3.ts`:**
```typescript
import { db } from '../db';
import { 
  invoices, 
  invoice_line_items, 
  services, 
  patients, 
  visits,
  prescriptions 
} from '../db/schema';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';

async function task3() {
  console.log('🎯 Task 5.3: Business Reports\n');
  
  // TODO: 1. Revenue by service category (last 30 days)
  // - Group by service category
  // - Sum line item totals
  // - Show: category, total revenue, % of total
  
  // TODO: 2. Top 10 clients by revenue (all time)
  // - Join clients → invoices → payments
  // - Sum amount paid per client
  // - Sort by total DESC, limit 10
  
  // TODO: 3. Most common diagnoses (last 90 days)
  // - Group by diagnosis description
  // - Count occurrences
  // - Show top 10
  
  // TODO: 4. Medication dispensing report (last month)
  // - Join prescriptions → medications → prescription_fills
  // - Group by medication
  // - Sum quantity dispensed
  // - Flag controlled substances
  
  // TODO: 5. Monthly recurring revenue
  // - Count active wellness plan enrollments (if you implemented them)
  // - OR: Average monthly revenue trend (last 6 months)
  
  console.log('\n✅ Task 5.3 complete!');
  process.exit(0);
}

task3().catch(console.error);
```

**Report format example:**
```
📊 Revenue by Category (Last 30 Days)

Category          Revenue    % of Total
---------------------------------------
Exams            $8,750.00       35.2%
Pharmacy         $5,200.00       20.9%
Surgery          $4,800.00       19.3%
Lab Work         $3,100.00       12.5%
Vaccinations     $3,025.00       12.1%
---------------------------------------
Total           $24,875.00      100.0%
```

---

## Day 5 Summary

**What you've built:**
- ✅ Service catalog with pricing
- ✅ Invoice generation from visits
- ✅ Payment processing with refunds
- ✅ Business intelligence reports

**Complete system includes:**
- 15+ tables
- Type-safe CRUD operations
- Complex business logic
- Validation at multiple layers
- Audit trails
- Reporting capabilities

---

## Final Project: Integration

**Create `src/complete-workflow.ts` - a script that demonstrates the entire system:**

```typescript
import { db } from './db';
import * as schema from './db/schema';

async function completeWorkflow() {
  console.log('🏥 Complete Veterinary Practice Workflow\n');
  
  // 1. New client registration
  console.log('1. Registering new client...');
  const [client] = await db.insert(schema.clients).values({
    firstName: 'Sarah',
    lastName: 'Miller',
    email: 'sarah.miller@email.com',
    phone: '555-234-5678',
    address: '789 Oak Ave',
    city: 'Portland',
    state: 'OR',
    zip: '97202',
  }).returning();
  console.log(`   ✅ Client registered: ${client.firstName} ${client.lastName}`);
  
  // 2. Add patient
  console.log('\n2. Adding patient...');
  const [patient] = await db.insert(schema.patients).values({
    clientId: client.id,
    name: 'Charlie',
    species: 'canine',
    breed: 'Beagle',
    sex: 'male_neutered',
    dateOfBirth: new Date('2019-03-15'),
    weightKg: 12.5,
    speciesData: {
      species: 'canine',
      akc_registered: false,
    },
  }).returning();
  console.log(`   ✅ Patient added: ${patient.name} (${patient.species})`);
  
  // 3. Schedule appointment
  console.log('\n3. Scheduling appointment...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);
  
  const [appointment] = await db.insert(schema.appointments).values({
    patientId: patient.id,
    clientId: client.id,
    scheduledStart: tomorrow,
    scheduledEnd: new Date(tomorrow.getTime() + 30 * 60000), // +30 min
    appointmentType: 'wellness',
    reason: 'Annual checkup',
    status: 'scheduled',
  }).returning();
  console.log(`   ✅ Appointment scheduled for ${tomorrow.toLocaleString()}`);
  
  // 4. Create visit (simulate appointment happened)
  console.log('\n4. Creating visit record...');
  const [visit] = await db.insert(schema.visits).values({
    patientId: patient.id,
    clientId: client.id,
    visitType: 'wellness',
    status: 'completed',
    scheduledAt: tomorrow,
    checkedInAt: tomorrow,
    completedAt: new Date(),
    subjective: 'Owner reports dog is healthy and active',
    objective: 'Alert, responsive. HR: 95 bpm, Temp: 38.5C, Weight: 12.5kg',
    assessment: 'Healthy adult dog. All vitals normal.',
    plan: 'DHPP booster, heartworm prevention refill. Return in 1 year.',
  }).returning();
  console.log(`   ✅ Visit completed and documented`);
  
  // 5. Record vitals
  console.log('\n5. Recording vitals...');
  await db.insert(schema.vital_records).values({
    patientId: patient.id,
    visitId: visit.id,
    weightKg: 12.5,
    temperatureCelsius: 38.5,
    heartRateBpm: 95,
    respiratoryRate: 24,
  });
  console.log('   ✅ Vitals recorded');
  
  // 6. Administer vaccination
  console.log('\n6. Administering vaccination...');
  const dhppVaccine = await db.query.vaccines.findFirst({
    where: eq(schema.vaccines.abbreviation, 'DHPP'),
  });
  
  if (dhppVaccine) {
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 3); // 3 years
    
    await db.insert(schema.vaccinations).values({
      patientId: patient.id,
      vaccineId: dhppVaccine.id,
      visitId: visit.id,
      administeredAt: new Date(),
      validUntil,
      lotNumber: 'DHX2024-789',
      injectionSite: 'right shoulder',
    });
    console.log('   ✅ DHPP vaccine administered');
  }
  
  // 7. Write prescription
  console.log('\n7. Creating prescription...');
  const heartgard = await db.query.medications.findFirst({
    where: eq(schema.medications.name, 'Heartgard Plus'),
  });
  
  // (You'd need to seed this medication first)
  
  // 8. Generate invoice
  console.log('\n8. Generating invoice...');
  
  // Get services
  const examService = await db.query.services.findFirst({
    where: eq(schema.services.code, 'EXAM_WELLNESS'),
  });
  
  const vaccineService = await db.query.services.findFirst({
    where: eq(schema.services.code, 'VACCINE_DHPP'),
  });
  
  // Create invoice
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
  
  const [invoice] = await db.insert(schema.invoices).values({
    invoiceNumber,
    clientId: client.id,
    visitId: visit.id,
    status: 'pending',
  }).returning();
  
  // Add line items
  const lineItems = [
    {
      invoiceId: invoice.id,
      serviceId: examService?.id,
      description: 'Wellness Examination',
      quantity: 1,
      unitPrice: 75.00,
      lineTotal: 75.00,
      isTaxable: false,
    },
    {
      invoiceId: invoice.id,
      serviceId: vaccineService?.id,
      description: 'DHPP Vaccination',
      quantity: 1,
      unitPrice: 35.00,
      lineTotal: 35.00,
      isTaxable: false,
    },
  ];
  
  await db.insert(schema.invoice_line_items).values(lineItems);
  
  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = 0; // Vet services typically not taxed
  const total = subtotal + taxAmount;
  
  await db.update(schema.invoices)
    .set({
      subtotal,
      taxAmount,
      total,
      amountDue: total,
      finalizedAt: new Date(),
    })
    .where(eq(schema.invoices.id, invoice.id));
  
  console.log(`   ✅ Invoice generated: ${invoiceNumber}`);
  console.log(`   💰 Total: $${total.toFixed(2)}`);
  
  // 9. Process payment
  console.log('\n9. Processing payment...');
  await db.insert(schema.payments).values({
    invoiceId: invoice.id,
    amount: total,
    method: 'credit',
    lastFour: '4242',
  });
  
  await db.update(schema.invoices)
    .set({
      amountPaid: total,
      amountDue: 0,
      status: 'paid',
      paidAt: new Date(),
    })
    .where(eq(schema.invoices.id, invoice.id));
  
  console.log('   ✅ Payment processed');
  
  // 10. Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Complete workflow executed successfully!');
  console.log('='.repeat(50));
  console.log(`
📋 Summary:
   • Client: ${client.firstName} ${client.lastName}
   • Patient: ${patient.name} (${patient.species})
   • Visit: ${visit.visitType} examination
   • Invoice: ${invoiceNumber} - PAID
   • Services: Exam + Vaccination
   • Total: $${total.toFixed(2)}
  `);
  
  process.exit(0);
}

completeWorkflow().catch(console.error);
```

**Run the complete workflow:**
```bash
bun src/complete-workflow.ts
```

---

## Workshop Complete! 🎉

You've built a production-ready veterinary practice database with:

**Core Systems:**
- ✅ Client and patient management
- ✅ Medical records (visits, SOAP notes, vitals, diagnoses)
- ✅ Medication and prescription tracking
- ✅ Vaccination management with reminders
- ✅ Appointment scheduling
- ✅ Billing and payment processing

**Technical Skills:**
- ✅ Drizzle ORM table definitions
- ✅ Foreign keys and relations
- ✅ Zod validation with refinements
- ✅ JSONB for flexible data
- ✅ Enums and arrays
- ✅ Complex queries with joins
- ✅ Transactions for atomicity
- ✅ Date/time handling
- ✅ Business logic implementation

**Next Steps:**
1. Add authentication/authorization
2. Build REST API on top of this schema
3. Add more business rules (e.g., inventory management)
4. Implement search functionality
5. Add data migrations for schema evolution
6. Performance optimization (query analysis, indexing)
7. Testing suite for all operations

**Resources:**
- Drizzle docs: https://orm.drizzle.team/docs/overview
- Zod docs: https://zod.dev/
- PostgreSQL docs: https://www.postgresql.org/docs/

You now have a solid foundation for building database-backed applications with type safety end-to-end!
