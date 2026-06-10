import * as THREE from 'three';
import gsap from 'gsap';

export class HitEffect {
  constructor(scene) {
    this.scene = scene;
  }

  spawn(position, quality = 'perfect') {
    const count = quality === 'perfect' ? 20 : 10;
    const color = quality === 'perfect' ? 0xffdd00 : 0xffffff;

    for (let i = 0; i < count; i++) {
      const size = 0.1 + Math.random() * 0.3;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.copy(position);
      this.scene.add(particle);

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const distance = 3 + Math.random() * 8;
      const targetPos = position.clone().add(dir.multiplyScalar(distance));

      gsap.to(particle.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: 0.5 + Math.random() * 0.5,
        ease: 'power2.out',
      });

      gsap.to(mat, {
        opacity: 0,
        duration: 0.5 + Math.random() * 0.5,
        ease: 'power2.in',
      });

      gsap.to(particle.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.6,
        delay: 0.4,
        ease: 'power2.in',
        onComplete: () => {
          this.scene.remove(particle);
          geo.dispose();
          mat.dispose();
        },
      });
    }

    const ringGeo = new THREE.TorusGeometry(2, 0.1, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);

    gsap.to(ring.scale, {
      x: 3,
      y: 3,
      z: 3,
      duration: 0.4,
      ease: 'power2.out',
    });

    gsap.to(ringMat, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => {
        this.scene.remove(ring);
        ringGeo.dispose();
        ringMat.dispose();
      },
    });
  }
}
