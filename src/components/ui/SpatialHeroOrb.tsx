import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSpatialScroll } from './SpatialScrollProvider.js';

interface SpatialHeroOrbProps {
  className?: string;
}

export const SpatialHeroOrb: React.FC<SpatialHeroOrbProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { mousePos, isReducedMotion } = useSpatialScroll();

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Main Group
    const group = new THREE.Group();
    scene.add(group);

    // Outer Smoked Navy Glass Crystal (Icosahedron)
    const glassGeometry = new THREE.IcosahedronGeometry(1.45, 0);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x242f49,
      metalness: 0.25,
      roughness: 0.08,
      transmission: 0.85,
      thickness: 1.5,
      transparent: true,
      opacity: 0.9,
      reflectivity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
    group.add(glassMesh);

    // Outer Slate Blue Wireframe Overlay
    const wireframeGeometry = new THREE.IcosahedronGeometry(1.47, 1);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x384358,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const wireframeMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    group.add(wireframeMesh);

    // Glowing Inner Core Sphere (Luminous Warm Peach)
    const coreGeometry = new THREE.SphereGeometry(0.58, 32, 32);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xffa586,
      emissive: 0xf09271,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.7,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(coreMesh);

    // Orbiting Rings (Vivid Crimson & Warm Peach)
    const ringGeometry1 = new THREE.TorusGeometry(1.9, 0.02, 16, 100);
    const ringMaterial1 = new THREE.MeshBasicMaterial({
      color: 0xb51a2b,
      transparent: true,
      opacity: 0.65,
    });
    const ringMesh1 = new THREE.Mesh(ringGeometry1, ringMaterial1);
    ringMesh1.rotation.x = Math.PI / 3;
    group.add(ringMesh1);

    const ringGeometry2 = new THREE.TorusGeometry(2.1, 0.015, 16, 100);
    const ringMaterial2 = new THREE.MeshBasicMaterial({
      color: 0xffa586,
      transparent: true,
      opacity: 0.4,
    });
    const ringMesh2 = new THREE.Mesh(ringGeometry2, ringMaterial2);
    ringMesh2.rotation.y = Math.PI / 4;
    group.add(ringMesh2);

    // Ambient & Point Lighting
    const ambientLight = new THREE.AmbientLight(0xf8fafc, 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffa586, 4.0, 12);
    pointLight1.position.set(3, 3, 4);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xb51a2b, 3.0, 12);
    pointLight2.position.set(-3, -3, 2);
    scene.add(pointLight2);

    // Animation Loop with Spring Float & Pointer Inertia
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (!isReducedMotion) {
        // Continuous rotation
        glassMesh.rotation.y += 0.004;
        glassMesh.rotation.x += 0.002;
        wireframeMesh.rotation.y -= 0.003;
        coreMesh.rotation.y += 0.007;
        ringMesh1.rotation.z += 0.005;
        ringMesh2.rotation.z -= 0.004;

        // Subtle sine wave floating motion
        group.position.y = Math.sin(elapsedTime * 1.4) * 0.12;

        // Pointer inertia lerp smoothing
        const targetRotY = mousePos.normalizedX * 0.45;
        const targetRotX = -mousePos.normalizedY * 0.45;
        group.rotation.y += (targetRotY - group.rotation.y) * 0.05;
        group.rotation.x += (targetRotX - group.rotation.x) * 0.05;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 320;
      const h = container.clientHeight || 320;
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
      glassGeometry.dispose();
      glassMaterial.dispose();
      wireframeGeometry.dispose();
      wireframeMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      ringGeometry1.dispose();
      ringMaterial1.dispose();
      ringGeometry2.dispose();
      ringMaterial2.dispose();
    };
  }, [mousePos.normalizedX, mousePos.normalizedY, isReducedMotion]);

  return (
    <div className={`relative w-full h-[280px] sm:h-[340px] flex items-center justify-center ${className}`}>
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute inset-0 pointer-events-none bg-radial from-peach-500/15 via-burgundy-900/20 to-transparent rounded-full blur-3xl animate-pulse" />
    </div>
  );
};
