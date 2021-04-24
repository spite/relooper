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
} from "../../third_party/three.module.js";
import { renderer, getCamera, onResize } from "../../modules/three.js";
import easings from "../../modules/easings.js";
import Maf from "../../modules/maf.js";
import { ShaderPass } from "../../modules/shader-pass.js";
import { getFBO } from "../../modules/fbo.js";
import { shader as finalVS } from "./final-vs.js";
import { shader as finalFS } from "./final-fs.js";
import { backdrop } from "./backdrop.js";

const loopDuration = 5;
let theme = 0;

const camera = getCamera();
const scene = new Scene();
const group = new Group();

const material = new MeshStandardMaterial({
  color: 0x404040,
  metalness: 0.1,
  roughness: 0.5,
});
const geometry = new BoxBufferGeometry(1, 1, 1);
const cubes = [];
let id = 0;
for (let z = 0; z < 3; z++) {
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const mesh = new Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      mesh.position.set(x - 1, y - 1, z - 1);
      const offset = Maf.randomInRange(0, 1);
      cubes.push({ id, mesh, x, y, z, offset });
      id++;
    }
  }
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

camera.position.set(0, 6, 7).multiplyScalar(1);
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
  let f2 = 0.5 + 2.5 * easings.InOutQuad(time / loopDuration);
  let ry = 0;
  if (time < 0.5 * loopDuration) {
  } else {
    ry =
      (Math.PI / 2) *
      easings.InOutCubic((time - 0.5 * loopDuration) / (0.5 * loopDuration));
  }

  const scale = Maf.randomInRange(0, 1);
  cubes.forEach((cube) => {
    let f = 0;
    if (time < 0.5 * loopDuration) {
      const t = Math.max(0, time - 0.1 * cube.offset * loopDuration);
      f = 1 - easings.InOutQuint(t / (0.5 * loopDuration));
    } else {
      cube.offset = scale * Maf.randomInRange(0, 1);
    }
    const s = cube.id === 13 ? f2 : f;
    cube.mesh.scale.setScalar(Math.max(s, 0.00001));
  });

  const t = 0.0001 * performance.now();
  group.rotation.y = ry;
  group.rotation.y += +1.3 * t;
  group.rotation.x = 1.1 * t;

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
    material.color.setHex(0x404040);
    backdrop.material.uniforms.darkColor.value.setHex(0x404040);
    backdrop.material.uniforms.brightColor.value.setHex(0xffffff);
    renderer.setClearColor(0xffffff, 1);
  } else {
    material.color.setHex(0xaaaaaa);
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
  finalPass.setSize(rw, rh);
});

export { draw, loopDuration, renderer, camera };
