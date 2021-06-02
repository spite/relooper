import { shader as rgbSplit } from "../../shaders/rgb-split.js";
import { shader as rgb_spectrum } from "../../shaders/rgb_spectrum.js";

const shader = `
precision highp float;

uniform vec2 resolution;
uniform sampler2D tInput;
uniform float time;

varying vec2 vUv;

vec2 hash( vec2 p ) {
	p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) );
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

${rgb_spectrum}

#define PI          3.14
#define TWO_PI      6.28
#define MAX_SAMPLES 28.0

//uniform float uPower;
//uniform float uAmount;

const float blurRadMax = 0.08;
const float blurCircles = 4.0;
void main() {
  float uPower = 2.;
  float uAmount = 1.;
  vec2 uv = vUv - 0.5;
  uv.x *= resolution.x / resolution.y;
  uv += 0.5;
  float amount = length(uv - 0.5);
  amount = pow(amount, uPower);
  amount *= uAmount;
  float blurRadius = blurRadMax * amount;
  float totalSamples = 0.0;
  vec3 colAcum = vec3(0.0);
  // vec4 sumcol = vec4(0.0);
  // vec4 sumw = vec4(0.0);

  for (float currentCircle = 0.0; currentCircle < blurCircles; currentCircle++) {
    float samplesForCurrentCircle = (pow(currentCircle + 1.0, 2.0) - pow(currentCircle, 2.0)) * 4.0;
    float currentRadius = (blurRadius / blurCircles) * (currentCircle + 0.5);
    for (float currentSample = 0.0; currentSample < MAX_SAMPLES; currentSample++) {
      if (currentSample >= samplesForCurrentCircle) break;
      vec2 samplePoint = vec2(0.0, currentRadius);
      float angle = TWO_PI * ((currentSample + 0.5) / samplesForCurrentCircle);
      float s = sin(angle);
      float c = cos(angle);
      mat2 m = mat2(c, -s, s, c);
      samplePoint = m * samplePoint;
      samplePoint *= vec2(resolution.y / resolution.x, 1.0);
      totalSamples++;
      colAcum += texture2D(tInput, vUv + samplePoint, blurRadius * 30.0).rgb;
      // float t = float(currentSample) * float(MAX_SAMPLES);
      // vec4 w = spectrum_offset( t );
      // sumw += w;
      // colAcum += w * texture2D( tInput, uv+samplePoint, blurRadius * 30.0 ).rgb;
    }
  }
  gl_FragColor = vec4(colAcum / totalSamples, 1.0);
  gl_FragColor.rgb += .01*vec3(hash(vUv).x);
}

// void main() {
//   // vec2 dir = vec2(10., 10.)/resolution;
//   vec2 dir = vec2(.5 - vUv)*100./resolution;  
//   gl_FragColor = rgbSplit(tInput, vUv, dir);
//   gl_FragColor.rgb += .01*hash(vUv + vec2(time, 0.)).x;
// }
`;

export { shader };
