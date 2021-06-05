const shader = `#version 300 es
precision highp float;

uniform float showNormals;

in vec4 vColor;

out vec4 fragColor;

void main() {
  if(showNormals == 1.) {
    fragColor = vColor;
  } else {
    fragColor = vec4(.5 + vColor.rgb, 1.);
}
}`;

export { shader };
