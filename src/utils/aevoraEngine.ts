export type LvglMode = 'idle' | 'listening' | 'inference' | 'hid' | 'thermal';
export type ChassisFinish = 'silver' | 'charcoal';
export type StorageTier = '512gb' | '1tb' | '2tb';
export type ModelBundle = 'qwen-coder' | 'llama-general' | 'voice-suite';
export type RingAccent = 'amber' | 'cobalt';

export interface HardwareState {
  micEnabled: boolean; // SPST Toggle Switch: true = connected, false = physically open
  hidConnected: boolean; // DPDT Slide Switch: true = host PC USB data connected, false = isolated
  cordlessMode: boolean; // Waveshare UPS HAT 5000mAh 2S battery vs USB-C 5V/3A
  lvglMode: LvglMode;
  ringAccent: RingAccent;
}

export interface TelemetrySnapshot {
  gpuLoadPct: number;
  fanRpm: number;
  chassisTempC: number;
  tokensPerSec: number;
  batteryPct: number;
  estimatedRuntimeHours: number;
  powerDrawWatts: number;
}

export interface BuildConfig {
  finish: ChassisFinish;
  storage: StorageTier;
  bundle: ModelBundle;
  quantity: number;
}

export interface BuildSummary {
  unitPrice: number;
  totalPrice: number;
  storageLabel: string;
  finishLabel: string;
  bundleLabel: string;
  estimatedShipWindow: string;
}

export interface ExecutionCheckResult {
  allowed: boolean;
  blockedReason: string | null;
  requiresMic: boolean;
  requiresHid: boolean;
}

export interface ReservationInput {
  fullName: string;
  email: string;
  region: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof ReservationInput, string>>;
}

const BASE_UNIT_PRICE = 649;

const STORAGE_SURCHARGE: Record<StorageTier, { price: number; label: string }> = {
  '512gb': { price: 0, label: '512 GB Samsung M.2 NVMe' },
  '1tb': { price: 70, label: '1 TB Samsung 970 EVO Plus NVMe' },
  '2tb': { price: 160, label: '2 TB Samsung 970 EVO Plus NVMe' },
};

const FINISH_META: Record<ChassisFinish, { price: number; label: string }> = {
  silver: { price: 0, label: 'CNC Anodized Raw Silver' },
  charcoal: { price: 20, label: 'Matte Charcoal-Black Anodized' },
};

const BUNDLE_META: Record<ModelBundle, string> = {
  'qwen-coder': 'Qwen-2.5 7B TensorRT + Whisper-Small',
  'llama-general': 'Llama-3.2 8B Q4 + FastAPI Agent Stack',
  'voice-suite': 'Ultra-Low Latency Voice + Android ADB Bridge',
};

export function calculateBuildSummary(config: BuildConfig): BuildSummary {
  const safeQty = Math.max(1, Math.min(10, Math.floor(config.quantity)));
  const storage = STORAGE_SURCHARGE[config.storage];
  const finish = FINISH_META[config.finish];
  const unitPrice = BASE_UNIT_PRICE + storage.price + finish.price;

  return {
    unitPrice,
    totalPrice: unitPrice * safeQty,
    storageLabel: storage.label,
    finishLabel: finish.label,
    bundleLabel: BUNDLE_META[config.bundle],
    estimatedShipWindow: config.storage === '2tb' ? 'Batch 02 · Late Q1' : 'Batch 01 · Ships in 3 weeks',
  };
}

export function estimateTelemetry(state: HardwareState): TelemetrySnapshot {
  const modeProfiles: Record<LvglMode, { gpu: number; rpm: number; temp: number; tps: number; watts: number }> = {
    idle: { gpu: 4, rpm: 1450, temp: 33, tps: 0, watts: 4.8 },
    listening: { gpu: 18, rpm: 1950, temp: 37, tps: 0, watts: 7.4 },
    inference: { gpu: 88, rpm: 3800, temp: 49, tps: 34.6, watts: 14.2 },
    hid: { gpu: 64, rpm: 3100, temp: 44, tps: 26.8, watts: 11.6 },
    thermal: { gpu: 96, rpm: 4800, temp: 43, tps: 38.2, watts: 15.0 },
  };

  let profile = modeProfiles[state.lvglMode];

  // Physical SPST mic kill switch forces listening mode back to idle acoustics
  if (!state.micEnabled && state.lvglMode === 'listening') {
    profile = { gpu: 3, rpm: 1400, temp: 32, tps: 0, watts: 4.4 };
  }

  // Physical DPDT isolation stops USB HID host bridge draw
  if (!state.hidConnected && state.lvglMode === 'hid') {
    profile = { gpu: 12, rpm: 1800, temp: 36, tps: 0, watts: 5.9 };
  }

  // 5000mAh 2S 21700 pack (~36Wh usable energy at 7.2V nominal)
  const usableWh = 36.0;
  const runtimeHours = Number((usableWh / profile.watts).toFixed(1));

  return {
    gpuLoadPct: profile.gpu,
    fanRpm: profile.rpm,
    chassisTempC: profile.temp,
    tokensPerSec: profile.tps,
    batteryPct: state.cordlessMode ? 86 : 100,
    estimatedRuntimeHours: runtimeHours,
    powerDrawWatts: profile.watts,
  };
}

export function evaluateExecutionReadiness(
  state: HardwareState,
  options: { requiresMic: boolean; requiresHid: boolean }
): ExecutionCheckResult {
  if (options.requiresMic && !state.micEnabled) {
    return {
      allowed: false,
      blockedReason: 'SPST Microphone Kill Switch is physically OPEN. Flip the mic switch ON to capture voice wake-word.',
      requiresMic: true,
      requiresHid: options.requiresHid,
    };
  }

  if (options.requiresHid && !state.hidConnected) {
    return {
      allowed: false,
      blockedReason: 'DPDT Data Switch is set to ISOLATED. Slide DPDT to ON to bridge USB HID lines to the host PC.',
      requiresMic: options.requiresMic,
      requiresHid: true,
    };
  }

  return {
    allowed: true,
    blockedReason: null,
    requiresMic: options.requiresMic,
    requiresHid: options.requiresHid,
  };
}

export function validateReservationForm(input: ReservationInput): ValidationResult {
  const errors: Partial<Record<keyof ReservationInput, string>> = {};
  const trimmedName = input.fullName.trim();
  const trimmedEmail = input.email.trim();
  const trimmedRegion = input.region.trim();

  if (trimmedName.length < 2) {
    errors.fullName = 'Enter your full name (at least 2 characters).';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address for batch allocation.';
  }

  if (!trimmedRegion) {
    errors.region = 'Select a shipping region.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface InspectionFocus {
  scale: number;
  translateXPct: number;
  translateYPct: number;
}

export function computeInspectionFocus(
  pinLeftPct: number,
  pinTopPct: number,
  zoomed: boolean
): InspectionFocus {
  if (!zoomed) {
    return { scale: 1, translateXPct: 0, translateYPct: 0 };
  }
  const scale = 1.42;
  // Center the active pin cleanly while clamping shifts so edges never expose empty background
  const rawX = (50 - pinLeftPct) * 0.42;
  const rawY = (50 - pinTopPct) * 0.48;
  const translateXPct = Number(Math.max(-14, Math.min(14, rawX)).toFixed(2));
  const translateYPct = Number(Math.max(-18, Math.min(18, rawY)).toFixed(2));
  return { scale, translateXPct, translateYPct };
}

const DIAL_ANGLES: Record<LvglMode, number> = {
  idle: 0,
  listening: 72,
  inference: 144,
  hid: 216,
  thermal: 288,
};

export function getLvglDialAngle(mode: LvglMode): number {
  return DIAL_ANGLES[mode];
}

export function computeContinuousDialAngle(currentAngle: number, targetMode: LvglMode): number {
  const targetMod = DIAL_ANGLES[targetMode];
  const currentMod = ((currentAngle % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return currentAngle + delta;
}

const LVGL_ORDER: LvglMode[] = ['idle', 'listening', 'inference', 'hid', 'thermal'];

export function stepLvglMode(current: LvglMode, delta: number): LvglMode {
  const idx = LVGL_ORDER.indexOf(current);
  const start = idx === -1 ? 0 : idx;
  const nextIdx = ((start + delta) % LVGL_ORDER.length + LVGL_ORDER.length) % LVGL_ORDER.length;
  return LVGL_ORDER[nextIdx];
}

export interface AmbientBloomSpec {
  opacity: number;
  scale: number;
  color: string;
}

export function computeAmbientBloom(state: HardwareState): AmbientBloomSpec {
  const color = state.ringAccent === 'amber' ? 'rgba(255, 85, 0, 0.34)' : 'rgba(14, 165, 233, 0.34)';

  if ((!state.micEnabled && state.lvglMode === 'listening') || (!state.hidConnected && state.lvglMode === 'hid')) {
    return {
      opacity: 0.25,
      scale: 0.94,
      color: 'rgba(239, 68, 68, 0.28)',
    };
  }

  const intensityByMode: Record<LvglMode, { opacity: number; scale: number }> = {
    idle: { opacity: 0.22, scale: 0.95 },
    listening: { opacity: 0.48, scale: 1.04 },
    inference: { opacity: 0.62, scale: 1.07 },
    hid: { opacity: 0.52, scale: 1.04 },
    thermal: { opacity: 0.7, scale: 1.09 },
  };

  return {
    ...intensityByMode[state.lvglMode],
    color,
  };
}

export interface ExplodedLayerTransform {
  id: string;
  yOffset: number;
  xOffset: number;
  zOffset: number;
  selectedLift: number;
}

/** CAD unit scale calibrated so Ø 100 mm = 2.090 units (R = 1.045, 1 mm = 0.0209 units) */
export const CAD_MM_TO_UNIT = 0.0209;
export const CHASSIS_RADIUS_UNITS = 1.045; // 50 mm radius (Ø 100 mm)
export const FAN_MOUNT_ANGLE = Math.PI * 0.38; // 68.4 deg right-side thermal exhaust duct

const CORE_SLOT_RANGE: Record<
  'display' | 'mics' | 'switches' | 'jetson' | 'nvme' | 'coprocessor' | 'acoustic' | 'battery',
  { assembledY: number; explodedY: number }
> = {
  display: { assembledY: 0.892, explodedY: 1.792 },
  mics: { assembledY: 0.735, explodedY: 1.405 },
  switches: { assembledY: 0.625, explodedY: 1.025 },
  jetson: { assembledY: 0.195, explodedY: 0.415 },
  nvme: { assembledY: -0.031, explodedY: -0.031 },
  coprocessor: { assembledY: -0.215, explodedY: -0.375 },
  acoustic: { assembledY: -0.49, explodedY: -0.84 },
  battery: { assembledY: -0.85, explodedY: -1.80 },
};

export function computeExplodedLayerPositions(
  explodeFactor: number,
  selectedLayerId: string | null
): Record<string, ExplodedLayerTransform> {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(explodeFactor) ? explodeFactor : 0));
  const result: Record<string, ExplodedLayerTransform> = {};

  (Object.keys(CORE_SLOT_RANGE) as Array<keyof typeof CORE_SLOT_RANGE>).forEach((id) => {
    const slot = CORE_SLOT_RANGE[id];
    const isSelected = selectedLayerId === id;
    const selectedLift = isSelected ? 0.06 * (0.4 + 0.6 * clamped) : 0;
    const baseY = slot.assembledY + (slot.explodedY - slot.assembledY) * clamped;
    const xOff = id === 'coprocessor' ? -0.34 * clamped : 0;
    const zOff = id === 'coprocessor' ? 0.28 * clamped : 0;

    result[id] = {
      id,
      yOffset: Number((baseY + selectedLift).toFixed(4)),
      xOffset: Number(xOff.toFixed(4)),
      zOffset: Number(zOff.toFixed(4)),
      selectedLift: Number(selectedLift.toFixed(4)),
    };
  });

  // 1:1 Noctua NF-A4x10 PWM (40 × 40 × 10 mm -> ±0.418 XY, ±0.1045 Z):
  // Radial center r_fan = 0.805 at 0% puts outer exhaust louver bevel (0.805 + 0.130 = 0.935)
  // within circle-chord sqrt(1.045^2 - 0.418^2) = 0.9578, flush inside the Ø100mm × H95mm silhouette.
  const thermalZoneY = (result.jetson.yOffset + result.nvme.yOffset) * 0.5;
  const fanSelected = selectedLayerId === 'fan';
  const fanRadial = 0.805 + clamped * 0.56 + (fanSelected ? 0.14 * clamped : 0);
  result.fan = {
    id: 'fan',
    yOffset: Number(thermalZoneY.toFixed(4)),
    xOffset: Number((fanRadial * Math.sin(FAN_MOUNT_ANGLE)).toFixed(4)),
    zOffset: Number((fanRadial * Math.cos(FAN_MOUNT_ANGLE)).toFixed(4)),
    selectedLift: fanSelected ? 0.14 : 0,
  };

  return result;
}




