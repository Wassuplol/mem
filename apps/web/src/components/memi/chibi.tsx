"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const SKIN = "#f6f3ff";
const SKIN_SHADE = "#e9e3ff";
const INK = "#241f3d";

/** Soft radial gradient under her - generated once as a canvas texture. */
function GlowDisc() {
  const texture = useMemo(() => {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, "rgba(167,139,250,0.5)");
      grad.addColorStop(0.55, "rgba(139,92,246,0.16)");
      grad.addColorStop(1, "rgba(139,92,246,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.6}>
      <planeGeometry args={[1.7, 1.7]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

/**
 * Memi - a procedural chibi: floats, bobs, blinks, tracks the cursor,
 * wanders around her corner and gets excited while "thinking".
 */
function Chibi({ thinking }: { thinking: boolean }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const pointer = useThree((s) => s.pointer);
  const nextBlink = useRef(2.5);
  const blink = useRef(0);
  const waypoint = useRef(0);
  const nextWander = useRef(5);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const g = root.current;
    if (g) {
      const excited = thinking ? Math.sin(t * 12) * 0.03 : 0;
      g.position.y = Math.sin(t * 1.7) * 0.05 + excited;
      g.rotation.z = Math.sin(t * 1.3) * 0.03;
      if (t > nextWander.current) {
        waypoint.current = (Math.random() - 0.5) * 0.85;
        nextWander.current = t + 5 + Math.random() * 4;
      }
      g.position.x += (waypoint.current - g.position.x) * Math.min(1, delta * 0.9);
      g.rotation.y = Math.sin(t * 0.7) * 0.06;
    }
    if (head.current) {
      const ty = THREE.MathUtils.clamp(pointer.x * 0.55, -0.45, 0.45);
      const tx = THREE.MathUtils.clamp(-pointer.y * 0.3, -0.28, 0.28);
      head.current.rotation.y += (ty - head.current.rotation.y) * Math.min(1, delta * 4.5);
      head.current.rotation.x += (tx - head.current.rotation.x) * Math.min(1, delta * 4.5);
    }
    if (t > nextBlink.current) {
      blink.current = 1;
      nextBlink.current = t + 2.4 + Math.random() * 3.4;
    }
    blink.current = Math.max(0, blink.current - delta * 10);
    const eyeScale = 1 - blink.current * 0.9;
    if (eyeL.current) eyeL.current.scale.y = eyeScale;
    if (eyeR.current) eyeR.current.scale.y = eyeScale;
  });

  return (
    <group ref={root}>
      <GlowDisc />
      <pointLight position={[0, -0.4, 0.6]} intensity={0.45} color="#8b5cf6" distance={2.5} />

      {/* body */}
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.34, 32, 32]} />
        <meshStandardMaterial color={SKIN_SHADE} roughness={0.4} />
      </mesh>

      {/* arms */}
      <mesh position={[-0.36, 0.12, 0]} rotation-z={0.5}>
        <capsuleGeometry args={[0.06, 0.16, 8, 16]} />
        <meshStandardMaterial color={SKIN_SHADE} roughness={0.45} />
      </mesh>
      <mesh position={[0.36, 0.12, 0]} rotation-z={-0.5}>
        <capsuleGeometry args={[0.06, 0.16, 8, 16]} />
        <meshStandardMaterial color={SKIN_SHADE} roughness={0.45} />
      </mesh>
      {/* hands */}
      <mesh position={[-0.3, 0.25, 0]}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.4} />
      </mesh>
      <mesh position={[0.3, 0.25, 0]}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.4} />
      </mesh>

      {/* head (tracks the cursor) */}
      <group ref={head} position={[0, 0.72, 0]}>
        <mesh>
          <sphereGeometry args={[0.5, 48, 48]} />
          <meshStandardMaterial color={SKIN} roughness={0.32} />
        </mesh>

        {/* eyes + glints */}
        <mesh ref={eyeL} position={[-0.17, 0.05, 0.44]}>
          <sphereGeometry args={[0.07, 24, 24]} />
          <meshStandardMaterial color={INK} roughness={0.25} />
        </mesh>
        <mesh ref={eyeR} position={[0.17, 0.05, 0.44]}>
          <sphereGeometry args={[0.07, 24, 24]} />
          <meshStandardMaterial color={INK} roughness={0.25} />
        </mesh>
        <mesh position={[-0.15, 0.09, 0.49]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.19, 0.09, 0.49]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* blush */}
        <mesh position={[-0.27, -0.08, 0.4]} scale={[1, 0.55, 0.4]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color="#ff9ecb" transparent opacity={0.55} />
        </mesh>
        <mesh position={[0.27, -0.08, 0.4]} scale={[1, 0.55, 0.4]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color="#ff9ecb" transparent opacity={0.55} />
        </mesh>

        {/* tiny smile */}
        <mesh position={[0, -0.09, 0.47]} rotation={[0, 0, Math.PI * 1.25]}>
          <torusGeometry args={[0.07, 0.016, 12, 24, Math.PI * 0.5]} />
          <meshStandardMaterial color={INK} roughness={0.3} />
        </mesh>

        {/* antenna + glowing tip */}
        <mesh position={[0.03, 0.57, 0]} rotation-z={0.16}>
          <cylinderGeometry args={[0.02, 0.02, 0.26, 10]} />
          <meshStandardMaterial color="#cfc6ff" roughness={0.35} />
        </mesh>
        <mesh position={[0.075, 0.72, 0]}>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshStandardMaterial color="#c4b5fd" emissive="#8b5cf6" emissiveIntensity={2.2} />
        </mesh>
        <pointLight position={[0.075, 0.72, 0]} intensity={0.7} color="#a78bfa" distance={1.8} />
      </group>

      {/* brand collar */}
      <mesh position={[0, 0.4, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.2, 0.035, 12, 40]} />
        <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Transparent canvas wrapper - sized by its parent. */
export function ChibiCanvas({ thinking }: { thinking: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0.42, 3.2], fov: 42 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.42, 0)}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 3, 2.5]} intensity={1.4} />
      <pointLight position={[-2.4, 0.6, -1.5]} intensity={0.7} color="#22d3ee" />
      <Chibi thinking={thinking} />
    </Canvas>
  );
}
