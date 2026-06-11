import * as THREE from 'three';
import {
  MAX_SHADER_NOTES,
  NOTE_HIT_DISTANCE,
  NOTE_SPHERE_RADIUS,
  HIT_RING_FRACTION,
  SHADER_FOV,
  FRACTAL_FULLSCREEN_PLANE_SIZE,
  FRACTAL_UNIFORM_TIME_SCALE,
  FRACTAL_TRANSIENT_DECAY,
  FRACTAL_SHAKE_DECAY,
  FRACTAL_HIT_EFFECT_DECAY,
} from '../engine/config.js';

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
uniform float u_cameraZ;
uniform float u_shake;
uniform float u_ringRadius;
uniform float u_showBg;

// Notes: xyz = world position, w = state (1.0=active, 0.5=hit, 0.0=miss/empty)
uniform vec4 u_notes[${MAX_SHADER_NOTES}];
// Note colors
uniform vec3 u_noteColors[${MAX_SHADER_NOTES}];
// Hit effect timers (0 = no effect, decays from 1.0)
uniform float u_hitEffects[${MAX_SHADER_NOTES}];

varying vec2 vUv;

const float NOTE_RADIUS = ${NOTE_SPHERE_RADIUS.toFixed(2)};
const float HIT_ZONE_Z_OFFSET = ${NOTE_HIT_DISTANCE.toFixed(1)};
const float PI = 3.14159265;

// ── SDF Primitives ──────────────────────────────────────────────

float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

// Smooth union
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// ── Fractal Tunnel SDF ──────────────────────────────────────────

// Infinite Menger sponge — camera flies through carved corridors
float fractalTunnel(vec3 p) {
  // Slight rotation over time for visual interest
  float angle = u_time * 0.02;
  float c = cos(angle), sn = sin(angle);
  p.xy = mat2(c, -sn, sn, c) * p.xy;

  // Start deeply inside solid; iterations carve out cross-shaped voids
  // Lower initial s = wider corridors
  float d = -1.0;
  float s = 0.2;
  float scale = 3.0; // fixed scale — no audio jitter

  for (int i = 0; i < 5; i++) {
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= scale;
    vec3 r = abs(1.0 - 3.0 * abs(a));

    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float cr = (min(da, min(db, dc)) - 1.0) / s;
    d = max(d, cr);
  }

  return d;
}

// ── Note Spheres SDF ────────────────────────────────────────────

struct NoteHit {
  float dist;
  int index;
  vec3 color;
};

NoteHit noteSDF(vec3 p) {
  NoteHit result;
  result.dist = 1e10;
  result.index = -1;
  result.color = vec3(0.0);

  for (int i = 0; i < ${MAX_SHADER_NOTES}; i++) {
    vec3 notePos = u_notes[i].xyz;

    // Draw sphere only for active notes (w > 0.5)
    if (u_notes[i].w > 0.5) {
      float r = NOTE_RADIUS;
      r += 0.005 * sin(u_time * 8.0 + float(i) * 2.0);
      float d = sdSphere(p - notePos, r);
      if (d < result.dist) {
        result.dist = d;
        result.index = i;
        result.color = u_noteColors[i];
      }
    }

    // Hit explosion particles — render even after note disappears
    if (u_hitEffects[i] > 0.01) {
      float ef = u_hitEffects[i];
      vec2 radialDir = normalize(notePos.xy);
      float spread = (1.0 - ef) * 0.5;
      for (int j = 0; j < 6; j++) {
        float angle = float(j) * 1.047; // 6 particles evenly spaced
        vec2 dir = vec2(
          radialDir.x * cos(angle) - radialDir.y * sin(angle),
          radialDir.x * sin(angle) + radialDir.y * cos(angle)
        );
        vec3 particlePos = notePos + vec3(dir * spread, 0.0);
        float particleR = 0.015 * ef;
        float pd = sdSphere(p - particlePos, particleR);
        if (pd < result.dist) {
          result.dist = pd;
          result.index = i;
          result.color = u_noteColors[i];
        }
      }
    }
  }
  return result;
}

// ── Hit Zone Ring SDF ───────────────────────────────────────────

float hitZoneSDF(vec3 p, float hitZ) {
  vec3 q = p;
  q.z -= hitZ;
  // Thin ring
  return sdTorus(vec3(q.x, q.z, q.y), vec2(u_ringRadius, 0.003));
}

// ── Sector Dots on Ring ─────────────────────────────────────────

float sectorDotsSDF(vec3 p, float hitZ) {
  float d = 1e10;
  vec3 q = p;
  q.z -= hitZ;
  for (int i = 0; i < 8; i++) {
    float angle = (PI / 2.0) - float(i) * (PI / 4.0) - (PI / 8.0);
    vec3 dotPos = vec3(cos(angle) * u_ringRadius, sin(angle) * u_ringRadius, 0.0);
    float sd = sdSphere(vec3(q.x, q.y, q.z) - dotPos, 0.012);
    d = min(d, sd);
  }
  return d;
}

// ── Combined Scene SDF ──────────────────────────────────────────

struct SceneResult {
  float dist;
  int material; // 0=fractal, 1=note, 2=hitzone
  vec3 noteColor;
  int noteIndex;
};

SceneResult sceneSDF(vec3 p) {
  SceneResult res;

  float fractal = fractalTunnel(p);
  NoteHit note = noteSDF(p);
  float hitZ = u_cameraZ + HIT_ZONE_Z_OFFSET;
  float hitzone = hitZoneSDF(p, hitZ);
  float dots = sectorDotsSDF(p, hitZ);
  // Merge dots with ring
  float ringAll = min(hitzone, dots);

  res.noteColor = note.color;
  res.noteIndex = note.index;

  // Carve out space around notes and hit zone so they're never hidden
  float fractalCarved = fractal;
  if (note.index >= 0) {
    fractalCarved = max(fractalCarved, -(note.dist - 0.3));
  }
  fractalCarved = max(fractalCarved, -(ringAll - 0.15));

  // Priority: notes > hit zone/dots > carved fractal
  if (note.dist < fractalCarved && note.dist < ringAll) {
    res.dist = note.dist;
    res.material = 1;
  } else if (ringAll < fractalCarved && ringAll < note.dist) {
    res.dist = ringAll;
    res.material = 2;
  } else {
    res.dist = fractalCarved;
    res.material = 0;
  }

  return res;
}

// ── Ray marching ────────────────────────────────────────────────

SceneResult march(vec3 ro, vec3 rd, out int steps) {
  float t = 0.0;
  steps = 0;
  SceneResult res;
  res.dist = 1e10;
  res.material = 0;
  res.noteColor = vec3(0.0);
  res.noteIndex = -1;

  for (int i = 0; i < 120; i++) {
    steps = i;
    vec3 p = ro + rd * t;
    res = sceneSDF(p);
    if (res.dist < 0.0005) {
      res.dist = t;
      return res;
    }
    t += res.dist * 0.8; // understep for Menger precision
    if (t > 50.0) break;
  }
  res.dist = t;
  res.material = -1; // miss
  return res;
}

// ── Normal ──────────────────────────────────────────────────────

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  float d = sceneSDF(p).dist;
  return normalize(vec3(
    sceneSDF(p + e.xyy).dist - d,
    sceneSDF(p + e.yxy).dist - d,
    sceneSDF(p + e.yyx).dist - d
  ));
}

// ── Note Light Contribution ─────────────────────────────────────

vec3 noteLighting(vec3 p, vec3 n) {
  vec3 light = vec3(0.0);
  for (int i = 0; i < ${MAX_SHADER_NOTES}; i++) {
    if (u_notes[i].w < 0.1) continue;
    vec3 notePos = u_notes[i].xyz;
    vec3 toNote = notePos - p;
    float dist = length(toNote);
    if (dist > 8.0) continue;
    vec3 dir = toNote / dist;
    float ndl = max(dot(n, dir), 0.0);
    float atten = 1.0 / (1.0 + dist * dist * 1.5);
    float intensity = 0.6;
    intensity += u_hitEffects[i] * 0.8;
    light += u_noteColors[i] * ndl * atten * intensity;
  }
  return light;
}

// ── Camera ──────────────────────────────────────────────────────

mat3 setCamera(vec3 ro, vec3 ta) {
  vec3 cw = normalize(ta - ro);
  // Right-handed basis: world +x → screen +x, world +y → screen +y.
  vec3 cu = normalize(cross(vec3(0.0, 1.0, 0.0), cw));
  vec3 cv = cross(cw, cu);
  return mat3(cu, cv, cw);
}

// ── Main ────────────────────────────────────────────────────────

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

  // Camera position — center of the sponge corridor (always open space)
  vec3 ro = vec3(0.0, 0.0, u_cameraZ);
  // Subtle shake
  ro.x += sin(u_time * 13.0) * u_shake * 0.05;
  ro.y += cos(u_time * 17.0) * u_shake * 0.05;

  vec3 ta = ro + vec3(0.0, 0.0, 1.0); // looking forward
  mat3 cam = setCamera(ro, ta);

  float fov = ${SHADER_FOV.toFixed(1)}; // ~70 degrees
  vec3 rd = cam * normalize(vec3(uv * fov, 1.0));

  // March
  int steps;
  SceneResult hit = march(ro, rd, steps);

  // Shading
  vec3 col = vec3(0.0);

  if (hit.material >= 0) {
    vec3 p = ro + rd * hit.dist;
    vec3 n = calcNormal(p);

    // Base lighting
    vec3 lightDir = normalize(vec3(0.3, 0.8, 0.5));
    float diff = max(dot(n, lightDir), 0.0);
    float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0);

    if (hit.material == 0) {
      if (u_showBg > 0.5) {
        // Fractal: visible monochrome with good ambient
        vec3 baseCol = vec3(0.12, 0.13, 0.15);
        col = baseCol * (diff * 0.8 + 0.25) + vec3(0.25) * spec * 0.3;
        // Subtle note-emitted light on fractal walls
        col += noteLighting(p, n) * 0.25;
      }
    } else if (hit.material == 1) {
      // Note sphere: visible but not blinding
      col = hit.noteColor * (diff * 0.3 + 0.7);
      col += hit.noteColor * 0.4; // mild self-emission
      col += spec * 0.2;
      // Hit flash — bright explosion
      if (hit.noteIndex >= 0) {
        float ef = u_hitEffects[hit.noteIndex];
        col += (hit.noteColor + vec3(0.5)) * ef * 3.0;
      }
    } else if (hit.material == 2) {
      // Hit zone ring: subtle white glow, pulses on beat
      float pulse = 0.5 + 0.5 * sin(u_time * 4.0);
      col = vec3(0.6, 0.7, 0.9) * (0.3 + pulse * 0.2 + u_transient * 0.5);
    }

    // Distance fog (subtle)
    float fog = 1.0 - exp(-hit.dist * 0.04);
    col = mix(col, vec3(0.0), fog);
  } else {
    // Background: black void (visible through sponge holes)
    col = vec3(0.0);
  }

  // AO from steps
  float ao = 1.0 - float(steps) / 120.0;
  col *= (0.6 + ao * 0.4);

  // Transient global flash (subtle)
  col += vec3(0.05, 0.03, 0.08) * u_transient * 0.3;

  gl_FragColor = vec4(col, 1.0);
}
`;

export interface NoteShaderData {
  id: number;
  x: number;
  y: number;
  z: number;
  state: number; // 1.0=active, 0.5=hit, 0.0=empty
  color: [number, number, number];
}

export class FractalBackground {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private transientDecay: number = 0;
  private shakeDecay: number = 0;
  private noteData: NoteShaderData[] = [];
  private hitEffectsByNoteId: Map<number, number> = new Map();

  constructor(scene: THREE.Scene) {
    // Initialize uniform arrays
    const emptyNotes: THREE.Vector4[] = [];
    const emptyColors: THREE.Vector3[] = [];
    const emptyEffects: number[] = [];
    for (let i = 0; i < MAX_SHADER_NOTES; i++) {
      emptyNotes.push(new THREE.Vector4(0, 0, 0, 0));
      emptyColors.push(new THREE.Vector3(0, 0, 0));
      emptyEffects.push(0);
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_bass: { value: 0 },
        u_treble: { value: 0 },
        u_transient: { value: 0 },
        u_cameraZ: { value: 0 },
        u_shake: { value: 0 },
        u_ringRadius: { value: this._calcRingRadius() },
        u_showBg: { value: 1.0 },
        u_notes: { value: emptyNotes },
        u_noteColors: { value: emptyColors },
        u_hitEffects: { value: emptyEffects },
      },
      depthWrite: false,
      depthTest: false,
    });

    const geometry = new THREE.PlaneGeometry(FRACTAL_FULLSCREEN_PLANE_SIZE, FRACTAL_FULLSCREEN_PLANE_SIZE);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    scene.add(this.mesh);

    window.addEventListener('resize', () => {
      this.material.uniforms.u_resolution.value.set(
        window.innerWidth, window.innerHeight
      );
      this.material.uniforms.u_ringRadius.value = this._calcRingRadius();
    });
  }

  /** Convert screen-fraction ring size to SDF world-space radius */
  private _calcRingRadius(): number {
    const smallSide = Math.min(window.innerWidth, window.innerHeight);
    // Map screen pixels to SDF units. The FOV covers ~1.2 units per half-height.
    // So pixel fraction → world units ≈ fraction * fovScale * hitDistance
    const fovScale = SHADER_FOV;
    const hitDist = NOTE_HIT_DISTANCE;
    return HIT_RING_FRACTION * fovScale * hitDist * 0.5;
  }

  setBgEnabled(enabled: boolean): void {
    this.material.uniforms.u_showBg.value = enabled ? 1.0 : 0.0;
  }

  onBeat(): void {
    // Beat flash is intentionally disabled.
    this.transientDecay = 0.0;
  }

  onMiss(): void {
    this.shakeDecay = 0.0;
  }

  triggerHitEffect(noteId: number): void {
    this.hitEffectsByNoteId.set(noteId, 1.0);
  }

  updateNotes(notes: NoteShaderData[]): void {
    this.noteData = notes;
  }

  update(bass: number, treble: number, cameraZ: number): void {
    const uniforms = this.material.uniforms;
    uniforms.u_time.value = performance.now() * FRACTAL_UNIFORM_TIME_SCALE;
    uniforms.u_bass.value += (bass - uniforms.u_bass.value) * 0.1;
    uniforms.u_treble.value += (treble - uniforms.u_treble.value) * 0.1;
    uniforms.u_cameraZ.value = cameraZ;

    // Decay transient + shake
    this.transientDecay *= FRACTAL_TRANSIENT_DECAY;
    this.shakeDecay *= FRACTAL_SHAKE_DECAY;
    uniforms.u_transient.value = 0.0;
    uniforms.u_shake.value = this.shakeDecay;

    // Decay hit effects keyed by note id so slot shuffling can't mis-attach FX.
    for (const [noteId, effect] of this.hitEffectsByNoteId.entries()) {
      const next = effect * FRACTAL_HIT_EFFECT_DECAY;
      if (next <= 0.01) {
        this.hitEffectsByNoteId.delete(noteId);
      } else {
        this.hitEffectsByNoteId.set(noteId, next);
      }
    }

    // Upload note data
    const noteUniforms = uniforms.u_notes.value as THREE.Vector4[];
    const colorUniforms = uniforms.u_noteColors.value as THREE.Vector3[];
    const effectUniforms = uniforms.u_hitEffects.value as number[];

    for (let i = 0; i < MAX_SHADER_NOTES; i++) {
      if (i < this.noteData.length) {
        const nd = this.noteData[i];
        noteUniforms[i].set(nd.x, nd.y, nd.z, nd.state);
        colorUniforms[i].set(nd.color[0], nd.color[1], nd.color[2]);
        effectUniforms[i] = this.hitEffectsByNoteId.get(nd.id) ?? 0;
      } else {
        noteUniforms[i].set(0, 0, 0, 0);
        colorUniforms[i].set(0, 0, 0);
        effectUniforms[i] = 0;
      }
    }
  }
}
