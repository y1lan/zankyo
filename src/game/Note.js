import * as THREE from 'three';
import { NOTE_SPAWN_Z, NOTE_END_Z, NOTE_TRAVEL_TIME, LANES } from './Constants.js';

let noteIdCounter = 0;

export class Note {
  constructor(scene, laneIndex) {
    this.id = noteIdCounter++;
    this.scene = scene;
    this.laneIndex = laneIndex;
    this.hit = false;
    this.missed = false;

    const lane = LANES[laneIndex];
    const color = new THREE.Color(lane.color);

    const geometry = new THREE.SphereGeometry(1.2, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(lane.x, 0, NOTE_SPAWN_Z);

    const ringGeo = new THREE.TorusGeometry(1.6, 0.15, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.mesh.add(this.ring);

    // Lane indicator pillar
    const pillarGeo = new THREE.CylinderGeometry(0.05, 0.05, 5, 8);
    const pillarMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
    this.pillar = new THREE.Mesh(pillarGeo, pillarMat);
    this.pillar.position.z = -2.5;
    this.mesh.add(this.pillar);

    scene.add(this.mesh);
    this.startTime = performance.now();
    this.spawned = false;
  }

  update(now) {
    if (this.hit || this.missed) return;

    const elapsed = (now - this.startTime) / 1000;
    const progress = elapsed / NOTE_TRAVEL_TIME;
    const z = NOTE_SPAWN_Z + (NOTE_END_Z - NOTE_SPAWN_Z) * progress;
    this.mesh.position.z = z;

    this.mesh.rotation.x += 0.02;
    this.mesh.rotation.y += 0.03;
    this.ring.rotation.x -= 0.01;
    this.ring.rotation.y -= 0.02;

    // Scale up as it approaches
    const t = Math.min(progress, 1);
    const scale = 0.4 + t * 0.6;
    this.mesh.scale.setScalar(scale);
  }

  getZ() {
    return this.mesh.position.z;
  }

  getX() {
    return this.mesh.position.x;
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.ring.geometry.dispose();
    this.ring.material.dispose();
    this.pillar.geometry.dispose();
    this.pillar.material.dispose();
  }
}
