// GLSL for the sky of observers.

const hash = /* glsl */ `
float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i), n100 = hash13(i + vec3(1, 0, 0)), n010 = hash13(i + vec3(0, 1, 0)), n110 = hash13(i + vec3(1, 1, 0));
  float n001 = hash13(i + vec3(0, 0, 1)), n101 = hash13(i + vec3(1, 0, 1)), n011 = hash13(i + vec3(0, 1, 1)), n111 = hash13(i + vec3(1, 1, 1));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y), mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}
`;

// Pushes a projected point away from the cursor, in screen space, with a little swirl.
const scatter = /* glsl */ `
uniform vec2 uMouse;
uniform float uAspect;
uniform float uMouseOn;
vec4 scatter(vec4 clip, float strength) {
  vec2 ndc = clip.xy / clip.w;
  vec2 d = (ndc - uMouse) * vec2(uAspect, 1.0);
  float len = length(d) + 1e-4;
  float f = exp(-len * len * 40.0) * uMouseOn * strength;
  vec2 dir = d / len;
  vec2 push = (dir + vec2(-dir.y, dir.x) * 0.6) * f * 0.09;
  clip.xy += push / vec2(uAspect, 1.0) * clip.w;
  return clip;
}
`;

// The night itself: a dark dome, the band of the galaxy, and a glow on the horizon.
export const domeVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const domeFragment = /* glsl */ `
uniform float uTime;
uniform vec3 uBand;
varying vec3 vDir;
${hash}
void main() {
  vec3 d = normalize(vDir);
  vec3 zenith = vec3(0.012, 0.016, 0.03);
  vec3 low = vec3(0.05, 0.042, 0.04);
  vec3 col = mix(low, zenith, smoothstep(-0.05, 0.55, d.y));
  // The galaxy: a soft band along a tilted great circle, broken up by dust.
  float b = dot(d, uBand);
  float band = exp(-b * b * 26.0);
  float dust = fbm(d * 3.2 + vec3(0.0, uTime * 0.004, 0.0));
  float lanes = smoothstep(0.35, 0.75, fbm(d * 7.0 + 11.0));
  float glow = band * (0.35 + 0.9 * dust) * (1.0 - 0.75 * lanes * band);
  col += glow * mix(vec3(0.07, 0.065, 0.09), vec3(0.16, 0.12, 0.09), dust) * 0.9;
  // Faint far nebulae.
  float neb = smoothstep(0.55, 0.95, fbm(d * 1.6 + 4.0));
  col += neb * vec3(0.03, 0.02, 0.05);
  // Light rising off the horizon.
  col += vec3(0.11, 0.075, 0.05) * exp(-max(d.y, 0.0) * 9.0) * 0.6;
  col *= 0.94 + 0.06 * hash13(floor(gl_FragCoord.xyx));
  gl_FragColor = vec4(col, 1.0);
}
`;

// Thousands of anonymous stars, twinkling.
export const dustVertex = /* glsl */ `
attribute float aSize;
attribute float aSeed;
attribute vec3 aTint;
uniform float uTime;
uniform float uPixel;
varying float vAlpha;
varying vec3 vTint;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.6 + 0.4 * sin(uTime * (0.8 + aSeed * 2.5) + aSeed * 60.0);
  vAlpha = tw * smoothstep(0.0, 4.0, uTime - aSeed * 2.0);
  vTint = aTint;
  gl_PointSize = aSize * uPixel;
}
`;

export const dustFragment = /* glsl */ `
varying float vAlpha;
varying vec3 vTint;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vTint, a * a * vAlpha);
}
`;

// The observers: one bright star each, with spikes, a halo and (for the chosen one) a ring.
export const starVertex = /* glsl */ `
attribute float aMark;
attribute float aBirth;
attribute float aSeed;
uniform float uTime;
uniform float uPixel;
uniform float uHover;
uniform float uFocus;
varying float vAlpha;
varying float vHot;
varying float vRing;
${scatter}
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = scatter(projectionMatrix * mv, 0.25);
  float born = smoothstep(aBirth, aBirth + 1.2, uTime);
  float hot = max(step(abs(aMark - uHover), 0.5), step(abs(aMark - uFocus), 0.5));
  float tw = 0.75 + 0.25 * sin(uTime * (1.1 + aSeed * 1.7) + aSeed * 40.0);
  vAlpha = born * tw;
  vHot = hot;
  vRing = step(abs(aMark - uFocus), 0.5);
  // A flash as each star ignites.
  float flash = exp(-max(uTime - aBirth - 0.4, 0.0) * 3.0) * born;
  gl_PointSize = (34.0 + hot * 26.0 + flash * 40.0) * uPixel;
}
`;

export const starFragment = /* glsl */ `
uniform float uTime;
varying float vAlpha;
varying float vHot;
varying float vRing;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float core = exp(-d * d * 900.0);
  float halo = exp(-d * d * 60.0) * (0.35 + vHot * 0.3);
  float spikes = (exp(-abs(uv.x) * 90.0) * exp(-abs(uv.y) * 7.0) + exp(-abs(uv.y) * 90.0) * exp(-abs(uv.x) * 7.0)) * (0.45 + vHot * 0.5);
  float ring = 0.0;
  if (vRing > 0.5) {
    float r = fract(uTime / 2.4) * 0.48;
    ring = smoothstep(0.012, 0.0, abs(d - r)) * (1.0 - r / 0.48);
  }
  float a = (core + halo + spikes + ring) * vAlpha * smoothstep(0.5, 0.42, d);
  vec3 col = mix(vec3(0.94, 0.91, 0.86), vec3(1.0, 0.95, 0.84), vHot);
  gl_FragColor = vec4(col * (1.0 + core * 1.5), a);
}
`;

// The answers, written into the sky in particles. They swarm in from scattered dust and
// settle into words, breathing slightly, and scatter from the cursor.
export const wordVertex = /* glsl */ `
attribute vec3 aStart;
attribute float aMark;
attribute float aDelay;
attribute float aSeed;
uniform float uTime;
uniform float uPixel;
uniform float uHover;
uniform float uFocus;
varying float vAlpha;
varying float vHot;
${scatter}
void main() {
  float k = clamp((uTime - aDelay) / 3.2, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - k, 4.0);
  vec3 p = mix(aStart, position, e);
  // Swirl on the way in, then a slow breath.
  float swirl = (1.0 - e) * 3.0;
  p += vec3(sin(uTime * 0.9 + aSeed * 30.0), cos(uTime * 0.7 + aSeed * 21.0), sin(uTime * 0.8 + aSeed * 17.0)) * (swirl + 0.035);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float hot = max(step(abs(aMark - uHover), 0.5), step(abs(aMark - uFocus), 0.5));
  gl_Position = scatter(projectionMatrix * mv, 1.0 - hot * 0.6);
  float tw = 0.7 + 0.3 * sin(uTime * (2.0 + aSeed * 3.0) + aSeed * 90.0);
  vAlpha = smoothstep(0.0, 0.25, k) * tw * (0.42 + hot * 0.58);
  vHot = hot;
  gl_PointSize = (1.6 + hot * 0.7 + (1.0 - e) * 2.0) * uPixel;
}
`;

export const wordFragment = /* glsl */ `
varying float vAlpha;
varying float vHot;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d);
  vec3 col = mix(vec3(0.94, 0.91, 0.86), vec3(1.0, 0.94, 0.8), vHot);
  gl_FragColor = vec4(col, a * vAlpha);
}
`;

// Constellation threads, drawn on after their stars have lit.
export const lineVertex = /* glsl */ `
attribute float aBirth;
uniform float uTime;
varying float vAlpha;
void main() {
  vAlpha = smoothstep(aBirth, aBirth + 2.0, uTime);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const lineFragment = /* glsl */ `
uniform float uOpacity;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(0.94, 0.91, 0.86, vAlpha * uOpacity);
}
`;
