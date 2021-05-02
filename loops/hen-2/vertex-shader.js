const shader = `#version 300 es
precision highp float;

// attributes.
in vec3 position;

// uniforms for vertex transformation.
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;

// uniforms for the effect.
uniform float SEGMENTS;
uniform float SIDES;
uniform float time;
uniform float radius;
uniform float radius2;
uniform float offset;

// varyings.
out vec3 pos;
out vec3 normal;

const float PI = 3.1415926535897932384626433832795;
const float TAU = 2. * PI;

// creates a quaternion out of an axis vector and a rotation angle.
vec4 quat(vec3 axis, float angle) {
  float halfAngle = angle / 2.;
  float s = sin( halfAngle );

  vec4 q = vec4(axis.x * s, axis.y * s, axis.z * s, cos( halfAngle ));
  return q;
}

// applies a quaternion q to a vec3 v. 
vec3 applyQuat( vec4 q, vec3 v ){ 
	return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
}

// returns the base point to generate a ring around.
vec3 getBasePoint(float alpha) {
  float r = radius;
  vec3 p = vec3(r * cos(alpha), 0., r * sin(alpha));
  vec3 dir = vec3(cos(alpha+PI/2.), 0., sin(alpha+PI/2.));

  float a = 5.*alpha;
  p += applyQuat(quat(dir, a), vec3(0., 6., 0.));
  return p;
}

float parabola(float x, float k) {
  return pow(4. * x * (1. - x), k);
}

float getSquircleRadius(float alpha) {
  float n = 2.;
  return 1. + (1./8.)*pow(sin(2.*n*alpha),2.);
}


vec3 getPoint(in float alpha, in float beta, out vec3 normal) {
  // get the base point, and calculate the orientation of the ring dir.
  vec3 base = getBasePoint(alpha);
  float e = .001;
  vec3 prevBase = getBasePoint(alpha - e);
  vec3 nextBase = getBasePoint(alpha + e);
  vec3 dir = normalize(nextBase - prevBase);

  // calculate the radius based on the effect.
  float gamma = beta + alpha + 10.*time;
  float tubeRadius = getSquircleRadius(gamma);
  tubeRadius *= smoothstep(.35, .65, parabola(mod(alpha + offset * TAU + 10.*time, TAU)/TAU, 5.));

  // distribute each side of the ring around the base point.
  vec3 tubeDir = tubeRadius * vec3(0., 1., 0.);
  
  vec4 q = normalize(quat(dir, beta + 4.*alpha + offset * 10.*time));
  tubeDir = normalize(applyQuat(q, tubeDir)) *2.* tubeRadius;
  vec3 newPosition = base + tubeDir;
  normal = tubeDir;

  return newPosition;
}

void main() {
  vec3 newNormal = vec3(0.);
  float alpha = TAU * position.x / SEGMENTS;
  float beta = TAU * position.y / SIDES;
  vec3 newPosition = getPoint(alpha, beta, newNormal);
  vec3 t;
  float e = .01;
  vec3 dx = getPoint(alpha+e, beta, t);
  vec3 dy = getPoint(alpha, beta+e, t);
  newNormal = cross(newPosition-dx, newPosition-dy);

  // the normal is the direction we pulled the vertex.
  normal = normalMatrix * normalize(newNormal);

  // project the position.
  vec4 mvp = modelViewMatrix * vec4(newPosition, 1.);
  pos = mvp.xyz;
  gl_Position = projectionMatrix * mvp;
}
`;

export { shader };
