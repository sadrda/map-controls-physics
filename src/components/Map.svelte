<script lang="ts">
  import { onMount } from "svelte";
  import { mapStore } from "../store";
  import { loadMapsApi } from "../lib/load-maps-api";

  let mapDiv: HTMLDivElement;

  onMount(async () => {
    await loadMapsApi({
      key: import.meta.env.GOOGLE_MAPS_API_KEY,
    });

    const map = new google.maps.Map(mapDiv, {
      zoom: 4,
      center: { lat: 37.7749, lng: -122.4194 },
      disableDefaultUI: true,
      draggable: false,
      zoomControl: false,
      restriction: {
        latLngBounds: {
          north: 80,
          south: -80,
          east: 180,
          west: -180,
        },
      },
    });

    mapStore.set(map);
  });
</script>

<div id="map" bind:this={mapDiv} />

<style>
  #map {
    height: 100%;
    width: 100%;
    position: absolute;
  }
</style>
