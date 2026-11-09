"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function isWebGLSupported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

class WebGLErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("WebGL initialization failed, falling back to CSS background:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const PARTICLE_COUNT = 250;

function generateInitialData() {
  const pos = new Float32Array(PARTICLE_COUNT * 3);
  const vel = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Deterministic pseudo-random distribution
    const seedX = Math.sin(i * 12.9898) * 43758.5453;
    const randX = seedX - Math.floor(seedX);
    const seedY = Math.sin(i * 78.233) * 43758.5453;
    const randY = seedY - Math.floor(seedY);
    const seedZ = Math.sin(i * 45.164) * 43758.5453;
    const randZ = seedZ - Math.floor(seedZ);

    pos[i * 3] = (randX - 0.5) * 15;
    pos[i * 3 + 1] = (randY - 0.5) * 15;
    pos[i * 3 + 2] = (randZ - 0.5) * 5 - 2;

    vel[i * 3] = (randX - 0.5) * 0.02;
    vel[i * 3 + 1] = (randY - 0.5) * 0.02;
    vel[i * 3 + 2] = (randZ - 0.5) * 0.02;
  }
  return { pos, vel };
}

const { pos: INITIAL_POSITIONS, vel: INITIAL_VELOCITIES } = generateInitialData();

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const { mouse, viewport } = useThree();

  const particleCount = PARTICLE_COUNT;
  
  const positions = useMemo(() => new Float32Array(INITIAL_POSITIONS), []);
  const velocitiesRef = useRef<Float32Array | null>(null);
  if (velocitiesRef.current == null) {
    velocitiesRef.current = new Float32Array(INITIAL_VELOCITIES);
  }
  const originalPositionsRef = useRef<Float32Array | null>(null);
  if (originalPositionsRef.current == null) {
    originalPositionsRef.current = new Float32Array(INITIAL_POSITIONS);
  }

  useFrame((state, delta) => {
    if (!ref.current) return;
    const velocities = velocitiesRef.current;
    const originalPositions = originalPositionsRef.current;
    if (!velocities || !originalPositions) return;
    
    // Convert normalized mouse coordinates to world space coordinates
    const targetX = (mouse.x * viewport.width) / 2;
    const targetY = (mouse.y * viewport.height) / 2;
    
    const positions = ref.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Basic drift
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];

      // Mouse repulsion
      const dx = targetX - positions[i3];
      const dy = targetY - positions[i3 + 1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 3) {
        const force = (3 - dist) / 3;
        positions[i3] -= dx * force * 0.05;
        positions[i3 + 1] -= dy * force * 0.05;
      }
      
      // Return to original bounds gently
      if (Math.abs(positions[i3] - originalPositions[i3]) > 5) {
        velocities[i3] *= -1;
      }
      if (Math.abs(positions[i3 + 1] - originalPositions[i3 + 1]) > 5) {
        velocities[i3 + 1] *= -1;
      }
      
      // Slow rotation for the entire field
      ref.current.rotation.x -= delta / 30;
      ref.current.rotation.y -= delta / 45;
    }
    
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#8b5cf6"
        size={0.06}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  );
}

export default function HeroParticles() {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setSupported(isWebGLSupported());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const cssFallback = (
    <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/10 via-transparent to-blue-900/10 pointer-events-none" />
  );

  if (!supported) {
    return cssFallback;
  }

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-[1]">
      <WebGLErrorBoundary fallback={cssFallback}>
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }} gl={{ powerPreference: "low-power" }}>
          <Particles />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
