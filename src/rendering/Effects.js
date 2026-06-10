import * as THREE from 'three';

export class Effects {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.baseFov = camera.fov;
    this.tunnelRings = [];
    this.createTunnel();
  }

  createTunnel() {
    for (let i = 0; i < 20; i++) {
      const ringGeo = new THREE.TorusGeometry(3 + i * 0.8, 0.05, 8, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x4444ff,
        emissive: 0x4444ff,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.5 - i * 0.02,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = -i * 5;
      this.scene.add(ring);
      this.tunnelRings.push({ mesh: ring, material: ringMat });
    }
  }

  update(frequencyData) {
    if (!frequencyData) return;

    const { low, mid, high } = frequencyData;
    const lowNorm = low / 255;
    const midNorm = mid / 255;
    const highNorm = high / 255;

    const bgR = 0.04 + lowNorm * 0.15;
    const bgG = 0.02 + midNorm * 0.05;
    const bgB = 0.04 + highNorm * 0.3;
    this.scene.background = new THREE.Color(bgR, bgG, bgB);

    const fovTarget = this.baseFov + midNorm * 5;
    this.camera.fov += (fovTarget - this.camera.fov) * 0.1;
    this.camera.updateProjectionMatrix();

    this.tunnelRings.forEach((ring, i) => {
      const scale = 1 + lowNorm * 0.3 * (1 - i * 0.04);
      ring.mesh.scale.setScalar(Math.max(1, scale));
      ring.material.emissiveIntensity = 0.3 + highNorm * 1.5 * (1 - i * 0.04);
    });
  }
}
