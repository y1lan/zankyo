import * as THREE from 'three';
import gsap from 'gsap';

export class HitEffect {
  constructor(scene) {
    this.scene = scene;
  }

  spawn(position, quality = 'perfect') {
    const color = quality === 'perfect' ? 0xffdd00 : 0xffffff;
    const primaryCount = quality === 'perfect' ? 16 : 8;

    // --- Primary burst: octahedrons ---
    for (let i = 0; i < primaryCount; i++) {
      const size = 0.15 + Math.random() * 0.25;
      const geo = new THREE.OctahedronGeometry(size, 0);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.copy(position);
      this.scene.add(particle);

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const distance = 3 + Math.random() * 8;
      const targetPos = position.clone().add(dir.clone().multiplyScalar(distance));

      gsap.to(particle.position, {
        x: targetPos.x, y: targetPos.y, z: targetPos.z,
        duration: 0.5 + Math.random() * 0.5,
        ease: 'power2.out',
      });

      gsap.to(particle.rotation, {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
        duration: 0.6,
        ease: 'power2.out',
      });

      gsap.to(mat, {
        opacity: 0,
        duration: 0.5 + Math.random() * 0.5,
        ease: 'power2.in',
      });

      gsap.to(particle.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.6, delay: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          this.scene.remove(particle);
          geo.dispose();
          mat.dispose();
        },
      });

      // --- Secondary fractal burst (halfway through primary travel) ---
      if (quality === 'perfect') {
        gsap.delayedCall(0.15 + Math.random() * 0.1, () => {
          if (!particle.parent) return;
          const midPos = particle.position.clone();
          this.secondaryBurst(midPos, color, 4);
        });
      }
    }

    // --- Expanding mandala rings ---
    for (let r = 0; r < 3; r++) {
      const ringRadius = 1.5 + r * 0.8;
      const ringGeo = new THREE.TorusGeometry(ringRadius, 0.04, 8, 48 + r * 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9 - r * 0.25,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(position);
      ring.rotation.x = Math.PI / 2 + r * 0.3;
      ring.rotation.y = r * 0.5;
      this.scene.add(ring);

      gsap.to(ring.scale, {
        x: 4 - r * 0.8,
        y: 4 - r * 0.8,
        z: 4 - r * 0.8,
        duration: 0.5 + r * 0.1,
        ease: 'power2.out',
      });

      gsap.to(ringMat, {
        opacity: 0,
        duration: 0.5 + r * 0.1,
        ease: 'power2.out',
        onComplete: () => {
          this.scene.remove(ring);
          ringGeo.dispose();
          ringMat.dispose();
        },
      });

      // Counter-rotating inner ring
      const innerRingGeo = new THREE.TorusGeometry(ringRadius * 0.5, 0.03, 6, 32);
      const innerRingMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7 - r * 0.2,
      });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.position.copy(position);
      innerRing.rotation.x = Math.PI / 3 * r;
      this.scene.add(innerRing);

      gsap.to(innerRing.scale, {
        x: 6 - r * 1.2,
        y: 6 - r * 1.2,
        z: 6 - r * 1.2,
        duration: 0.6 + r * 0.1,
        ease: 'power2.out',
      });

      gsap.to(innerRing.position, {
        y: position.y + 2 - r * 0.5,
        duration: 0.5,
        ease: 'power2.out',
      });

      gsap.to(innerRingMat, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          this.scene.remove(innerRing);
          innerRingGeo.dispose();
          innerRingMat.dispose();
        },
      });
    }

    // --- Central flash sphere ---
    const flashGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const flashMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(position);
    this.scene.add(flash);

    gsap.to(flash.scale, {
      x: 5, y: 5, z: 5,
      duration: 0.25,
      ease: 'power2.out',
    });
    gsap.to(flashMat, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: () => {
        this.scene.remove(flash);
        flashGeo.dispose();
        flashMat.dispose();
      },
    });
  }

  secondaryBurst(position, color, count) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.TetrahedronGeometry(0.06 + Math.random() * 0.1, 0);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(position);
      this.scene.add(p);

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const target = position.clone().add(dir.multiplyScalar(1.5 + Math.random() * 3));

      gsap.to(p.position, {
        x: target.x, y: target.y, z: target.z,
        duration: 0.3 + Math.random() * 0.3,
        ease: 'power2.out',
      });
      gsap.to(p.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => {
          this.scene.remove(p);
          geo.dispose();
          mat.dispose();
        },
      });
    }
  }
}
