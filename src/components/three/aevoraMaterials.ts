import * as THREE from 'three';
import type { ChassisFinish, LvglMode, RingAccent } from '../../utils/aevoraEngine';

export function detectSoftwareWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function createBrushedMetalBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  const data = img.data;

  // Fine isotropic bead-blasted anodized 6061 aluminum micro-grain (deterministic LCG noise)
  let seed = 133791;
  for (let i = 0; i < 256 * 256; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const grain = 122 + ((seed >>> 24) & 15); // subtle 122..137 micro-satin variance
    const idx = i * 4;
    data[idx] = grain;
    data[idx + 1] = grain;
    data[idx + 2] = grain;
    data[idx + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createPcbCircuitTexture(
  maxAnisotropy: number,
  tintHex: string = '#15191d',
  silkscreenText?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(214, 174, 88, 0.38)';
  ctx.lineWidth = 2;
  for (let i = 24; i < 488; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 36);
    ctx.lineTo(i, 200);
    ctx.lineTo(Math.min(480, i + 28), 232);
    ctx.lineTo(Math.min(480, i + 28), 476);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(232, 194, 114, 0.52)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(256, 256, 182, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 256, 134, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#deb65e';
  for (let a = 0; a < 28; a += 1) {
    const rad = (a / 28) * Math.PI * 2;
    const vx = 256 + Math.cos(rad) * 204;
    const vy = 256 + Math.sin(rad) * 204;
    ctx.beginPath();
    ctx.arc(vx, vy, 4.8, 0, Math.PI * 2);
    ctx.fill();
  }

  if (silkscreenText) {
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '700 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(silkscreenText, 256, 418);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createNvmeDecalTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#121317';
  ctx.fillRect(0, 0, 512, 192);

  ctx.strokeStyle = '#c89b44';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 492, 172);

  ctx.fillStyle = '#f3f4f6';
  ctx.font = '700 32px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SAMSUNG', 32, 70);

  ctx.fillStyle = '#ff6b1a';
  ctx.font = '800 38px sans-serif';
  ctx.fillText('970 EVO Plus', 32, 120);

  ctx.fillStyle = '#9ca3af';
  ctx.font = '600 21px monospace';
  ctx.fillText('NVMe M.2 2280 · PCIe', 32, 156);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createXiaoDecalTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#14171d';
  ctx.fillRect(0, 0, 256, 192);

  ctx.fillStyle = '#d4af37';
  for (let i = 0; i < 7; i += 1) {
    const px = 34 + i * 30;
    ctx.fillRect(px, 6, 16, 20);
    ctx.fillRect(px, 166, 16, 20);
  }

  ctx.fillStyle = '#e5e7eb';
  ctx.font = '700 21px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('seeed studio', 132, 74);

  ctx.fillStyle = '#93c5fd';
  ctx.font = '700 24px monospace';
  ctx.fillText('XIAO RP2040', 132, 112);

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(218, 96, 5.5, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createNvidiaBadgeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#15171c';
  ctx.fillRect(0, 0, 256, 64);

  ctx.fillStyle = '#76b900';
  ctx.fillRect(14, 14, 24, 36);

  ctx.fillStyle = '#f3f4f6';
  ctx.font = '800 27px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('NVIDIA ORIN', 48, 42);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createNoctuaHubTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4e2017';
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#c89b6e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#e7d6c0';
  ctx.font = '700 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('noctua', 64, 71);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createFloorReticleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;

  [120, 175, 232].forEach((r) => {
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Subtle 45-degree degree ticks
  for (let i = 0; i < 36; i += 1) {
    const a = (i / 36) * Math.PI * 2;
    const inner = i % 3 === 0 ? 218 : 226;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * inner, 256 + Math.sin(a) * inner);
    ctx.lineTo(256 + Math.cos(a) * 232, 256 + Math.sin(a) * 232);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export interface LvglHudCanvasController {
  texture: THREE.CanvasTexture;
  drawFrame: (opts: {
    timeSec: number;
    accent: RingAccent;
    lvglMode: LvglMode;
    cordlessMode: boolean;
    fanRpm: number;
    tokensPerSec: number;
    micEnabled: boolean;
    hidConnected: boolean;
  }) => void;
  dispose: () => void;
}

const MODE_DISPLAY_LABELS: Record<LvglMode, string> = {
  idle: 'STANDBY · QUIET',
  listening: 'LISTENING · LOCAL',
  inference: 'INFERENCE · LOCAL',
  hid: 'HID TYPING · USB',
  thermal: 'THERMAL · PEAK',
};

export function createLiveLvglController(
  initialAccent: RingAccent,
  maxAnisotropy: number
): LvglHudCanvasController {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAnisotropy);

  const drawFrame: LvglHudCanvasController['drawFrame'] = ({
    timeSec,
    accent,
    lvglMode,
    cordlessMode,
    fanRpm,
    tokensPerSec,
    micEnabled,
    hidConnected,
  }) => {
    const micBlocked = !micEnabled && lvglMode === 'listening';
    const hidBlocked = !hidConnected && lvglMode === 'hid';
    const isBlocked = micBlocked || hidBlocked;
    const accentHex = isBlocked ? '#ef4444' : accent === 'amber' ? '#ff6200' : '#0ea5e9';
    const accentGlow = isBlocked
      ? 'rgba(239, 68, 68, 0.24)'
      : accent === 'amber'
      ? 'rgba(255, 92, 0, 0.22)'
      : 'rgba(14, 165, 233, 0.24)';

    // Pure diode-off #000000 OLED black substrate
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 512);

    // Tight localized self-lit bloom strictly under waveform center
    const grad = ctx.createRadialGradient(256, 266, 8, 256, 266, 118);
    grad.addColorStop(0, accentGlow);
    grad.addColorStop(0.6, accent === 'amber' ? 'rgba(255, 92, 0, 0.05)' : 'rgba(14, 165, 233, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Static precision tick track around inner OLED dial
    for (let i = 0; i < 40; i += 1) {
      const a = (i / 40) * Math.PI * 2;
      const activeTick = i % 5 === 0;
      ctx.strokeStyle = activeTick ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.10)';
      ctx.lineWidth = activeTick ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(256 + Math.cos(a) * 198, 256 + Math.sin(a) * 198);
      ctx.lineTo(256 + Math.cos(a) * 207, 256 + Math.sin(a) * 207);
      ctx.stroke();
    }

    // Outer stationary luminous OLED perimeter ring
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.arc(256, 256, 224, 0, Math.PI * 2);
    ctx.stroke();

    // Header Wordmark & Live Power Rail
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '600 15px monospace';
    ctx.fillText(cordlessMode ? 'UPS · 2S BATT' : 'USB-C · 5V/3A', 256, 134);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 42px sans-serif';
    ctx.fillText('Aevora', 256, 182);

    ctx.fillStyle = isBlocked ? '#fca5a5' : '#e4e4e7';
    ctx.font = '600 16px monospace';
    const modeHeadline = micBlocked
      ? 'MIC HARD-CUT'
      : hidBlocked
      ? 'USB AIR-GAPPED'
      : !micEnabled
      ? 'MIC OPEN · LOCAL'
      : MODE_DISPLAY_LABELS[lvglMode];
    ctx.fillText(modeHeadline, 256, 214);

    // Alive in-place OLED audio waveform bars
    const waveActive = micEnabled && lvglMode !== 'idle' && !isBlocked;
    const barCount = 11;
    for (let i = 0; i < barCount; i += 1) {
      const distCenter = 1 - Math.abs(i - 5) / 6;
      const wave = waveActive
        ? 0.28 + distCenter * (0.42 + 0.30 * Math.sin(timeSec * 4.4 + i * 0.9))
        : 0.14;
      const bh = Math.max(8, wave * 58);
      const bx = 256 + (i - 5) * 18 - 4;
      ctx.fillStyle = !micEnabled ? '#ef4444' : accentHex;
      ctx.beginPath();
      ctx.roundRect(bx, 272 - bh / 2, 8, bh, 4);
      ctx.fill();
    }

    // Live hardware telemetry stats synced directly with Section 01 state
    ctx.fillStyle = '#f4f4f5';
    ctx.font = '600 18px monospace';
    const tpsText = tokensPerSec > 0 ? tokensPerSec.toFixed(1) : '0.0';
    ctx.fillText(`FAN ${Math.round(fanRpm)} RPM · ${tpsText} TPS`, 256, 338);

    // Status labels — HID ON rendered in blue (#38bdf8) independently of MIC kill state
    ctx.font = '700 16px monospace';
    const micLabel = micEnabled ? 'MIC LIVE' : 'MIC OPEN-CKT';
    const sepLabel = '  /  ';
    const hidLabel = hidConnected ? 'HID ON' : 'HID ISO';
    const totalWidth =
      ctx.measureText(micLabel).width +
      ctx.measureText(sepLabel).width +
      ctx.measureText(hidLabel).width;
    let cursorX = 256 - totalWidth / 2;
    ctx.textAlign = 'left';

    ctx.fillStyle = micEnabled ? '#34d399' : '#f87171';
    ctx.fillText(micLabel, cursorX, 378);
    cursorX += ctx.measureText(micLabel).width;

    ctx.fillStyle = '#71717a';
    ctx.fillText(sepLabel, cursorX, 378);
    cursorX += ctx.measureText(sepLabel).width;

    ctx.fillStyle = hidConnected ? '#38bdf8' : '#fbbf24';
    ctx.fillText(hidLabel, cursorX, 378);
    ctx.textAlign = 'center';

    texture.needsUpdate = true;
  };

  drawFrame({
    timeSec: 0,
    accent: initialAccent,
    lvglMode: 'inference',
    cordlessMode: false,
    fanRpm: 3800,
    tokensPerSec: 34.6,
    micEnabled: true,
    hidConnected: true,
  });

  return {
    texture,
    drawFrame,
    dispose: () => texture.dispose(),
  };
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.68)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface AevoraMaterialSet {
  aluminumChassis: THREE.MeshPhysicalMaterial;
  aluminumTrim: THREE.MeshPhysicalMaterial;
  displayPuckBezel: THREE.MeshPhysicalMaterial;
  ledRing: THREE.MeshStandardMaterial;
  opticalGlass: THREE.MeshPhysicalMaterial;
  lvglScreen: THREE.MeshPhysicalMaterial;
  lvglController: LvglHudCanvasController;
  pcbDark: THREE.MeshStandardMaterial;
  pcbEmerald: THREE.MeshStandardMaterial;
  pcbWaveshare: THREE.MeshStandardMaterial;
  nvmeDecal: THREE.MeshStandardMaterial;
  xiaoDecal: THREE.MeshStandardMaterial;
  nvidiaBadge: THREE.MeshStandardMaterial;
  noctuaHub: THREE.MeshStandardMaterial;
  floorReticle: THREE.MeshBasicMaterial;
  siliconeGasket: THREE.MeshStandardMaterial;
  brassStandoff: THREE.MeshStandardMaterial;
  copperCoil: THREE.MeshStandardMaterial;
  polyimideFlex: THREE.MeshStandardMaterial;
  siliconDie: THREE.MeshPhysicalMaterial;
  heatsinkDark: THREE.MeshStandardMaterial;
  noctuaFrame: THREE.MeshStandardMaterial;
  noctuaBlade: THREE.MeshStandardMaterial;
  absChamber: THREE.MeshPhysicalMaterial;
  acousticFoam: THREE.MeshStandardMaterial;
  liIonGreen: THREE.MeshPhysicalMaterial;
  rubberBase: THREE.MeshStandardMaterial;
  accentSwitch: THREE.MeshStandardMaterial;
  redToggle: THREE.MeshStandardMaterial;
  greenLed: THREE.MeshStandardMaterial;
  chromeSteel: THREE.MeshStandardMaterial;
  ghostShell: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createAevoraMaterialSet(
  renderer: THREE.WebGLRenderer,
  finish: ChassisFinish,
  ringAccent: RingAccent,
  isSoftwareGl: boolean
): AevoraMaterialSet {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const brushedBump = createBrushedMetalBumpTexture(maxAniso);
  const pcbDarkTex = createPcbCircuitTexture(maxAniso, '#14171c');
  const pcbGreenTex = createPcbCircuitTexture(maxAniso, '#143826');
  const pcbWaveTex = createPcbCircuitTexture(maxAniso, '#0d263d', 'waveshare');
  const nvmeTex = createNvmeDecalTexture(maxAniso);
  const xiaoTex = createXiaoDecalTexture(maxAniso);
  const nvidiaTex = createNvidiaBadgeTexture(maxAniso);
  const noctuaTex = createNoctuaHubTexture(maxAniso);
  const reticleTex = createFloorReticleTexture(maxAniso);
  const lvglController = createLiveLvglController(ringAccent, maxAniso);

  const isCharcoal = finish === 'charcoal';
  const accentColor = ringAccent === 'amber' ? 0xff5500 : 0x0ea5e9;

  const aluminumChassis = new THREE.MeshPhysicalMaterial({
    color: isCharcoal ? 0x262930 : 0xd7d6d0,
    metalness: 0.88,
    roughness: isCharcoal ? 0.34 : 0.27,
    bumpMap: brushedBump,
    bumpScale: 0.0012,
    clearcoat: 0.14,
    clearcoatRoughness: 0.34,
  });

  const aluminumTrim = new THREE.MeshPhysicalMaterial({
    color: isCharcoal ? 0x414652 : 0xeeeee8,
    metalness: 0.94,
    roughness: 0.16,
    clearcoat: 0.4,
    clearcoatRoughness: 0.18,
  });

  const displayPuckBezel = new THREE.MeshPhysicalMaterial({
    color: isCharcoal ? 0x16181e : 0x262932,
    metalness: 0.86,
    roughness: 0.24,
    bumpMap: brushedBump,
    bumpScale: 0.001,
    clearcoat: 0.45,
    clearcoatRoughness: 0.16,
  });

  const ledRing = new THREE.MeshStandardMaterial({
    color: ringAccent === 'amber' ? 0xff4a00 : 0x0284c7,
    emissive: ringAccent === 'amber' ? 0xff4d00 : 0x0ea5e9,
    emissiveIntensity: ringAccent === 'amber' ? 1.55 : 1.75,
    roughness: 0.16,
    metalness: 0.02,
  });

  // Ultra-low-reflectance AR sapphire glass edge catchlight — zero milky ceiling wash
  const opticalGlass = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    metalness: 0.0,
    roughness: 0.02,
    transparent: true,
    opacity: 0.02,
    specularIntensity: 0.16,
    envMapIntensity: 0.12,
    depthWrite: false,
  });

  // True self-luminous AR-coated OLED panel: pure #000000 albedo + suppressed ceiling glare so black pixels stay obsidian jet-black even in top-down view
  const lvglScreen = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    map: lvglController.texture,
    emissive: 0xffffff,
    emissiveMap: lvglController.texture,
    emissiveIntensity: 1.85,
    roughness: 0.08,
    metalness: 0.0,
    reflectivity: 0.15,
    specularIntensity: 0.22,
    clearcoat: 0.18,
    clearcoatRoughness: 0.04,
    envMapIntensity: 0.14,
  });

  const pcbDark = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pcbDarkTex,
    roughness: 0.62,
    metalness: 0.12,
  });

  const pcbEmerald = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pcbGreenTex,
    roughness: 0.58,
    metalness: 0.14,
  });

  const pcbWaveshare = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pcbWaveTex,
    roughness: 0.56,
    metalness: 0.14,
  });

  const nvmeDecal = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: nvmeTex,
    roughness: 0.45,
    metalness: 0.12,
  });

  const xiaoDecal = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: xiaoTex,
    roughness: 0.52,
    metalness: 0.18,
  });

  const nvidiaBadge = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: nvidiaTex,
    roughness: 0.36,
    metalness: 0.2,
  });

  const noctuaHub = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: noctuaTex,
    roughness: 0.4,
    metalness: 0.15,
  });

  const floorReticle = new THREE.MeshBasicMaterial({
    map: reticleTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });

  const siliconeGasket = new THREE.MeshStandardMaterial({
    color: 0xd13322,
    roughness: 0.78,
    metalness: 0.02,
  });

  const brassStandoff = new THREE.MeshStandardMaterial({
    color: 0xd8b152,
    metalness: 0.94,
    roughness: 0.19,
  });

  const copperCoil = new THREE.MeshStandardMaterial({
    color: 0xd0783c,
    metalness: 0.93,
    roughness: 0.2,
  });

  const polyimideFlex = new THREE.MeshStandardMaterial({
    color: 0xd9821f,
    metalness: 0.35,
    roughness: 0.32,
  });

  const siliconDie = new THREE.MeshPhysicalMaterial({
    color: 0x0d0f13,
    metalness: 0.38,
    roughness: 0.14,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
  });

  const heatsinkDark = new THREE.MeshStandardMaterial({
    color: 0x1b1e24,
    metalness: 0.86,
    roughness: 0.3,
  });

  const noctuaFrame = new THREE.MeshStandardMaterial({
    color: 0xdccbb0,
    roughness: 0.58,
    metalness: 0.05,
  });

  const noctuaBlade = new THREE.MeshStandardMaterial({
    color: 0x5c231c,
    roughness: 0.42,
    metalness: 0.14,
  });

  const absChamber = new THREE.MeshPhysicalMaterial({
    color: 0x1d1f25,
    roughness: 0.55,
    metalness: 0.08,
  });

  const acousticFoam = new THREE.MeshStandardMaterial({
    color: 0x26282e,
    roughness: 0.96,
    metalness: 0.02,
  });

  const liIonGreen = new THREE.MeshPhysicalMaterial({
    color: 0x32a866,
    roughness: 0.26,
    metalness: 0.24,
    clearcoat: 0.76,
    clearcoatRoughness: 0.15,
  });

  const rubberBase = new THREE.MeshStandardMaterial({
    color: 0x121316,
    roughness: 0.92,
    metalness: 0.04,
  });

  const accentSwitch = new THREE.MeshStandardMaterial({
    color: 0xff5500,
    emissive: 0xff5500,
    emissiveIntensity: 0.85,
    roughness: 0.35,
    metalness: 0.1,
  });

  const redToggle = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.75,
    roughness: 0.32,
    metalness: 0.14,
  });

  const greenLed = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 1.4,
    roughness: 0.25,
    metalness: 0.1,
  });

  const chromeSteel = new THREE.MeshStandardMaterial({
    color: 0xededed,
    metalness: 0.97,
    roughness: 0.11,
  });

  const ghostShell = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.18,
    roughness: 0.55,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  });

  const textures = [
    brushedBump,
    pcbDarkTex,
    pcbGreenTex,
    pcbWaveTex,
    nvmeTex,
    xiaoTex,
    nvidiaTex,
    noctuaTex,
    reticleTex,
  ];
  const materials = [
    aluminumChassis,
    aluminumTrim,
    displayPuckBezel,
    ledRing,
    opticalGlass,
    lvglScreen,
    pcbDark,
    pcbEmerald,
    pcbWaveshare,
    nvmeDecal,
    xiaoDecal,
    nvidiaBadge,
    noctuaHub,
    floorReticle,
    siliconeGasket,
    brassStandoff,
    copperCoil,
    polyimideFlex,
    siliconDie,
    heatsinkDark,
    noctuaFrame,
    noctuaBlade,
    absChamber,
    acousticFoam,
    liIonGreen,
    rubberBase,
    accentSwitch,
    redToggle,
    greenLed,
    chromeSteel,
    ghostShell,
  ];

  return {
    aluminumChassis,
    aluminumTrim,
    displayPuckBezel,
    ledRing,
    opticalGlass,
    lvglScreen,
    lvglController,
    pcbDark,
    pcbEmerald,
    pcbWaveshare,
    nvmeDecal,
    xiaoDecal,
    nvidiaBadge,
    noctuaHub,
    floorReticle,
    siliconeGasket,
    brassStandoff,
    copperCoil,
    polyimideFlex,
    siliconDie,
    heatsinkDark,
    noctuaFrame,
    noctuaBlade,
    absChamber,
    acousticFoam,
    liIonGreen,
    rubberBase,
    accentSwitch,
    redToggle,
    greenLed,
    chromeSteel,
    ghostShell,
    dispose: () => {
      textures.forEach((t) => t.dispose());
      lvglController.dispose();
      materials.forEach((m) => m.dispose());
    },
  };
}
