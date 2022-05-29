<script lang="ts">
  import { onMount } from "svelte";
  import { initScene } from "../lib/init-scene";

  let canvas: HTMLCanvasElement;

  onMount(() => initScene(canvas));
</script>

<canvas id="physics-canvas" bind:this={canvas} />

<style>
  #physics-canvas {
    background: transparent !important;
    position: absolute;
    width: 100%;
    height: 100%;
  }
</style>
