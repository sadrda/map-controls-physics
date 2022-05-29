<script lang="ts">
  import Map from "./Map.svelte";
  import Controller from "./Controller.svelte";
</script>

<main>
  <Map />
  <Controller />
</main>

<style>
  main {
    width: 100%;
    height: 100%;
  }

  :global(html, body) {
    width: 100%;
    height: 100%;
    margin: 0;
  }

  :global(#app) {
    width: 100%;
    height: 100%;
  }
</style>
