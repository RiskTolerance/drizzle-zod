<script lang="ts">
	import { checkpoint1Insert, insertPatientForm } from '$lib/remotes/data.remote';
	import { enhance } from '$app/forms';

	let result = $state<{ success: boolean; patient?: any; error?: any } | null>(null);
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<button onclick={() => checkpoint1Insert()}>Insert!</button>

<div class="">
	<h2>Add New Patient</h2>
	{#if result?.error}
		<p style="color: red;">Error: {JSON.stringify(result.error)}</p>
	{/if}
	{#if result?.success}
		<p style="color: green;">Successfully added patient: {result.patient.name}</p>
	{/if}
	<form
		method="post"
		class="container mx-auto grid grid-cols-2 gap-8"
		onsubmit={async (e) => {
			e.preventDefault();
			const formData = new FormData(e.currentTarget as HTMLFormElement);
			try {
				// Remote form functions are callable with FormData
				result = await (insertPatientForm as any)(formData);
				if (result?.success) {
					(e.currentTarget as HTMLFormElement).reset();
				}
			} catch (err) {
				result = { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
			}
		}}
	>
		<label>
			Client ID:
			<input required type="number" name="clientId" />
		</label>
		<label>
			Name:
			<input required type="text" name="name" />
		</label>
		<label>
			Species:
			<select required name="species">
				<option value="">Select...</option>
				<option value="canine">Canine</option>
				<option value="feline">Feline</option>
				<option value="avian">Avian</option>
				<option value="reptile">Reptile</option>
				<option value="small_mammal">Small Mammal</option>
				<option value="equine">Equine</option>
				<option value="exotic">Exotic</option>
			</select>
		</label>
		<label>
			Sex:
			<select required name="sex">
				<option value="">Select...</option>
				<option value="male">Male</option>
				<option value="female">Female</option>
				<option value="male_neutered">Male Neutered</option>
				<option value="female_spayed">Female Spayed</option>
				<option value="unknown">Unknown</option>
			</select>
		</label>
		<label>
			Breed:
			<input type="text" name="breed" />
		</label>
		<label>
			Color:
			<input type="text" name="color" />
		</label>
		<label>
			Date of Birth:
			<input type="date" name="dateOfBirth" />
		</label>
		<label>
			Weight (kg):
			<input type="number" step="0.1" name="weightKg" />
		</label>
		<label>
			Notes:
			<textarea name="notes"></textarea>
		</label>
		<button
			type="submit"
			class="my-auto h-fit w-fit cursor-pointer justify-self-end bg-amber-300 px-6 py-4"
			>Add Patient</button
		>
	</form>
</div>

<style>
	label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>
