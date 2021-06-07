import { shader as hash } from "../../shaders/hash.js";

const shader = `#version 300 es
precision highp float;

uniform vec2 resolution;
uniform vec3 brightColor;
uniform vec3 darkColor;

in vec2 vUv;

out vec4 fragColor;

${hash}

void main() {
  float ar = resolution.x / resolution.y;
  vec2 center = resolution * .5;
  float d = length(center-gl_FragCoord.xy) / length(resolution);
  fragColor = vec4(mix(brightColor, darkColor, d),1.);
  fragColor.rgb += .01 * vec3(hash(vUv).x);
}
`;

export { shader };
