import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  SCENE_CAMERA_FOV_DEG,
  SCENE_CAMERA_NEAR,
  SCENE_CAMERA_FAR,
  SCENE_MAX_PIXEL_RATIO,
  SCENE_TONE_MAPPING_EXPOSURE,
  BLOOM_STRENGTH,
  BLOOM_RADIUS,
  BLOOM_THRESHOLD,
  FRACTAL_MAX_PIXELS,
} from '../engine/Config';

export class SceneSetup {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public composer: EffectComposer;
  public bloomPass: UnrealBloomPass;

  constructor() {
    this.scene = new THREE.Scene();

    // Camera is only used for the EffectComposer pipeline; actual view is in the shader
    this.camera = new THREE.PerspectiveCamera(
      SCENE_CAMERA_FOV_DEG, window.innerWidth / window.innerHeight, SCENE_CAMERA_NEAR, SCENE_CAMERA_FAR
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(this._cappedPixelRatio());
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = SCENE_TONE_MAPPING_EXPOSURE;
    document.body.appendChild(this.renderer.domElement);

    // No explicit render target — EffectComposer auto-creates at physical pixel resolution
    // (innerWidth * pixelRatio), keeping gl_FragCoord consistent with u_resolution.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD
    );
    this.composer.addPass(this.bloomPass);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(this._cappedPixelRatio());
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /** Compute effective pixel ratio capped by FRACTAL_MAX_PIXELS */
  private _cappedPixelRatio(): number {
    const basePR = Math.min(window.devicePixelRatio, SCENE_MAX_PIXEL_RATIO);
    if (FRACTAL_MAX_PIXELS <= 0) return basePR;
    const totalPixels = window.innerWidth * basePR * window.innerHeight * basePR;
    if (totalPixels <= FRACTAL_MAX_PIXELS) return basePR;
    // Scale down pixel ratio to fit within cap
    const scale = Math.sqrt(FRACTAL_MAX_PIXELS / totalPixels);
    return basePR * scale;
  }

  render(): void {
    this.composer.render();
  }
}
