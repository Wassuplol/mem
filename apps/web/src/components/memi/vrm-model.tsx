"use client";

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";

/**
 * Loads a VRM avatar (VTuber model format) and animates it:
 * floats, sways, blinks, looks at the cursor, hair physics via springbones.
 */
export function VrmModel({
  url,
  thinking = false,
  sway = true,
}: {
  url: string;
  thinking?: boolean;
  sway?: boolean;
}) {
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });
  const vrm = useMemo(() => gltf.userData.vrm as VRM | undefined, [gltf]);
  const root = useRef<THREE.Group>(null);
  const lookTarget = useMemo(() => new THREE.Object3D(), []);
  const pointer = useThree((s) => s.pointer);
  const nextBlink = useRef(2);
  const blink = useRef(0);
  const waypoint = useRef(0);
  const nextWander = useRef(5);

  useEffect(() => {
    if (!vrm) return;
    VRMUtils.removeUnnecessaryVertices(vrm.scene);
    VRMUtils.combineSkeletons(vrm.scene);
    vrm.scene.traverse((obj) => {
      obj.frustumCulled = false;
    });
    // VRM 0.x models face -Z; flip so she looks at the camera.
    vrm.scene.rotation.y = Math.PI;
    if (vrm.lookAt) vrm.lookAt.target = lookTarget;
    // break the T-pose: arms down, slight elbow bend, hands relaxed
    const humanoid = vrm.humanoid;
    if (humanoid) {
      const lua = humanoid.getNormalizedBoneNode("leftUpperArm");
      const rua = humanoid.getNormalizedBoneNode("rightUpperArm");
      const lla = humanoid.getNormalizedBoneNode("leftLowerArm");
      const rla = humanoid.getNormalizedBoneNode("rightLowerArm");
      if (lua) lua.rotation.z = 1.38;
      if (rua) rua.rotation.z = -1.38;
      if (lla) lla.rotation.y = 0.3;
      if (rla) rla.rotation.y = -0.3;
    }
    return () => {
      VRMUtils.deepDispose(vrm.scene);
    };
  }, [vrm, lookTarget]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    vrm?.update(delta);

    if (root.current && sway) {
      const excited = thinking ? Math.sin(t * 12) * 0.012 : 0;
      root.current.position.y = Math.sin(t * 1.6) * 0.03 + excited;
      root.current.rotation.z = Math.sin(t * 1.2) * 0.018;
      root.current.rotation.y = Math.sin(t * 0.6) * 0.05;
      if (t > nextWander.current) {
        waypoint.current = (Math.random() - 0.5) * 0.12;
        nextWander.current = t + 5 + Math.random() * 4;
      }
      root.current.position.x += (waypoint.current - root.current.position.x) * Math.min(1, delta * 0.8);
    }

    // cursor tracking
    lookTarget.position.set(pointer.x * 2.6, 1.52 + pointer.y * 1.1, 2.4);

    // blink
    if (t > nextBlink.current) {
      blink.current = 1;
      nextBlink.current = t + 2.2 + Math.random() * 3.4;
    }
    blink.current = Math.max(0, blink.current - delta * 9);

    const em = vrm?.expressionManager;
    if (em) {
      em.setValue("blink", blink.current > 0.04 ? Math.min(1, blink.current * 1.5) : 0);
      em.setValue("happy", thinking ? 0.65 : 0);
    }
  });

  if (!vrm) return null;
  return (
    <group ref={root}>
      <primitive object={vrm.scene} />
      <primitive object={lookTarget} />
    </group>
  );
}
