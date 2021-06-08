import {
  RawShaderMaterial,
  HalfFloatType,
  NearestFilter,
  RGBAFormat,
  UnsignedByteType,
  LinearFilter,
  ClampToEdgeWrapping,
  BackSide,
  FrontSide,
  Vector2,
  Vector3,
  DataTexture3D,
  RedFormat,
  FloatType,
} from "../../third_party/three.module.js";
import { getFBO } from "../../modules/fbo.js";
import { shader as orthoVertexShader } from "../../shaders/ortho.js";
import { shader as waterFragmentShader } from "./water-fs.js";
import { ShaderPass } from "../../modules/shader-pass.js";
import { shader as vignette } from "../../shaders/vignette.js";
import { shader as fxaa } from "../../shaders/fxaa.js";
import { shader as softLight } from "../../shaders/soft-light.js";
import { shader as colorDodge } from "../../shaders/color-dodge.js";
import { shader as rgbShift } from "../../shaders/rgb-shift.js";
import { perlin3 } from "../../third_party/perlin.js";

const aberrationFragmentShader = `#version 300 es
precision highp float;

uniform vec2 resolution;
uniform sampler2D inputTexture;

in vec2 vUv;

out vec4 fragColor;

${rgbShift}

void main() {
  vec4 color = rgbShift(inputTexture, vUv, vec2(30.));
  fragColor = color;
}
`;

const finalFragmentShader = `#version 300 es
precision highp float;

uniform vec2 resolution;
uniform sampler2D inputTexture;
uniform float vignetteBoost;
uniform float vignetteReduction;

in vec2 vUv;

out vec4 fragColor;

${vignette}

${fxaa}

${softLight}

${colorDodge}

void main() {
  vec4 color = fxaa(inputTexture, vUv);
  vec4 finalColor = softLight(color, vec4(vec3(vignette(vUv, vignetteBoost, vignetteReduction)),1.));
  fragColor = finalColor;
}
`;

function perlin(x, y, z) {
  // return 0.5 + 0.5 * perlin3(x, y, z);
  const s = 2.02;
  const s2 = 0.51;
  return (
    perlin3(x, y, z) +
    perlin3(s * x, s * y, s * z) +
    perlin3(s2 * x, s2 * y, s2 * z)
  );
}

const normal = new Vector3();

function perlinNormal(x, y, z) {
  const step = 0.001;
  normal.x = perlin(x - step, y, z) - perlin(x + step, y, z);
  normal.y = perlin(x, y - step, z) - perlin(x, y + step, z);
  normal.z = perlin(x, y, z - step) - perlin(x, y, z + step);

  normal.normalize();
  return normal;
}

function generatePerlin(data, ox, oy, oz) {
  let ptr = 0;
  const s = 0.05;

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ox = x - 0.5 * width;
        const oy = y - 0.5 * height;
        const oz = z - 0.5 * depth;
        const alpha = Math.atan2(ox, oz);
        const d = Math.sqrt(ox ** 2 + oz ** 2);
        const beta = (0 * d) / 10;
        const px = s * (0.5 + d * Math.cos(alpha + beta));
        const py = s * (0.5 + oy);
        const pz = s * (0.5 + d * Math.sin(alpha + beta));

        data[ptr] = perlin(px, py, pz);
        /*
        perlinNormal(ox + s * x, oy + s * y, oz + s * z);
        data2[ptr*3+0] = normal.x;
        data2[ptr*3+1] = normal.y;
        data2[ptr*3+2] = normal.z;
        */
        ptr++;
      }
    }
  }
}

const size = 128;
const width = size;
const height = size;
const depth = size;

const data = new Float32Array(width * height * depth);
generatePerlin(data, 0, 0, 0);

const texture = new DataTexture3D(data, width, height, depth);
texture.format = RedFormat;
texture.type = FloatType;
texture.minFilter = LinearFilter;
texture.magFilter = LinearFilter;
texture.wrapS = ClampToEdgeWrapping;
texture.wrapT = ClampToEdgeWrapping;
texture.unpackAlignment = 1;

class Post {
  constructor(renderer, baseMaterial, lightMaterial, params = {}) {
    this.renderer = renderer;
    this.baseMaterial = baseMaterial;
    this.lightMaterial = lightMaterial;

    this.backFBO = getFBO(1, 1, {
      type: HalfFloatType,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    });
    this.frontFBO = getFBO(1, 1, {
      type: HalfFloatType,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    });
    this.normalsFBO = getFBO(1, 1, {
      type: HalfFloatType,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    });
    this.colorFBO = getFBO(1, 1);

    this.waterShader = new RawShaderMaterial({
      uniforms: {
        volumeMap: { value: texture },
        backTexture: { value: this.backFBO.texture },
        frontTexture: { value: this.frontFBO.texture },
        normalsTexture: { value: this.normalsFBO.texture },
        colorTexture: { value: this.colorFBO.texture },
        time: { value: 0 },
      },
      vertexShader: orthoVertexShader,
      fragmentShader: waterFragmentShader,
    });
    this.waterPass = new ShaderPass(
      renderer,
      this.waterShader,
      1,
      1,
      RGBAFormat,
      UnsignedByteType,
      LinearFilter,
      LinearFilter,
      ClampToEdgeWrapping,
      ClampToEdgeWrapping
    );

    this.finalShader = new RawShaderMaterial({
      uniforms: {
        resolution: { value: new Vector2(1, 1) },
        vignetteBoost: { value: params.vignetteBoost || 0.5 },
        vignetteReduction: { value: params.vignetteReduction || 0.5 },
        inputTexture: { value: this.waterPass.fbo.texture },
      },
      vertexShader: orthoVertexShader,
      fragmentShader: finalFragmentShader,
    });
    this.finalPass = new ShaderPass(
      renderer,
      this.finalShader,
      1,
      1,
      RGBAFormat,
      UnsignedByteType,
      LinearFilter,
      LinearFilter,
      ClampToEdgeWrapping,
      ClampToEdgeWrapping
    );

    this.aberrationShader = new RawShaderMaterial({
      uniforms: {
        resolution: { value: new Vector2(1, 1) },
        inputTexture: { value: this.finalPass.fbo.texture },
      },
      vertexShader: orthoVertexShader,
      fragmentShader: aberrationFragmentShader,
    });
    this.aberrationPass = new ShaderPass(
      renderer,
      this.aberrationShader,
      1,
      1,
      RGBAFormat,
      UnsignedByteType,
      LinearFilter,
      LinearFilter,
      ClampToEdgeWrapping,
      ClampToEdgeWrapping
    );
  }

  setSize(w, h) {
    this.backFBO.setSize(w, h);
    this.frontFBO.setSize(w, h);
    this.normalsFBO.setSize(w, h);
    this.colorFBO.setSize(w, h);
    this.waterPass.setSize(w, h);
    this.aberrationPass.setSize(w, h);
    this.finalPass.setSize(w, h);
    this.finalShader.uniforms.resolution.value.set(w, h);
    this.aberrationShader.uniforms.resolution.value.set(w, h);
  }

  render(scene, camera) {
    scene.overrideMaterial = this.baseMaterial;
    this.renderer.setClearColor(0xff00ff, 0);
    this.baseMaterial.uniforms.time.value = 0.001 * performance.now();
    this.baseMaterial.uniforms.showNormals.value = 0;
    this.baseMaterial.side = BackSide;
    this.renderer.setRenderTarget(this.backFBO);
    this.renderer.render(scene, camera);

    this.baseMaterial.side = FrontSide;
    this.renderer.setRenderTarget(this.frontFBO);
    this.renderer.render(scene, camera);

    this.baseMaterial.uniforms.showNormals.value = 1;
    this.renderer.setRenderTarget(this.normalsFBO);
    this.renderer.render(scene, camera);

    scene.overrideMaterial = this.lightMaterial;
    this.renderer.setRenderTarget(this.colorFBO);
    this.renderer.render(scene, camera, this.colorFBO);
    scene.overrideMaterial = null;

    this.renderer.setRenderTarget(null);

    this.waterPass.shader.uniforms.time.value = 0.001 * performance.now();
    this.waterPass.render();
    this.finalPass.render();
    this.aberrationPass.render(true);
  }
}

export { Post };
