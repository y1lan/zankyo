import * as THREE from 'three';

const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_treble;
uniform float u_transient;
uniform float u_fov;
uniform vec3 u_camPos;
uniform vec3 u_camTarget;

varying vec2 vUv;

// ── SDF Primitives ──────────────────────────────────────────────

float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sdCross(vec3 p, float s) {
  float a = sdBox(p, vec3(s, 999.0, 999.0));
  float b = sdBox(p, vec3(999.0, s, 999.0));
  float c = sdBox(p, vec3(999.0, 999.0, s));
  return min(a, min(b, c));
}

// ── Menger Sponge SDF with audio-reactive folding ───────────────

float mengerSDF(vec3 p) {
  float scale = 3.0 + u_bass * 0.5;
  float d = sdBox(p, vec3(2.0));

  float s = 1.0;
  for (int i = 0; i < 4; i++) {
    // Audio-reactive rotation per iteration
    float angle = u_time * 0.1 + float(i) * 0.5 + u_transient * 0.3;
    float c = cos(angle), sn = sin(angle);
    p.xz = mat2(c, -sn, sn, c) * p.xz;

    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= scale;
    vec3 r = abs(1.0 - 3.0 * abs(a));

    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float crossDist = (min(da, min(db, dc)) - 1.0) / s;
    d = max(d, -crossDist);
  }
  return d;
}

// ── Scene SDF ───────────────────────────────────────────────────

float sceneSDF(vec3 p) {
  // Repeat space for infinite tunnel feel
  p.z = mod(p.z + u_time * 2.0, 12.0) - 6.0;
  return mengerSDF(p);
}

// ── Ray marching ────────────────────────────────────────────────

float march(vec3 ro, vec3 rd, out int steps) {
  float t = 0.0;
  steps = 0;
  for (int i = 0; i < 80; i++) {
    steps = i;
    vec3 p = ro + rd * t;
    float d = sceneSDF(p);
    if (d < 0.001) break;
    t += d;
    if (t > 60.0) break;
  }
  return t;
}

// ── Normal via central difference ───────────────────────────────

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    sceneSDF(p + e.xyy) - sceneSDF(p - e.xyy),
    sceneSDF(p + e.yxy) - sceneSDF(p - e.yxy),
    sceneSDF(p + e.yyx) - sceneSDF(p - e.yyx)
  ));
}

// ── Camera matrix ───────────────────────────────────────────────

mat3 setCamera(vec3 ro, vec3 ta) {
  vec3 cw = normalize(ta - ro);
  vec3 cu = normalize(cross(cw, vec3(0.0, 1.0, 0.0)));
  vec3 cv = cross(cu, cw);
  return mat3(cu, cv, cw);
}

// ── Main ────────────────────────────────────────────────────────

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

  // Camera
  vec3 ro = u_camPos;
  vec3 ta = u_camTarget;
  mat3 cam = setCamera(ro, ta);

  float fovScale = tan(radians(u_fov) * 0.5);
  vec3 rd = cam * normalize(vec3(uv * fovScale, 1.0));

  // March
  int steps;
  float t = march(ro, rd, steps);

  // Shading
  vec3 col = vec3(0.0);

  if (t < 60.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);

    // Lighting
    vec3 lightDir = normalize(vec3(0.5, 1.0, -0.3));
    float diff = max(dot(n, lightDir), 0.0);
    float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 16.0);

    // Audio-reactive color
    vec3 baseColor = mix(
      vec3(0.1, 0.15, 0.4),
      vec3(0.4, 0.1, 0.6),
      u_bass
    );
    vec3 highColor = vec3(0.2, 0.8, 1.0) * u_treble;

    col = baseColor * (diff * 0.8 + 0.2) + spec * 0.5 + highColor * 0.3;

    // Transient flash
    col += vec3(0.8, 0.4, 1.0) * u_transient * 0.5;

    // Distance fog
    float fog = 1.0 - exp(-t * 0.04);
    col = mix(col, vec3(0.02, 0.01, 0.05), fog);
  } else {
    // Background gradient
    col = vec3(0.02, 0.01, 0.04) + uv.y * 0.02;
  }

  // AO approximation from step count
  float ao = 1.0 - float(steps) / 80.0;
  col *= ao;

  // Output in HDR range (tone mapping handled by renderer)
  col *= 1.5 + u_bass * 0.5;

  gl_FragColor = vec4(col, 1.0);
}
`;

export class FractalBackground {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private transientDecay: number = 0;

  constructor(scene: THREE.Scene) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_bass: { value: 0 },
        u_treble: { value: 0 },
        u_transient: { value: 0 },
        u_fov: { value: 75 },
        u_camPos: { value: new THREE.Vector3(0, 0, -5) },
        u_camTarget: { value: new THREE.Vector3(0, 0, 0) },
      },
      depthWrite: false,
      depthTest: false,
    });

    // Full-screen quad rendered behind everything
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    scene.add(this.mesh);

    window.addEventListener('resize', () => {
      this.material.uniforms.u_resolution.value.set(
        window.innerWidth, window.innerHeight
      );
    });
  }

  onBeat(): void {
    this.transientDecay = 1.0;
  }

  update(bass: number, treble: number, camera: THREE.PerspectiveCamera): void {
    this.material.uniforms.u_time.value = performance.now() * 0.001;
    this.material.uniforms.u_bass.value += (bass - this.material.uniforms.u_bass.value) * 0.1;
    this.material.uniforms.u_treble.value += (treble - this.material.uniforms.u_treble.value) * 0.1;

    // Decay transient
    this.transientDecay *= 0.9;
    this.material.uniforms.u_transient.value = this.transientDecay;

    // Sync camera
    this.material.uniforms.u_fov.value = camera.fov;
    this.material.uniforms.u_camPos.value.copy(camera.position);
    const target = new THREE.Vector3(0, 0, 0);
    camera.getWorldDirection(target);
    target.add(camera.position);
    this.material.uniforms.u_camTarget.value.copy(target);
  }
}
