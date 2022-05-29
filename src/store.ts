import { writable } from "svelte/store";

export const mapStore = writable<google.maps.Map | null>(null);
