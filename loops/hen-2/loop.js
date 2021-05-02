import {
  Scene,
  Group,
  MeshStandardMaterial,
  TextureLoader,
  BufferGeometry,
  BufferAttribute,
  Mesh,
  DirectionalLight,
  HemisphereLight,
  AmbientLight,
  PCFSoftShadowMap,
  RawShaderMaterial,
  Vector2,
  Color,
} from "../../third_party/three.module.js";
import { TAU } from "../../modules/maf.js";
import { renderer, getCamera, onResize } from "../../modules/three.js";
import { ShaderPass } from "../../modules/shader-pass.js";
import { getFBO } from "../../modules/fbo.js";
import { shader as finalVS } from "./final-vs.js";
import { shader as finalFS } from "./final-fs.js";
import { backdrop } from "./backdrop.js";
import { shader as vertexShader } from "./vertex-shader.js";
import { shader as fragmentShader } from "./fragment-shader.js";
import { randomInRange } from "../../modules/maf.js";

const loopDuration = 5;
let theme = 0;

const camera = getCamera();
const scene = new Scene();
const group = new Group();

const SIDES = 40;
const SEGMENTS = 500;
const geometry = new BufferGeometry();

const indices = [];
const vertices = new Float32Array(SIDES * SEGMENTS * 3);

let matcaps;

const loader = new TextureLoader();
async function loadTexture(path) {
  return new Promise((resolve, reject) => {
    loader.load(path, (texture) => {
      resolve(texture);
    });
  });
}
async function init() {
  const [m1, m2, m3, m4] = await Promise.all([
    loadTexture("../../assets/matcap-black.png"),
    loadTexture("../../assets/matcap-red.jpg"),
    loadTexture("../../assets/matcap-cream.png"),
    loadTexture("../../assets/matcap-silver.jpg"),
  ]);
  matcaps = {
    0: [m1, m2],
    1: [m3, m4],
  };
  setTheme(theme);
}

function getRandomMatCap() {
  return matcaps[theme][~~(Math.random() * matcaps[theme].length)];
}

let ptr = 0;
for (let segment = 0; segment < SEGMENTS; segment++) {
  for (let side = 0; side < SIDES; side++) {
    vertices[ptr] = segment;
    vertices[ptr + 1] = side;
    vertices[ptr + 2] = 0;
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

const backgroundColor = new Color();
const meshes = [];
const PARTS = 5;
for (let i = 0; i < PARTS; i++) {
  const geoMat = new RawShaderMaterial({
    uniforms: {
      SEGMENTS: { value: SEGMENTS },
      SIDES: { value: SIDES },
      matCapMap: { value: null },
      time: { value: 0 },
      radius: { value: 17 + i * 1 },
      radius2: { value: 1 + i / 10 },
      backgroundColor: { value: backgroundColor },
      offset: { value: randomInRange(0.25, 1) },
    },
    vertexShader,
    fragmentShader,
    // wireframe: true,
  });
  const t = new Mesh(geometry, geoMat);
  t.rotation.y = (i * (TAU / PARTS)) / PARTS;
  group.add(t);
  t.scale.setScalar(0.1);
  meshes.push(t);
}

scene.add(group);

const MAPSIZE = 512;
const directionalLight = new DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(-2.1, 2, 3);
directionalLight.castShadow = true;
const d = 2.75;
directionalLight.shadow.camera.left = -d;
directionalLight.shadow.camera.top = -d;
directionalLight.shadow.camera.right = d;
directionalLight.shadow.camera.bottom = d;
directionalLight.shadow.bias = -0.0001;
directionalLight.shadow.camera.near = 0.1;
directionalLight.shadow.camera.far = 10;
directionalLight.shadow.mapSize.width = MAPSIZE;
directionalLight.shadow.mapSize.height = MAPSIZE;
scene.add(directionalLight);

const directionalLight2 = new DirectionalLight(0xffffff, 0.5);
directionalLight2.position.set(1.5, 3, 1.5);
directionalLight2.castShadow = true;
const d2 = 2.75;
directionalLight2.shadow.camera.left = -d2;
directionalLight2.shadow.camera.top = -d2;
directionalLight2.shadow.camera.right = d2;
directionalLight2.shadow.camera.bottom = d2;
directionalLight2.shadow.mapSize.width = MAPSIZE;
directionalLight2.shadow.mapSize.height = MAPSIZE;
directionalLight2.shadow.camera.near = 0.1;
directionalLight2.shadow.camera.far = 12;
directionalLight2.shadow.bias = -0.0001;
scene.add(directionalLight2);

const ambientLight = new AmbientLight(0x808080, 0.5);
scene.add(ambientLight);

const light = new HemisphereLight(0xcecece, 0xb3b3b3, 0.5);
scene.add(light);

camera.position.set(0, 6, 7).multiplyScalar(1.2);
camera.lookAt(group.position);
renderer.setClearColor(0xffffff, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;

const colorFBO = getFBO(1, 1, true);
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

  const time = (0.001 * (performance.now() - startTime)) % loopDuration;
  let i = 1;
  meshes.forEach((m) => {
    m.material.uniforms.time.value = 0.00001 * performance.now() * i;
    i++;
  });

  group.rotation.y = 0.0001 * performance.now();

  renderer.setRenderTarget(colorFBO);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  finalPass.render(true);
}

renderer.domElement.addEventListener("click", (e) => {
  theme = 1 - theme;
  setTheme(theme);
});

function setTheme(theme) {
  if (theme === 0) {
    backgroundColor.setHex(0xffffff);
    meshes.forEach((m) => {
      m.material.uniforms.matCapMap.value = getRandomMatCap();
    });
    backdrop.material.uniforms.darkColor.value.setHex(0x404040);
    backdrop.material.uniforms.brightColor.value.setHex(0xffffff);
    renderer.setClearColor(0xffffff, 1);
  } else {
    backgroundColor.setHex(0x404040);
    meshes.forEach((m) => {
      m.material.uniforms.matCapMap.value = getRandomMatCap();
    });
    backdrop.material.uniforms.darkColor.value.setHex(0x101010);
    backdrop.material.uniforms.brightColor.value.setHex(0x404040);
    renderer.setClearColor(0, 1);
  }
}

onResize((w, h) => {
  const rw = renderer.domElement.width;
  const rh = renderer.domElement.height;
  resolution.set(rw, rh);
  colorFBO.setSize(rw, rh);
  finalPass.setSize(rw, rh);
});

export { draw, loopDuration, renderer, camera, init };
