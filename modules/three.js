import {
  WebGLRenderer,
  PerspectiveCamera,
  OrthographicCamera,
} from "../third_party/three.module.js";

const onResizeFns = [];

function getWebGLRenderer() {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  const canvas = renderer.domElement;
  return renderer;
}

function onResize(fn) {
  onResizeFns.push(fn);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let fn of onResizeFns) {
    fn(w, h);
  }
}

window.addEventListener("resize", resize);

const renderer = getWebGLRenderer();

function getCamera(fov) {
  const camera = new PerspectiveCamera(fov ? fov : 35, 1, 0.1, 100);
  onResize((w, h) => {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  return camera;
}

function getOrthoCamera(w, h) {
  return new OrthographicCamera(-w, w, h, -h, -100, 100);
}

onResize((w, h) => {
  renderer.setSize(w, h);
});

export { renderer, getCamera, getOrthoCamera, onResize, resize };
