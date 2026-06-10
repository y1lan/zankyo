import * as THREE from 'three';
import gsap from 'gsap';

export type HitQuality = 'perfect' | 'good';

export class HitEffects {
  public scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawn(position: THREE.Vector3, quality: HitQuality = 'perfect'): void {
    const color: number = quality === 'perfect' ? 0xffdd00 : 0xffffff;
    const n: number = quality === 'perfect' ? 16 : 8;

    // Primary burst: octahedrons
    for (let i: number = 0; i < n; i++) {
      const geo: THREE.OctahedronGeometry = new THREE.OctahedronGeometry(0.15 + Math.random() * 0.25, 0);
      const mat: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const p: THREE.Mesh = new THREE.Mesh(geo, mat);
      p.position.copy(position);
      this.scene.add(p);

      const dir: THREE.Vector3 = new THREE.Vector3(
        (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2,
      ).normalize();
      const target: THREE.Vector3 = position.clone().add(dir.multiplyScalar(3 + Math.random() * 8));

      gsap.to(p.position, { x: target.x, y: target.y, z: target.z, duration: 0.5 + Math.random() * 0.5, ease: 'power2.out' });
      gsap.to(p.rotation, { x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2, z: Math.random() * Math.PI * 2, duration: 0.6, ease: 'power2.out' });
      gsap.to(mat, { opacity: 0, duration: 0.5 + Math.random() * 0.5, ease: 'power2.in' });
      gsap.to(p.scale, { x: 0, y: 0, z: 0, duration: 0.6, delay: 0.3, ease: 'power2.in', onComplete: () => { this.scene.remove(p); geo.dispose(); mat.dispose(); } });

      if (quality === 'perfect') {
        gsap.delayedCall(0.15 + Math.random() * 0.1, () => {
          if (!p.parent) return;
          this._secondary(p.position.clone(), color, 4);
        });
      }
    }

    // Triple mandala rings
    for (let r: number = 0; r < 3; r++) {
      const rr: number = 1.5 + r * 0.8;
      const ringGeo: THREE.TorusGeometry = new THREE.TorusGeometry(rr, 0.04, 8, 48 + r * 16);
      const ringMat: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 - r * 0.25 });
      const ring: THREE.Mesh = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(position);
      ring.rotation.x = Math.PI / 2 + r * 0.3;
      ring.rotation.y = r * 0.5;
      this.scene.add(ring);
      gsap.to(ring.scale, { x: 4 - r * 0.8, y: 4 - r * 0.8, z: 4 - r * 0.8, duration: 0.5 + r * 0.1, ease: 'power2.out' });
      gsap.to(ringMat, { opacity: 0, duration: 0.5 + r * 0.1, ease: 'power2.out', onComplete: () => { this.scene.remove(ring); ringGeo.dispose(); ringMat.dispose(); } });
    }

    // Flash sphere
    const flashGeo: THREE.SphereGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const flashMat: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const flash: THREE.Mesh = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(position);
    this.scene.add(flash);
    gsap.to(flash.scale, { x: 5, y: 5, z: 5, duration: 0.25, ease: 'power2.out' });
    gsap.to(flashMat, { opacity: 0, duration: 0.25, ease: 'power2.out', onComplete: () => { this.scene.remove(flash); flashGeo.dispose(); flashMat.dispose(); } });
  }

  private _secondary(pos: THREE.Vector3, color: number, count: number): void {
    for (let i: number = 0; i < count; i++) {
      const geo: THREE.TetrahedronGeometry = new THREE.TetrahedronGeometry(0.06 + Math.random() * 0.1, 0);
      const mat: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const p: THREE.Mesh = new THREE.Mesh(geo, mat);
      p.position.copy(pos);
      this.scene.add(p);
      const dir: THREE.Vector3 = new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2).normalize();
      const target: THREE.Vector3 = pos.clone().add(dir.multiplyScalar(1.5 + Math.random() * 3));
      gsap.to(p.position, { x: target.x, y: target.y, z: target.z, duration: 0.3 + Math.random() * 0.3, ease: 'power2.out' });
      gsap.to(p.scale, { x: 0, y: 0, z: 0, duration: 0.4, ease: 'power2.in', onComplete: () => { this.scene.remove(p); geo.dispose(); mat.dispose(); } });
    }
  }
}
