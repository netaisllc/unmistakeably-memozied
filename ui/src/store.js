import { readable, writable } from 'svelte/store';
export const next = writable(false);
export const pages = writable([]);
export const previous = writable(false);
export const showInputs = writable(true);
export const showResults = writable(false);
export const stateInputting = writable(true);
export const statePending = writable(false);
export const stateUrlError = writable(false);
