import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Focus,
  RotateCcw,
  Volume2,
  Wind,
} from 'lucide-react';
import {
  computeExplodedLayerPositions,
  FAN_MOUNT_ANGLE,
  type ChassisFinish,
  type LvglMode,
  type RingAccent,
} from '../../utils/aevoraEngine';
import { HARDWARE_LAYERS, type SubsystemCategory } from '../../data/hardwareLayers';
import { playDetentClick } from '../../utils/tactileAudio';
import {
  createAevoraMaterialSet,
  createContactShadowTexture,
  detectSoftwareWebGl,
  type AevoraMaterialSet,
} from './aevoraMaterials';
import {
  buildAevoraAssembly,
  type AevoraAssemblyHandles,
} from './aevoraAssemblyBuilder';

export type CameraPresetId = 'iso' | 'top' | 'side';
export type StageOverlayMode = 'inspect' | 'isolate' | 'thermal' | 'acoustic';

interface AevoraExplodedStageProps {
  selectedLayerId: string;
  onSelectLayer: (layerId: string) => void;
  activeCategory: SubsystemCategory;
  overlayMode: StageOverlayMode;
  onChangeOverlayMode: (mode: StageOverlayMode) => void;
  finish: ChassisFinish;
  ringAccent: RingAccent;
  lvglMode: LvglMode;
  cordlessMode: boolean;
  fanRpm: number;
  tokensPerSec: number;
  micEnabled: boolean;
  hidConnected: boolean;
  explodeAmount: number;
  onChangeExplodeAmount: (val: number) => void;
  soundEnabled: boolean;
}

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { label: string; pos: [number, number, number]; targetY: number }
> = {
  iso: { label: '3/4 CAD', pos: [5.15, 2.75, 5.8], targetY: -0.52 },
  top: { label: 'Top IPS', pos: [0.01, 7.25, 1.75], targetY: 0.15 },
  side: { label: 'Elevation', pos: [6.85, 0.35, 0.72], targetY: -0.52 },
};

const LAYER_CATEGORY_MAP: Record<string, Exclude<SubsystemCategory, 'all'>> = Object.fromEntries(
  HARDWARE_LAYERS.map((l) => [l.id, l.category])
);

// Module-level pre-allocated scratch math objects (zero GC in render loop)
const _scratchObj = new THREE.Object3D();
const _flowPos = new THREE.Vector3();
const _flowTangent = new THREE.Vector3();
const _flowLookTarget = new THREE.Vector3();
const _coolColor = new THREE.Color(0x38bdf8);
const _warmColor = new THREE.Color(0xff922b);
const _hotColor = new THREE.Color(0xff4500);
const _tmpColor = new THREE.Color();
const _rayMouse = new THREE.Vector2();
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();

export const AevoraExplodedStage: React.FC<AevoraExplodedStageProps> = ({
  selectedLayerId,
  onSelectLayer,
  activeCategory,
  overlayMode,
  onChangeOverlayMode,
  finish,
  ringAccent,
  lvglMode,
  cordlessMode,
  fanRpm,
  tokensPerSec,
  micEnabled,
  hidConnected,
  explodeAmount,
  onChangeExplodeAmount,
  soundEnabled,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPresetId>('iso');
  const [autoRotate, setAutoRotate] = useState(false);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  // Latest React props & callbacks stored in refs so WebGL mounts once
  const stateRef = useRef({
    selectedLayerId,
    activeCategory,
    overlayMode,
    finish,
    ringAccent,
    lvglMode,
    cordlessMode,
    fanRpm,
    tokensPerSec,
    micEnabled,
    hidConnected,
    explodeAmount,
    autoRotate,
  });
  stateRef.current = {
    selectedLayerId,
    activeCategory,
    overlayMode,
    finish,
    ringAccent,
    lvglMode,
    cordlessMode,
    fanRpm,
    tokensPerSec,
    micEnabled,
    hidConnected,
    explodeAmount,
    autoRotate,
  };

  const callbacksRef = useRef({ onSelectLayer });
  callbacksRef.current = { onSelectLayer };

  const cameraGoalRef = useRef<{
    pos: [number, number, number];
    targetY: number;
  } | null>(null);

  const matSetRef = useRef<AevoraMaterialSet | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const requestWakeRef = useRef<() => void>(() => {});

  // Apply dynamic material updates (finish, ring accent) cleanly without remounting WebGL
  useEffect(() => {
    const mats = matSetRef.current;
    const renderer = rendererRef.current;
    if (!mats || !renderer) return;

    const isCharcoal = finish === 'charcoal';
    mats.aluminumChassis.color.setHex(isCharcoal ? 0x262930 : 0xd5d4ce);
    mats.aluminumChassis.roughness = isCharcoal ? 0.34 : 0.25;
    mats.aluminumTrim.color.setHex(isCharcoal ? 0x3b3f4a : 0xe9e8e2);
    mats.displayPuckBezel.color.setHex(isCharcoal ? 0x16181e : 0x262932);

    const isAmber = ringAccent === 'amber';
    mats.ledRing.color.setHex(isAmber ? 0xff4200 : 0x0284c7);
    mats.ledRing.emissive.setHex(isAmber ? 0xff4500 : 0x0ea5e9);
    mats.ledRing.emissiveIntensity = isAmber ? 1.55 : 1.75;

    const s = stateRef.current;
    mats.lvglController.drawFrame({
      timeSec: 0,
      accent: ringAccent,
      lvglMode: s.lvglMode,
      cordlessMode: s.cordlessMode,
      fanRpm: s.fanRpm,
      tokensPerSec: s.tokensPerSec,
      micEnabled: s.micEnabled,
      hidConnected: s.hidConnected,
    });

    requestWakeRef.current();
  }, [finish, ringAccent]);

  // Wake renderer whenever interactive layer/category/explode/overlay/telemetry props change
  useEffect(() => {
    requestWakeRef.current();
  }, [
    selectedLayerId,
    activeCategory,
    overlayMode,
    explodeAmount,
    lvglMode,
    cordlessMode,
    fanRpm,
    tokensPerSec,
    micEnabled,
    hidConnected,
    autoRotate,
  ]);

  // Core Three.js lifecycle (mounts once)
  useEffect(() => {
    const mountEl = mountRef.current;
    const wrapEl = containerRef.current;
    if (!mountEl || !wrapEl) return;

    const isSoftwareGl = detectSoftwareWebGl();

    const width = Math.max(300, mountEl.clientWidth || 560);
    const height = Math.max(320, mountEl.clientHeight || 520);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mountEl.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const bgHex = 0x13151a;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.042);

    // Mandatory Studio PMREM Environment Lighting on every device
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 60);
    camera.position.set(...CAMERA_PRESETS.iso.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, CAMERA_PRESETS.iso.targetY, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.6;
    controls.maxDistance = 8.5;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI * 0.54;
    controls.update();

    // Warm key / cool fill lighting rig + studio softbox panels on GPU
    const hemiLight = new THREE.HemisphereLight(0xc8dcff, 0x26211c, 0.72);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1de, 2.2);
    keyLight.position.set(3.8, 6.2, 4.4);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1.0;
      keyLight.shadow.camera.far = 16;
      keyLight.shadow.camera.left = -3.2;
      keyLight.shadow.camera.right = 3.2;
      keyLight.shadow.camera.top = 4.2;
      keyLight.shadow.camera.bottom = -4.2;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7ab8ff, 1.05);
    rimLight.position.set(-4.5, 2.5, -3.5);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softboxLeft = new THREE.RectAreaLight(0xfff6eb, 2.4, 2.8, 4.4);
      softboxLeft.position.set(-3.6, 1.4, 2.4);
      softboxLeft.lookAt(0, 0, 0);
      scene.add(softboxLeft);
    }

    // Matte architectural studio floor + soft radial contact shadow disc
    const studioFloorGeo = new THREE.CircleGeometry(14, 48);
    studioFloorGeo.rotateX(-Math.PI / 2);
    const studioFloorMat = new THREE.MeshStandardMaterial({
      color: 0x16181e,
      roughness: 0.92,
      metalness: 0.08,
    });
    const studioFloor = new THREE.Mesh(studioFloorGeo, studioFloorMat);
    studioFloor.position.y = -2.42;
    studioFloor.receiveShadow = true;
    scene.add(studioFloor);

    const contactTex = createContactShadowTexture();
    const contactGeo = new THREE.CircleGeometry(2.3, 40);
    contactGeo.rotateX(-Math.PI / 2);
    const contactMat = new THREE.MeshBasicMaterial({
      map: contactTex,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    });
    const contactDisc = new THREE.Mesh(contactGeo, contactMat);
    contactDisc.position.y = -2.4;
    scene.add(contactDisc);

    // Build Procedural 9-Layer AEVORA Assembly
    const initState = stateRef.current;
    const matSet = createAevoraMaterialSet(
      renderer,
      initState.finish,
      initState.ringAccent,
      isSoftwareGl
    );
    matSetRef.current = matSet;

    // Architectural studio calibration reticle ring above contact shadow disc
    const reticleGeo = new THREE.CircleGeometry(2.55, 48);
    reticleGeo.rotateX(-Math.PI / 2);
    const reticleMesh = new THREE.Mesh(reticleGeo, matSet.floorReticle);
    reticleMesh.position.y = -2.38;
    scene.add(reticleMesh);

    const assembly: AevoraAssemblyHandles = buildAevoraAssembly(matSet);
    scene.add(assembly.root);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycaster strictly locked to Layer 1 hitProxies
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);

    let pointerDownPos: { x: number; y: number } | null = null;
    let lastHoverCheck = 0;

    const updateRayCoords = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!pointerDownPos) return;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      pointerDownPos = null;
      if (dist > 6) return;

      updateRayCoords(e.clientX, e.clientY);
      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(assembly.hitProxies, false);
      if (hits.length > 0) {
        const layerId = hits[0].object.userData.layerId as string | undefined;
        if (layerId) {
          callbacksRef.current.onSelectLayer(layerId);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 55) return;
      lastHoverCheck = now;

      updateRayCoords(e.clientX, e.clientY);
      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(assembly.hitProxies, false);
      const hitId = hits.length > 0 ? (hits[0].object.userData.layerId as string) : null;
      renderer.domElement.style.cursor = hitId ? 'pointer' : 'grab';
      setHoveredLayerId((prev) => (prev === hitId ? prev : hitId));
    };

    const handleControlsStart = () => {
      cameraGoalRef.current = null;
      requestWakeRef.current();
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    controls.addEventListener('start', handleControlsStart);

    // ResizeObserver for crisp layout scaling
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(280, Math.floor(entry.contentRect.width));
      const h = Math.max(300, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestWakeRef.current();
    });
    resizeObserver.observe(mountEl);

    // Visibility observer pauses background WebGL CPU/GPU usage when scrolled away
    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
        if (isVisible) requestWakeRef.current();
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(wrapEl);

    // Damped simulation state
    let currentExplode = stateRef.current.explodeAmount;
    const initialPositions = computeExplodedLayerPositions(
      currentExplode,
      stateRef.current.selectedLayerId
    );
    Object.entries(initialPositions).forEach(([id, tf]) => {
      const grp = assembly.layers[id];
      if (grp) {
        grp.position.set(tf.xOffset, tf.yOffset, tf.zOffset);
      }
    });

    let currentHaloY = initialPositions[stateRef.current.selectedLayerId]?.yOffset ?? 0;
    let currentHaloX = initialPositions[stateRef.current.selectedLayerId]?.xOffset ?? 0;
    let currentHaloRotZ = stateRef.current.selectedLayerId === 'fan' ? Math.PI / 2 : 0;
    let currentSpstOffsetX = stateRef.current.micEnabled ? -0.205 : -0.265;
    let airflowClock = 0;
    let acousticClock = 0;
    let hudClock = 0;
    let lastHudDrawSec = -1;
    let lastHudSig = '';

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const status = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const advanceScene = (dt: number) => {
      const s = stateRef.current;

      // Exponentially damp exploded stack separation (x, y, z)
      currentExplode = THREE.MathUtils.damp(currentExplode, s.explodeAmount, 7.5, dt);
      const targets = computeExplodedLayerPositions(currentExplode, s.selectedLayerId);

      Object.entries(targets).forEach(([id, tf]) => {
        const grp = assembly.layers[id];
        if (!grp) return;
        grp.position.x = THREE.MathUtils.damp(grp.position.x, tf.xOffset, 9.0, dt);
        grp.position.y = THREE.MathUtils.damp(grp.position.y, tf.yOffset, 9.0, dt);
        grp.position.z = THREE.MathUtils.damp(grp.position.z, tf.zOffset, 9.0, dt);

        // Apply CAD X-Ray ghosting for Isolate mode or active subsystem category filter
        const dimmedByIsolate = s.overlayMode === 'isolate' && id !== s.selectedLayerId;
        const dimmedByCategory =
          s.activeCategory !== 'all' && LAYER_CATEGORY_MAP[id] !== s.activeCategory;
        assembly.setLayerDimmed(id, dimmedByIsolate || dimmedByCategory);
      });

      // Keep Waveshare UPS HAT PCB cleanly between 21700 cells and acoustic red damper
      assembly.upsSubGroup.position.y = 0.142 + currentExplode * 0.32;

      // Sync 4 brass guide standoff rod span between underside of Top Cover (01) and Battery Base (09)
      const topY = (assembly.layers.display?.position.y ?? targets.display.yOffset) - 0.035;
      const botY = (assembly.layers.battery?.position.y ?? targets.battery.yOffset) - 0.075;
      const span = Math.max(0.85, topY - botY);
      assembly.guideRods.position.y = (topY + botY) * 0.5;
      assembly.guideRods.scale.y = span;
      assembly.guideRods.visible = s.overlayMode !== 'isolate';

      // Smoothly dock Selection Halo on active layer in Inspect or Isolate mode
      const selTf = targets[s.selectedLayerId] ?? targets.jetson;
      const isFanSelected = s.selectedLayerId === 'fan';
      const targetHaloY =
        s.selectedLayerId === 'battery'
          ? selTf.yOffset + 0.13 + 0.25 * currentExplode
          : selTf.yOffset;
      currentHaloY = THREE.MathUtils.damp(currentHaloY, targetHaloY, 10, dt);
      currentHaloX = THREE.MathUtils.damp(currentHaloX, isFanSelected ? selTf.xOffset : 0, 10, dt);
      currentHaloRotZ = THREE.MathUtils.damp(currentHaloRotZ, isFanSelected ? Math.PI / 2 : 0, 10, dt);
      assembly.selectionHalo.position.set(
        currentHaloX,
        currentHaloY,
        isFanSelected ? selTf.zOffset : 0
      );
      assembly.selectionHalo.rotation.set(
        0,
        isFanSelected ? -(Math.PI / 2 - FAN_MOUNT_ANGLE) : 0,
        currentHaloRotZ
      );
      assembly.selectionHalo.scale.setScalar(isFanSelected ? 0.44 : 1.0);
      assembly.selectionHalo.visible =
        s.overlayMode === 'inspect' || s.overlayMode === 'isolate';

      // Spin vertical Noctua NF-A4x10 impeller proportional to fanRPM telemetry
      const rpmSpeed = Math.max(1.4, (s.fanRpm / 1450) * 4.2);
      assembly.fanRotor.rotation.z -= rpmSpeed * dt;

      // Sync SPST mechanical slider, Mic Mute pill, and DPDT USB indicator directly in 3D collar
      const targetSpstX = s.micEnabled ? -0.205 : -0.265;
      currentSpstOffsetX = THREE.MathUtils.damp(currentSpstOffsetX, targetSpstX, 12, dt);
      assembly.spstLever.position.x = currentSpstOffsetX;
      assembly.micMuteIndicator.material = s.micEnabled ? matSet.accentSwitch : matSet.redToggle;
      assembly.dpdtIndicator.material = s.hidConnected ? matSet.greenLed : matSet.heatsinkDark;

      // Keep top 2.4" circular IPS LVGL display live-synced with Section 01 state
      hudClock += dt;
      const hudSig = `${s.ringAccent}-${s.lvglMode}-${s.cordlessMode}-${Math.round(s.fanRpm)}-${s.tokensPerSec}-${s.micEnabled}-${s.hidConnected}`;
      if (hudClock - lastHudDrawSec >= 0.08 || hudSig !== lastHudSig) {
        lastHudDrawSec = hudClock;
        lastHudSig = hudSig;
        matSet.lvglController.drawFrame({
          timeSec: hudClock,
          accent: s.ringAccent,
          lvglMode: s.lvglMode,
          cordlessMode: s.cordlessMode,
          fanRpm: s.fanRpm,
          tokensPerSec: s.tokensPerSec,
          micEnabled: s.micEnabled,
          hidConnected: s.hidConnected,
        });
      }

      // Engineering overlays: Thermal Airflow CFD vs Acoustic Isolation Wavefronts
      assembly.airflowGroup.visible = s.overlayMode === 'thermal';
      assembly.acousticHighlightGroup.visible = s.overlayMode === 'acoustic';

      if (s.overlayMode === 'acoustic') {
        acousticClock += dt * 0.85;
        assembly.acousticWaveRings.forEach((ring, idx) => {
          const phase = (acousticClock + idx / assembly.acousticWaveRings.length) % 1;
          ring.mesh.position.y = -0.10 - phase * 0.38;
          const sc = 0.65 + phase * 0.95;
          ring.mesh.scale.set(sc, 1, sc);
          ring.mat.opacity = Math.sin(phase * Math.PI) * 0.72;
        });
      }

      if (s.overlayMode === 'thermal') {
        airflowClock += dt * 0.48;
        const fanTheta = FAN_MOUNT_ANGLE;
        const fanNx = Math.sin(fanTheta);
        const fanNz = Math.cos(fanTheta);
        const fanTx = Math.cos(fanTheta);
        const fanTz = -Math.sin(fanTheta);

        const fx = targets.fan.xOffset;
        const fy = targets.fan.yOffset;
        const fz = targets.fan.zOffset;
        const baseY = targets.battery.yOffset;
        const finTopY = targets.jetson.yOffset + 0.14;

        const routeSpecs = [
          { a: -1.12, zFin: -0.18, u: -0.16, v: -0.10 },
          { a: -0.32, zFin: -0.06, u: -0.08, v: 0.0 },
          { a: 1.08, zFin: 0.05, u: 0.08, v: 0.10 },
          { a: 1.88, zFin: 0.16, u: 0.16, v: -0.10 },
          { a: 2.74, zFin: -0.12, u: -0.11, v: 0.20 },
          { a: 3.66, zFin: 0.08, u: 0.10, v: -0.20 },
        ];

        assembly.airflowRoutes.forEach((route, idx) => {
          const spec = routeSpecs[idx % routeSpecs.length];
          const sx = Math.sin(spec.a);
          const cz = Math.cos(spec.a);
          const pts = route.points;

          pts[0].set(sx * 1.40, baseY - 0.14, cz * 1.40);
          pts[1].set(sx * 0.90, baseY + 0.02, cz * 0.90);
          pts[2].set(sx * 0.77, targets.acoustic.yOffset + 0.06, cz * 0.77);
          pts[3].set(-0.06, finTopY, spec.zFin);
          pts[4].set(
            fx - fanNx * 0.18 + fanTx * spec.u,
            fy + spec.v,
            fz - fanNz * 0.18 + fanTz * spec.u
          );
          pts[5].set(
            fx + fanNx * 0.13 + fanTx * (spec.u * 0.88),
            fy + spec.v,
            fz + fanNz * 0.13 + fanTz * (spec.u * 0.88)
          );
          pts[6].set(
            fx + fanNx * 0.72 + fanTx * (spec.u * 1.35),
            fy + spec.v * 1.15,
            fz + fanNz * 0.72 + fanTz * (spec.u * 1.35)
          );
        });

        const totalDarts = 72;
        const routeCount = assembly.airflowRoutes.length;
        const perRoute = totalDarts / routeCount;

        for (let i = 0; i < totalDarts; i += 1) {
          const rIdx = Math.floor(i / perRoute);
          const localIdx = i % perRoute;
          const route = assembly.airflowRoutes[rIdx];
          const t = (airflowClock + localIdx / perRoute + rIdx * 0.13) % 1;

          route.curve.getPoint(t, _flowPos);
          route.curve.getTangent(t, _flowTangent);
          _flowLookTarget.copy(_flowPos).add(_flowTangent);

          _scratchObj.position.copy(_flowPos);
          _scratchObj.lookAt(_flowLookTarget);
          const pulseScale = 0.72 + Math.sin(t * Math.PI) * 0.52;
          _scratchObj.scale.set(pulseScale, pulseScale, pulseScale * 1.25);
          _scratchObj.updateMatrix();
          assembly.airflowParticles.setMatrixAt(i, _scratchObj.matrix);

          if (t < 0.45) {
            _tmpColor.copy(_coolColor);
          } else if (t < 0.72) {
            const blend = (t - 0.45) / 0.27;
            _tmpColor.copy(_coolColor).lerp(_warmColor, blend);
          } else {
            const blend = (t - 0.72) / 0.28;
            _tmpColor.copy(_warmColor).lerp(_hotColor, blend);
          }
          assembly.airflowParticles.setColorAt(i, _tmpColor);
        }
        assembly.airflowParticles.instanceMatrix.needsUpdate = true;
        if (assembly.airflowParticles.instanceColor) {
          assembly.airflowParticles.instanceColor.needsUpdate = true;
        }
      }

      // Smooth damped camera preset transitions
      const goal = cameraGoalRef.current;
      if (goal) {
        _camGoalPos.set(goal.pos[0], goal.pos[1], goal.pos[2]);
        _camGoalTarget.set(0, goal.targetY, 0);
        const alpha = 1 - Math.exp(-6.5 * dt);
        camera.position.lerp(_camGoalPos, alpha);
        controls.target.lerp(_camGoalTarget, alpha);
        if (camera.position.distanceTo(_camGoalPos) < 0.025) {
          camera.position.copy(_camGoalPos);
          controls.target.copy(_camGoalTarget);
          cameraGoalRef.current = null;
        }
      } else {
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          -0.52 + selTf.yOffset * 0.14,
          4.5,
          dt
        );
      }

      controls.autoRotate = !isSoftwareGl && s.autoRotate && !cameraGoalRef.current;
      controls.autoRotateSpeed = 1.15;
      controls.update();
    };

    let renderScheduled = false;
    const scheduleNext = () => {
      if (disposed || renderScheduled || !isVisible) return;
      renderScheduled = true;
      frameId = requestAnimationFrame(tick);
    };

    const tick = () => {
      renderScheduled = false;
      if (disposed || !isVisible) return;

      const now = performance.now();
      const dt = Math.min(0.06, Math.max(0.004, (now - lastTime) / 1000));
      lastTime = now;

      advanceScene(dt);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(() => {
          if (!disposed && isVisible) {
            renderScheduled = true;
            tick();
          }
        });
      } else {
        scheduleNext();
      }
    };

    requestWakeRef.current = () => {
      lastTime = performance.now();
      scheduleNext();
    };

    // Initial deterministic draw + start loop
    advanceScene(0.016);
    renderer.render(scene, camera);
    scheduleNext();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      controls.removeEventListener('start', handleControlsStart);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      controls.dispose();

      assembly.disposeGeometries();
      matSet.dispose();
      reticleGeo.dispose();
      studioFloorGeo.dispose();
      studioFloorMat.dispose();
      contactGeo.dispose();
      contactMat.dispose();
      contactTex.dispose();
      envTex.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
      matSetRef.current = null;
    };
  }, []);

  const applyCameraPreset = (presetId: CameraPresetId) => {
    playDetentClick(soundEnabled, 1080);
    setActivePreset(presetId);
    const p = CAMERA_PRESETS[presetId];
    cameraGoalRef.current = { pos: p.pos, targetY: p.targetY };
    requestWakeRef.current();
  };

  const activeLayerMeta =
    HARDWARE_LAYERS.find((l) => l.id === selectedLayerId) ?? HARDWARE_LAYERS[0];
  const hoveredLayerMeta = hoveredLayerId
    ? HARDWARE_LAYERS.find((l) => l.id === hoveredLayerId)
    : null;

  const isAssembled = explodeAmount < 0.08;

  return (
    <div
      ref={containerRef}
      data-testid="aevora-3d-stage"
      data-selected-layer={selectedLayerId}
      data-overlay={overlayMode}
      data-category={activeCategory}
      data-mic={String(micEnabled)}
      data-mode={lvglMode}
      data-explode={explodeAmount.toFixed(2)}
      className="relative h-[500px] sm:h-[560px] lg:h-full lg:min-h-[610px] w-full overflow-hidden rounded-2xl bg-[#13151a] border border-white/10 select-none"
    >
      {/* Isolated WebGL Mount Container */}
      <div ref={mountRef} className="h-full w-full" aria-label="Interactive 3D exploded CAD assembly of AEVORA" />

      {/* Minimal Top Spec Readout */}
      <div className="pointer-events-none absolute top-3.5 left-4 right-4 flex items-start justify-between gap-3">
        <div className="rounded-lg bg-[#13151a]/90 px-3 py-2 border border-white/10">
          <div className="font-mono text-[10px] tracking-wide text-zinc-400">
            {hoveredLayerMeta
              ? `Click to inspect · Layer ${hoveredLayerMeta.index}`
              : `Active · Layer ${activeLayerMeta.index}`}
          </div>
          <div className="mt-0.5 text-xs font-semibold text-white">
            {(hoveredLayerMeta ?? activeLayerMeta).name}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playDetentClick(soundEnabled, autoRotate ? 880 : 1140);
            setAutoRotate((v) => !v);
          }}
          aria-pressed={autoRotate}
          className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            autoRotate
              ? 'border-[#ff5500] bg-[#ff5500] text-white'
              : 'border-white/15 bg-[#13151a]/90 text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          <span>{autoRotate ? 'Orbiting' : 'Auto-Orbit'}</span>
        </button>
      </div>

      {/* Collapsible Compact Bottom Control Dock (Zero backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          aria-expanded={!dockCollapsed}
          className="pointer-events-auto mb-1 inline-flex items-center gap-1 rounded-t-lg rounded-b-sm border border-white/12 bg-[#16181e]/94 px-2.5 py-1 font-mono text-[10px] text-zinc-300 hover:text-white cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="h-3 w-3" aria-hidden="true" />
              <span>Show 3D Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto flex w-full max-w-[580px] flex-col gap-2 rounded-xl border border-white/12 bg-[#16181e]/95 p-2.5 sm:p-3 text-white shadow-xl">
            {/* Row 1: Explode Snap + Slider + Camera Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1 rounded-lg bg-black/35 p-0.5 border border-white/8 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playDetentClick(soundEnabled, 880);
                    onChangeExplodeAmount(0);
                  }}
                  aria-pressed={isAssembled}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isAssembled
                      ? 'bg-white text-zinc-950'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Assembled
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playDetentClick(soundEnabled, 1140);
                    onChangeExplodeAmount(0.8);
                  }}
                  aria-pressed={!isAssembled}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    !isAssembled
                      ? 'bg-white text-zinc-950'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Exploded
                </button>
              </div>

              <label className="flex min-w-[125px] flex-1 items-center gap-2 text-[11px] font-mono text-zinc-300">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(explodeAmount * 100)}
                  onChange={(e) => onChangeExplodeAmount(Number(e.target.value) / 100)}
                  aria-label="Explode hardware stack slider"
                  className="h-1.5 flex-1 cursor-pointer accent-[#ff5500]"
                />
                <span className="w-8 text-right tabular-nums text-white">
                  {Math.round(explodeAmount * 100)}%
                </span>
              </label>

              <div className="flex items-center gap-1 rounded-lg bg-black/35 p-0.5 border border-white/8 shrink-0">
                {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((pid) => (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => applyCameraPreset(pid)}
                    aria-pressed={activePreset === pid}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      activePreset === pid
                        ? 'bg-white text-zinc-950'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    {CAMERA_PRESETS[pid].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Clear Engineering Inspection Overlays */}
            <div className="flex items-center justify-between gap-2 border-t border-white/8 pt-2">
              <div className="flex flex-wrap items-center gap-1" role="group" aria-label="3D inspection overlays">
                <button
                  type="button"
                  onClick={() => {
                    playDetentClick(soundEnabled, 1020);
                    onChangeOverlayMode('inspect');
                  }}
                  aria-pressed={overlayMode === 'inspect'}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    overlayMode === 'inspect'
                      ? 'bg-white text-zinc-950'
                      : 'text-zinc-300 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Eye className="h-3 w-3" aria-hidden="true" />
                  <span>Inspect</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playDetentClick(soundEnabled, 1100);
                    onChangeOverlayMode('isolate');
                  }}
                  aria-pressed={overlayMode === 'isolate'}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    overlayMode === 'isolate'
                      ? 'bg-white text-zinc-950'
                      : 'text-zinc-300 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Focus className="h-3 w-3" aria-hidden="true" />
                  <span>Isolate X-Ray</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playDetentClick(soundEnabled, 1160);
                    onChangeOverlayMode('thermal');
                    onSelectLayer('fan');
                  }}
                  aria-pressed={overlayMode === 'thermal'}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    overlayMode === 'thermal'
                      ? 'bg-[#ff5500] text-white'
                      : 'text-zinc-300 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Wind className="h-3 w-3" aria-hidden="true" />
                  <span>Airflow CFD</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playDetentClick(soundEnabled, 980);
                    onChangeOverlayMode('acoustic');
                    onSelectLayer('acoustic');
                  }}
                  aria-pressed={overlayMode === 'acoustic'}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    overlayMode === 'acoustic'
                      ? 'bg-sky-500 text-zinc-950'
                      : 'text-zinc-300 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Volume2 className="h-3 w-3" aria-hidden="true" />
                  <span>Acoustic Seal</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
