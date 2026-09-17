import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSpatialScroll } from './SpatialScrollProvider.js';

interface SpatialHeroOrbProps {
  className?: string;
}

export const SpatialHeroOrb: React.FC<SpatialHeroOrbProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { mousePosRef, isReducedMotion } = useSpatialScroll();
  const isReducedMotionRef = useRef(isReducedMotion);

  useEffect(() => {
    isReducedMotionRef.current = isReducedMotion;
  }, [isReducedMotion]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Context loss handlers
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('[SpatialHeroOrb] WebGL context lost');
    };
    const canvas = renderer.domElement;
    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    // 2. Main Group
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

    // 3. Continuous Animation Loop with Robust Timing
    let animationFrameId: number;
    let lastTime = performance.now();
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      try {
        const now = performance.now();
        const delta = Math.min((now - lastTime) / 1000, 0.1); // Seconds since last frame
        lastTime = now;
        const elapsedTime = (now - startTime) / 1000;

        if (!isReducedMotionRef.current) {
          // Continuous rotations (vivid, physical movement)
          glassMesh.rotation.y += delta * 0.5;
          glassMesh.rotation.x += delta * 0.25;
          wireframeMesh.rotation.y -= delta * 0.4;
          coreMesh.rotation.y += delta * 0.8;
          ringMesh1.rotation.z += delta * 0.6;
          ringMesh2.rotation.z -= delta * 0.5;

          // Sine wave floating motion
          group.position.y = Math.sin(elapsedTime * 1.6) * 0.15;

          // Pointer inertia lerp smoothing via ref
          const normX = mousePosRef.current ? mousePosRef.current.normalizedX : 0;
          const normY = mousePosRef.current ? mousePosRef.current.normalizedY : 0;
          const targetRotY = normX * 0.55;
          const targetRotX = -normY * 0.55;

          group.rotation.y += (targetRotY - group.rotation.y) * 0.06;
          group.rotation.x += (targetRotX - group.rotation.x) * 0.06;
        }

        renderer.render(scene, camera);
      } catch (err) {
        console.error('[SpatialHeroOrb] Render error:', err);
      }
    };
    animate();

    // 4. Resize Observer
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

    // 5. Cleanup ONLY on Component Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
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
  }, []); // Mounted EXACTLY ONCE!

  return (
    <div className={`relative w-full h-[280px] sm:h-[340px] flex items-center justify-center ${className}`}>
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing relative z-10" />
      <div className="absolute inset-0 pointer-events-none bg-radial from-peach-500/15 via-burgundy-900/20 to-transparent rounded-full blur-3xl animate-pulse" />
    </div>
  );
};


