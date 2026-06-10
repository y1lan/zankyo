import * as THREE from 'three';
import { LANES, NOTE_SPAWN_Z, NOTE_END_Z } from '../engine/config.js';

export class LaneMandalas {
  public scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this._build();
  }

  private _build(): void {
    const hitZ: number = 10;

    for (const lane of LANES) {
      const color: THREE.Color = new THREE.Color(lane.color);

      // Hit ring
      const ring: THREE.Mesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.0, 0.03, 8, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 }),
      );
      ring.position.set(lane.x, 0, hitZ);
      this.scene.add(ring);

      // Vertical post
      const post: THREE.Mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 5, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 }),
      );
      post.position.set(lane.x, 0, hitZ);
      this.scene.add(post);

      // Guide line
      const line: THREE.Line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(lane.x, -3, NOTE_SPAWN_Z),
          new THREE.Vector3(lane.x, -3, NOTE_END_Z),
        ]),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.12 }),
      );
      this.scene.add(line);

      // Depth markers
      for (let z: number = -10; z > NOTE_SPAWN_Z; z -= 20) {
        const m: THREE.Mesh = new THREE.Mesh(
          new THREE.TorusGeometry(0.4, 0.02, 6, 24),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 }),
        );
        m.position.set(lane.x, -3, z);
        this.scene.add(m);
      }
    }
  }
}
