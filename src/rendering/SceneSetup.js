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

    this.laneMandalas = [];
    this.createLaneMandalas();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });

    this.defaultFov = this.camera.fov;
  }

  createLaneMandalas() {
    const hitZ = 10;

    for (const lane of LANES) {
      const color = new THREE.Color(lane.color);
      const group = new THREE.Group();
      group.position.set(lane.x, 0, hitZ);
      this.scene.add(group);

      const mandalaParts = [];

      // Outer ring
      const outerRingGeo = new THREE.TorusGeometry(1.2, 0.03, 8, 48);
      const outerRingMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
      const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
      group.add(outerRing);

      // Inner ring, rotated
      const innerRingGeo = new THREE.TorusGeometry(0.8, 0.03, 8, 32);
      const innerRingMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.rotation.x = Math.PI / 3;
      group.add(innerRing);

      // Counter-angled ring
      const crossRingGeo = new THREE.TorusGeometry(1.0, 0.02, 8, 40);
      const crossRingMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 });
      const crossRing = new THREE.Mesh(crossRingGeo, crossRingMat);
      crossRing.rotation.y = Math.PI / 3;
      crossRing.rotation.x = Math.PI / 4;
      group.add(crossRing);

      // Central octahedron
      const octGeo = new THREE.OctahedronGeometry(0.3, 0);
      const octMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.7,
      });
      const oct = new THREE.Mesh(octGeo, octMat);
      group.add(oct);

      // Wireframe dodecahedron
      const dodGeo = new THREE.DodecahedronGeometry(0.6, 0);
      const dodEdges = new THREE.EdgesGeometry(dodGeo);
      const dodLine = new THREE.LineSegments(
        dodEdges,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25 })
      );
      group.add(dodLine);

      // Small vertex dots on outer ring
      const dotGeo = new THREE.SphereGeometry(0.04, 4, 4);
      const dotMat = new THREE.MeshBasicMaterial({ color });
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(Math.cos(angle) * 1.2, Math.sin(angle) * 1.2, 0);
        group.add(dot);
      }

      mandalaParts.push(
        { mesh: outerRing, type: 'ring' },
        { mesh: innerRing, type: 'ring' },
        { mesh: crossRing, type: 'ring' },
        { mesh: oct, type: 'solid' },
        { mesh: dodLine, type: 'wire' }
      );

      // Guide line along z-axis
      const points = [
        new THREE.Vector3(lane.x, -3, NOTE_SPAWN_Z),
        new THREE.Vector3(lane.x, -3, NOTE_END_Z),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.12 });
      const line = new THREE.Line(lineGeo, lineMat);
      this.scene.add(line);

      // Depth markers along the guide line (fractal repetition)
      for (let z = -10; z > NOTE_SPAWN_Z; z -= 20) {
        const markerGeo = new THREE.TorusGeometry(0.4, 0.02, 6, 24);
        const markerMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.set(lane.x, -3, z);
        this.scene.add(marker);
      }

      this.laneMandalas.push({ group, parts: mandalaParts, lane });
    }
  }

  render() {
    this.composer.render();
  }
}
