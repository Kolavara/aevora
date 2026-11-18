import * as THREE from 'three';
import { FAN_MOUNT_ANGLE } from '../../utils/aevoraEngine';
import type { AevoraMaterialSet } from './aevoraMaterials';

export interface AevoraAssemblyHandles {
  root: THREE.Group;
  layers: Record<string, THREE.Group>;
  upsSubGroup: THREE.Group;
  hitProxies: THREE.Mesh[];
  guideRods: THREE.Group;
  fanRotor: THREE.Group;
  spstLever: THREE.Group;
  micMuteIndicator: THREE.Mesh;
  dpdtIndicator: THREE.Mesh;
  airflowGroup: THREE.Group;
  airflowParticles: THREE.InstancedMesh;
  airflowRoutes: Array<{
    points: THREE.Vector3[];
    curve: THREE.CatmullRomCurve3;
  }>;
  acousticHighlightGroup: THREE.Group;
  selectionHalo: THREE.Mesh;
  disposeGeometries: () => void;
}

const _dummy = new THREE.Object3D();

export function buildAevoraAssembly(mats: AevoraMaterialSet): AevoraAssemblyHandles {
  const geometries: THREE.BufferGeometry[] = [];
  const extraDisposableMats: THREE.Material[] = [];

  const track = <T extends THREE.BufferGeometry>(geo: T): T => {
    geometries.push(geo);
    return geo;
  };

  const root = new THREE.Group();
  const layers: Record<string, THREE.Group> = {};
  const hitProxies: THREE.Mesh[] = [];

  const registerProxy = (
    group: THREE.Group,
    layerId: string,
    radius: number,
    height: number,
    offset?: [number, number, number]
  ) => {
    const proxyGeo = track(new THREE.CylinderGeometry(radius, radius, height, 16));
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    extraDisposableMats.push(proxyMat);
    const proxy = new THREE.Mesh(proxyGeo, proxyMat);
    if (offset) proxy.position.set(...offset);
    proxy.userData.layerId = layerId;
    proxy.layers.set(1);
    group.add(proxy);
    hitProxies.push(proxy);
  };

  // Shared fastener geometries (true 6-sided hex/socket precision)
  const hexStandoffGeo = track(new THREE.CylinderGeometry(0.024, 0.024, 0.19, 6));
  const socketScrewGeo = track(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 6));
  const icChipGeo = track(new THREE.BoxGeometry(0.22, 0.03, 0.22));

  // ── 01. ELEVATED CIRCULAR OLED DISPLAY PUCK (PROUD ABOVE OUTER COLLAR & RING) ─
  const displayGroup = new THREE.Group();
  const crownProfile = [
    new THREE.Vector2(0.71, -0.095),
    new THREE.Vector2(0.758, -0.095),
    new THREE.Vector2(0.758, -0.035),
    new THREE.Vector2(0.785, -0.035),
    new THREE.Vector2(0.785, 0.082),
    new THREE.Vector2(0.758, 0.098),
    new THREE.Vector2(0.742, 0.098),
    new THREE.Vector2(0.734, 0.072),
    new THREE.Vector2(0.0, 0.072),
  ];
  const crownGeo = track(new THREE.LatheGeometry(crownProfile, 96));
  const crownMesh = new THREE.Mesh(crownGeo, mats.displayPuckBezel);
  crownMesh.castShadow = true;
  crownMesh.receiveShadow = true;
  displayGroup.add(crownMesh);

  // Machined metallic micro-chamfer rim framing the top OLED glass face
  const trimRingGeo = track(new THREE.TorusGeometry(0.752, 0.0085, 14, 96));
  trimRingGeo.rotateX(Math.PI / 2);
  const trimRing = new THREE.Mesh(trimRingGeo, mats.aluminumTrim);
  trimRing.position.y = 0.096;
  displayGroup.add(trimRing);

  // 6 recessed stainless perimeter micro-fasteners around the elevated display puck sidewall
  const microScrewGeo = track(new THREE.CylinderGeometry(0.015, 0.015, 0.014, 6));
  microScrewGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const screw = new THREE.Mesh(microScrewGeo, mats.chromeSteel);
    screw.position.set(Math.sin(a) * 0.784, 0.016, Math.cos(a) * 0.784);
    screw.rotation.y = a;
    displayGroup.add(screw);
  }

  // Solid obsidian substrate below OLED panel
  const screenBackGeo = track(new THREE.CylinderGeometry(0.735, 0.735, 0.020, 96));
  const screenBack = new THREE.Mesh(screenBackGeo, mats.siliconDie);
  screenBack.position.y = 0.078;
  displayGroup.add(screenBack);

  // Self-luminous pitch-black OLED glass face seated flush on elevated puck crown
  const ipsFaceGeo = track(new THREE.CircleGeometry(0.728, 96));
  ipsFaceGeo.rotateX(-Math.PI / 2);
  const ipsFace = new THREE.Mesh(ipsFaceGeo, mats.lvglScreen);
  ipsFace.position.y = 0.090;
  displayGroup.add(ipsFace);

  // Thin mirror clearcoat glass top lens (+0.004 above OLED emitter layer)
  const coverGlassGeo = track(new THREE.CircleGeometry(0.734, 96));
  coverGlassGeo.rotateX(-Math.PI / 2);
  const coverGlass = new THREE.Mesh(coverGlassGeo, mats.opticalGlass);
  coverGlass.position.y = 0.094;
  coverGlass.renderOrder = 4;
  displayGroup.add(coverGlass);

  // 4 underside brass hex standoffs aligned to structural frame
  [
    [-0.54, -0.38],
    [0.54, -0.38],
    [0.54, 0.38],
    [-0.54, 0.38],
  ].forEach(([sx, sz]) => {
    const post = new THREE.Mesh(hexStandoffGeo, mats.brassStandoff);
    post.position.set(sx, -0.10, sz);
    displayGroup.add(post);
  });

  registerProxy(displayGroup, 'display', 0.82, 0.22);
  layers.display = displayGroup;
  root.add(displayGroup);

  // ── 02. TOP ELECTRONICS PCB (Display Driver, Mic Array, ZIF & FFC Bridge) ─────
  const micsGroup = new THREE.Group();
  const micPcbGeo = track(new THREE.CylinderGeometry(0.715, 0.715, 0.036, 48));
  const micPcb = new THREE.Mesh(micPcbGeo, mats.pcbDark);
  micPcb.castShadow = true;
  micsGroup.add(micPcb);

  const dspChip = new THREE.Mesh(icChipGeo, mats.siliconDie);
  dspChip.position.set(0.05, 0.032, -0.05);
  micsGroup.add(dspChip);

  // Copper power choke inductor & secondary audio codec IC + SMD array
  const chokeGeo = track(new THREE.BoxGeometry(0.14, 0.042, 0.14));
  const choke = new THREE.Mesh(chokeGeo, mats.copperCoil);
  choke.position.set(-0.22, 0.036, 0.14);
  micsGroup.add(choke);

  const smdPadGeo = track(new THREE.BoxGeometry(0.048, 0.02, 0.032));
  const smdInst = new THREE.InstancedMesh(smdPadGeo, mats.chromeSteel, 12);
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    _dummy.position.set(Math.cos(a) * 0.38, 0.028, Math.sin(a) * 0.38);
    _dummy.rotation.set(0, a, 0);
    _dummy.updateMatrix();
    smdInst.setMatrixAt(i, _dummy.matrix);
  }
  smdInst.instanceMatrix.needsUpdate = true;
  smdInst.computeBoundingSphere();
  micsGroup.add(smdInst);

  // SMD quartz crystal
  const crystalGeo = track(new THREE.BoxGeometry(0.11, 0.028, 0.07));
  const crystal = new THREE.Mesh(crystalGeo, mats.chromeSteel);
  crystal.position.set(-0.20, 0.032, -0.14);
  micsGroup.add(crystal);

  // 4 perimeter gold MEMS microphone capsules on red silicone isolators
  const capsuleGeo = track(new THREE.CylinderGeometry(0.054, 0.054, 0.046, 16));
  const capsuleGrommetGeo = track(new THREE.TorusGeometry(0.064, 0.015, 10, 20));
  capsuleGrommetGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const mx = Math.cos(a) * 0.55;
    const mz = Math.sin(a) * 0.55;
    const capsule = new THREE.Mesh(capsuleGeo, mats.brassStandoff);
    capsule.position.set(mx, 0.036, mz);
    micsGroup.add(capsule);

    const grommet = new THREE.Mesh(capsuleGrommetGeo, mats.siliconeGasket);
    grommet.position.set(mx, 0.024, mz);
    micsGroup.add(grommet);
  }

  // ZIF Ribbon Connector Latch + Kapton FFC Flex Bridge curving smoothly downward
  const zifGeo = track(new THREE.BoxGeometry(0.20, 0.042, 0.085));
  const zifLatch = new THREE.Mesh(zifGeo, mats.chromeSteel);
  zifLatch.position.set(0.36, 0.034, 0.30);
  zifLatch.rotation.y = 0.65;
  micsGroup.add(zifLatch);

  const ffcCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.36, 0.02, 0.32),
    new THREE.Vector3(0.49, -0.02, 0.42),
    new THREE.Vector3(0.46, -0.14, 0.48),
    new THREE.Vector3(0.32, -0.2, 0.45),
  ]);
  const ffcGeo = track(new THREE.TubeGeometry(ffcCurve, 18, 0.022, 6, false));
  const ffcMesh = new THREE.Mesh(ffcGeo, mats.polyimideFlex);
  micsGroup.add(ffcMesh);

  [
    [-0.54, -0.38],
    [0.54, -0.38],
    [0.54, 0.38],
    [-0.54, 0.38],
  ].forEach(([sx, sz]) => {
    const post = new THREE.Mesh(hexStandoffGeo, mats.brassStandoff);
    post.position.set(sx, -0.09, sz);
    micsGroup.add(post);
  });

  registerProxy(micsGroup, 'mics', 0.80, 0.18);
  layers.mics = micsGroup;
  root.add(micsGroup);

  // ── 03. HOLLOW UPPER LED LIGHT-GUIDE COLLAR & PRIVACY CONTROL RING ────────────
  // Concentric top deck: Grey Outer Ring (0.945..1.045) -> Thin LED Ring (0.895..0.945) -> Grey Inner Ring (0.768..0.895)
  const switchesGroup = new THREE.Group();
  const collarProfile = [
    new THREE.Vector2(0.74, -0.12),
    new THREE.Vector2(1.045, -0.12),
    new THREE.Vector2(1.045, 0.205),
    new THREE.Vector2(1.015, 0.232),
    new THREE.Vector2(0.945, 0.232),
    new THREE.Vector2(0.940, 0.195),
    new THREE.Vector2(0.900, 0.195),
    new THREE.Vector2(0.895, 0.232),
    new THREE.Vector2(0.775, 0.232),
    new THREE.Vector2(0.762, 0.218),
    new THREE.Vector2(0.762, 0.140),
    new THREE.Vector2(0.74, -0.12),
  ];
  const collarGeo = track(new THREE.LatheGeometry(collarProfile, 72));
  const collarMesh = new THREE.Mesh(collarGeo, mats.aluminumChassis);
  collarMesh.castShadow = true;
  collarMesh.receiveShadow = true;
  switchesGroup.add(collarMesh);

  // Subtle machined inner chamfer highlight around inner aluminum ring surrounding elevated puck
  const innerDeckChamferGeo = track(new THREE.TorusGeometry(0.892, 0.006, 10, 72));
  innerDeckChamferGeo.rotateX(Math.PI / 2);
  const innerDeckChamfer = new THREE.Mesh(innerDeckChamferGeo, mats.aluminumTrim);
  innerDeckChamfer.position.y = 0.232;
  switchesGroup.add(innerDeckChamfer);

  // Slim 360° Optical PMMA Light-Guide Ring seated squarely between the Grey Outer Ring and Grey Inner Ring
  const ledGuideProfile = [
    new THREE.Vector2(0.898, 0.194),
    new THREE.Vector2(0.942, 0.194),
    new THREE.Vector2(0.942, 0.228),
    new THREE.Vector2(0.920, 0.231),
    new THREE.Vector2(0.898, 0.228),
  ];
  const ledGuideGeo = track(new THREE.LatheGeometry(ledGuideProfile, 72));
  const ledRingMesh = new THREE.Mesh(ledGuideGeo, mats.ledRing);
  switchesGroup.add(ledRingMesh);

  const ledOuterEdgeGeo = track(new THREE.TorusGeometry(0.920, 0.015, 12, 72));
  ledOuterEdgeGeo.rotateX(Math.PI / 2);
  const ledOuterEdge = new THREE.Mesh(ledOuterEdgeGeo, mats.ledRing);
  ledOuterEdge.position.y = 0.221;
  switchesGroup.add(ledOuterEdge);

  // Signature front optical notch light slit cutting radially across outer grey ring (+Z)
  const frontNotchGeo = track(new THREE.BoxGeometry(0.036, 0.076, 0.095));
  const frontNotch = new THREE.Mesh(frontNotchGeo, mats.ledRing);
  frontNotch.position.set(0, 0.198, 0.996);
  switchesGroup.add(frontNotch);

  // Left-front SPST Switch Bezel + Precision Serrated Mechanical Actuator (-X, +Z)
  const spstBezelGeo = track(new THREE.BoxGeometry(0.34, 0.105, 0.08));
  const spstBezel = new THREE.Mesh(spstBezelGeo, mats.siliconDie);
  spstBezel.position.set(-0.23, -0.01, 1.015);
  spstBezel.rotation.y = -0.22;
  switchesGroup.add(spstBezel);

  const spstLever = new THREE.Group();
  spstLever.position.set(-0.205, -0.01, 1.055);
  spstLever.rotation.y = -0.22;
  const knobGeo = track(new THREE.BoxGeometry(0.088, 0.068, 0.055));
  const spstKnob = new THREE.Mesh(knobGeo, mats.chromeSteel);
  spstLever.add(spstKnob);
  const spstStripeGeo = track(new THREE.BoxGeometry(0.022, 0.072, 0.06));
  const spstStripe = new THREE.Mesh(spstStripeGeo, mats.redToggle);
  spstLever.add(spstStripe);
  switchesGroup.add(spstLever);

  // Right-front Mic Mute & DPDT Dual-Indicator Capsule Bezel (+X, +Z)
  const muteBezelGeo = track(new THREE.BoxGeometry(0.36, 0.105, 0.08));
  const muteBezel = new THREE.Mesh(muteBezelGeo, mats.siliconDie);
  muteBezel.position.set(0.24, -0.01, 1.01);
  muteBezel.rotation.y = 0.24;
  switchesGroup.add(muteBezel);

  const indicatorGeo = track(new THREE.BoxGeometry(0.11, 0.054, 0.035));
  const micMuteIndicator = new THREE.Mesh(indicatorGeo, mats.accentSwitch);
  micMuteIndicator.position.set(0.31, -0.01, 1.045);
  micMuteIndicator.rotation.y = 0.28;
  switchesGroup.add(micMuteIndicator);

  const dpdtIndicator = new THREE.Mesh(indicatorGeo, mats.greenLed);
  dpdtIndicator.position.set(0.17, -0.01, 1.055);
  dpdtIndicator.rotation.y = 0.16;
  switchesGroup.add(dpdtIndicator);

  registerProxy(switchesGroup, 'switches', 1.1, 0.26);
  layers.switches = switchesGroup;
  root.add(switchesGroup);

  // ── 04. COMPUTE TIER: JETSON ORIN NANO (69.6 × 45 mm -> 1.45 × 0.94 shifted cleanly inside left of Noctua intake)
  const jetsonGroup = new THREE.Group();
  const carrierBoardGeo = track(new THREE.BoxGeometry(1.36, 0.038, 0.90));
  const carrierBoard = new THREE.Mesh(carrierBoardGeo, mats.pcbDark);
  carrierBoard.position.x = -0.05;
  carrierBoard.castShadow = true;
  jetsonGroup.add(carrierBoard);

  // 260-Pin SO-DIMM edge latch bar
  const sodimmGeo = track(new THREE.BoxGeometry(0.08, 0.06, 0.74));
  const sodimmConnector = new THREE.Mesh(sodimmGeo, mats.siliconDie);
  sodimmConnector.position.set(-0.63, 0.044, 0);
  jetsonGroup.add(sodimmConnector);

  // Green Jetson Orin SOM Module
  const somGeo = track(new THREE.BoxGeometry(1.10, 0.032, 0.74));
  const somMesh = new THREE.Mesh(somGeo, mats.pcbEmerald);
  somMesh.position.set(-0.07, 0.048, 0);
  somMesh.castShadow = true;
  jetsonGroup.add(somMesh);

  // Extruded aluminum heatsink vapor plate
  const hsBaseGeo = track(new THREE.BoxGeometry(0.92, 0.032, 0.68));
  const hsBase = new THREE.Mesh(hsBaseGeo, mats.heatsinkDark);
  hsBase.position.set(-0.07, 0.082, 0);
  jetsonGroup.add(hsBase);

  // Flattened Copper Heatpipe sweeping across the heatsink fins straight toward right-side Noctua intake!
  const heatpipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.38, 0.105, -0.16),
    new THREE.Vector3(-0.04, 0.105, 0.0),
    new THREE.Vector3(0.32, 0.105, 0.10),
    new THREE.Vector3(0.56, 0.068, 0.10),
  ]);
  const heatpipeGeo = track(new THREE.TubeGeometry(heatpipeCurve, 20, 0.03, 10, false));
  const heatpipe = new THREE.Mesh(heatpipeGeo, mats.copperCoil);
  jetsonGroup.add(heatpipe);

  // 11 longitudinal black aluminum cooling fins guiding air right into the side Noctua fan intake
  const finGeo = track(new THREE.BoxGeometry(0.88, 0.145, 0.02));
  const finsInstanced = new THREE.InstancedMesh(finGeo, mats.heatsinkDark, 11);
  for (let i = 0; i < 11; i += 1) {
    _dummy.position.set(-0.07, 0.165, -0.28 + i * 0.056);
    _dummy.rotation.set(0, 0, 0);
    _dummy.updateMatrix();
    finsInstanced.setMatrixAt(i, _dummy.matrix);
  }
  finsInstanced.instanceMatrix.needsUpdate = true;
  finsInstanced.computeBoundingSphere();
  finsInstanced.castShadow = true;
  jetsonGroup.add(finsInstanced);

  // Front "NVIDIA ORIN" badge
  const badgePlateGeo = track(new THREE.PlaneGeometry(0.44, 0.11));
  const badgePlate = new THREE.Mesh(badgePlateGeo, mats.nvidiaBadge);
  badgePlate.position.set(0.12, 0.14, 0.346);
  jetsonGroup.add(badgePlate);

  // Exposed SMD solid-state VRM capacitors & chokes on Jetson carrier perimeter
  const vrmCapGeo = track(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 12));
  const vrmInst = new THREE.InstancedMesh(vrmCapGeo, mats.chromeSteel, 6);
  for (let i = 0; i < 6; i += 1) {
    _dummy.position.set(-0.50 + i * 0.105, 0.044, 0.405);
    _dummy.rotation.set(0, 0, 0);
    _dummy.updateMatrix();
    vrmInst.setMatrixAt(i, _dummy.matrix);
  }
  vrmInst.instanceMatrix.needsUpdate = true;
  vrmInst.computeBoundingSphere();
  jetsonGroup.add(vrmInst);

  // Corner hex socket screws on carrier aligned with structural brass standoffs
  [
    [-0.54, -0.38],
    [0.54, -0.38],
    [0.54, 0.38],
    [-0.54, 0.38],
  ].forEach(([bx, bz]) => {
    const screw = new THREE.Mesh(socketScrewGeo, mats.chromeSteel);
    screw.position.set(bx, 0.03, bz);
    jetsonGroup.add(screw);
  });

  registerProxy(jetsonGroup, 'jetson', 0.90, 0.28);
  layers.jetson = jetsonGroup;
  root.add(jetsonGroup);

  // ── 05. NVME STORAGE: SAMSUNG 970 EVO PLUS M.2 2280 ──────────────────────────
  const nvmeGroup = new THREE.Group();
  const nvmeCarrierGeo = track(new THREE.BoxGeometry(1.26, 0.026, 0.68));
  const nvmeCarrier = new THREE.Mesh(nvmeCarrierGeo, mats.pcbDark);
  nvmeCarrier.castShadow = true;
  nvmeGroup.add(nvmeCarrier);

  const ssdStickGeo = track(new THREE.BoxGeometry(1.16, 0.026, 0.38));
  const ssdStick = new THREE.Mesh(ssdStickGeo, mats.pcbDark);
  ssdStick.position.set(0.02, 0.032, 0.06);
  ssdStick.castShadow = true;
  nvmeGroup.add(ssdStick);

  const ssdLabelGeo = track(new THREE.PlaneGeometry(0.94, 0.33));
  ssdLabelGeo.rotateX(-Math.PI / 2);
  const ssdLabel = new THREE.Mesh(ssdLabelGeo, mats.nvmeDecal);
  ssdLabel.position.set(0.05, 0.047, 0.06);
  nvmeGroup.add(ssdLabel);

  const mKeyGeo = track(new THREE.BoxGeometry(0.11, 0.034, 0.32));
  const mKey = new THREE.Mesh(mKeyGeo, mats.brassStandoff);
  mKey.position.set(-0.56, 0.032, 0.06);
  nvmeGroup.add(mKey);

  const ssdScrew = new THREE.Mesh(socketScrewGeo, mats.chromeSteel);
  ssdScrew.position.set(0.57, 0.04, 0.06);
  nvmeGroup.add(ssdScrew);
  nvmeGroup.rotation.y = 0.22;

  registerProxy(nvmeGroup, 'nvme', 0.85, 0.16);
  layers.nvme = nvmeGroup;
  root.add(nvmeGroup);

  // ── 06. DETERMINISTIC COPROCESSOR: SEEED XIAO RP2040 (FRONT-LEFT) ─────────────
  const coprocGroup = new THREE.Group();
  const rpBoardGeo = track(new THREE.BoxGeometry(0.76, 0.034, 0.56));
  const rpBoard = new THREE.Mesh(rpBoardGeo, mats.pcbDark);
  rpBoard.castShadow = true;
  coprocGroup.add(rpBoard);

  const xiaoTopGeo = track(new THREE.PlaneGeometry(0.72, 0.52));
  xiaoTopGeo.rotateX(-Math.PI / 2);
  const xiaoTop = new THREE.Mesh(xiaoTopGeo, mats.xiaoDecal);
  xiaoTop.position.y = 0.019;
  coprocGroup.add(xiaoTop);

  // Hollowed silver stainless USB-C Host shell + dark cavity opening + tactile RESET/BOOT buttons
  const usbCanGeo = track(new THREE.BoxGeometry(0.18, 0.065, 0.24));
  const usbCan = new THREE.Mesh(usbCanGeo, mats.chromeSteel);
  usbCan.position.set(0.32, 0.042, 0);
  coprocGroup.add(usbCan);

  const usbMouthGeo = track(new THREE.BoxGeometry(0.03, 0.038, 0.17));
  const usbMouth = new THREE.Mesh(usbMouthGeo, mats.siliconDie);
  usbMouth.position.set(0.405, 0.042, 0);
  coprocGroup.add(usbMouth);

  const btnGeo = track(new THREE.CylinderGeometry(0.025, 0.025, 0.028, 12));
  [-0.12, 0.12].forEach((bz) => {
    const btn = new THREE.Mesh(btnGeo, mats.chromeSteel);
    btn.position.set(-0.22, 0.03, bz);
    coprocGroup.add(btn);
  });

  // 14 castellated edge pins
  const pinGeo = track(new THREE.BoxGeometry(0.045, 0.045, 0.065));
  const headerPins = new THREE.InstancedMesh(pinGeo, mats.brassStandoff, 14);
  for (let i = 0; i < 14; i += 1) {
    const row = i < 7 ? -0.25 : 0.25;
    const col = ((i % 7) - 3) * 0.092;
    _dummy.position.set(col, 0.008, row);
    _dummy.rotation.set(0, 0, 0);
    _dummy.updateMatrix();
    headerPins.setMatrixAt(i, _dummy.matrix);
  }
  headerPins.instanceMatrix.needsUpdate = true;
  headerPins.computeBoundingSphere();
  coprocGroup.add(headerPins);

  coprocGroup.rotation.y = 0.28;
  registerProxy(coprocGroup, 'coprocessor', 0.65, 0.18);
  layers.coprocessor = coprocGroup;
  root.add(coprocGroup);

  // ── 07. EXACT 1:1 NOCTUA NF-A4x10 PWM (40 × 40 × 10 mm -> ±0.418 XY, ±0.1045 Z FIXED SCALE)
  const fanGroup = new THREE.Group();
  const fanLocalMount = new THREE.Group();
  fanLocalMount.rotation.y = FAN_MOUNT_ANGLE;

  const FAN_BEVEL = 0.008;
  const FAN_HALF = 0.418; // exact 20.0 mm * 0.0209
  const FAN_CORE_HALF = FAN_HALF - FAN_BEVEL; // 0.410 (+0.008 bevel = 0.418 exact 40 mm square)
  const FAN_BORE_HOLE = 0.376 + FAN_BEVEL; // clear bore diameter 36.0 mm (r = 0.376)

  const makeRoundedSquareShape = (half: number, holeR: number, cornerR = 0.048) => {
    const s = new THREE.Shape();
    s.moveTo(-half + cornerR, -half);
    s.lineTo(half - cornerR, -half);
    s.quadraticCurveTo(half, -half, half, -half + cornerR);
    s.lineTo(half, half - cornerR);
    s.quadraticCurveTo(half, half, half - cornerR, half);
    s.lineTo(-half + cornerR, half);
    s.quadraticCurveTo(-half, half, -half, half - cornerR);
    s.lineTo(-half, -half + cornerR);
    s.quadraticCurveTo(-half, -half, -half + cornerR, -half);
    const h = new THREE.Path();
    h.absarc(0, 0, holeR, 0, Math.PI * 2, true);
    s.holes.push(h);
    return s;
  };

  // Machined Venturi Intake Bellmouth Ring + Chord-Matched Intake Bars welded into circular rim
  const FAN_RIM_R = 0.380;
  const intakeCollarGeo = track(new THREE.TorusGeometry(FAN_RIM_R, 0.017, 14, 48));
  const intakeCollar = new THREE.Mesh(intakeCollarGeo, mats.aluminumTrim);
  intakeCollar.position.z = -0.112;
  fanLocalMount.add(intakeCollar);

  [-0.22, -0.075, 0.075, 0.22].forEach((vy) => {
    const chordW = 2 * Math.sqrt(Math.max(0.01, FAN_RIM_R * FAN_RIM_R - (Math.abs(vy) + 0.005) ** 2));
    const vaneGeo = track(new THREE.BoxGeometry(chordW, 0.014, 0.018));
    const vane = new THREE.Mesh(vaneGeo, mats.heatsinkDark);
    vane.position.set(0, vy, -0.112);
    vane.rotation.x = -0.35;
    fanLocalMount.add(vane);
  });

  // Exact 1:1 Noctua NF-A4x10 Tan Frame (40 × 40 × 10 mm: XY = ±0.418, Z = ±0.1045)
  const fanShape = makeRoundedSquareShape(FAN_CORE_HALF, FAN_BORE_HOLE);
  const fanFrameGeo = track(
    new THREE.ExtrudeGeometry(fanShape, {
      depth: 0.193, // 0.193 + 2 * 0.008 bevel = 0.209 exact (10.0 mm)
      bevelEnabled: true,
      bevelThickness: FAN_BEVEL,
      bevelSize: FAN_BEVEL,
      bevelSegments: 2,
    })
  );
  fanFrameGeo.translate(0, 0, -0.0965);
  const fanFrame = new THREE.Mesh(fanFrameGeo, mats.noctuaFrame);
  fanFrame.castShadow = true;
  fanLocalMount.add(fanFrame);

  // 4 brown anti-vibration pads + 4 stainless mounting screws at exact 32 × 32 mm Noctua hole pitch (±16 mm = ±0.334)
  const cornerPadGeo = track(new THREE.CylinderGeometry(0.044, 0.044, 0.216, 12));
  cornerPadGeo.rotateX(Math.PI / 2);
  const fanScrewGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 0.232, 8));
  fanScrewGeo.rotateX(Math.PI / 2);
  [
    [-0.334, -0.334],
    [0.334, -0.334],
    [0.334, 0.334],
    [-0.334, 0.334],
  ].forEach(([cx, cy]) => {
    const pad = new THREE.Mesh(cornerPadGeo, mats.noctuaBlade);
    pad.position.set(cx, cy, 0);
    fanLocalMount.add(pad);

    const screw = new THREE.Mesh(fanScrewGeo, mats.chromeSteel);
    screw.position.set(cx, cy, 0.004);
    fanLocalMount.add(screw);
  });

  // 4-pin Noctua braided PWM lead curving back toward Jetson
  const pwmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.34, -0.34, -0.07),
    new THREE.Vector3(-0.46, -0.26, -0.22),
    new THREE.Vector3(-0.52, 0.02, -0.30),
  ]);
  const pwmWireGeo = track(new THREE.TubeGeometry(pwmCurve, 12, 0.015, 6, false));
  const pwmWire = new THREE.Mesh(pwmWireGeo, mats.absChamber);
  fanLocalMount.add(pwmWire);

  // Spinning 7-blade maroon Noctua rotor (Ø15 mm hub = r 0.157, Ø34 mm swept blades inside Ø36 mm bore)
  const fanRotor = new THREE.Group();
  fanRotor.position.z = 0;
  const hubGeo = track(new THREE.CylinderGeometry(0.157, 0.157, 0.15, 24));
  hubGeo.rotateX(Math.PI / 2);
  const hubMesh = new THREE.Mesh(hubGeo, mats.noctuaBlade);
  fanRotor.add(hubMesh);

  const hubDecalGeo = track(new THREE.CircleGeometry(0.135, 24));
  const hubDecal = new THREE.Mesh(hubDecalGeo, mats.noctuaHub);
  hubDecal.position.z = 0.078;
  fanRotor.add(hubDecal);

  const bladeGeo = track(new THREE.BoxGeometry(0.215, 0.095, 0.016));
  for (let b = 0; b < 7; b += 1) {
    const angle = (b / 7) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.rotation.z = angle;
    const blade = new THREE.Mesh(bladeGeo, mats.noctuaBlade);
    blade.position.set(0.245, 0, 0);
    blade.rotation.x = 0.54;
    pivot.add(blade);
    fanRotor.add(pivot);
  }
  fanLocalMount.add(fanRotor);

  // Circular Brushed Aluminum Exhaust Bore Trim Ring + Exact Chord-Matched Louver Slats welded seamlessly into rim
  const exhaustTrimGeo = track(new THREE.TorusGeometry(FAN_RIM_R, 0.017, 14, 48));
  const exhaustTrim = new THREE.Mesh(exhaustTrimGeo, mats.aluminumTrim);
  exhaustTrim.position.z = 0.108;
  fanLocalMount.add(exhaustTrim);

  [-0.22, -0.11, 0.0, 0.11, 0.22].forEach((ey) => {
    const chordW = 2 * Math.sqrt(Math.max(0.01, FAN_RIM_R * FAN_RIM_R - (Math.abs(ey) + 0.005) ** 2));
    const slatGeo = track(new THREE.BoxGeometry(chordW, 0.012, 0.020));
    const slat = new THREE.Mesh(slatGeo, mats.aluminumTrim);
    slat.position.set(0, ey, 0.108);
    slat.rotation.x = 0.34;
    fanLocalMount.add(slat);
  });

  fanGroup.add(fanLocalMount);
  registerProxy(fanGroup, 'fan', 0.45, 0.84);
  layers.fan = fanGroup;
  root.add(fanGroup);

  // ── 08. CUTAWAY SPEAKER ACOUSTIC CHAMBER + OPEN ANNULAR AIRFLOW BYPASS MOAT ──
  const acousticGroup = new THREE.Group();
  const shellProfile = [
    new THREE.Vector2(0.89, -0.145),
    new THREE.Vector2(1.045, -0.145),
    new THREE.Vector2(1.045, 0.145),
    new THREE.Vector2(0.89, 0.145),
  ];
  const shellGeo = track(new THREE.LatheGeometry(shellProfile, 52, 1.65, Math.PI * 1.32));
  const shellMesh = new THREE.Mesh(shellGeo, mats.aluminumChassis);
  shellMesh.castShadow = true;
  shellMesh.receiveShadow = true;
  acousticGroup.add(shellMesh);

  const foamProfile = [
    new THREE.Vector2(0.835, -0.12),
    new THREE.Vector2(0.888, -0.12),
    new THREE.Vector2(0.888, 0.12),
    new THREE.Vector2(0.835, 0.12),
  ];
  const foamGeo = track(new THREE.LatheGeometry(foamProfile, 44, 1.72, Math.PI * 1.25));
  const foamMesh = new THREE.Mesh(foamGeo, mats.acousticFoam);
  acousticGroup.add(foamMesh);

  // Outer Retaining Ring Collar (leaves open annular air moat r = 0.67 .. 0.85 unobstructed!)
  const outerFlangeGeo = track(new THREE.TorusGeometry(0.89, 0.026, 12, 48));
  outerFlangeGeo.rotateX(Math.PI / 2);
  const outerFlange = new THREE.Mesh(outerFlangeGeo, mats.aluminumTrim);
  outerFlange.position.y = 0.118;
  acousticGroup.add(outerFlange);

  // 6 Slim Radial Suspension Bridges spanning the annular airflow moat to inner speaker pod
  const bridgeRibGeo = track(new THREE.BoxGeometry(0.045, 0.026, 0.22));
  for (let rIdx = 0; rIdx < 6; rIdx += 1) {
    const a = (rIdx / 6) * Math.PI * 2 + 0.25;
    const rib = new THREE.Mesh(bridgeRibGeo, mats.aluminumTrim);
    rib.position.set(Math.sin(a) * 0.76, 0.118, Math.cos(a) * 0.76);
    rib.rotation.y = a;
    acousticGroup.add(rib);
  }

  // Sealed Inner Speaker Sub-Canister (compact r = 0.67 so air streams around it cleanly!)
  const innerCanWallProfile = [
    new THREE.Vector2(0.56, -0.105),
    new THREE.Vector2(0.67, -0.105),
    new THREE.Vector2(0.67, 0.12),
    new THREE.Vector2(0.58, 0.12),
  ];
  const innerCanGeo = track(new THREE.LatheGeometry(innerCanWallProfile, 40, 1.65, Math.PI * 1.32));
  const innerCan = new THREE.Mesh(innerCanGeo, mats.absChamber);
  acousticGroup.add(innerCan);

  const baffleGeo = track(new THREE.CylinderGeometry(0.67, 0.67, 0.032, 44));
  const baffle = new THREE.Mesh(baffleGeo, mats.absChamber);
  baffle.position.y = 0.12;
  acousticGroup.add(baffle);

  // Chrome neodymium magnet pot & copper voice coil collar atop the compact speaker baffle
  const magnetPotGeo = track(new THREE.CylinderGeometry(0.18, 0.20, 0.052, 24));
  const magnetPot = new THREE.Mesh(magnetPotGeo, mats.chromeSteel);
  magnetPot.position.y = 0.145;
  acousticGroup.add(magnetPot);

  const voiceCoilGeo = track(new THREE.CylinderGeometry(0.125, 0.125, 0.032, 24));
  const voiceCoil = new THREE.Mesh(voiceCoilGeo, mats.copperCoil);
  voiceCoil.position.y = 0.105;
  acousticGroup.add(voiceCoil);

  // Downward-firing 45mm speaker cone
  const coneProfile = [
    new THREE.Vector2(0.08, 0.015),
    new THREE.Vector2(0.45, 0.11),
    new THREE.Vector2(0.54, 0.11),
    new THREE.Vector2(0.46, 0.068),
    new THREE.Vector2(0.11, -0.015),
  ];
  const coneGeo = track(new THREE.LatheGeometry(coneProfile, 36));
  const speakerCone = new THREE.Mesh(coneGeo, mats.siliconDie);
  speakerCone.position.y = 0.005;
  acousticGroup.add(speakerCone);

  const dustCapGeo = track(new THREE.SphereGeometry(0.105, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55));
  const dustCap = new THREE.Mesh(dustCapGeo, mats.absChamber);
  dustCap.position.y = -0.02;
  acousticGroup.add(dustCap);

  // Red Silicone Elastomeric Damping Ring cleanly seated inside acoustic shell envelope
  const redDamperGeo = track(new THREE.TorusGeometry(0.56, 0.045, 16, 48));
  redDamperGeo.rotateX(Math.PI / 2);
  const redDamper = new THREE.Mesh(redDamperGeo, mats.siliconeGasket);
  redDamper.position.y = -0.092;
  acousticGroup.add(redDamper);

  // Acoustic Seal highlight rings
  const acousticHighlightGroup = new THREE.Group();
  const wireRingGeo = track(new THREE.TorusGeometry(0.95, 0.014, 10, 48));
  wireRingGeo.rotateX(Math.PI / 2);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xff5500,
    transparent: true,
    opacity: 0.92,
  });
  extraDisposableMats.push(wireMat);
  const wireTop = new THREE.Mesh(wireRingGeo, wireMat);
  wireTop.position.y = 0.16;
  const wireBot = new THREE.Mesh(wireRingGeo, wireMat);
  wireBot.position.y = -0.16;
  acousticHighlightGroup.add(wireTop, wireBot);
  acousticHighlightGroup.visible = false;
  acousticGroup.add(acousticHighlightGroup);

  registerProxy(acousticGroup, 'acoustic', 1.05, 0.32);
  layers.acoustic = acousticGroup;
  root.add(acousticGroup);

  // ── 09. WAVESHARE UPS HAT + 21700 PACK + CLEAN SLOTTED INTAKE & SOLID USB-C BOSS
  const batteryGroup = new THREE.Group();

  // Sub-tier A: Waveshare UPS HAT (C) circular cobalt-navy PCB
  const upsSubGroup = new THREE.Group();
  const upsBoardGeo = track(new THREE.CylinderGeometry(0.80, 0.80, 0.032, 44));
  const upsBoard = new THREE.Mesh(upsBoardGeo, mats.pcbWaveshare);
  upsBoard.castShadow = true;
  upsSubGroup.add(upsBoard);

  const inductorGeo = track(new THREE.BoxGeometry(0.18, 0.044, 0.18));
  const inductor = new THREE.Mesh(inductorGeo, mats.heatsinkDark);
  inductor.position.set(0.30, 0.036, 0.14);
  upsSubGroup.add(inductor);

  const regChip = new THREE.Mesh(icChipGeo, mats.pcbEmerald);
  regChip.position.set(-0.22, 0.03, 0.16);
  upsSubGroup.add(regChip);

  const jstHeaderGeo = track(new THREE.BoxGeometry(0.16, 0.042, 0.11));
  const jstHeader = new THREE.Mesh(jstHeaderGeo, mats.chromeSteel);
  jstHeader.position.set(0.08, 0.03, 0.44);
  upsSubGroup.add(jstHeader);

  batteryGroup.add(upsSubGroup);

  // Sub-tier B: Machined 360° Slotted Base Enclosure + Rubber Anti-Slip Base Pad
  const baseProfile = [
    new THREE.Vector2(0.0, -0.14),
    new THREE.Vector2(0.98, -0.14),
    new THREE.Vector2(1.045, -0.07),
    new THREE.Vector2(1.045, 0.085),
    new THREE.Vector2(0.94, 0.085),
    new THREE.Vector2(0.94, -0.11),
    new THREE.Vector2(0.0, -0.11),
  ];
  const baseCupGeo = track(new THREE.LatheGeometry(baseProfile, 60));
  const baseCup = new THREE.Mesh(baseCupGeo, mats.aluminumChassis);
  baseCup.castShadow = true;
  baseCup.receiveShadow = true;
  batteryGroup.add(baseCup);

  // Matte anti-slip bottom rubber ring pad
  const padRingGeo = track(new THREE.RingGeometry(0.55, 0.95, 48));
  padRingGeo.rotateX(Math.PI / 2);
  const rubberPad = new THREE.Mesh(padRingGeo, mats.rubberBase);
  rubberPad.position.y = -0.142;
  batteryGroup.add(rubberPad);

  // Radial Perimeter Intake Ventilation Slots — SKIPPING the Solid USB-C Charging Port Boss Sector!
  const USB_PORT_ANGLE = 0.44; // front-right I/O sector (~25 deg)
  const slotAngles: number[] = [];
  for (let i = 0; i < 28; i += 1) {
    const a = (i / 28) * Math.PI * 2;
    const diff = Math.atan2(Math.sin(a - USB_PORT_ANGLE), Math.cos(a - USB_PORT_ANGLE));
    if (Math.abs(diff) > 0.28) {
      slotAngles.push(a);
    }
  }

  const slotGeo = track(new THREE.BoxGeometry(0.044, 0.112, 0.048));
  const intakeSlots = new THREE.InstancedMesh(slotGeo, mats.siliconDie, slotAngles.length);
  slotAngles.forEach((a, idx) => {
    _dummy.position.set(Math.sin(a) * 1.028, 0.0, Math.cos(a) * 1.028);
    _dummy.rotation.set(0, a, 0);
    _dummy.updateMatrix();
    intakeSlots.setMatrixAt(idx, _dummy.matrix);
  });
  intakeSlots.instanceMatrix.needsUpdate = true;
  intakeSlots.computeBoundingSphere();
  batteryGroup.add(intakeSlots);

  // Dedicated Solid CNC USB-C PD Charging Port Boss cleanly flush in the non-vented sector
  const usbBossGroup = new THREE.Group();
  usbBossGroup.position.set(
    Math.sin(USB_PORT_ANGLE) * 0.998,
    0.004,
    Math.cos(USB_PORT_ANGLE) * 0.998
  );
  usbBossGroup.rotation.y = USB_PORT_ANGLE;

  const bossOuterGeo = track(new THREE.BoxGeometry(0.36, 0.135, 0.14));
  const bossOuter = new THREE.Mesh(bossOuterGeo, mats.aluminumTrim);
  usbBossGroup.add(bossOuter);

  const portBezelGeo = track(new THREE.BoxGeometry(0.20, 0.085, 0.036));
  const portBezel = new THREE.Mesh(portBezelGeo, mats.chromeSteel);
  portBezel.position.set(0, 0, 0.056);
  usbBossGroup.add(portBezel);

  const portRecessGeo = track(new THREE.BoxGeometry(0.165, 0.06, 0.048));
  const portRecess = new THREE.Mesh(portRecessGeo, mats.siliconDie);
  portRecess.position.set(0, 0, 0.06);
  usbBossGroup.add(portRecess);

  const portTongueGeo = track(new THREE.BoxGeometry(0.114, 0.016, 0.042));
  const portTongue = new THREE.Mesh(portTongueGeo, mats.brassStandoff);
  portTongue.position.set(0, 0, 0.066);
  usbBossGroup.add(portTongue);

  // Tiny charging status LED dot right beside USB-C port
  const chgLedGeo = track(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 12));
  chgLedGeo.rotateX(Math.PI / 2);
  const chgLed = new THREE.Mesh(chgLedGeo, mats.greenLed);
  chgLed.position.set(0.135, 0, 0.066);
  usbBossGroup.add(chgLed);

  batteryGroup.add(usbBossGroup);

  // Twin Mint-Green 21700 Li-Ion Cells + Center Retention Strap + BMS Leads nested below UPS HAT
  const cellBodyGeo = track(new THREE.CylinderGeometry(0.115, 0.115, 1.24, 30));
  cellBodyGeo.rotateZ(Math.PI / 2);
  const cellCapGeo = track(new THREE.CylinderGeometry(0.095, 0.095, 1.27, 20));
  cellCapGeo.rotateZ(Math.PI / 2);

  [-0.165, 0.165].forEach((zOff) => {
    const cell = new THREE.Mesh(cellBodyGeo, mats.liIonGreen);
    cell.position.set(-0.02, 0.005, zOff);
    cell.castShadow = true;
    batteryGroup.add(cell);

    const caps = new THREE.Mesh(cellCapGeo, mats.chromeSteel);
    caps.position.set(-0.02, 0.005, zOff);
    batteryGroup.add(caps);
  });

  const strapGeo = track(new THREE.BoxGeometry(0.20, 0.21, 0.62));
  const strap = new THREE.Mesh(strapGeo, mats.absChamber);
  strap.position.set(-0.02, 0.005, 0);
  batteryGroup.add(strap);

  // Red (+) & Black (-) 18AWG battery leads curving cleanly from cells up toward UPS PCB underside
  const posLeadCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.56, 0.03, 0.165),
    new THREE.Vector3(0.60, 0.085, 0.29),
    new THREE.Vector3(0.14, 0.13, 0.42),
  ]);
  const posLead = new THREE.Mesh(
    track(new THREE.TubeGeometry(posLeadCurve, 12, 0.016, 6, false)),
    mats.redToggle
  );
  batteryGroup.add(posLead);

  const negLeadCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.56, 0.03, -0.165),
    new THREE.Vector3(0.58, 0.085, -0.02),
    new THREE.Vector3(0.05, 0.13, 0.36),
  ]);
  const negLead = new THREE.Mesh(
    track(new THREE.TubeGeometry(negLeadCurve, 12, 0.016, 6, false)),
    mats.absChamber
  );
  batteryGroup.add(negLead);

  registerProxy(batteryGroup, 'battery', 1.1, 0.62, [0, 0.16, 0]);
  layers.battery = batteryGroup;
  root.add(batteryGroup);

  // ── 4 HEXAGONAL BRASS STRUCTURAL STANDOFF RODS THROUGH THE STACK ─────────────
  const guideRods = new THREE.Group();
  const rodGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 1, 6));
  [
    [-0.54, -0.38],
    [0.54, -0.38],
    [0.54, 0.38],
    [-0.54, 0.38],
  ].forEach(([rx, rz]) => {
    const rod = new THREE.Mesh(rodGeo, mats.brassStandoff);
    rod.position.set(rx, 0, rz);
    guideRods.add(rod);
  });
  root.add(guideRods);

  // ── SELECTION HALO RING HIGHLIGHTING ACTIVE SUBSYSTEM ─────────────────────────
  const selHaloGeo = track(new THREE.TorusGeometry(1.13, 0.015, 10, 64));
  selHaloGeo.rotateX(Math.PI / 2);
  const selHaloMat = new THREE.MeshBasicMaterial({
    color: 0xff5500,
    transparent: true,
    opacity: 0.78,
  });
  extraDisposableMats.push(selHaloMat);
  const selectionHalo = new THREE.Mesh(selHaloGeo, selHaloMat);
  root.add(selectionHalo);

  // ── 4-STAGE THERMAL AIRFLOW PATH (THROUGH BASE SLOTS → ANNULAR BYPASS MOAT → JETSON FINS → OPEN FAN BORE → EXHAUST LOUVERS)
  const airflowGroup = new THREE.Group();
  const airflowRoutes: Array<{
    points: THREE.Vector3[];
    curve: THREE.CatmullRomCurve3;
  }> = [];

  // Angles chosen cleanly inside actual milled base vent sectors (avoiding USB boss at 0.44 ± 0.28)
  const routeOffsets = [
    { startA: -1.12, zFin: -0.18, boreU: -0.14, boreV: 0.10 },
    { startA: -0.32, zFin: -0.06, boreU: -0.06, boreV: -0.08 },
    { startA: 1.08, zFin: 0.05, boreU: 0.08, boreV: 0.11 },
    { startA: 1.88, zFin: 0.16, boreU: 0.14, boreV: -0.05 },
    { startA: 2.74, zFin: -0.12, boreU: -0.10, boreV: 0.04 },
    { startA: 3.66, zFin: 0.08, boreU: 0.05, boreV: -0.11 },
  ];

  routeOffsets.forEach(({ startA, zFin }) => {
    const sx = Math.sin(startA);
    const cz = Math.cos(startA);
    const pts = [
      new THREE.Vector3(sx * 1.42, -1.55, cz * 1.42),
      new THREE.Vector3(sx * 0.94, -1.28, cz * 0.94),
      new THREE.Vector3(sx * 0.77, -0.45, cz * 0.77),
      new THREE.Vector3(-0.08, 0.28, zFin),
      new THREE.Vector3(0.85, 0.30, 0.10),
      new THREE.Vector3(1.18, 0.30, 0.22),
      new THREE.Vector3(1.75, 0.30, 0.40),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    airflowRoutes.push({ points: pts, curve });
  });

  const dartGeo = track(new THREE.ConeGeometry(0.036, 0.125, 8));
  dartGeo.rotateX(Math.PI / 2);
  const dartMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  extraDisposableMats.push(dartMat);
  const airflowParticles = new THREE.InstancedMesh(dartGeo, dartMat, 72);
  airflowParticles.frustumCulled = false;
  airflowGroup.add(airflowParticles);
  airflowGroup.visible = false;
  root.add(airflowGroup);

  return {
    root,
    layers,
    upsSubGroup,
    hitProxies,
    guideRods,
    fanRotor,
    spstLever,
    micMuteIndicator,
    dpdtIndicator,
    airflowGroup,
    airflowParticles,
    airflowRoutes,
    acousticHighlightGroup,
    selectionHalo,
    disposeGeometries: () => {
      geometries.forEach((g) => g.dispose());
      extraDisposableMats.forEach((m) => m.dispose());
    },
  };
}
