import * as THREE from 'three';

export class FractalTunnel {
  constructor(scene) {
    this.scene = scene;
    this.levels = [];
    this._build();
  }

  _build() {
    const root = new THREE.Group();
    root.position.set(0, 0, 0);
    this.scene.add(root);
    this.root = root;

    const hue = 0.58; // blue-purple

    // ── Level 0: Core icosahedron ───────────────────────────
    const l0radius = 5;
    const l0Color = new THREE.Color().setHSL(hue, 0.8, 0.5);
    const l0Ico = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(l0radius, 0)),
      new THREE.LineBasicMaterial({ color: l0Color, transparent: true, opacity: 0.35 }),
    );
    root.add(l0Ico);

    // Glowing vertex spheres
    const l0Verts = this._icoVerts(l0radius);
    const l0DotGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const l0DotMat = new THREE.MeshBasicMaterial({ color: l0Color });
    const l0Dots = [];
    l0Verts.forEach((v) => {
      const dot = new THREE.Mesh(l0DotGeo, l0DotMat);
      dot.position.copy(v);
      root.add(dot);
      l0Dots.push(dot);
    });

    // Level 0 torus
    const l0Torus = new THREE.Mesh(
      new THREE.TorusGeometry(l0radius, 0.04, 8, 64),
      new THREE.MeshBasicMaterial({ color: l0Color, transparent: true, opacity: 0.3 }),
    );
    root.add(l0Torus);

    this.levels.push({
      group: root,
      wires: [l0Ico],
      dots: l0Dots,
      tori: [l0Torus],
      rotSpeed: 0.15,
      baseRadius: l0radius,
    });

    // ── Level 1: Octahedrons at Level 0 vertices ────────────
    const l1Group = new THREE.Group();
    root.add(l1Group);
    const l1radius = 1.6;
    const l1Color = new THREE.Color().setHSL(hue + 0.08, 0.75, 0.55);

    const l1Octas = [];
    const l1Dots = [];
    l0Verts.forEach((v) => {
      const oct = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.OctahedronGeometry(l1radius, 0)),
        new THREE.LineBasicMaterial({ color: l1Color, transparent: true, opacity: 0.4 }),
      );
      oct.position.copy(v);
      l1Group.add(oct);
      l1Octas.push({ mesh: oct, basePos: v.clone() });

      // Dots at octa vertices
      const ov = this._octaVerts(l1radius);
      ov.forEach((ovv) => {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 4, 4),
          new THREE.MeshBasicMaterial({ color: l1Color }),
        );
        dot.position.copy(v).add(ovv);
        l1Group.add(dot);
        l1Dots.push({ mesh: dot, basePos: v.clone(), localPos: ovv.clone() });
      });
    });

    // Level 1 torus
    const l1Torus = new THREE.Mesh(
      new THREE.TorusGeometry(l0radius + 1.5, 0.03, 8, 72),
      new THREE.MeshBasicMaterial({ color: l1Color, transparent: true, opacity: 0.25 }),
    );
    l1Torus.rotation.x = Math.PI / 3;
    root.add(l1Torus);

    this.levels.push({
      group: l1Group,
      wires: l1Octas.map(o => o.mesh),
      dots: l1Dots,
      tori: [l1Torus],
      rotSpeed: -0.25,
      children: l1Octas,
      baseRadius: l1radius,
    });

    // ── Level 2: Tetrahedrons at Level 1 octa vertices ──────
    const l2Group = new THREE.Group();
    root.add(l2Group);
    const l2radius = 0.5;
    const l2Color = new THREE.Color().setHSL(hue + 0.15, 0.7, 0.6);

    const l2Tets = [];
    l0Verts.forEach((parentPos) => {
      const ov = this._octaVerts(l1radius);
      // Only use 3 of 6 octa vertices to manage count
      ov.slice(0, 3).forEach((localPos) => {
        const worldPos = parentPos.clone().add(localPos);
        const tet = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.TetrahedronGeometry(l2radius, 0)),
          new THREE.LineBasicMaterial({ color: l2Color, transparent: true, opacity: 0.5 }),
        );
        tet.position.copy(worldPos);
        l2Group.add(tet);
        l2Tets.push({ mesh: tet, basePos: worldPos.clone() });
      });
    });

    // Level 2 torus
    const l2Torus = new THREE.Mesh(
      new THREE.TorusGeometry(l0radius + 3, 0.02, 6, 80),
      new THREE.MeshBasicMaterial({ color: l2Color, transparent: true, opacity: 0.2 }),
    );
    l2Torus.rotation.y = Math.PI / 4;
    root.add(l2Torus);

    this.levels.push({
      group: l2Group,
      wires: l2Tets.map(t => t.mesh),
      dots: [],
      tori: [l2Torus],
      rotSpeed: 0.35,
      children: l2Tets,
      baseRadius: l2radius,
    });
  }

  _icoVerts(r) {
    const phi = (1 + Math.sqrt(5)) / 2;
    const raw = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
    ];
    return raw.map(([x, y, z]) => {
      const len = Math.sqrt(x * x + y * y + z * z);
      return new THREE.Vector3(x * r / len, y * r / len, z * r / len);
    });
  }

  _octaVerts(r) {
    return [
      new THREE.Vector3(r, 0, 0), new THREE.Vector3(-r, 0, 0),
      new THREE.Vector3(0, r, 0), new THREE.Vector3(0, -r, 0),
      new THREE.Vector3(0, 0, r), new THREE.Vector3(0, 0, -r),
    ];
  }

  // Fracture: children fly outward on beat
  onBeat() {
    this.levels.forEach((level) => {
      if (!level.children) return;
      level.children.forEach((child) => {
        const dist = 1 + Math.random() * 0.6;
        child.mesh.position.copy(child.basePos.clone().multiplyScalar(dist));
      });
    });
  }

  update({ lowNorm, midNorm, highNorm }) {
    const time = performance.now() * 0.001;

    this.levels.forEach((level) => {
      const rot = level.rotSpeed * (1 + midNorm) * 0.01;
      level.group.rotation.y += rot;
      level.group.rotation.x += rot * 0.3;
      level.group.rotation.z += rot * 0.15;

      // Scale pulse
      const scale = 1 + lowNorm * 0.15;
      level.group.scale.lerp(
        new THREE.Vector3(scale, scale, scale),
        0.05,
      );

      // Emission glow on high frequencies
      level.tori.forEach((t) => {
        t.material.opacity += ((0.15 + highNorm * 0.35) - t.material.opacity) * 0.05;
      });

      // Animate dot/wire opacity
      level.wires.forEach((w) => {
        w.material.opacity += ((0.2 + highNorm * 0.3) - w.material.opacity) * 0.05;
      });

      // Return fractured children to base positions
      if (level.children) {
        level.children.forEach((child) => {
          child.mesh.position.lerp(child.basePos, 0.03);
        });
      }
      if (level.dots) {
        level.dots.forEach((dot) => {
          if (dot.basePos) {
            const target = dot.basePos.clone().add(dot.localPos || new THREE.Vector3());
            dot.mesh.position.lerp(target, 0.03);
          }
        });
      }
    });

    // Whole fractal rotation
    this.root.rotation.y += 0.002 * (1 + midNorm);
    this.root.rotation.x += 0.001 * (1 + lowNorm);
  }
}
