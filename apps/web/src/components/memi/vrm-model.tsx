"use client";

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import {
  createVRMAnimationClip,
  VRMAnimationLoaderPlugin,
  VRMLookAtQuaternionProxy,
  type VRMAnimation,
} from "@pixiv/three-vrm-animation";

export type MemiMode = "idle" | "thinking" | "talking";

const VRM_URL = "/models/memi.vrm";
const ANIM_URLS: string[] = ["/models/idle.vrma", "/models/talking.vrma", "/models/thinking.vrma"];

interface Props {
  mode: MemiMode;
  /** Corner-widget framing: lean gently toward the cursor. */
  bust?: boolean;
  /** Hero framing: slow orbit so she is seen from all sides. */
  hero?: boolean;
  /** Extra bounce while the assistant is "thinking". */
  thinkingIntensity?: number;
}

/** Register the VRM + VRMA parsing plugins on a GLTF loader. */
function withVrmPlugins(loader: GLTFLoader) {
  loader.register((parser) => new VRMLoaderPlugin(parser));
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
}

/** VRoid VRM avatar + VRMA clips (idle / talking / thinking), cursor look-at, blink, springbone hair. */
export function VrmModel({ mode = "idle", bust = false, hero = false, thinkingIntensity = 0 }: Props) {
  const gltf = useLoader(GLTFLoader, VRM_URL, withVrmPlugins);
  const animGltfs = useLoader(GLTFLoader, ANIM_URLS, withVrmPlugins);

  const vrm = useMemo(() => gltf.userData.vrm as VRM | undefined, [gltf]);
  const anims = useMemo(
    () => animGltfs.map((g) => (g.userData.vrmAnimations?.[0] as VRMAnimation | undefined) ?? null),
    [animGltfs],
  );

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
  const spin = useRef(0);

  /* one-time scene setup + animation wiring */
  useEffect(() => {
    if (!vrm) return;
    VRMUtils.removeUnnecessaryVertices(vrm.scene);
    VRMUtils.combineSkeletons(vrm.scene);
    vrm.scene.traverse((obj: THREE.Object3D) => (obj.frustumCulled = false));
    vrm.scene.rotation.y = Math.PI; // VRM 0.x faces -Z; flip so she faces the camera
    if (vrm.lookAt) {
      vrm.lookAt.target = lookTarget;
      if (!vrm.scene.children.some((o) => o instanceof VRMLookAtQuaternionProxy)) {
        const lookAtProxy = new VRMLookAtQuaternionProxy(vrm.lookAt);
        lookAtProxy.name = "VRMLookAtQuaternionProxy";
        vrm.scene.add(lookAtProxy);
      }
    }

    const mixer = new THREE.AnimationMixer(vrm.scene);
    mixerRef.current = mixer;
    (["idle", "talking", "thinking"] as const).forEach((key, i) => {
      const anim = anims[i];
      if (!anim) return;
      try {
        actionsRef.current[key] = mixer.clipAction(createVRMAnimationClip(anim, vrm));
      } catch (e) {
        console.warn(`[memi] clip "${key}" failed to build`, e);
      }
    });

    const idle = actionsRef.current.idle;
    if (idle) {
      idle.reset().play();
    } else if (vrm.humanoid) {
      /* no clips? relaxed pose so she never T-poses */
      const lu = vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
      const ru = vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
      if (lu) lu.rotation.z = 1.25;
      if (ru) ru.rotation.z = -1.25;
    }
    activeRef.current = "idle";

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
      actionsRef.current = {};
    };
  }, [vrm, anims, lookTarget]);

  /* crossfade when the requested mode changes */
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

    if (root.current) {
      const excited = mode === "thinking" ? Math.sin(t * 12) * (0.012 + thinkingIntensity * 0.01) : 0;
      root.current.position.y = Math.sin(t * 1.6) * 0.028 + excited;
      root.current.rotation.z = Math.sin(t * 1.25) * 0.022;
      if (t > nextWander.current) {
        waypoint.current = (Math.random() - 0.5) * 0.12;
        nextWander.current = t + 5 + Math.random() * 4;
      }
      root.current.position.x += (waypoint.current - root.current.position.x) * Math.min(1, delta * 0.8);

      if (hero) {
        spin.current += delta * 0.12;
        root.current.rotation.y = Math.sin(spin.current) * 0.35;
      } else if (bust) {
        root.current.rotation.y += (pointer.x * 0.08 - root.current.rotation.y) * Math.min(1, delta * 3);
      }
    }

    /* blink + a soft smile while talking */
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

    /* cursor-driven gaze */
    lookTarget.position.set(pointer.x * 2.6, 1.52 + pointer.y * 1.1, 2.4);
    vrm?.update(delta);
  });

  if (!vrm) return null;

  return (
    <group ref={root}>
      <primitive object={vrm.scene} />
      <primitive object={lookTarget} />
    </group>
  );
}
