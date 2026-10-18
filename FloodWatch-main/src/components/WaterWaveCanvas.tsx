/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function WaterWaveCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!containerRef.current || !canvas2DRef.current) return;

    const container = containerRef.current;
    const canvas2D = canvas2DRef.current;

    let width = container.clientWidth || 400;
    let height = container.clientHeight || 600;

    canvas2D.width = width;
    canvas2D.height = height;
    const ctx = canvas2D.getContext('2d');

    // -------------------------------------------------------------
    // FLUID DYNAMICS WATER RIPPLE SOLVER CONFIGURATION (128x128 grid)
    // -------------------------------------------------------------
    const gridDim = 128;
    const size = gridDim * gridDim;
    let buffer1 = new Float32Array(size);
    let buffer2 = new Float32Array(size);
    const damping = 0.97;

    // Helper offscreen canvas to generate dynamic fluid displacement map
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = gridDim;
    offscreenCanvas.height = gridDim;
    const offscreenCtx = offscreenCanvas.getContext('2d');

    // -------------------------------------------------------------
    // THREE.JS SCENE CREATION & RENDER RIGGING
    // -------------------------------------------------------------
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a192f, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 30, 60);
    camera.lookAt(0, -2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Create the high-performance dynamic CanvasTexture
    const fluidTexture = new THREE.CanvasTexture(offscreenCanvas);
    fluidTexture.wrapS = THREE.ClampToEdgeWrapping;
    fluidTexture.wrapT = THREE.ClampToEdgeWrapping;
    fluidTexture.minFilter = THREE.LinearFilter;

    // Create water surface plane mapped to our dynamic fluid texture bump map
    const geometry = new THREE.PlaneGeometry(120, 120, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x0f2b48,
      roughness: 0.15,
      metalness: 0.9,
      bumpMap: fluidTexture,
      bumpScale: 3.5, // Enhances physical shadow and light reflections on dynamic ripples
      transparent: true,
      opacity: 0.88,
    });

    const waterPlane = new THREE.Mesh(geometry, material);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.y = -2;
    scene.add(waterPlane);

    // -------------------------------------------------------------
    // FLOATING RAIN/DEW CONDENSATION PARTICLES
    // -------------------------------------------------------------
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 110;     // X
      particlePositions[i + 1] = Math.random() * 40 - 10;     // Y
      particlePositions[i + 2] = (Math.random() - 0.5) * 110;   // Z
      particleVelocities[i / 3] = Math.random() * 0.05 + 0.02; // Float speed
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x64ffda, // Bright neon teal condensation
      size: 0.6,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });

    const atmosphericParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(atmosphericParticles);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x4fc3f7, 2.5); // Electric teal water light
    keyLight.position.set(30, 80, 20);
    scene.add(keyLight);

    const accentLight = new THREE.DirectionalLight(0xf2994a, 0.6); // Warm orange horizon reflection
    accentLight.position.set(-40, 30, -30);
    scene.add(accentLight);

    // -------------------------------------------------------------
    // PAINTERLY ELEMENTAL WATER 2D CANVAS STRUCTS
    // -------------------------------------------------------------
    interface ElementalRipple {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      opacity: number;
      speed: number;
    }

    interface WatercolorDrop {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      radius: number;
      alpha: number;
      life: number;
    }

    let elementalRipples: ElementalRipple[] = [];
    let watercolorDrops: WatercolorDrop[] = [];

    // Tracks cursor positions for trail effects
    let lastCursorX = width / 2;
    let lastCursorY = height / 2;

    // -------------------------------------------------------------
    // INTERACTIVE FLUID INTERACTION TRIGGERS
    // -------------------------------------------------------------
    const triggerRippleDrop = (mx: number, my: number, strength: number = 4) => {
      const rect = container.getBoundingClientRect();
      const relativeX = mx - rect.left;
      const relativeY = my - rect.top;

      // Project UI coordinates onto 128x128 heightmap coordinates
      const gridX = Math.floor((relativeX / rect.width) * gridDim);
      const gridY = Math.floor((relativeY / rect.height) * gridDim);

      if (gridX > 3 && gridX < gridDim - 4 && gridY > 3 && gridY < gridDim - 4) {
        // Disturb buffer grid
        const index = gridY * gridDim + gridX;
        buffer1[index] += strength;
        buffer1[index - 1] += strength * 0.5;
        buffer1[index + 1] += strength * 0.5;
        buffer1[index - gridDim] += strength * 0.5;
        buffer1[index + gridDim] += strength * 0.5;
      }
    };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // 1. WebGL Heightmap disturbance
      triggerRippleDrop(e.clientX, e.clientY, 1.8);

      // 2. Elemental Water watercolor node generation
      if (Math.random() < 0.45) {
        watercolorDrops.push({
          x: mx,
          y: my,
          vx: (Math.random() - 0.5) * 1.8,
          vy: (Math.random() - 0.5) * 1.8 - 0.6, // Float slightly up
          color: Math.random() > 0.4 ? 'rgba(100, 255, 218, 0.6)' : 'rgba(79, 195, 247, 0.5)',
          radius: Math.random() * 4 + 1.5,
          alpha: 0.9,
          life: 1.0,
        });
      }

      // 3. Gentle concentric overlay ripple on threshold movement
      if (Math.abs(mx - lastCursorX) > 30 || Math.abs(my - lastCursorY) > 30) {
        elementalRipples.push({
          x: mx,
          y: my,
          radius: 3,
          maxRadius: Math.random() * 35 + 25,
          opacity: 0.6,
          speed: 1.4,
        });
        lastCursorX = mx;
        lastCursorY = my;
      }
    };

    const handlePointerClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // 1. WebGL Heightmap disturbance
      triggerRippleDrop(e.clientX, e.clientY, 9.5);

      // 2. Multi-tiered painterly ripple rings
      for (let j = 0; j < 3; j++) {
        elementalRipples.push({
          x: mx,
          y: my,
          radius: 2,
          maxRadius: 70 + j * 15,
          opacity: 0.85,
          speed: 1.1 - j * 0.2,
        });
      }

      // 3. Explosion of watercolor droplets
      for (let j = 0; j < 15; j++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 3 + 1.2;
        watercolorDrops.push({
          x: mx,
          y: my,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          color: j % 2 === 0 ? 'rgba(242, 153, 74, 0.75)' : 'rgba(100, 255, 218, 0.75)', // Elegant mix matching buttons
          radius: Math.random() * 5 + 2.5,
          alpha: 1.0,
          life: 1.0,
        });
      }
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('click', handlePointerClick);

    // Initialize with a few automatic rain drops to keep it alive
    let lastDropTime = 0;

    // -------------------------------------------------------------
    // ANIMATION & PHYSICAL UPDATES LOOP
    // -------------------------------------------------------------
    let animationFrameId: number;

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);

      // 1. Spontaneous raindrops/fluid ripples
      if (time - lastDropTime > 400) {
        const randomX = Math.floor(Math.random() * (gridDim - 10) + 5);
        const randomY = Math.floor(Math.random() * (gridDim - 10) + 5);
        const idx = randomY * gridDim + randomX;
        buffer1[idx] += Math.random() * 3 + 1.5;
        lastDropTime = time;
      }

      // 2. Perform 2D Fluid Dynamics equation step
      for (let y = 1; y < gridDim - 1; y++) {
        for (let x = 1; x < gridDim - 1; x++) {
          const idx = y * gridDim + x;
          
          // Ripple propagation equation based on neighboring wave heights
          buffer2[idx] = (
            (buffer1[idx - 1] +
             buffer1[idx + 1] +
             buffer1[idx - gridDim] +
             buffer1[idx + gridDim]) * 0.5
          ) - buffer2[idx];

          // Apply damping to dissipate waves naturally over time
          buffer2[idx] *= damping;
        }
      }

      // Swap wave buffers
      const temp = buffer1;
      buffer1 = buffer2;
      buffer2 = temp;

      // 3. Render Heightmap directly to Canvas Texture (creating high-quality height normals)
      if (offscreenCtx) {
        const imgData = offscreenCtx.createImageData(gridDim, gridDim);
        const data = imgData.data;

        for (let i = 0; i < size; i++) {
          // Normalize height values to RGB normals space
          const currentHeight = buffer1[i];
          const brightness = Math.max(0, Math.min(255, 128 + currentHeight * 128));

          const pixelIdx = i * 4;
          data[pixelIdx] = brightness;     // R (gradient profile)
          data[pixelIdx + 1] = brightness; // G
          data[pixelIdx + 2] = brightness; // B
          data[pixelIdx + 3] = 255;        // A
        }

        offscreenCtx.putImageData(imgData, 0, 0);
        fluidTexture.needsUpdate = true;
      }

      // 4. Animate atmospheric moisture drift
      const positions = atmosphericParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i + 1] += particleVelocities[i / 3]; // upward drift
        positions[i] += Math.sin(time * 0.002 + i) * 0.02; // swaying flow

        // Recirculate drops when leaving view limits
        if (positions[i + 1] > 35) {
          positions[i + 1] = -12;
          positions[i] = (Math.random() - 0.5) * 110;
        }
      }
      atmosphericParticles.geometry.attributes.position.needsUpdate = true;

      // Rotate surface slightly to avoid looking static
      waterPlane.rotation.z = time * 0.00008;

      // Render 3D component
      renderer.render(scene, camera);

      // 5. Draw 2D Painterly Ripple Overlay with canvas2D
      if (ctx) {
        ctx.clearRect(0, 0, width, height);

        // Update & Render watercolor drops
        for (let i = watercolorDrops.length - 1; i >= 0; i--) {
          const drop = watercolorDrops[i];
          drop.x += drop.vx;
          drop.y += drop.vy;
          drop.vy += 0.015; // light gravity drift
          drop.life -= 0.014;
          drop.alpha = Math.max(0, drop.life);

          if (drop.life <= 0) {
            watercolorDrops.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(drop.x, drop.y, drop.radius * drop.life, 0, Math.PI * 2);
          ctx.fillStyle = drop.color.replace(/[\d.]+\)$/, `${drop.alpha})`);
          ctx.fill();
        }

        // Update & Render concentric ripple rings
        for (let i = elementalRipples.length - 1; i >= 0; i--) {
          const rip = elementalRipples[i];
          rip.radius += rip.speed;
          rip.opacity -= 0.012;

          if (rip.opacity <= 0 || rip.radius >= rip.maxRadius) {
            elementalRipples.splice(i, 1);
            continue;
          }

          // Render principal ring
          ctx.beginPath();
          ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(100, 255, 218, ${rip.opacity})`;
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // Render subtle inner ripple echo
          if (rip.radius > 15) {
            ctx.beginPath();
            ctx.arc(rip.x, rip.y, rip.radius - 10, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(79, 195, 247, ${rip.opacity * 0.4})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }
    };

    animate(0);

    // -------------------------------------------------------------
    // DYNAMIC RESIZING RIG
    // -------------------------------------------------------------
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        width = entry.contentRect.width;
        height = entry.contentRect.height;

        canvas2D.width = width;
        canvas2D.height = height;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // -------------------------------------------------------------
    // STACK DE-ALLOCATION & MEMORY DISPOSAL
    // -------------------------------------------------------------
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handlePointerClick);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      fluidTexture.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div 
        className="absolute inset-0 w-full h-full select-none pointer-events-auto" 
        id="water-3d-fluid-dynamics-ripple-canvas"
        style={{
          background: 'linear-gradient(135deg, #0a192f 0%, #112b3c 30%, #1b4b66 60%, #0b1b24 100%)'
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full bg-[#0a192f] select-none pointer-events-auto" 
      id="water-3d-fluid-dynamics-ripple-canvas"
      aria-hidden="true"
    >
      {/* 2D Overlay canvas for painterly fluid water lines, ripple rings, and splatters */}
      <canvas 
        ref={canvas2DRef} 
        className="absolute inset-0 w-full h-full pointer-events-none z-10" 
      />
    </div>
  );
}
