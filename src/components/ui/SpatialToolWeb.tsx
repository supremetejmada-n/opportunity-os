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
  const { mousePosRef, isReducedMotion } = useSpatialScroll();
  const isReducedMotionRef = useRef(isReducedMotion);
  const activeIndicesRef = useRef(activeIndices);

  useEffect(() => {
    isReducedMotionRef.current = isReducedMotion;
  }, [isReducedMotion]);

  useEffect(() => {
    activeIndicesRef.current = activeIndices;
  }, [activeIndices]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 220;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('[SpatialToolWeb] WebGL context lost');
    };
    const canvas = renderer.domElement;
    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    const group = new THREE.Group();
    scene.add(group);

    // 2. Create 3D Nodes based on tool count
    const nodeCount = Math.max(toolNames.length, 3);
    const nodes: THREE.Mesh[] = [];
    const nodeMaterials: THREE.MeshPhysicalMaterial[] = [];
    const nodeGeometries: THREE.BufferGeometry[] = [];
    const positions: THREE.Vector3[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 1.6;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * (radius * 0.5);
      const z = (Math.sin(angle * 2) * 0.4);

      const pos = new THREE.Vector3(x, y, z);
      positions.push(pos);

      const isActive = activeIndicesRef.current.length === 0 || activeIndicesRef.current.includes(i);
      const nodeColor = isActive ? (i === 0 ? 0xffa586 : 0xb51a2b) : 0x384358;

      const nodeGeo = new THREE.OctahedronGeometry(0.32, 0);
      nodeGeometries.push(nodeGeo);

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
      nodeMaterials.push(nodeMat);

      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(pos);
      group.add(nodeMesh);
      nodes.push(nodeMesh);
    }

    // Connect Nodes with Vivid Crimson / Warm Peach Lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffa586,
      transparent: true,
      opacity: 0.6,
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
      emissiveIntensity: 1.8,
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
      opacity: 0.5,
    });
    const centerLineMesh = new THREE.LineSegments(centerLineGeo, centerLineMat);
    group.add(centerLineMesh);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xf8fafc, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffa586, 3.0, 10);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    // 3. Continuous Animation Loop with Robust Timing
    let animationFrameId: number;
    let lastTime = performance.now();
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      try {
        const now = performance.now();
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        const elapsedTime = (now - startTime) / 1000;

        if (!isReducedMotionRef.current) {
          group.rotation.y += delta * 0.4;
          centerMesh.rotation.x += delta * 0.8;
          centerMesh.rotation.z += delta * 0.8;

          // Pointer inertia lerp
          const normX = mousePosRef.current ? mousePosRef.current.normalizedX : 0;
          const normY = mousePosRef.current ? mousePosRef.current.normalizedY : 0;
          const targetRotY = normX * 0.4;
          const targetRotX = -normY * 0.4;
          group.rotation.y += (targetRotY - group.rotation.y) * 0.05;
          group.rotation.x += (targetRotX - group.rotation.x) * 0.05;

          // Dynamic scale & emissive response to activeIndicesRef
          nodes.forEach((node, idx) => {
            node.position.y = positions[idx].y + Math.sin(elapsedTime * 2 + idx) * 0.1;
            node.rotation.y += delta * (idx % 2 === 0 ? 1.0 : -1.0);

            const isActive = activeIndicesRef.current.length === 0 || activeIndicesRef.current.includes(idx);
            const targetScale = isActive ? 1.15 : 0.7;
            node.scale.setScalar(THREE.MathUtils.lerp(node.scale.x, targetScale, 0.08));

            const targetEmissive = isActive ? 1.2 : 0.15;
            const targetOpacity = isActive ? 0.95 : 0.4;
            nodeMaterials[idx].emissiveIntensity = THREE.MathUtils.lerp(
              nodeMaterials[idx].emissiveIntensity,
              targetEmissive,
              0.08
            );
            nodeMaterials[idx].opacity = THREE.MathUtils.lerp(
              nodeMaterials[idx].opacity,
              targetOpacity,
              0.08
            );
          });
        }

        renderer.render(scene, camera);
      } catch (err) {
        console.error('[SpatialToolWeb] Render error:', err);
      }
    };
    animate();

    // 4. Resize Observer
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

    // 5. Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
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
      nodeGeometries.forEach(g => g.dispose());
      nodeMaterials.forEach(m => m.dispose());
    };
  }, [toolNames.length]); // Re-init ONLY if total tool count changes!

  return (
    <div className={`relative w-full h-[200px] flex items-center justify-center ${className}`}>
      <div ref={containerRef} className="w-full h-full relative z-10" />
    </div>
  );
};


