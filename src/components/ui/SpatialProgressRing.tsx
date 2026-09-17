import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSpatialScroll } from './SpatialScrollProvider.js';

interface SpatialProgressRingProps {
  progressPercentage: number;
  className?: string;
}

export const SpatialProgressRing: React.FC<SpatialProgressRingProps> = ({ progressPercentage, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { mousePosRef, isReducedMotion } = useSpatialScroll();
  const isReducedMotionRef = useRef(isReducedMotion);
  const targetProgressRef = useRef(progressPercentage);

  useEffect(() => {
    isReducedMotionRef.current = isReducedMotion;
  }, [isReducedMotion]);

  useEffect(() => {
    targetProgressRef.current = progressPercentage;
  }, [progressPercentage]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 240;
    const height = container.clientHeight || 240;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('[SpatialProgressRing] WebGL context lost');
    };
    const canvas = renderer.domElement;
    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    const group = new THREE.Group();
    scene.add(group);

    // 2. Base Track Torus (Slate Blue)
    const trackGeo = new THREE.TorusGeometry(1.2, 0.04, 16, 100);
    const trackMat = new THREE.MeshBasicMaterial({ color: 0x384358, transparent: true, opacity: 0.5 });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    group.add(trackMesh);

    // 3. Progress Arc Torus (Luminous Warm Peach)
    let currentDisplayedProgress = Math.max(targetProgressRef.current, 1);
    const initialArcLength = (currentDisplayedProgress / 100) * Math.PI * 2;
    let progressGeo = new THREE.TorusGeometry(1.2, 0.065, 16, 64, initialArcLength);
    const progressMat = new THREE.MeshStandardMaterial({
      color: 0xffa586,
      emissive: 0xf09271,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });
    const progressMesh = new THREE.Mesh(progressGeo, progressMat);
    progressMesh.rotation.z = Math.PI / 2;
    group.add(progressMesh);

    // 4. Inner Floating Sphere Core (Navy Glass with Crimson Highlight)
    const coreGeo = new THREE.SphereGeometry(0.48, 32, 32);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x242f49,
      transmission: 0.85,
      thickness: 0.6,
      transparent: true,
      opacity: 0.92,
      roughness: 0.08,
      clearcoat: 1.0,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xf8fafc, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffa586, 3.5, 6);
    pointLight.position.set(2, 2, 3);
    scene.add(pointLight);

    // 6. Continuous Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();
    let lastBuiltArc = currentDisplayedProgress;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      try {
        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // Smoothly interpolate displayed progress
        currentDisplayedProgress += (targetProgressRef.current - currentDisplayedProgress) * 0.05;

        // Rebuild geometry cleanly ONLY when progress changes noticeably
        if (Math.abs(currentDisplayedProgress - lastBuiltArc) > 0.4) {
          lastBuiltArc = currentDisplayedProgress;
          progressGeo.dispose();
          const targetArcLength = Math.max(0.01, (currentDisplayedProgress / 100) * Math.PI * 2);
          progressGeo = new THREE.TorusGeometry(1.2, 0.065, 16, 64, targetArcLength);
          progressMesh.geometry = progressGeo;
        }

        if (!isReducedMotionRef.current) {
          group.rotation.y += delta * 0.3;
          group.rotation.x += delta * 0.12;
          coreMesh.rotation.y -= delta * 0.45;

          // Pointer inertia lerp
          const normX = mousePosRef.current ? mousePosRef.current.normalizedX : 0;
          const normY = mousePosRef.current ? mousePosRef.current.normalizedY : 0;
          const targetRotY = normX * 0.3;
          const targetRotX = -normY * 0.3;
          group.rotation.y += (targetRotY - group.rotation.y) * 0.04;
          group.rotation.x += (targetRotX - group.rotation.x) * 0.04;

          // Core light pulse
          progressMat.emissiveIntensity = 1.5 + Math.sin(elapsedTime * 3) * 0.3;
        }

        renderer.render(scene, camera);
      } catch (err) {
        console.error('[SpatialProgressRing] Render error:', err);
      }
    };
    animate();

    // 7. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 240;
      const h = container.clientHeight || 240;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 8. Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      trackGeo.dispose();
      trackMat.dispose();
      progressGeo.dispose();
      progressMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
    };
  }, []); // Mounted EXACTLY ONCE!

  return (
    <div className={`relative w-full h-[220px] flex items-center justify-center ${className}`}>
      <div ref={containerRef} className="w-full h-full relative z-10" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center z-20">
        <span className="text-2xl font-black font-sans num-tabular text-slate-100">{progressPercentage}%</span>
        <span className="text-[10px] font-sans text-peach-500 uppercase tracking-wider font-semibold">Progress</span>
      </div>
    </div>
  );
};

