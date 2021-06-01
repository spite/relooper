import {
  Scene,
  Group,
  MeshStandardMaterial,
  BoxBufferGeometry,
  Mesh,
  DirectionalLight,
  HemisphereLight,
  AmbientLight,
  PCFSoftShadowMap,
  RawShaderMaterial,
  Vector2,
  BufferAttribute,
  Vector3,
  MeshDepthMaterial,
  MeshNormalMaterial,
  DoubleSide,
  Euler,
  TorusBufferGeometry,
  BufferGeometry,
} from "../../third_party/three.module.js";
import { renderer, getCamera, onResize } from "../../modules/three.js";
import easings from "../../modules/easings.js";
import { norm, parabola, randomInRange } from "../../modules/maf.js";
import { ShaderPass } from "../../modules/shader-pass.js";
import { getFBO } from "../../modules/fbo.js";
import { shader as finalVS } from "./final-vs.js";
import { shader as finalFS } from "./final-fs.js";
import { backdrop } from "./backdrop.js";
import { perlin3 } from "../../third_party/perlin.js";
import { OrbitControls } from "../../third_party/OrbitControls.js";
import { PositionMaterial } from "../../modules/PositionMaterial.js";

const loopDuration = 5;
let theme = 0;

const camera = getCamera();
const scene = new Scene();
const geometry = new BufferGeometry();

const SEGMENTS = 200;
const SIDES = 36;
const indices = [];
const vertices = new Float32Array(SIDES * SEGMENTS * 3);

let ptr = 0;
const r1 = 1;
const v = new Vector3();
const up = new Vector3(0, 1, 0);
const dir = new Vector3(0, 0, 1);
for (let segment = 0; segment < SEGMENTS; segment++) {
  const alpha = (segment * 2 * Math.PI) / SEGMENTS;
  for (let side = 0; side < SIDES; side++) {
    const beta = (side * 2 * Math.PI) / SIDES;

    const a0 = 2;
    const b0 = 2;
    const n0 = 3.5;
    const gamma0 = alpha;
    const x =
      Math.pow(Math.abs(Math.cos(gamma0)), 2 / n0) *
      a0 *
      Math.sign(Math.cos(gamma0));
    const y = 0;
    const z =
      Math.pow(Math.abs(Math.sin(gamma0)), 2 / n0) *
      b0 *
      Math.sign(Math.sin(gamma0));

    //const x = r1 * Math.cos(alpha);
    //const y = 0;
    //const z = r1 * Math.sin(alpha);

    const a = 0.8;
    const b = 0.8;
    const n = 1.5;
    const gamma = -beta;
    const rx =
      Math.pow(Math.abs(Math.cos(gamma)), 2 / n) *
      a *
      Math.sign(Math.cos(gamma));
    const ry =
      Math.pow(Math.abs(Math.sin(gamma)), 2 / n) *
      b *
      Math.sign(Math.sin(gamma));

    v.set(rx, ry, 0);
    v.applyAxisAngle(dir, 1 * alpha);
    v.applyAxisAngle(up, -alpha);
    vertices[ptr] = x + v.x;
    vertices[ptr + 1] = y + v.y;
    vertices[ptr + 2] = z + v.z;
    ptr += 3;
  }
}

const MAX = SEGMENTS * SIDES;
for (let segment = 0; segment < SEGMENTS + 1; segment++) {
  for (let f = 0; f < SIDES; f++) {
    const a = (segment * SIDES + ((f + 1) % SIDES)) % MAX;
    const b = (segment * SIDES + f) % MAX;
    const c = (segment * SIDES + f + SIDES) % MAX;
    const d = (segment * SIDES + ((f + 1) % SIDES) + SIDES) % MAX;

    indices.push(a, b, d);
    indices.push(b, c, d);
  }
}
geometry.setIndex(indices);
geometry.setAttribute("position", new BufferAttribute(vertices, 3));
geometry.computeFaceNormals();
geometry.computeVertexNormals();
const mesh = new Mesh(geometry, new MeshNormalMaterial({ wireframe: !true }));
scene.add(mesh);
// mesh.material.flatShading = true;

camera.position.set(5.5, 8, 5.5).multiplyScalar(1.2);
camera.lookAt(new Vector3(0, 1, 0));
renderer.setClearColor(0xffffff, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;

const colorFBO = getFBO(1, 1, {}, true);
const positionFBO = getFBO(1, 1, true);
const normalFBO = getFBO(1, 1, true);
const resolution = new Vector2(1, 1);

backdrop.material.uniforms.resolution.value = resolution;

const finalShader = new RawShaderMaterial({
  uniforms: {
    tInput: { value: colorFBO.texture },
    resolution: { value: resolution },
    time: { value: performance.now() },
  },
  vertexShader: finalVS,
  fragmentShader: finalFS,
});
const finalPass = new ShaderPass(renderer, finalShader);

scene.add(backdrop);

function draw(startTime) {
  finalShader.uniforms.time.value = Math.random();

  // scene.overrideMaterial = positionMaterial;
  // // renderer.setRenderTarget(positionFBO);
  // renderer.render(scene, camera);

  // return;

  // scene.overrideMaterial = normalMaterial;
  // renderer.setRenderTarget(normalFBO);
  // renderer.render(scene, camera);

  // scene.overrideMaterial = null;
  // renderer.setRenderTarget(colorFBO);
  // renderer.render(scene, camera);
  // renderer.setRenderTarget(null);
  // finalPass.render(true);

  renderer.render(scene, camera);
}

// renderer.domElement.addEventListener("click", (e) => {
//   theme = 1 - theme;
//   setTheme(theme);
// });

function setTheme(theme) {
  if (theme === 0) {
    // material.color.setHex(0xffffff);
    backdrop.material.uniforms.darkColor.value.setHex(0x404040);
    backdrop.material.uniforms.brightColor.value.setHex(0xffffff);
  } else {
    // material.color.setHex(0xaaaaaa);
    backdrop.material.uniforms.darkColor.value.setHex(0xffffff);
    backdrop.material.uniforms.brightColor.value.setHex(0x404040);
    renderer.setClearColor(0, 1);
  }
}

setTheme(theme);

onResize((w, h) => {
  const rw = renderer.domElement.width;
  const rh = renderer.domElement.height;
  resolution.set(rw, rh);
  colorFBO.setSize(rw, rh);
  positionFBO.setSize(rw, rh);
  normalFBO.setSize(rw, rh);
  finalPass.setSize(rw, rh);
});

const controls = new OrbitControls(camera, renderer.domElement);
async function init() {}

export { draw, loopDuration, renderer, camera, init };