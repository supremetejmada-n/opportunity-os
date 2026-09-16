import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SpatialToolWebProps {
  toolNames: string[];
  className?: string;
}

export const SpatialToolWeb: React.FC<SpatialToolWebProps> = ({ toolNames, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 220;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Create 3D Nodes based on tool count
    const nodeCount = Math.max(toolNames.length, 3);
    const nodes: THREE.Mesh[] = [];
    const positions: THREE.Vector3[] = [];

    const colors = [0x818cf8, 0x34d399, 0xfbbf24, 0x38bdf8, 0xf43f5e];

    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 1.6;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * (radius * 0.5);
      const z = (Math.sin(angle * 2) * 0.4);

      const pos = new THREE.Vector3(x, y, z);
      positions.push(pos);

      // Node Geometry
      const nodeGeo = new THREE.OctahedronGeometry(0.3, 0);
      const nodeMat = new THREE.MeshPhysicalMaterial({
        color: colors[i % colors.length],
        metalness: 0.2,
        roughness: 0.2,
        transmission: 0.7,
        thickness: 0.8,
        transparent: true,
        opacity: 0.9,
        emissive: colors[i % colors.length],
        emissiveIntensity: 0.4,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(pos);
      group.add(nodeMesh);
      nodes.push(nodeMesh);
    }

    // Connect Nodes with Energy Lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.4,
    });

    const linePoints: THREE.Vector3[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const nextIdx = (i + 1) % nodeCount;
      linePoints.push(positions[i]);
      linePoints.push(positions[nextIdx]);
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMesh = new THREE.LineSegments(lineGeo, lineMaterial);
    group.add(lineMesh);

    // Center Core Node (Synthesis Outcome)
    const centerGeo = new THREE.IcosahedronGeometry(0.4, 0);
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    group.add(centerMesh);

    // Connect all nodes to center core
    const centerLinePoints: THREE.Vector3[] = [];
    positions.forEach(pos => {
      centerLinePoints.push(pos);
      centerLinePoints.push(new THREE.Vector3(0, 0, 0));
    });
    const centerLineGeo = new THREE.BufferGeometry().setFromPoints(centerLinePoints);
    const centerLineMat = new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.3 });
    const centerLineMesh = new THREE.LineSegments(centerLineGeo, centerLineMat);
    group.add(centerLineMesh);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x818cf8, 2, 8);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      group.rotation.y += 0.005;
      centerMesh.rotation.x += 0.01;
      centerMesh.rotation.z += 0.01;

      nodes.forEach((node, idx) => {
        node.rotation.y += 0.01 * (idx % 2 === 0 ? 1 : -1);
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 220;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [toolNames]);

  return (
    <div className={`relative w-full h-[200px] flex items-center justify-center ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
