"use client";

import { Canvas } from "@react-three/fiber";
import { Component, type ReactNode } from "react";
import { VrmModel } from "./vrm-model";

const MODEL_URL = "/models/memi.vrm";

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

/** Memi - the VRM avatar (VTuber model), posed and animated. */
export function Chibi({ thinking, position = [0, 0, 0] }: { thinking: boolean; position?: [number, number, number] }) {
  return (
    <group position={position}>
      <VrmBoundary>
        <VrmModel url={MODEL_URL} thinking={thinking} />
      </VrmBoundary>
    </group>
  );
}

/** Widget canvas - bust framing (head + shoulders), like a VTuber stream overlay. */
export function ChibiCanvas({ thinking }: { thinking: boolean }) {
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
      <Chibi thinking={thinking} />
    </Canvas>
  );
}
