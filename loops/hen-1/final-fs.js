import { shader as rgbSplit } from "../../shaders/rgb-split.js";

const shader = `#version 300 es
precision highp float;

uniform vec2 resolution;
uniform sampler2D tInput;
uniform float time;

in vec2 vUv;

out vec4 fragColor;

vec2 hash( vec2 p ) {
	p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) );
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

${rgbSplit}

void main() {
  // vec2 dir = vec2(10., 10.)/resolution;
  vec2 dir = vec2(.5 - vUv)*30./resolution;  
  fragColor = rgbSplit(tInput, vUv, dir);
  fragColor.rgb += .01*hash(vUv + vec2(time, 0.)).x;
}
`;

export { shader };
