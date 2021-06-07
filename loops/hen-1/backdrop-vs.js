const shader = `#version 300 es
precision highp float;

in vec3 position;
in vec2 uv;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

out vec2 vUv;

void main() {
  vec4 p = vec4( position, 1. );
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * p;
}`;

export { shader };
