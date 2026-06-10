import * as THREE from 'three';

export class Effects {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.baseFov = camera.fov;
    this.fractalNodes = [];
    this.createFractalTunnel();
  }

  createFractalTunnel() {
    const depth = 15;
    for (let i = 0; i < depth; i++) {
      const z = -i * 6;
      const t = i / depth;
      const color = new THREE.Color().setHSL(0.55 + t * 0.15, 0.8, 0.3 + t * 0.4);

      const node = new THREE.Group();
      node.position.z = z;
      this.scene.add(node);

      const shapes = [];

      // Outermost: rotating wireframe icosahedron
      const icoGeo = new THREE.IcosahedronGeometry(3.5 - t * 1.5, 0);
      const icoEdges = new THREE.EdgesGeometry(icoGeo);
      const icoLine = new THREE.LineSegments(
        icoEdges,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 - t * 0.15 })
      );
      node.add(icoLine);

      // Middle: counter-rotating octahedron
      const octGeo = new THREE.OctahedronGeometry(2.2 - t * 1.0, 0);
      const octEdges = new THREE.EdgesGeometry(octGeo);
      const octLine = new THREE.LineSegments(
        octEdges,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 - t * 0.25 })
      );
      node.add(octLine);

      // Inner: tetrahedron
      const tetGeo = new THREE.TetrahedronGeometry(1.1 - t * 0.5, 0);
      const tetEdges = new THREE.EdgesGeometry(tetGeo);
      const tetLine = new THREE.LineSegments(
        tetEdges,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 - t * 0.3 })
      );
      node.add(tetLine);

      // Orbiting torus
      const torusGeo = new THREE.TorusGeometry(1.6 - t * 0.7, 0.03, 8, 48);
      const torusMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 - t * 0.25 });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      node.add(torus);

      // Second torus at different angle
      const torus2 = new THREE.Mesh(
        new THREE.TorusGeometry(2.0 - t * 0.9, 0.02, 8, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 - t * 0.2 })
      );
      torus2.rotation.x = Math.PI / 2;
      node.add(torus2);

      // Small satellite dots at icosahedron vertices
      const dotGeo = new THREE.SphereGeometry(0.06, 4, 4);
      const dotMat = new THREE.MeshBasicMaterial({ color });
      const icoVertices = this.getIcosahedronVertices(3.5 - t * 1.5);
      icoVertices.forEach((v) => {
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.copy(v);
        node.add(dot);
        shapes.push({ mesh: dot, type: 'dot', basePos: v.clone() });
      });

      shapes.push(
        { mesh: icoLine, type: 'wire' },
        { mesh: octLine, type: 'wire' },
        { mesh: tetLine, type: 'wire' },
        { mesh: torus, type: 'torus', material: torusMat },
        { mesh: torus2, type: 'torus2' }
      );

      this.fractalNodes.push({ node, shapes, z, t });
    }
  }

  getIcosahedronVertices(radius) {
    const t = (1 + Math.sqrt(5)) / 2;
    const raw = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ];
    return raw.map(([x, y, z]) => {
      const len = Math.sqrt(x * x + y * y + z * z);
      return new THREE.Vector3(x * radius / len, y * radius / len, z * radius / len);
    });
  }

  update(frequencyData) {
    if (!frequencyData) return;

    const { low, mid, high } = frequencyData;
    const lowNorm = low / 255;
    const midNorm = mid / 255;
    const highNorm = high / 255;

    const bgR = 0.03 + lowNorm * 0.12;
    const bgG = 0.02 + midNorm * 0.04;
    const bgB = 0.04 + highNorm * 0.25;
    this.scene.background = new THREE.Color(bgR, bgG, bgB);

    const fovTarget = this.baseFov + midNorm * 5;
    this.camera.fov += (fovTarget - this.camera.fov) * 0.1;
    this.camera.updateProjectionMatrix();

    const time = performance.now() * 0.001;

    this.fractalNodes.forEach(({ node, shapes }, i) => {
      const bassScale = 1 + lowNorm * 0.4 * (1 - i * 0.05);
      node.scale.setScalar(Math.max(1, bassScale));

      node.rotation.x += 0.003 * (1 + highNorm * 2) * (1 - i * 0.04);
      node.rotation.y += 0.005 * (1 + midNorm * 2) * (1 - i * 0.03);
      node.rotation.z += 0.002 * (1 + lowNorm * 1.5) * (1 - i * 0.05);

      shapes.forEach((s) => {
        if (s.type === 'torus' && s.material) {
          s.material.opacity = 0.2 + highNorm * 0.5 * (1 - i * 0.06);
          s.mesh.rotation.z += 0.01 * (1 + midNorm);
          s.mesh.rotation.x += 0.005 * (1 + lowNorm);
        }
        if (s.type === 'torus2') {
          s.mesh.rotation.y += 0.015 * (1 + lowNorm);
        }
        if (s.type === 'dot' && s.basePos) {
          const wobble = Math.sin(time * 3 + i) * lowNorm * 0.3;
          s.mesh.position.copy(s.basePos).multiplyScalar(1 + wobble);
        }
      });
    });
  }
}
