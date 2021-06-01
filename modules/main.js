import { draw, renderer, init } from "../loops/hen-4/loop.js";
import { resize } from "../modules/three.js";

let startTime = 0;

function update() {
  requestAnimationFrame(update);
  draw(startTime);
}

async function run() {
  await init();
  document.body.appendChild(renderer.domElement);
  resize();
  update();
}

run();
