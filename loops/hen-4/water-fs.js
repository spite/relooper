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
  // if(p.x>=0. && p.x<1. && p.y>=0. && p.y<1. && p.z>=0. && p.z<1.) {
  //   return 1.;
  // }
  // return 0.;
  return texture(volumeMap, p).r;

  vec3 q = p;// - vec3(0.0,0.1,1.0)*time;
  float f;
    f  = 0.50000*noise3d( q );
    q = q*2.02;
    f += 0.25000*noise3d( q );
  return f;
}

#define MAX 200

void main() {
  vec3 lightColor = vec3(41.,86.,80.)/255.;
  vec3 darkColor = vec3(32.,37.,42.)/255.;

  vec4 normal = texture(normalsTexture, vUv);
  vec4 back = texture(backTexture,vUv);
  vec4 front = texture(frontTexture,vUv);
  vec3 dir = back.xyz-front.xyz;
  float ld = length(dir);
  // dir = refract(dir,normalize(normal.xyz), .8);
  float d = length(dir);
  dir = normalize(dir);
  float fSteps = float(MAX) * d;
  int steps = int(fSteps);
  vec3 fStep = dir / fSteps;
  float n = 0.;
  vec3 p = back.xyz;
  vec3 boundingBox = vec3(3.5);
  for(int i=0; i<MAX; i++){
    if(i>steps || n>1.) {
      break;
    }
    p = front.xyz + float(i) * fStep;
    float v = clamp(map(p/boundingBox+.5 ),0.,1.);
    n += v/fSteps;
  }
  n *= 10.;
  vec3 color = vec3(0.);//texture(colorTexture, vUv).xyz;
  float mask = clamp(ld,0.,1.);
  fragColor.rgb = mix(darkColor,lightColor*n,mask);
  fragColor.rgb += color * back.a;
  float rim = smoothstep(.5,1.,(1.-ld));
  fragColor.rgb += lightColor *rim * back.a;
  fragColor.rgb = mix(vec3(.3), fragColor.rgb, back.a);
  fragColor.a = 1.;

  // fragColor.rgb =1.- vec3(rim+clamp(d*n, 0., 1.));
  // fragColor.rgb = normal.rgb;
  // fragColor.rgb = front.xyz / boundingBox;
}`;

export { shader };
