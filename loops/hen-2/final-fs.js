import { shader as rgbSplit } from "../../shaders/rgb-split.js";

const shader = `
precision highp float;

uniform vec2 resolution;
uniform sampler2D tInput;
uniform float time;

varying vec2 vUv;

vec2 hash( vec2 p ) {
	p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) );
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

${rgbSplit}

void main() {
  // vec2 dir = vec2(10., 10.)/resolution;
  vec2 dir = vec2(.5 - vUv)*50./resolution;  
  gl_FragColor = rgbSplit(tInput, vUv, dir);
  gl_FragColor.rgb += .01*hash(vUv + vec2(time, 0.)).x;
}
`;

export { shader };
