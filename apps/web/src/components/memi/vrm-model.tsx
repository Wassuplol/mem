"use client";

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import { createVRMAnimationClip, VRMAnimationLoaderPlugin, type VRMAnimation } from "@pixiv/three-vrm-animation";

export type MemiMode = "idle" | "thinking" | "talking";

const VRM_URL = "/models/memi.vrm";
const ANIM_URLS: Record<MemiMode, string> = {
  idle: "/models/idle.vrma",
  thinking: "/models/thinking.vrma",
  talking: "/models/talking.vrma",
};

/**
 * Loads the VRM avatar + VRMA animation clips (idle / thinking / talking) and
 * blends between them. Layers blinking, cursor look-at and light floating on top.
 */
export function VrmModel({ mode = "idle", sway = true }: { mode?: MemiMode; sway?: boolean }) {
  const [gltfVrm, gltfIdle, gltfThinking, gltfTalking] = useLoader(
    GLTFLoader,
    [VRM_URL, ANIM_URLS.idle, ANIM_URLS.thinking, ANIM_URLS.talking],
    (loader) => {
      loader.register((parser) => new VRMLoaderPlugin(parser));
      loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    },
  );

  const vrm = useMemo(() => gltfVrm.userData.vrm as VRM | undefined, [gltfVrm]);
  const root = useRef<THREE.Group>(null);
  const lookTarget = useMemo(() => new THREE.Object3D(), []);
  const pointer = useThree((s) => s.pointer);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Partial<Record<MemiMode, THREE.AnimationAction>>>({});
  const activeRef = useRef<MemiMode>("idle");
  const nextBlink = useRef(2);
  const blink = useRef(0);
  const waypoint = useRef(0);
  const nextWander = useRef(5);

  /* setup: materials, bones, animations */
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

    const mixer = new THREE.AnimationMixer(vrm.scene);
    mixerRef.current = mixer;
    const clips: Array<[MemiMode, VRMAnimation | undefined]> = [
      ["idle", gltfIdle.userData.vrmAnimations?.[0]],
      ["thinking", gltfThinking.userData.vrmAnimations?.[0]],
      ["talking", gltfTalking.userData.vrmAnimations?.[0]],
    ];
    for (const [key, anim] of clips) {
      if (!anim) continue;
      try {
        actionsRef.current[key] = mixer.clipAction(createVRMAnimationClip(anim, vrm));
      } catch (error) {
        console.warn(`[memi] could not build "${key}" clip:`, error);
      }
    }
    const first = actionsRef.current[mode] ?? actionsRef.current.idle;
    if (first) {
      first.reset().play();
      activeRef.current = actionsRef.current[mode] ? mode : "idle";
    } else {
      // no animation available - fall back to a posed idle (arms down)
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
    }

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
      actionsRef.current = {};
      VRMUtils.deepDispose(vrm.scene);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vrm, gltfIdle, gltfThinking, gltfTalking, lookTarget]);

  /* crossfade when the mode changes */
  useEffect(() => {
    const next = actionsRef.current[mode];
    const prev = actionsRef.current[activeRef.current];
    if (!next || next === prev) return;
    next.reset().setEffectiveWeight(1).fadeIn(0.45).play();
    prev?.fadeOut(0.45);
    activeRef.current = mode;
  }, [mode]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    mixerRef.current?.update(delta);
    vrm?.update(delta);

    if (root.current && sway) {
      // light float on top of the clip - the animation owns the body itself
      const excited = mode === "thinking" ? Math.sin(t * 10) * 0.008 : 0;
      root.current.position.y = Math.sin(t * 1.1) * 0.02 + excited;
      root.current.rotation.y = Math.sin(t * 0.5) * 0.03;
      if (t > nextWander.current) {
        waypoint.current = (Math.random() - 0.5) * 0.12;
        nextWander.current = t + 5 + Math.random() * 4;
      }
      root.current.position.x += (waypoint.current - root.current.position.x) * Math.min(1, delta * 0.8);
    }

    // cursor tracking (applied after the mixer, so it wins over the clip)
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
      em.setValue("happy", mode === "talking" ? 0.45 : 0);
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
