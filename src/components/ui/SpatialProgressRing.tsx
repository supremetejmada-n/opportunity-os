import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SpatialProgressRingProps {
  progressPercentage: number;
  className?: string;
}

export const SpatialProgressRing: React.FC<SpatialProgressRingProps> = ({ progressPercentage, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 240;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Torus Ring representing full 100% path
    const trackGeo = new THREE.TorusGeometry(1.2, 0.04, 16, 100);
    const trackMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.6 });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    group.add(trackMesh);

    // Progress Arc Torus
    const arcLength = (progressPercentage / 100) * Math.PI * 2 || 0.01;
    const progressGeo = new THREE.TorusGeometry(1.2, 0.06, 16, 64, arcLength);
    const progressMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const progressMesh = new THREE.Mesh(progressGeo, progressMat);
    progressMesh.rotation.z = Math.PI / 2;
    group.add(progressMesh);

    // Inner Floating Sphere Core
    const coreGeo = new THREE.SphereGeometry(0.45, 32, 32);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x818cf8,
      transmission: 0.8,
      thickness: 0.5,
      transparent: true,
      opacity: 0.9,
      roughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x818cf8, 2, 6);
    pointLight.position.set(2, 2, 3);
    scene.add(pointLight);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      group.rotation.y += 0.006;
      group.rotation.x += 0.003;
      coreMesh.rotation.y -= 0.01;
      renderer.render(scene, camera);
    };
    animate();

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

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [progressPercentage]);

  return (
    <div className={`relative w-full h-[220px] flex items-center justify-center ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className="text-2xl font-black font-mono text-slate-100">{progressPercentage}%</span>
        <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-wider">Progress</span>
      </div>
    </div>
  );
};
