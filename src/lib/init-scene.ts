import Matter from "matter-js";
import { mapStore } from "../store";

const Engine = Matter.Engine,
  Render = Matter.Render,
  Runner = Matter.Runner,
  Bodies = Matter.Bodies,
  Composite = Matter.Composite,
  Mouse = Matter.Mouse,
  Events = Matter.Events,
  Body = Matter.Body,
  Composites = Matter.Composites;

const WALL_SIZE = 512; // keep objects in viewport
const LAT_BOUNDS = 80; // dont go to poles
const VIWEPORT_ZOOM_BUFFER = 50; // dont trigger a zoom change on viewport edges

let map: google.maps.Map;

mapStore.subscribe((currentMap) => (map = currentMap));

export async function initScene(canvas: HTMLCanvasElement) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const engine = Engine.create();

  const render = Render.create({
    engine,
    canvas,
    bounds: {
      max: {
        x: window.innerWidth,
        y: window.innerHeight,
      },
      min: {
        x: 0,
        y: 0,
      },
    },
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      wireframes: false,
    },
  });

  const circles = Composites.stack(
    500,
    80,
    2,
    1,
    10,
    0,
    (x: number, y: number, i: number) => {
      const segmentSize = i === 0 ? 10 : 30;
      const mass = i === 0 ? 1 : 50;
      const frictionAir = i === 0 ? 1 : 0.05;
      const label = i === 0 ? "handle" : "collider";

      return Bodies.circle(
        window.innerWidth / 2,
        window.innerHeight / 2,
        segmentSize,
        {
          label,
          mass,
          frictionAir,
          render: { fillStyle: "#E6AE00", lineWidth: 3, strokeStyle: "#333" },
        },
        64
      );
    }
  );

  const chain = Composites.chain(circles, 0, 0, 0, 0, {
    stiffness: 1,
    length: 50,
    render: { lineWidth: 0.5, fillStyle: "red", strokeStyle: "#666" },
  });
  const [handle, collider] = chain.bodies;
  const mouse = Mouse.create(render.canvas);

  const wallBot = Bodies.rectangle(
    canvas.width / 2,
    canvas.height + WALL_SIZE / 2,
    canvas.width,
    WALL_SIZE,
    {
      isStatic: true,
      label: "wallBot",
    }
  );
  const wallTop = Bodies.rectangle(
    canvas.width / 2,
    -WALL_SIZE / 2,
    canvas.width,
    WALL_SIZE,
    {
      isStatic: true,
      label: "wallTop",
    }
  );
  const wallLeft = Bodies.rectangle(
    -WALL_SIZE / 2,
    canvas.height / 2,
    WALL_SIZE,
    canvas.height,
    {
      isStatic: true,
      label: "wallLeft",
    }
  );
  const wallRight = Bodies.rectangle(
    canvas.width + WALL_SIZE / 2,
    canvas.height / 2,
    WALL_SIZE,
    canvas.height,
    {
      isStatic: true,
      label: "wallRight",
    }
  );

  Composite.add(engine.world, [chain, wallBot, wallLeft, wallRight, wallTop]);
  Render.run(render);

  const runner = Runner.create();
  Runner.run(runner, engine);

  let colliderSide = null;
  Events.on(engine, "afterUpdate", () => {
    if (!mouse.position.x && !mouse.position.y) {
      return;
    }

    const mouseX = mouse.position.x;
    const mouseY = mouse.position.y;
    const colliderX = collider.position.x;
    const colliderY = collider.position.y;

    Body.setPosition(handle, {
      x: mouseX,
      y: mouseY,
    });

    if (!map) {
      return;
    }

    const newColliderSide = colliderX > mouseX ? "right" : "left";

    if (!colliderSide) {
      colliderSide = newColliderSide;
      return;
    }

    const colliderChangedSide = newColliderSide !== colliderSide;
    const colliderIsAboveHandler = colliderY < mouseY;
    const mouseIsCloseToViewportEdge =
      mouseX < VIWEPORT_ZOOM_BUFFER ||
      mouseX > window.innerWidth - VIWEPORT_ZOOM_BUFFER ||
      mouseY < VIWEPORT_ZOOM_BUFFER ||
      mouseY > window.innerHeight - VIWEPORT_ZOOM_BUFFER;

    if (
      colliderIsAboveHandler &&
      !mouseIsCloseToViewportEdge &&
      colliderChangedSide
    ) {
      const zoom = map.getZoom();
      map.setZoom(zoom + (newColliderSide === "left" ? -1 : 1));
    }
    colliderSide = newColliderSide;
  });

  Matter.Events.on(engine, "collisionStart", (event) => {
    if (!map) {
      return;
    }

    for (const pair of event.pairs) {
      const { bodyA, bodyB, separation } = pair;

      if (separation < 1) {
        continue;
      }

      if (bodyA.label !== "collider" && bodyB.label !== "collider") {
        continue;
      }
      const { lat, lng } = map.getCenter().toJSON();
      const travelAmount =
        separation * 0.0001 * Math.pow(1.6, 23 - map.getZoom());
      let newLat = lat;
      let newLng = lng;

      if (bodyA.label === "wallLeft" || bodyB.label === "wallLeft") {
        newLng -= travelAmount;
      }
      if (bodyA.label === "wallRight" || bodyB.label === "wallRight") {
        newLng += travelAmount;
      }
      if (bodyA.label === "wallTop" || bodyB.label === "wallTop") {
        newLat += travelAmount;
      }
      if (bodyA.label === "wallBot" || bodyB.label === "wallBot") {
        newLat -= travelAmount;
      }

      newLat = Math.max(newLat, -LAT_BOUNDS);
      newLat = Math.min(newLat, LAT_BOUNDS);

      map.panTo({ lat: newLat, lng: newLng });
    }
  });

  window.addEventListener("resize", handleResize);

  function handleResize() {
    render.bounds.max.x = window.innerWidth;
    render.bounds.max.y = window.innerHeight;
    render.options.width = window.innerWidth;
    render.options.height = window.innerHeight;
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;

    Body.setPosition(wallRight, {
      x: window.innerWidth + WALL_SIZE / 2,
      y: window.innerHeight / 2,
    });

    Body.setPosition(wallBot, {
      x: window.innerWidth / 2,
      y: window.innerHeight + WALL_SIZE / 2,
    });
  }
}
