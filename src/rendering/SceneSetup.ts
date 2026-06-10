import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class SceneSetup {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public composer: EffectComposer;
  public bloomPass: UnrealBloomPass;
  public baseFov: number;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 200
    );
    this.camera.position.set(0, 5, 20);
    this.camera.lookAt(0, 0, 10);
    this.baseFov = this.camera.fov;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    document.body.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85
    );
    this.composer.addPass(this.bloomPass);

    this.scene.add(new THREE.AmbientLight(0x222222));
    const pl: THREE.PointLight = new THREE.PointLight(0xffffff, 2, 50);
    pl.position.set(0, 5, 15);
    this.scene.add(pl);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  setBg(r: number, g: number, b: number): void {
    this.scene.background = new THREE.Color(r, g, b);
  }

  render(): void {
    this.composer.render();
  }
}
