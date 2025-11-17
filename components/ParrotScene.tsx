"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Props {
  speaking: boolean;
  beat: number; // seconds, monotonically increasing
  lineIndex: number;
}

export default function ParrotScene({ speaking, beat, lineIndex }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    parrotGroup?: THREE.Group;
    parrot?: THREE.Object3D;
    wingBones: THREE.Object3D[];
    headBones: THREE.Object3D[];
    beakBones: THREE.Object3D[];
    clock: THREE.Clock;
    resize: () => void;
    dispose: () => void;
    raf: number | null;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current!;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0b0b);

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(0.4, 1.1, 1.6);

    // Room: floor + walls + a "window" light splash
    const room = new THREE.Group();
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x252525, roughness: 0.9, metalness: 0.0 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0.0 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), wallMat);
    backWall.position.set(0, 1.5, -2.2);

    const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), wallMat);
    sideWall.rotation.y = Math.PI / 2;
    sideWall.position.set(-3, 1.5, 0);

    // Simple window light proxy
    const windowPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.0),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 })
    );
    windowPanel.position.set(1.2, 1.6, -2.19);

    room.add(floor, backWall, sideWall, windowPanel);
    scene.add(room);

    // Lights: soft window light + gentle fill
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(2.5, 3.0, 1.2);
    scene.add(key);

    const fill = new THREE.HemisphereLight(0x99ccff, 0x223344, 0.5);
    scene.add(fill);

    // Wooden perch
    const perch = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.8, metalness: 0.05 });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 24), wood);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 0.9, 0);

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 24), wood);
    stand.position.set(0, 0.5, 0);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 32), wood);
    base.position.set(0, 0.02, 0);

    perch.add(rod, stand, base);
    scene.add(perch);

    const parrotGroup = new THREE.Group();
    parrotGroup.position.set(0, 1.02, 0);
    scene.add(parrotGroup);

    const wingBones: THREE.Object3D[] = [];
    const headBones: THREE.Object3D[] = [];
    const beakBones: THREE.Object3D[] = [];

    // Load hyper-realistic parrot model from three.js example assets
    const loader = new GLTFLoader();
    loader.load(
      "https://threejs.org/examples/models/gltf/Parrot.glb",
      (gltf) => {
        const model = gltf.scene;
        model.traverse((obj: any) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            // Push toward vibrant green without losing texture tint if present
            if ((mesh.material as any)?.color) {
              (mesh.material as any).color = new THREE.Color(0x10ff72);
            }
          }
          const n = (obj.name || "").toLowerCase();
          if (n.includes("wing")) wingBones.push(obj);
          if (n.includes("head") || n.includes("neck")) headBones.push(obj);
          if (n.includes("beak") || n.includes("jaw") || n.includes("mouth")) beakBones.push(obj);
        });

        // Reasonable scale and orientation
        model.scale.setScalar(0.012);
        model.rotation.y = Math.PI * 0.1;
        parrotGroup.add(model);

        // If no bones were discovered, fall back to top-level
        if (wingBones.length === 0) wingBones.push(model);
        if (headBones.length === 0) headBones.push(model);
        if (beakBones.length === 0) beakBones.push(model);

        threeRef.current!.parrot = model;
      },
      undefined,
      () => {
        // If load fails, create a placeholder stylized bird
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 32, 32), new THREE.MeshStandardMaterial({ color: 0x10ff72 }));
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 32, 32), new THREE.MeshStandardMaterial({ color: 0x0ee763 }));
        head.position.set(0, 0.11, 0.04);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.2, roughness: 0.4 }));
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.11, 0.08);
        const wings = new THREE.Group();
        const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.12), new THREE.MeshStandardMaterial({ color: 0x14ff7a }));
        const wingR = wingL.clone();
        wingL.position.set(-0.07, 0.04, 0);
        wingR.position.set(0.07, 0.04, 0);
        wings.add(wingL, wingR);
        const bird = new THREE.Group();
        bird.add(body, head, beak, wings);
        bird.scale.setScalar(1);
        parrotGroup.add(bird);
        wingBones.push(wings);
        headBones.push(head);
        beakBones.push(beak);
        threeRef.current!.parrot = bird;
      }
    );

    const clock = new THREE.Clock();

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", resize);

    let raf: number | null = null;

    const loop = () => {
      const t = clock.getElapsedTime();

      // Cinematic micro camera movement
      const radius = 1.65;
      const angle = Math.sin(t * 0.25) * 0.2 + 0.25;
      camera.position.x = Math.cos(angle) * radius * 0.25;
      camera.position.z = 1.2 + Math.sin(angle) * 0.15;
      camera.position.y = 1.1 + Math.sin(t * 0.2) * 0.02;
      camera.lookAt(0.0, 1.05, 0.0);

      // Feather ruffle: subtle scale wobble
      if (threeRef.current?.parrot) {
        const target = threeRef.current.parrot as THREE.Object3D;
        const s = 1 + Math.sin(t * 3.1) * 0.003 + (speaking ? Math.sin(t * 9.0) * 0.004 : 0);
        target.scale.setScalar(target.scale.x * 0 + s); // keep isotropic, override to s
      }

      // Attitude head tilts: punctuate at line boundaries
      const sharp = Math.sin((beat + lineIndex * 0.3) * 6.0) * (speaking ? 0.04 : 0.02);
      headBones.forEach((b) => {
        b.rotation.z = sharp * 2.0;
        b.rotation.y = Math.sin(t * 0.8 + lineIndex) * 0.15 + (speaking ? 0.08 : 0);
      });

      // Slight wing motion while speaking
      wingBones.forEach((w) => {
        const flap = speaking ? Math.sin(t * 10.0) * 0.06 : Math.sin(t * 1.8) * 0.01;
        w.rotation.x = flap;
      });

      // Beak open/close while speaking
      beakBones.forEach((b) => {
        const open = speaking ? Math.max(0, Math.sin(t * 14.0)) * 0.28 : Math.max(0, Math.sin(t * 2.0)) * 0.05;
        b.rotation.x = open;
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    threeRef.current = {
      renderer,
      scene,
      camera,
      parrotGroup,
      wingBones,
      headBones,
      beakBones,
      clock,
      resize,
      raf,
      dispose: () => {
        window.removeEventListener("resize", resize);
        if (raf) cancelAnimationFrame(raf);
        renderer.dispose();
        container.removeChild(renderer.domElement);
      }
    };

    return () => {
      threeRef.current?.dispose();
      threeRef.current = null;
    };
  }, []);

  // React to size changes if container resizes (Next layout changes)
  useEffect(() => {
    threeRef.current?.resize();
  });

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
