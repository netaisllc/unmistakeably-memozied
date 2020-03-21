<script>
	import { next, pages, previous, showInputs, showResults, stateInputting, statePending, stateUrlError } from './store.js';
	import Inputs from './Inputs.svelte';
	import Results from './Results.svelte';
	import { backward, forward } from './network.js';

	const acceptPages = (data) => {
		$next = data.after ? data.after : false;
		$pages = data;
		$previous = data.before ? data.before : false;
		$showInputs = false;
		$showResults = true;
		$statePending = false;
	}

	const nextPage = () => {
		forward($pages.exid, $pages.after).then((data) => {
			acceptPages(data);
		}).catch((err) => {
			console.err
		})
	}
	
	const previousPage = () => {
		backward($pages.exid, $pages.before).then((data) => {
			acceptPages(data);
		}).catch((err) => {
			console.err
		})
	}

	const setShowInputs = () => {
		$showInputs = true;
		$showResults = false;
		$stateInputting = true;
		$statePending = false;
		$stateUrlError = false;
	}

	const setShowResults = () => {
		$showInputs = false;
		$showResults = true;
		$stateInputting = false;
		$statePending = false;
		$stateUrlError = false;
	}	
</script>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 24rem;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 8em;
		font-weight: 300;
	}

	p {
		font-size: 2rem;
		font-weight: 300;
	}

	.container {
		display: flex;
		justify-content: space-around;
		margin: 2rem 16.666667vw;
		width: 66vw;
	}
	.row {
		display: flex;
	}
	.end {
		justify-content: end;
	}

	.areas {
		justify-content: start;
	}

	.tabs {
		margin-top: 4.5rem;
	}

	.tabs, .tab {
		height: 4.2rem;
	}
	.tab {
		color: #B4B4B4;
		font-size: 3.6rem;
		font-weight: 300;
		line-height: 4.2rem;
		border-radius: 3px;
		padding: .1rem .6rem .7rem;
	}
	.tab:hover {
		color: #676767;
		cursor: pointer;
		background-color: white;
	}
	.tab.active {
		color: #ff3e00;
		font-weight: 400;
	}
	.tab.active:hover {
		background-color: transparent;
		cursor: default;
	}

	.square {
		border-radius: 3px;
		color: #676767;
		height: 4.2rem;
		margin-left: 1rem;
		opacity: 0.50;
		padding: .9rem 0;
		text-align: center;
		transition: all 300ms ease;
		width: 4.2rem;
	}
	.square.bright {
		opacity: 1.0;
	}
	.square:hover {
		background-color: #ff3e00;
		color: white;
		cursor: pointer;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>

<main>
	<h1>Woogle</h1>
	<p>Find all the pages and names within a limit.</p>
	<div class="container tabs">
		<div class="tab" class:active="{$showInputs}" on:click={setShowInputs}>Inputs</div>
		<div class="row">
			<div class="tab" class:active="{$showResults}" on:click={setShowResults}>Results
			</div>
			{#if $showResults}
				<div class="row end">
					{#if $previous || $next}
					<div class="square" class:bright={$previous} on:click={previousPage}>
						<i class="material-icons">chevron_left</i>
					</div>
					{/if}
					{#if $next || $previous}
					<div class="square" class:bright={$next} on:click={nextPage}>
						<i class="material-icons">chevron_right</i>
					</div>
					{/if}
				</div>
			{/if}
		</div>
		
	</div>
	<div class="container areas">
		{#if $showInputs}
			<Inputs></Inputs>
		{/if}
		{#if $showResults}
			<Results></Results>
		{/if}		
	</div>
</main>