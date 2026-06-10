import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { LANES, NOTE_SPAWN_Z, NOTE_END_Z } from '../game/Constants.js';

export class SceneSetup {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 2, 20);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    document.body.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
    );
    this.composer.addPass(this.bloomPass);

    const ambientLight = new THREE.AmbientLight(0x222222);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2, 50);
    pointLight.position.set(0, 5, 15);
    this.scene.add(pointLight);

    this.createLaneGuides();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });

    this.defaultFov = this.camera.fov;
  }

  createLaneGuides() {
    const hitZ = 10;
    for (const lane of LANES) {
      const color = new THREE.Color(lane.color);

      // Vertical post at hit position
      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 4, 8);
      const postMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(lane.x, 0, hitZ);
      this.scene.add(post);

      // Glowing ring at hit zone
      const ringGeo = new THREE.TorusGeometry(1.0, 0.03, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(lane.x, 0, hitZ);
      this.scene.add(ring);

      // Guide line along the z-axis
      const points = [
        new THREE.Vector3(lane.x, -3, NOTE_SPAWN_Z),
        new THREE.Vector3(lane.x, -3, NOTE_END_Z),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.15 });
      const line = new THREE.Line(lineGeo, lineMat);
      this.scene.add(line);
    }
  }

  render() {
    this.composer.render();
  }
}
