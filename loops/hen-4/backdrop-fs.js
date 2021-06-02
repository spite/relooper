import { shader as hash } from "../../shaders/hash.js";

const shader = `
precision highp float;

uniform vec2 resolution;
uniform vec3 brightColor;
uniform vec3 darkColor;

varying vec2 vUv;

${hash}

void main() {
  float ar = resolution.x / resolution.y;
  vec2 center = resolution * .5;
  float d = length(center-gl_FragCoord.xy) / length(resolution);
  gl_FragColor = vec4(mix(brightColor, darkColor, d),1.);
  gl_FragColor.rgb += .01 * vec3(hash(vUv).x);
}
`;

export { shader };
