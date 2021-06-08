import noise3d from "../../shaders/noise3d.js";

const shader = `#version 300 es
precision highp float;
precision highp sampler3D;

uniform sampler2D backTexture;
uniform sampler2D frontTexture;
uniform sampler2D normalsTexture;
uniform sampler2D colorTexture;
uniform sampler3D volumeMap;

uniform float time;

in vec2 vUv;

out vec4 fragColor;

${noise3d}

float map( in vec3 p ){
  return texture(volumeMap, p).r;
}

#define MAX 200

void main() {
  vec3 lightColor = vec3(41.,86.,80.)/255.;
  vec3 darkColor = vec3(32.,37.,42.)/255.;

  vec3 boundingBox = vec3(3.5);
  float d = sqrt(3.5*3.5*3.);

  vec4 normal = texture(normalsTexture, vUv);
  vec4 back = texture(backTexture,vUv);
  vec4 front = texture(frontTexture,vUv);
  vec3 dir = back.xyz-front.xyz;
  float ld = length(dir);
  dir = refract(dir,normalize(normal.xyz), .2);
  dir = normalize(dir);
  vec3 fStep = .01*dir / (ld/d);
  float n = 0.;
  vec3 p = back.xyz;
  for(int i=0; i< MAX; i++){
    float dd = length(p.xyz - front.xyz);
    if(dd > ld) {
      break;
    }
    p = front.xyz + float(i) * fStep;
//    float v = clamp(map(p/boundingBox+ 1.25/boundingBox ),0.,1.);
    float v = map(p/boundingBox+ 1.25/boundingBox );
    v = clamp(v, 0., 1.);
    n += smoothstep(.45, .55, v) / 5.;
    n+=.01;
  }
  n /= d;
  vec3 color = texture(colorTexture, vUv).xyz;
  float mask = clamp(ld,0.,1.);
  fragColor.rgb = mix(darkColor,lightColor*n,mask);
  fragColor.rgb += color * back.a;
  float rim = smoothstep(.5,1.,(1.-ld));
  fragColor.rgb += lightColor *rim * back.a;
  fragColor.rgb = mix(vec3(.3), fragColor.rgb, back.a);
  fragColor.a = 1.;
  // fragColor.rgb = vec3(n);
  // fragColor.rgb =1.- vec3(rim+clamp(d*n, 0., 1.));
  // fragColor.rgb = .5 + .5 * normal.rgb;
}`;

export { shader };
