"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Chibi, type MemiMode } from "@/components/memi/chibi";
import { heroScrollProgress } from "@/lib/scroll-anim";

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

/** Slow-drifting nebula backdrop: violet/cyan fbm-ish gradient wash on a far plane. */
function Nebula() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uViolet: { value: new THREE.Color("#6d28d9") }, uCyan: { value: new THREE.Color("#0e7490") } }),
    [],
  );
  useFrame((state) => {
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh position={[0, 0.6, -7]}>
      <planeGeometry args={[26, 15]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          uniform vec3 uViolet;
          uniform vec3 uCyan;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                       mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
          }
          void main() {
            vec2 uv = vUv - 0.5;
            float d = length(uv * vec2(1.4, 1.0));
            float n = noise(vUv * 3.0 + vec2(uTime * 0.03, -uTime * 0.02)) * 0.6
                    + noise(vUv * 6.0 - vec2(uTime * 0.02, uTime * 0.015)) * 0.4;
            float glow = smoothstep(0.75, 0.0, d) * (0.35 + 0.4 * n);
            vec3 col = mix(uViolet, uCyan, clamp(vUv.x + 0.2 * n, 0.0, 1.0)) * glow;
            gl_FragColor = vec4(col, glow * 0.5);
          }
        `}
      />
    </mesh>
  );
}

/** Scroll-driven camera dolly: pulls back + rises as the pinned hero progresses. */
function Dolly({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const p = heroScrollProgress();
    g.position.y += (p * 0.25 - g.position.y) * Math.min(1, delta * 3);
    g.position.z += (p * 0.7 - g.position.z) * Math.min(1, delta * 3);
  });
  return <group ref={ref}>{children}</group>;
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

/** Full-bleed cinematic hero: Memi floating in a particle void, parallax on mouse + scroll dolly. */
export function HeroScene({ mood = "idle" }: { mood?: MemiMode }) {
  return (
    <Canvas
      camera={{ position: [0, 0.88, 3.16], fov: 40 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.88, 0)}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent", pointerEvents: "none" }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.5} />
      <pointLight position={[-3, 1, -2]} intensity={1.1} color="#22d3ee" />
      <pointLight position={[3, 2, -3]} intensity={0.9} color="#8b5cf6" />
      <Rig>
        <Nebula />
        <Stars count={520} radius={7} color="#a78bfa" size={0.035} />
        <Stars count={260} radius={5} color="#22d3ee" size={0.028} opacity={0.65} />
        <Stars count={140} radius={4} color="#f0abfc" size={0.02} opacity={0.5} />
        <Dolly>
          <group scale={1.05} position={[0.92, 0, 0]}>
            <Suspense fallback={null}>
              <Chibi mode={mood} hero />
            </Suspense>
          </group>
        </Dolly>
      </Rig>
    </Canvas>
  );
}
