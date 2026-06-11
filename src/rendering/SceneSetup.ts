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
} from '../engine/config.js';

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, SCENE_MAX_PIXEL_RATIO));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = SCENE_TONE_MAPPING_EXPOSURE;
    document.body.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer,
      new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        type: THREE.HalfFloatType,
      })
    );
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD
    );
    this.composer.addPass(this.bloomPass);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  render(): void {
    this.composer.render();
  }
}
