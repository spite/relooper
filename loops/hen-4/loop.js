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
  BackSide,
  TorusBufferGeometry,
  BufferGeometry,
  IcosahedronBufferGeometry,
  TorusKnotBufferGeometry,
  MeshBasicMaterial,
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
import { RoundedBoxGeometry } from "../../third_party/RoundedBoxGeometry.js";
import { generateGeometry } from "../../modules/polyhedra.js";

import { Post } from "./post.js";

import { shader as positionsFragmentShader } from "./position-fs.js";
import { shader as positionsVertexShader } from "./position-vs.js";
import { shader as meshFragmentShader } from "./mesh-fs.js";
import { shader as meshVertexShader } from "./mesh-vs.js";

const loopDuration = 5;
let theme = 0;

const camera = getCamera();
const scene = new Scene();
const geometry = new BufferGeometry();

const SEGMENTS = 400;
const SIDES = 72;
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

    // const a0 = 2;
    // const b0 = 2;
    // const n0 = 3.5;
    // const gamma0 = alpha;
    // const x =
    //   Math.pow(Math.abs(Math.cos(gamma0)), 2 / n0) *
    //   a0 *
    //   Math.sign(Math.cos(gamma0));
    // const y = 0;
    // const z =
    //   Math.pow(Math.abs(Math.sin(gamma0)), 2 / n0) *
    //   b0 *
    //   Math.sign(Math.sin(gamma0));

    // const x = r1 * Math.cos(alpha);
    // const y = 0;
    // const z = r1 * Math.sin(alpha);

    // // superellipse / Lam?? curve | https://en.wikipedia.org/wiki/Superellipse
    // const a = 0.2; // semi-diameter
    // const b = 0.2; // semi-diameter
    // const n = 3.5; // curve (<1, 1-2, >2)
    // const gamma = -beta;
    // const c = Math.cos(gamma);
    // const s = Math.sin(gamma);
    // const rx = Math.pow(Math.abs(c), 2 / n) * a * Math.sign(c);
    // const ry = Math.pow(Math.abs(s), 2 / n) * b * Math.sign(s);
    // // const rx = 0.5 * Math.cos(gamma) + 0.05 * Math.cos(6 * gamma);
    // // const ry = 0.5 * Math.sin(gamma) + 0.05 * Math.sin(6 * gamma);

    // v.set(rx, ry, 0);
    // v.applyAxisAngle(dir, 1 * alpha);
    // v.applyAxisAngle(up, -alpha);
    vertices[ptr] = alpha; //x + v.x;
    vertices[ptr + 1] = beta; //y + v.y;
    vertices[ptr + 2] = 0; //z + v.z;
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

const box = new Mesh(
  new BoxBufferGeometry(3.5, 3.5, 3.5),
  new MeshBasicMaterial({ color: 0xff00ff, wireframe: true })
);
const scene2 = new Scene();
scene2.add(box);

const prepassMaterial = new RawShaderMaterial({
  uniforms: {
    showNormals: { value: 0 },
    time: { value: 0 },
  },
  vertexShader: positionsVertexShader,
  fragmentShader: positionsFragmentShader,
  side: BackSide,
});

// const lightMaterial = new RawShaderMaterial({
//   //color: 0x202020,
//   //metalness: 0.1,
//   //roughness: 0.135,
//   // normalMap: normalTexture,
//   // normalScale: new THREE.Vector2(.75, .75),
//   // wireframe: !true
//   vertexShader: meshVertexShader,
//   fragmentShader: meshFragmentShader,
// });
const lightMaterial = new MeshStandardMaterial({
  color: 0x202020,
  metalness: 0.1,
  roughness: 0.3,
});

function squareTurbulence(v) {
  return 1 - Math.pow(v, 2);
}

function ridgedTurbulence(v) {
  return 1 - Math.abs(v);
}

function gaussianTurbulence(v) {
  return 1 - Math.exp(-Math.pow(v, 2));
}

function fbm(x, y, z) {
  let value = 0;
  let amplitude = 1;
  for (let i = 0; i < 8; i++) {
    value += amplitude * Math.abs(perlin3(x, y, z));
    x *= 2;
    y *= 2;
    z *= 2;
    amplitude *= 0.5;
  }
  return ridgedTurbulence(value);
}

function map(x, y, z, t) {
  const s1 = 0.5;
  const s2 = 1.5;
  const r = 1;
  return 0.1 * (fbm(s1 * x, s1 * y, s1 * z) + fbm(s2 * x, s2 * y, s2 * z));
}

// const geometry2 = geometry;
// const geometry2 = new TorusKnotBufferGeometry(1.5, 0.5, 200, 50);
const geometry2 = new RoundedBoxGeometry(3.5, 3.5, 3.5, 0.5, 5);
// const geometry2 = new IcosahedronBufferGeometry(1.75, 10);
// const geometry2 = new BoxBufferGeometry(3.5, 3.5, 3.5);
// const geometry2 = generateGeometry();
// const positions = geometry2.attributes.position.array;
// const normals = geometry2.attributes.normal.array;
// const p = new Vector3();
// const n = new Vector3();
// for (let i = 0; i < positions.length; i += 3) {
//   p.set(positions[i], positions[i + 1], positions[i + 2]);
//   n.set(normals[i], normals[i + 1], normals[i + 2]);
//   const d = map(p.x, p.y, p.z, 0);
//   n.multiplyScalar(1 * d);
//   p.add(n);
//   positions[i] = p.x;
//   positions[i + 1] = p.y;
//   positions[i + 2] = p.z;
// }
// geometry.computeVertexNormals();
// geometry.computeFaceNormals();

const mesh = new Mesh(geometry2, lightMaterial); // new MeshNormalMaterial({ wireframe: !true }));
scene.add(mesh);
mesh.castShadow = mesh.receiveShadow = true;
// mesh.material.flatShading = true;

camera.position.set(5.5, 8, 5.5).multiplyScalar(1.2);
camera.lookAt(new Vector3(0, 1, 0));
renderer.setClearColor(0x776e88, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;

const post = new Post(renderer, prepassMaterial, lightMaterial);

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

const directionalLight = new DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(-2, 2, 2);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = -1;
directionalLight.shadow.camera.far = 10;
scene.add(directionalLight);

const directionalLight2 = new DirectionalLight(0xffffff, 0.5);
directionalLight2.position.set(1, 2, 1);
directionalLight2.castShadow = true;
directionalLight2.shadow.camera.near = -4;
directionalLight2.shadow.camera.far = 10;
scene.add(directionalLight2);

const ambientLight = new AmbientLight(0x808080, 0.5);
scene.add(ambientLight);

const light = new HemisphereLight(0x776e88, 0xffffff, 0.5);
scene.add(light);

//scene.add(backdrop);

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

  post.render(scene, camera);
  // renderer.autoClear = false;
  // renderer.clear(false, true, true);
  // renderer.render(scene2, camera);
  // renderer.autoClear = true;

  // renderer.render(scene, camera);
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
  post.setSize(rw, rh);
});

const controls = new OrbitControls(camera, renderer.domElement);
async function init() {}

export { draw, loopDuration, renderer, camera, init };
