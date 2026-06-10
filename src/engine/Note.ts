import * as THREE from 'three';
import { NOTE_SPAWN_Z, NOTE_END_Z, NOTE_TRAVEL_TIME, LANES } from './config.js';

let _id: number = 0;

export class Note {
  readonly id: number;
  readonly scene: THREE.Scene;
  readonly laneIndex: number;
  hit: boolean;
  missed: boolean;
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  readonly pillar: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  private readonly startTime: number;

  constructor(scene: THREE.Scene, laneIndex: number) {
    this.id = _id++;
    this.scene = scene;
    this.laneIndex = laneIndex;
    this.hit = false;
    this.missed = false;

    const lane = LANES[laneIndex];
    const color = new THREE.Color(lane.color);

    const geo = new THREE.SphereGeometry(1.2, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.6,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(lane.x, 0, NOTE_SPAWN_Z);

    const ringGeo = new THREE.TorusGeometry(1.6, 0.15, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.4,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.mesh.add(this.ring);

    const pillarGeo = new THREE.CylinderGeometry(0.05, 0.05, 5, 8);
    const pillarMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.3,
    });
    this.pillar = new THREE.Mesh(pillarGeo, pillarMat);
    this.pillar.position.z = -2.5;
    this.mesh.add(this.pillar);

    scene.add(this.mesh);
    this.startTime = performance.now();
  }

  update(now: number): void {
    if (this.hit || this.missed) return;

    const progress: number = (now - this.startTime) / 1000 / NOTE_TRAVEL_TIME;
    const z: number = NOTE_SPAWN_Z + (NOTE_END_Z - NOTE_SPAWN_Z) * progress;
    this.mesh.position.z = z;

    this.mesh.rotation.x += 0.02;
    this.mesh.rotation.y += 0.03;
    this.ring.rotation.x -= 0.01;
    this.ring.rotation.y -= 0.02;

    const s: number = 0.4 + Math.min(progress, 1) * 0.6;
    this.mesh.scale.setScalar(s);
  }

  z(): number {
    return this.mesh.position.z;
  }

  position(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  destroy(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.ring.geometry.dispose();
    this.ring.material.dispose();
    this.pillar.geometry.dispose();
    this.pillar.material.dispose();
  }
}
