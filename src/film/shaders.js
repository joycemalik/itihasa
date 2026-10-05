// GLSL for the particle film. Shared helpers first, then the two GPGPU passes, then drawing.

const common = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 hash32(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}

// Per-particle progress of a morph. Particles leave in a staggered wave, highest first,
// so a new shape gets drawn in from the top instead of popping in all at once.
float morphFactor(float morph, float rnd, float targetY) {
  float sweep = 1.0 - clamp((targetY + 2.5) / 6.0, 0.0, 1.0);
  float delay = rnd * 0.55 + sweep * 0.45;
  return smoothstep(0.0, 1.0, clamp(morph * 1.8 - delay * 0.8, 0.0, 1.0));
}
`;

const noise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
vec3 snoiseVec3(vec3 x) {
  return vec3(snoise(x), snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2)), snoise(vec3(x.z + 74.2, x.x - 124.4, x.y + 99.4)));
}
// Divergence-free flow: particles swirl like smoke instead of jittering.
vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
  vec3 px0 = snoiseVec3(p - dx), px1 = snoiseVec3(p + dx);
  vec3 py0 = snoiseVec3(p - dy), py1 = snoiseVec3(p + dy);
  vec3 pz0 = snoiseVec3(p - dz), pz1 = snoiseVec3(p + dz);
  vec3 c = vec3(py1.z - py0.z - pz1.y + pz0.y, pz1.x - pz0.x - px1.z + px0.z, px1.y - px0.y - py1.x + py0.x);
  return c / (2.0 * e);
}
`;

// --- GPGPU: velocity. Springs toward the current target, swirls in curl noise, flees the cursor.
export const velocityShader = /* glsl */ `
uniform float uTime;
uniform float uDelta;
uniform float uMorph;
uniform float uChaos;
uniform float uIntro;
uniform float uBurst;
uniform float uSpring;
uniform float uDrag;
uniform float uMouseForce;
uniform vec3 uBulb;
uniform vec3 uRayO;
uniform vec3 uRayD;
uniform sampler2D uTargetA;
uniform sampler2D uTargetB;
${common}
${noise}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  float rnd = hash12(uv * 512.0);
  vec3 h = hash32(uv * 512.0) - 0.5;
  vec3 p = texture2D(texturePosition, uv).xyz;
  vec3 v = texture2D(textureVelocity, uv).xyz;
  vec4 tA = texture2D(uTargetA, uv);
  vec4 tB = texture2D(uTargetB, uv);

  float m = morphFactor(uMorph, rnd, tB.y);
  vec3 target = mix(tA.xyz, tB.xyz, m);
  target = mix(target, uBulb + h * 0.2, uIntro);
  float transit = sin(m * 3.14159);
  float dt = min(uDelta, 1.0 / 30.0);

  // Springs loosen mid-flight so the swirl can carry particles between shapes.
  vec3 acc = (target - p) * uSpring * (1.0 - 0.8 * transit);
  acc += curlNoise(p * 0.35 + vec3(0.0, uTime * 0.06, uTime * 0.03)) * (uChaos + transit * 3.2) * (0.5 + rnd);

  vec3 rel = p - uRayO;
  vec3 d = rel - uRayD * dot(rel, uRayD);
  float dist = length(d);
  acc += (d / max(dist, 0.001)) * uMouseForce * 38.0 * (1.0 - smoothstep(0.0, 0.85, dist));

  v += acc * dt;
  v *= exp(-uDrag * dt);
  v += normalize(h + 0.0001) * uBurst * (0.4 + rnd * 1.6);
  gl_FragColor = vec4(v, 1.0);
}
`;

export const positionShader = /* glsl */ `
uniform float uDelta;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 p = texture2D(texturePosition, uv).xyz;
  vec3 v = texture2D(textureVelocity, uv).xyz;
  gl_FragColor = vec4(p + v * min(uDelta, 1.0 / 30.0), 1.0);
}
`;

// --- Drawing. Each particle is one pencil stroke.
export const renderVertex = /* glsl */ `
uniform sampler2D uPositions;
uniform sampler2D uVelocities;
uniform sampler2D uTargetA;
uniform sampler2D uTargetB;
uniform sampler2D uNormalA;
uniform sampler2D uNormalB;
uniform float uMorph;
uniform float uTime;
uniform float uSceneTA;
uniform float uSceneTB;
uniform float uStroke;
uniform float uProj;
uniform float uDpr;
uniform float uReveal;
uniform float uTone;
uniform float uFocus;
uniform vec3 uLightDir;
attribute vec2 aRef;
varying float vAlpha;
varying float vAngle;
varying float vThick;
varying float vSoft;
varying float vSeed;
${common}

const float PI = 3.14159265;

float funnelR(float s) { return 2.8 + (0.08 - 2.8) * pow(s, 0.55); }

// Analytic motion layered over the simulated position, per FLAG in shapes.js.
// Returns an offset; writes an alpha multiplier and a velocity (for stroke direction).
vec3 flagOffset(vec4 t, float rnd, float sceneT, out float a, out vec3 vel) {
  float f = t.w;
  vec3 p = t.xyz;
  a = 1.0;
  vel = vec3(0.0);
  if (f < 0.5) return vec3(0.0);
  if (f < 1.5) { // THOUGHT
    float life = fract(uTime * 0.07 * (0.6 + rnd) + rnd * 7.31);
    float ang = rnd * 40.0 + uTime * 0.5 * (0.4 + rnd);
    float rad = 0.04 + life * (0.4 + 0.9 * rnd);
    a = sin(life * PI) * 0.35;
    vel = vec3(0.3, 1.0, 0.0);
    return vec3(cos(ang) * rad + life * 0.6, life * 3.0, sin(ang) * rad);
  }
  if (f < 2.5) { // DUST
    a = 0.3;
    return 0.2 * vec3(sin(uTime * 0.13 + rnd * 30.0), sin(uTime * 0.11 + rnd * 17.0), cos(uTime * 0.09 + rnd * 11.0));
  }
  if (f < 3.5) { // VORTEX
    float s0 = clamp(-p.y / 3.0, 0.0, 1.0);
    float s = fract(s0 + uTime * 0.035);
    float r = funnelR(s);
    float ang = atan(p.z, p.x) + uTime * 0.15 + s * 5.0 + uTime * 0.5 * s;
    vec3 np = vec3(cos(ang) * r, -3.0 * s, sin(ang) * r);
    a = smoothstep(1.0, 0.82, s) * smoothstep(0.0, 0.06, s);
    vel = vec3(-sin(ang), -0.4, cos(ang)) * (0.5 + 2.0 * s);
    return np - p;
  }
  if (f < 4.5) { // HUM
    return p * (0.03 * sin(uTime * 40.0 + rnd * 6.28) + 0.05 * sin(uTime * 1.7 + p.y * 2.5));
  }
  if (f < 5.5) { // STREAM
    float L = 24.0;
    float x = mod(p.x + uTime * (9.0 + rnd * 7.0) + L * 0.5, L) - L * 0.5;
    a = 0.4 * (1.0 - smoothstep(L * 0.3, L * 0.5, abs(x)));
    vel = vec3(14.0, 0.0, 0.0);
    return vec3(x - p.x, 0.0, 0.0);
  }
  if (f < 6.5) { // SPIN
    float ang = uTime * 0.14;
    float c = cos(ang), s = sin(ang);
    return vec3(c * p.x - s * p.z, p.y + 0.05 * sin(uTime + rnd * 6.0), s * p.x + c * p.z) - p;
  }
  if (f < 7.5) { // GHOST
    a = 0.2;
    return vec3(0.0);
  }
  if (f < 8.5) { // PULSE
    float wave = sin(dot(p, vec3(0.7, 0.5, 0.3)) * 2.2 - uTime * 2.4 + rnd * 0.3);
    a = 0.5 + 1.8 * pow(max(wave, 0.0), 14.0);
    return vec3(0.0);
  }
  if (f < 9.5) { // PEEL
    float life = fract(uTime * 0.045 + rnd * 3.7);
    a = (1.0 - life) * 0.6;
    return normalize(p + 0.0001) * life * 1.3 + vec3(0.0, life * 0.5, 0.0);
  }
  if (f < 10.5) { // DISSOLVE
    float k = smoothstep(rnd * 0.7, rnd * 0.7 + 0.3, sceneT);
    vec3 h = hash32(t.xy * 91.7 + rnd) - 0.5;
    a = 1.0 - k * 0.8;
    vel = vec3(0.0, k * 1.5, 0.0);
    return (h * vec3(6.0, 3.0, 6.0) + vec3(0.0, 2.2, 0.0)) * k;
  }
  if (f < 11.5) { // IRIS
    float r = max(length(p.xy), 0.0001);
    float pupil = mix(0.55, 0.2, smoothstep(0.1, 0.9, sceneT));
    float nr = mix(pupil, 1.0, clamp((r - 0.55) / 0.45, 0.0, 1.0));
    return vec3(p.xy / r * nr - p.xy, 0.0);
  }
  if (f < 12.5) { // SMOKE
    float life = fract(uTime * 0.035 * (0.5 + rnd) + rnd * 9.1);
    float ang = rnd * 30.0 + uTime * 0.25 + life * 3.0;
    float rad = 0.1 + life * 2.4 * rnd;
    a = sin(life * PI) * 0.6;
    vel = vec3(0.0, 1.2, 0.0);
    return vec3(cos(ang) * rad, life * 4.2 + 0.25 * sin(life * 8.0 + rnd * 10.0), sin(ang) * rad);
  }
  return vec3(0.0);
}

void main() {
  float rnd = hash12(aRef * 512.0);
  vec4 tA = texture2D(uTargetA, aRef);
  vec4 tB = texture2D(uTargetB, aRef);
  vec4 nA = texture2D(uNormalA, aRef);
  vec4 nB = texture2D(uNormalB, aRef);
  float m = morphFactor(uMorph, rnd, tB.y);

  vec3 pos = texture2D(uPositions, aRef).xyz;
  vec3 vel = texture2D(uVelocities, aRef).xyz;
  float aA, aB;
  vec3 vA, vB;
  vec3 offA = flagOffset(tA, rnd, uSceneTA, aA, vA);
  vec3 offB = flagOffset(tB, rnd, uSceneTB, aB, vB);
  pos += mix(offA, offB, m);
  vel += mix(vA, vB, m);
  float flagAlpha = mix(aA, aB, m);
  vec4 nn = m < 0.5 ? nA : nB;
  float transit = sin(m * PI);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = max(-mv.z, 0.001);

  // Default: diagonal hatching, crossed in places, like shading with a pencil.
  float angle = 0.78 + (rnd > 0.7 ? 1.5708 : 0.0);
  float alpha = 0.45;
  float lenMul = 1.0;
  vec3 n = nn.xyz;
  if (nn.w > 0.5) {
    // Drawn line: stroke along it.
    vec2 t2 = (viewMatrix * vec4(n, 0.0)).xy;
    angle = atan(t2.y, t2.x);
    alpha = 0.62;
    lenMul = 1.4;
  } else if (length(n) > 0.1) {
    // Surface: silhouettes become contour lines, lit sides get light hatching.
    vec3 vn = normalize((viewMatrix * vec4(n, 0.0)).xyz);
    float facing = abs(dot(vn, normalize(-mv.xyz)));
    float rim = pow(1.0 - facing, 2.5);
    float diff = dot(normalize(n), uLightDir) * 0.5 + 0.5;
    float shade = mix(diff, 1.0 - diff, uTone);
    if (rim > 0.22 + rnd * 0.25) {
      angle = atan(vn.y, vn.x) + 1.5708;
      lenMul = 1.3;
    }
    alpha = 0.035 + 0.24 * shade * shade + 0.8 * rim;
  }

  // Fast particles become motion streaks.
  float speed = length(vel);
  if (speed > 1.2) {
    vec2 v2 = (viewMatrix * vec4(vel, 0.0)).xy;
    angle = atan(v2.y, v2.x);
  }
  lenMul *= 1.0 + min(speed * 0.28, 3.5);

  alpha *= flagAlpha * mix(1.0, 0.8, transit);
  alpha *= smoothstep(0.2, 1.1, depth) * (1.0 - smoothstep(20.0, 40.0, depth));
  alpha *= uReveal;

  // Depth of field: strokes off the focal plane swell, soften and fade, like a lens.
  float blur = clamp(abs(depth - uFocus) / (uFocus * 0.55) - 0.15, 0.0, 1.6);
  alpha *= 1.0 / (1.0 + blur * 1.8);

  float size = clamp(uStroke * lenMul * (1.0 + blur * 1.2) * uProj / depth, 1.5, 96.0);
  gl_PointSize = size;
  vThick = (1.15 * uDpr * (1.0 + blur * 3.0)) / size;
  vSoft = blur;
  vAlpha = clamp(alpha, 0.0, 1.0);
  vAngle = angle;
  vSeed = rnd * 10.0;
}
`;

export const renderFragment = /* glsl */ `
uniform vec3 uInk;
varying float vAlpha;
varying float vAngle;
varying float vThick;
varying float vSoft;
varying float vSeed;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  c.y = -c.y;
  vec2 d = vec2(cos(vAngle), sin(vAngle));
  float along = dot(c, d);
  float across = dot(c, vec2(-d.y, d.x));
  float halfT = vThick * 0.5;
  float a = 1.0 - smoothstep(halfT * (1.0 - vSoft * 0.5), halfT + max(vThick * (0.7 + vSoft), 0.02), abs(across));
  a *= 1.0 - smoothstep(0.3, 0.5, abs(along));
  // Far out of focus, a stroke melts into a round bokeh disc.
  float disc = (1.0 - smoothstep(0.18, 0.5, length(c))) * 0.55;
  a = mix(a, disc, smoothstep(0.35, 1.2, vSoft));
  // Graphite grain: the stroke breaks up a little along its length.
  a *= 0.7 + 0.3 * fract(sin((along + vSeed) * 91.7) * 43758.5453);
  a *= vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uInk, a);
}
`;
