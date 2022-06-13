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

const WALL_SIZE = 1024; // keep objects in viewport

let ySum = 0;
let xSum = 0;
let map: google.maps.Map;
let circles: Matter.Composite;
let handle: Matter.Body;
let collider: Matter.Body;
let mouse: Matter.Mouse;
let wallBot: Matter.Body;
let wallRight: Matter.Body;
let wallTop: Matter.Body;
let wallLeft: Matter.Body;
let colliderSide = null;
let canvas: HTMLCanvasElement;
let render: Matter.Render;
let engine: Matter.Engine;

export async function initScene(newCanvas: HTMLCanvasElement) {
  canvas = newCanvas;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  engine = Engine.create();
  render = Render.create({
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

  circles = getCircles();

  const chain = getChain();
  handle = chain.bodies[0];
  collider = chain.bodies[1];
  mouse = Mouse.create(render.canvas);

  const walls = getWalls();
  wallLeft = walls.wallLeft;
  wallTop = walls.wallTop;
  wallRight = walls.wallRight;
  wallBot = walls.wallBot;

  Composite.add(engine.world, [chain, wallBot, wallLeft, wallRight, wallTop]);
  Render.run(render);

  // interval instead of raf loop because matterjs
  // render speed depends on monitor refresh interval
  setInterval(() => {
    Engine.update(engine, 7);
  }, 7);

  handleCollision();

  Events.on(engine, "afterUpdate", () => {
    if (!mouse.position.x && !mouse.position.y) {
      return;
    }

    setHandlePosition();

    if (!map) {
      return;
    }

    handleRotation();
  });

  mapStore.subscribe((currentMap) => (map = currentMap));
  window.addEventListener("resize", handleResize);

  // stagger panning, because gmaps would stack them until release
  setInterval(() => {
    map.panBy(xSum, ySum);
    xSum = 0;
    ySum = 0;
  }, 50);
}

function handleCollision() {
  Matter.Events.on(engine, "collisionStart", (event) => {
    if (!map) {
      return;
    }

    for (const pair of event.pairs) {
      const { bodyA, bodyB, separation } = pair;

      if (separation < 1) continue;

      if (bodyA.label !== "collider" && bodyB.label !== "collider") {
        continue;
      }

      const travelAmount = 30 * separation;
      let x = 0;
      let y = 0;

      if (bodyA.label === "wallLeft" || bodyB.label === "wallLeft") {
        x = -travelAmount;
      }
      if (bodyA.label === "wallRight" || bodyB.label === "wallRight") {
        x = travelAmount;
      }
      if (bodyA.label === "wallTop" || bodyB.label === "wallTop") {
        y = -travelAmount;
      }
      if (bodyA.label === "wallBot" || bodyB.label === "wallBot") {
        y = travelAmount;
      }

      map.panBy(x, y);
    }
  });
}

function handleRotation() {
  const handleX = handle.position.x;
  const handleY = handle.position.y;
  const colliderX = collider.position.x;
  const colliderY = collider.position.y;

  const dx = (colliderX - handleX) * (colliderX - handleX);
  const dy = (colliderY - handleY) * (colliderY - handleY);
  const distance = Math.sqrt(dx + dy);

  if (distance < 80) return;

  const newColliderSide = colliderX > handleX ? "right" : "left";

  if (!colliderSide) {
    colliderSide = newColliderSide;
    return;
  }

  const colliderChangedSide = newColliderSide !== colliderSide;
  const colliderIsAboveHandler = colliderY < handleY;

  if (colliderIsAboveHandler && colliderChangedSide) {
    const zoom = map.getZoom();
    map.setZoom(zoom + (newColliderSide === "left" ? -1 : 1));
  }
  colliderSide = newColliderSide;
}

function getCircles() {
  return Composites.stack(
    500,
    80,
    2,
    1,
    10,
    0,
    (x: number, y: number, i: number) => {
      const segmentSize = i === 0 ? 5 : 10;
      const mass = i === 0 ? 1 : 100;
      const frictionAir = i === 0 ? 1 : 0.06;
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
}

function getChain() {
  return Composites.chain(circles, 0, 0, 0, 0, {
    stiffness: 1,
    length: 15,
    render: { lineWidth: 0.5, fillStyle: "red", strokeStyle: "#666" },
  });
}

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

  Body.setPosition(handle, {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  Body.setPosition(collider, {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
}

function getWalls() {
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
  return { wallBot, wallLeft, wallRight, wallTop };
}

function setHandlePosition() {
  const mouseX = mouse.position.x;
  const mouseY = mouse.position.y;

  Body.setPosition(handle, {
    x: mouseX,
    y: mouseY,
  });
}
