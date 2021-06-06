const shader = `#version 300 es
precision highp float;

in vec3 position;
in vec3 normal;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat3 normalMatrix;
uniform float time;
uniform float showNormals;

out vec4 vColor;

const float PI = 3.1415926535897932384626433832795;
const float TAU = 2. * PI;

//	Classic Perlin 3D Noise 
//	by Stefan Gustavson
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

vec4 quat(vec3 axis, float angle) {
  float halfAngle = angle / 2.;
  float s = sin( halfAngle );
  vec4 q = vec4(axis.x * s, axis.y * s, axis.z * s, cos( halfAngle ));
  return q;
}

vec3 applyQuat( vec4 q, vec3 v ){ 
	return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
}

vec3 applyAxisAngle( vec3 v, vec3 axis,float angle ) {
  return applyQuat(quat( axis, angle ), v);
}

float squareTurbulence(float v) {
  return 1. - pow(v, 2.);
}

float ridgedTurbulence(float v) {
  return 1. - abs(v);
}

float gaussianTurbulence(float v) {
  return 1. - exp(-pow(v, 2.));
}

float fbm(float x, float y, float z) {
  float value = 0.;
  float amplitude = 1.;
  for (int i = 0; i < 8; i++) {
    value += amplitude * abs(cnoise(vec3(x, y, z)));
    x *= 2.;
    y *= 2.;
    z *= 2.;
    amplitude *= 0.5;
  }
  return ridgedTurbulence(value);
}

float map(float x, float y, float z, float t) {
  float s1 = 0.5;
  float s2 = 1.5;
  float r = 1.;
  return 0.1 * (fbm(s1 * x, s1 * y, s1 * z) + fbm(s2 * x, s2 * y, s2 * z));
}

vec3 pos(float alpha, float beta) {
  float r1 = 1.;
  vec3 base = vec3(
    r1 * cos(alpha),
    0,
    r1 * sin(alpha)
  );

  float a = 0.5;// + .2 * sin(alpha); // semi-diameter
  float b = 0.2; // semi-diameter
  float n = 3.5;// + 2. * sin(3.*alpha+time); // curve (<1, 1-2, >2)
  float gamma = -beta;
  float c = cos(gamma);
  float s = sin(gamma);
  float rx = pow(abs(c), 2. / n) * a * sign(c);
  float ry = pow(abs(s), 2. / n) * b * sign(s);

  vec3 up = vec3(0., 1., 0.);
  vec3 dir = vec3(0., 0., 1.);

  vec3 v = vec3(rx, ry, 0);
  v = applyAxisAngle(v, dir, 1. * alpha + 0.*time);
  v = applyAxisAngle(v, up, alpha);
  vec3 d = normalize(v);
  vec3 p = base + v;
  p += .05*cnoise(4.*p + vec3(0., 0., time)) * d;

  return p;
}

vec3 norm(vec3 p, float alpha, float beta) {
  float e = .0001;
  vec3 p1 = pos(alpha + e, beta);
  vec3 p2 = pos(alpha, beta + e);
  vec3 v1 = p1 - p;
  vec3 v2 = p2 - p;
  return cross(normalize(v1), normalize(v2));
}

void main() {
  
  float alpha = position.x;
  float beta = position.y;

  vec3 p = pos(alpha, beta);

  vec4 mvPosition = modelViewMatrix * vec4( p, 1.0 );
  if(showNormals==1.) {
    vColor.rgb = norm(p, alpha, beta);
  } else {
    vColor.xyz = p.xyz;
  }
  gl_Position = projectionMatrix * mvPosition;
}
`;

export { shader };
