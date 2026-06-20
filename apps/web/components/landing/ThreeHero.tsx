"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ThreeHero() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Skip on reduced-motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const isMobile = window.innerWidth < 768;
    const PARTICLE_COUNT = isMobile ? 55 : 120;
    const CONNECTION_THRESHOLD = isMobile ? 10 : 14;
    const MAX_CONNECTIONS = PARTICLE_COUNT * (isMobile ? 2 : 4);
    const THRESHOLD_SQ = CONNECTION_THRESHOLD * CONNECTION_THRESHOLD;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.z = 38;

    // Particles
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const velocities: { x: number; y: number; z: number }[] = [];
    const palette = [
      new THREE.Color(0x3b82f6),
      new THREE.Color(0x8b5cf6),
      new THREE.Color(0x06b6d4),
      new THREE.Color(0x10b981),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25;
      velocities.push({
        x: (Math.random() - 0.5) * 0.025,
        y: (Math.random() - 0.5) * 0.025,
        z: (Math.random() - 0.5) * 0.008,
      });
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const particleMat = new THREE.PointsMaterial({
      size: isMobile ? 0.45 : 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Points(particleGeo, particleMat));

    // Line segments — pre-allocated buffer
    const linePositions = new Float32Array(MAX_CONNECTIONS * 2 * 3);
    const lineColors2 = new Float32Array(MAX_CONNECTIONS * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(lineColors2, 3));
    scene.add(
      new THREE.LineSegments(
        lineGeo,
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
    );

    // Subtle glow blobs (skip on mobile)
    if (!isMobile) {
      const glowGeo = new THREE.SphereGeometry(8, 8, 8);
      const m1 = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending });
      const g1 = new THREE.Mesh(glowGeo, m1);
      g1.position.set(-15, 8, -10);
      scene.add(g1);
    }

    // Mouse parallax (desktop only)
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!isMobile) window.addEventListener("mousemove", onMouseMove);

    const onResize = () => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // Pause rendering when hero scrolls off screen
    let isVisible = true;
    const io = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; },
      { threshold: 0.05 }
    );
    io.observe(mount);

    let frameId: number;
    let frameCount = 0;

    function animate() {
      frameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      frameCount++;
      const pos = particleGeo.attributes.position.array as Float32Array;
      const col = particleGeo.attributes.color.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;
        if (Math.abs(pos[i * 3]) > 36) velocities[i].x *= -1;
        if (Math.abs(pos[i * 3 + 1]) > 26) velocities[i].y *= -1;
        if (Math.abs(pos[i * 3 + 2]) > 13) velocities[i].z *= -1;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Throttle connection rebuild: every frame on desktop, every 2nd on mobile
      if (!isMobile || frameCount % 2 === 0) {
        let lineIdx = 0;
        for (let i = 0; i < PARTICLE_COUNT && lineIdx < MAX_CONNECTIONS; i++) {
          let conns = 0;
          for (let j = i + 1; j < PARTICLE_COUNT && lineIdx < MAX_CONNECTIONS; j++) {
            if (conns >= (isMobile ? 2 : 4)) break;
            const dx = pos[i * 3] - pos[j * 3];
            const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
            const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
            const dist2 = dx * dx + dy * dy + dz * dz;
            if (dist2 < THRESHOLD_SQ) {
              const alpha = (1 - Math.sqrt(dist2) / CONNECTION_THRESHOLD) * 0.5;
              const base = lineIdx * 6;
              linePositions[base] = pos[i * 3];
              linePositions[base + 1] = pos[i * 3 + 1];
              linePositions[base + 2] = pos[i * 3 + 2];
              linePositions[base + 3] = pos[j * 3];
              linePositions[base + 4] = pos[j * 3 + 1];
              linePositions[base + 5] = pos[j * 3 + 2];
              lineColors2[base] = col[i * 3] * alpha;
              lineColors2[base + 1] = col[i * 3 + 1] * alpha;
              lineColors2[base + 2] = col[i * 3 + 2] * alpha;
              lineColors2[base + 3] = col[j * 3] * alpha;
              lineColors2[base + 4] = col[j * 3 + 1] * alpha;
              lineColors2[base + 5] = col[j * 3 + 2] * alpha;
              lineIdx++;
              conns++;
            }
          }
        }
        for (let i = lineIdx * 6; i < MAX_CONNECTIONS * 2 * 3; i++) {
          linePositions[i] = 0; lineColors2[i] = 0;
        }
        lineGeo.setDrawRange(0, lineIdx * 2);
        lineGeo.attributes.position.needsUpdate = true;
        lineGeo.attributes.color.needsUpdate = true;
      }

      if (!isMobile) {
        camera.position.x += (mouseX * 4 - camera.position.x) * 0.03;
        camera.position.y += (-mouseY * 3 - camera.position.y) * 0.03;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      io.disconnect();
      cancelAnimationFrame(frameId);
      if (!isMobile) window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      particleGeo.dispose();
      lineGeo.dispose();
      particleMat.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />;
}
