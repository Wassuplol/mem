"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const SKIN = "#ffe8d9";
const HAIR = "#b9a1f7";
const HAIR_DARK = "#9a7fe8";
const DRESS = "#6d4fd0";
const RIBBON = "#22d3ee";
const IRIS = "#7c5cff";
const INK = "#2a2342";

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

/** One anime eye: white base, violet iris, pupil, two glints. Blinks via group scale. */
function Eye({ x }: { x: number }) {
  return (
    <group position={[x, 0.03, 0.43]}>
      <mesh position={[0, 0, 0.02]} scale={[0.95, 1.2, 0.5]}>
        <sphereGeometry args={[0.095, 24, 24]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.055]} scale={[1, 1.15, 0.5]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshStandardMaterial color={IRIS} roughness={0.15} emissive={IRIS} emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.075]} scale={[1, 1, 0.5]}>
        <sphereGeometry args={[0.038, 16, 16]} />
        <meshStandardMaterial color={INK} roughness={0.2} />
      </mesh>
      <mesh position={[-0.03, 0.04, 0.095]}>
        <sphereGeometry args={[0.026, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.028, -0.022, 0.1]}>
        <sphereGeometry args={[0.013, 10, 10]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/** One twintail: ribbon tie + two segments + tip, sways in useFrame. */
function TwinTail({ side, groupRef }: { side: 1 | -1; groupRef: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={groupRef} position={[side * 0.54, 0.18, -0.02]}>
      <mesh>
        <sphereGeometry args={[0.085, 16, 16]} />
        <meshStandardMaterial color={RIBBON} roughness={0.3} emissive={RIBBON} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[side * 0.14, -0.13, -0.04]}>
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshStandardMaterial color={HAIR} roughness={0.5} />
      </mesh>
      <mesh position={[side * 0.23, -0.32, -0.06]} rotation-z={side * 0.5}>
        <capsuleGeometry args={[0.1, 0.22, 8, 16]} />
        <meshStandardMaterial color={HAIR_DARK} roughness={0.55} />
      </mesh>
      <mesh position={[side * 0.32, -0.5, -0.07]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={HAIR} roughness={0.5} />
      </mesh>
    </group>
  );
}

/**
 * Memi - an anime chibi girl: twintails, bangs, big violet eyes, a dress with
 * a cyan ribbon. Floats, bobs, blinks, tracks the cursor, wanders and gets
 * excited while "thinking".
 */
export function Chibi({ thinking }: { thinking: boolean }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Group>(null);
  const eyeR = useRef<THREE.Group>(null);
  const tailL = useRef<THREE.Group>(null);
  const tailR = useRef<THREE.Group>(null);
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
    // twintail sway
    if (tailL.current) tailL.current.rotation.z = 0.12 + Math.sin(t * 2.1) * 0.1;
    if (tailR.current) tailR.current.rotation.z = -0.12 + Math.sin(t * 2.1 + 1.4) * 0.1;
    // blink
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

      {/* dress */}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.2, 0.46, 0.42, 32]} />
        <meshStandardMaterial color={DRESS} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.33, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.45, 0.022, 10, 40]} />
        <meshStandardMaterial color="#f7f5ff" roughness={0.35} />
      </mesh>

      {/* torso + collar + chest ribbon */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.26, 28, 28]} />
        <meshStandardMaterial color="#f7f5ff" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.14, 0.028, 10, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.26, 0.235]}>
        <sphereGeometry args={[0.045, 14, 14]} />
        <meshStandardMaterial color={RIBBON} roughness={0.3} emissive={RIBBON} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-0.09, 0.27, 0.22]} rotation-z={0.5} scale={[1.3, 0.7, 0.4]}>
        <sphereGeometry args={[0.06, 14, 14]} />
        <meshStandardMaterial color={RIBBON} roughness={0.3} />
      </mesh>
      <mesh position={[0.09, 0.27, 0.22]} rotation-z={-0.5} scale={[1.3, 0.7, 0.4]}>
        <sphereGeometry args={[0.06, 14, 14]} />
        <meshStandardMaterial color={RIBBON} roughness={0.3} />
      </mesh>
      <mesh position={[-0.045, 0.19, 0.235]} rotation-z={0.45}>
        <capsuleGeometry args={[0.022, 0.07, 6, 12]} />
        <meshStandardMaterial color={RIBBON} roughness={0.35} />
      </mesh>
      <mesh position={[0.045, 0.19, 0.235]} rotation-z={-0.45}>
        <capsuleGeometry args={[0.022, 0.07, 6, 12]} />
        <meshStandardMaterial color={RIBBON} roughness={0.35} />
      </mesh>

      {/* arms + hands */}
      <mesh position={[-0.35, 0.13, 0]} rotation-z={0.5}>
        <capsuleGeometry args={[0.055, 0.22, 8, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.45} />
      </mesh>
      <mesh position={[0.35, 0.13, 0]} rotation-z={-0.5}>
        <capsuleGeometry args={[0.055, 0.22, 8, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.45} />
      </mesh>
      <mesh position={[-0.28, 0.26, 0]}>
        <sphereGeometry args={[0.068, 16, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.4} />
      </mesh>
      <mesh position={[0.28, 0.26, 0]}>
        <sphereGeometry args={[0.068, 16, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.4} />
      </mesh>

      {/* head (tracks the cursor) */}
      <group ref={head} position={[0, 0.78, 0]}>
        {/* face */}
        <mesh>
          <sphereGeometry args={[0.48, 48, 48]} />
          <meshStandardMaterial color={SKIN} roughness={0.35} />
        </mesh>

        {/* back hair + cap */}
        <mesh position={[0, 0.02, -0.14]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={HAIR_DARK} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.1, -0.1]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={HAIR} roughness={0.5} />
        </mesh>

        {/* bangs */}
        {[-0.3, -0.15, 0, 0.15, 0.3].map((x, i) => (
          <mesh key={i} position={[x, 0.29 + (i % 2 === 0 ? 0.02 : 0), 0.42]} scale={[0.95, 1.25, 0.55]} rotation-z={x * 0.35}>
            <sphereGeometry args={[0.11, 18, 18]} />
            <meshStandardMaterial color={HAIR} roughness={0.5} />
          </mesh>
        ))}
        {/* side bangs */}
        <mesh position={[-0.38, 0.2, 0.3]} scale={[0.8, 1.5, 0.5]} rotation-z={0.3}>
          <sphereGeometry args={[0.11, 18, 18]} />
          <meshStandardMaterial color={HAIR} roughness={0.5} />
        </mesh>
        <mesh position={[0.38, 0.2, 0.3]} scale={[0.8, 1.5, 0.5]} rotation-z={-0.3}>
          <sphereGeometry args={[0.11, 18, 18]} />
          <meshStandardMaterial color={HAIR} roughness={0.5} />
        </mesh>

        {/* side locks */}
        <mesh position={[-0.44, 0.05, 0.12]} rotation-z={0.1}>
          <capsuleGeometry args={[0.065, 0.28, 8, 16]} />
          <meshStandardMaterial color={HAIR_DARK} roughness={0.55} />
        </mesh>
        <mesh position={[0.44, 0.05, 0.12]} rotation-z={-0.1}>
          <capsuleGeometry args={[0.065, 0.28, 8, 16]} />
          <meshStandardMaterial color={HAIR_DARK} roughness={0.55} />
        </mesh>

        {/* twintails */}
        <TwinTail side={-1} groupRef={tailL} />
        <TwinTail side={1} groupRef={tailR} />

        {/* eyes */}
        <group ref={eyeL}>
          <Eye x={-0.18} />
        </group>
        <group ref={eyeR}>
          <Eye x={0.18} />
        </group>

        {/* blush */}
        <mesh position={[-0.3, -0.06, 0.37]} scale={[1, 0.5, 0.35]}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshBasicMaterial color="#ffb3d1" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0.3, -0.06, 0.37]} scale={[1, 0.5, 0.35]}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshBasicMaterial color="#ffb3d1" transparent opacity={0.6} />
        </mesh>

        {/* smile */}
        <mesh position={[0, -0.15, 0.45]} rotation-z={Math.PI * 1.2}>
          <torusGeometry args={[0.045, 0.012, 10, 20, Math.PI * 0.6]} />
          <meshStandardMaterial color="#c96a8e" roughness={0.3} />
        </mesh>

        {/* ahoge + glowing tip */}
        <mesh position={[0.03, 0.63, 0]} rotation-z={0.18}>
          <cylinderGeometry args={[0.021, 0.021, 0.24, 8]} />
          <meshStandardMaterial color="#d9c9ff" roughness={0.4} />
        </mesh>
        <mesh position={[0.07, 0.76, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#c4b5fd" emissive="#8b5cf6" emissiveIntensity={2.2} />
        </mesh>
        <pointLight position={[0.07, 0.76, 0]} intensity={0.7} color="#a78bfa" distance={1.8} />
      </group>
    </group>
  );
}

/** Transparent canvas wrapper - sized by its parent. */
export function ChibiCanvas({ thinking, cameraZ = 3.2, fov = 42 }: { thinking: boolean; cameraZ?: number; fov?: number }) {
  return (
    <Canvas
      camera={{ position: [0, 0.42, cameraZ], fov }}
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
