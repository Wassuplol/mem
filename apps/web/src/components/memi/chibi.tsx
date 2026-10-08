"use client";

import { Canvas } from "@react-three/fiber";
import { Component, Suspense, type ReactNode } from "react";
import { VrmModel, type MemiMode } from "./vrm-model";

export type { MemiMode };

/** If the VRM fails to load, degrade gracefully to a glowing orb. */
class VrmBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.26, 32, 32]} />
            <meshStandardMaterial color="#b9a1f7" emissive="#8b5cf6" emissiveIntensity={0.9} roughness={0.3} />
          </mesh>
          <pointLight intensity={1} color="#a78bfa" distance={3} />
        </group>
      );
    }
    return this.props.children;
  }
}

/** Memi itself - renders inside an existing canvas (e.g. the hero scene). */
export function Chibi({ mode = "idle", bust = false, hero = false, thinkingIntensity = 0 }: { mode?: MemiMode; bust?: boolean; hero?: boolean; thinkingIntensity?: number }) {
  return (
    <VrmBoundary>
      <VrmModel mode={mode} bust={bust} hero={hero} thinkingIntensity={thinkingIntensity} />
    </VrmBoundary>
  );
}

/** Standalone canvas for the corner widget - bust framing. */
export function ChibiCanvas({ mode = "idle" }: { mode?: MemiMode }) {
  return (
    <Canvas
      camera={{ position: [0, 1.55, 1.23], fov: 34 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.55, 0)}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 2.5]} intensity={1.85} />
      <pointLight position={[-2.4, 1.6, -1.5]} intensity={0.8} color="#22d3ee" />
      <pointLight position={[2.4, 0.8, 1.5]} intensity={0.5} color="#8b5cf6" />
      <Suspense fallback={null}>
        <Chibi mode={mode} bust />
      </Suspense>
    </Canvas>
  );
}
