import { draw, renderer } from "../loops/hen-1/loop.js";
import { resize } from "../modules/three.js";

document.body.appendChild(renderer.domElement);

let startTime = 0;

function update() {
  requestAnimationFrame(update);
  draw(startTime);
}

resize();
update();
