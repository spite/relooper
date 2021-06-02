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

const aberrationFragmentShader = `
precision highp float;
uniform vec2 resolution;
uniform sampler2D inputTexture;
varying vec2 vUv;
${rgbShift}
void main() {
  vec4 color = rgbShift(inputTexture, vUv, vec2(30.));
  gl_FragColor = color;
}
`;

const finalFragmentShader = `
precision highp float;
uniform vec2 resolution;
uniform sampler2D inputTexture;
uniform float vignetteBoost;
uniform float vignetteReduction;
varying vec2 vUv;
${vignette}
${fxaa}
${softLight}
${colorDodge}
void main() {
  vec4 color = fxaa(inputTexture, vUv);
  vec4 finalColor = softLight(color, vec4(vec3(vignette(vUv, vignetteBoost, vignetteReduction)),1.));
  gl_FragColor = finalColor;
}
`;

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
        backTexture: { value: this.backFBO.texture },
        frontTexture: { value: this.frontFBO.texture },
        normalsTexture: { value: this.normalsFBO.texture },
        colorTexture: { value: this.colorFBO.texture },
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

    this.waterPass.render();
    this.finalPass.render();
    this.aberrationPass.render(true);
  }
}

export { Post };
