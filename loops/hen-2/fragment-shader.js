const shader = `#version 300 es
precision highp float;

// texture uniforms.
uniform sampler2D matCapMap;
uniform vec3 backgroundColor;

// varyings.
in vec3 pos;
in vec3 normal;

// output.
out vec4 color;

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {  
  // calculate matcap coordinates.
  vec3 n = normalize(normal);
  vec3 eye = normalize(pos.xyz);
  vec3 r = reflect( eye, normal );
  float m = 2. * sqrt( pow( r.x, 2. ) + pow( r.y, 2. ) + pow( r.z + 1., 2. ) );
  vec2 vN = r.xy / m + .5;

  float rim = 1.-pow(abs(dot(eye,n)),2.);
  rim = pow(rim,5.);

  vec3 dx = dFdx(n);
  vec3 dy = dFdy(n);
  vec3 xneg = n - dx;
  vec3 xpos = n + dx;
  vec3 yneg = n - dy;
  vec3 ypos = n + dy;
  float cdepth = 10.;
  float curvature = (cross(xneg, xpos).y - cross(yneg, ypos).x) * 4.0 / cdepth;

  // lookup matcap.
  vec3 mat = texture(matCapMap, vN).rgb;

  // return matcap.
  color = vec4(vec3(luma(mat.rgb)), 1.);
  color.rgb += curvature;
  color.rgb = mix(color.rgb, backgroundColor, rim);
}
`;

export { shader };
