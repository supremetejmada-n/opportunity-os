import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSpatialScroll } from './SpatialScrollProvider.js';

interface SpatialToolWebProps {
  toolNames: string[];
  activeIndices?: number[];
  className?: string;
}

export const SpatialToolWeb: React.FC<SpatialToolWebProps> = ({ toolNames, activeIndices = [], className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { mousePos, isReducedMotion } = useSpatialScroll();

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

    const colors = [0xffa586, 0x384358, 0x242f49, 0xb51a2b, 0x384358];

    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 1.6;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * (radius * 0.5);
      const z = (Math.sin(angle * 2) * 0.4);

      const pos = new THREE.Vector3(x, y, z);
      positions.push(pos);

      const isActive = activeIndices.length === 0 || activeIndices.includes(i);
      const nodeColor = isActive ? (i === 0 ? 0xffa586 : 0xb51a2b) : 0x384358;

      const nodeGeo = new THREE.OctahedronGeometry(isActive ? 0.35 : 0.25, 0);
      const nodeMat = new THREE.MeshPhysicalMaterial({
        color: nodeColor,
        metalness: 0.3,
        roughness: 0.15,
        transmission: 0.75,
        thickness: 0.8,
        transparent: true,
        opacity: isActive ? 0.95 : 0.5,
        emissive: nodeColor,
        emissiveIntensity: isActive ? 1.0 : 0.1,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(pos);
      group.add(nodeMesh);
      nodes.push(nodeMesh);
    }

    // Connect Nodes with Vivid Crimson / Warm Peach Lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: activeIndices.length > 0 ? 0xffa586 : 0xb51a2b,
      transparent: true,
      opacity: activeIndices.length > 0 ? 0.75 : 0.4,
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

    // Center Core Node (Illuminated Synthesis Outcome)
    const centerGeo = new THREE.IcosahedronGeometry(0.45, 0);
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0xffa586,
      emissive: 0xf09271,
      emissiveIntensity: activeIndices.length > 0 ? 2.5 : 1.4,
      roughness: 0.15,
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
    const centerLineMat = new THREE.LineBasicMaterial({
      color: 0xffa586,
      transparent: true,
      opacity: activeIndices.length > 0 ? 0.6 : 0.3,
    });
    const centerLineMesh = new THREE.LineSegments(centerLineGeo, centerLineMat);
    group.add(centerLineMesh);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xf8fafc, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffa586, 3.0, 10);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (!isReducedMotion) {
        group.rotation.y += 0.005;
        centerMesh.rotation.x += 0.01;
        centerMesh.rotation.z += 0.01;

        // Pointer inertia lerp
        const targetRotY = mousePos.normalizedX * 0.35;
        const targetRotX = -mousePos.normalizedY * 0.35;
        group.rotation.y += (targetRotY - group.rotation.y) * 0.04;
        group.rotation.x += (targetRotX - group.rotation.x) * 0.04;

        nodes.forEach((node, idx) => {
          node.position.y = positions[idx].y + Math.sin(elapsedTime * 2 + idx) * 0.08;
          node.rotation.y += 0.01 * (idx % 2 === 0 ? 1 : -1);
        });
      }

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
      lineGeo.dispose();
      lineMaterial.dispose();
      centerGeo.dispose();
      centerMat.dispose();
      centerLineGeo.dispose();
      centerLineMat.dispose();
    };
  }, [toolNames, activeIndices, mousePos.normalizedX, mousePos.normalizedY, isReducedMotion]);

  return (
    <div className={`relative w-full h-[200px] flex items-center justify-center ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
