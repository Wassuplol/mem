"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Chibi } from "@/components/memi/chibi";

/** A drifting cloud of glowing particles. */
function Stars({
  count,
  radius,
  color,
  size,
  opacity = 0.8,
}: {
  count: number;
  radius: number;
  color: string;
  size: number;
  opacity?: number;
}) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * radius * 2;
      arr[i * 3 + 1] = (Math.random() - 0.35) * radius;
      arr[i * 3 + 2] = -Math.random() * radius - 0.5;
    }
    return arr;
  }, [count, radius]);

  useFrame((state) => {
    if (points.current) {
      const t = state.clock.elapsedTime;
      points.current.rotation.y = t * 0.018;
      points.current.position.y = Math.sin(t * 0.3) * 0.08;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={size} color={color} transparent opacity={opacity} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Parallax rig driven by the global mouse position (canvas stays click-through). */
function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y += (target.current.x * 0.22 - g.rotation.y) * Math.min(1, delta * 2.2);
    g.rotation.x += (target.current.y * 0.12 - g.rotation.x) * Math.min(1, delta * 2.2);
  });

  return <group ref={ref}>{children}</group>;
}

/** Full-bleed cinematic hero: Memi floating in a particle void, parallax on mouse. */
export function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 3.5], fov: 40 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.5, 0)}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent", pointerEvents: "none" }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.5} />
      <pointLight position={[-3, 1, -2]} intensity={1.1} color="#22d3ee" />
      <pointLight position={[3, 2, -3]} intensity={0.9} color="#8b5cf6" />
      <Rig>
        <Stars count={520} radius={7} color="#a78bfa" size={0.035} />
        <Stars count={260} radius={5} color="#22d3ee" size={0.028} opacity={0.65} />
        <group scale={1.06} position={[0.88, -0.05, 0]}>
          <Chibi thinking={false} />
        </group>
      </Rig>
    </Canvas>
  );
}
