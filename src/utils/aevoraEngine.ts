export type LvglMode = 'idle' | 'listening' | 'inference' | 'hid' | 'thermal';
export type ChassisFinish = 'silver' | 'charcoal';
export type StorageTier = '512gb' | '1tb' | '2tb';
export type ModelBundle = 'qwen-coder' | 'llama-general' | 'voice-suite';
export type RingAccent = 'amber' | 'cobalt';
export type TargetOs = 'macos' | 'windows' | 'linux' | 'android';
export type InferenceRoute = 'on-device' | 'lan-peer' | 'cloud-byok';

export interface InferenceRouteMeta {
  id: InferenceRoute;
  label: string;
  shortLabel: string;
  endpointNote: string;
  plannerStage: string;
  plannerDetail: string;
  completionSummary: string;
  badgeText: string;
}

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
  noiseFloorDba: number;
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
  basePrice: number;
  finishDelta: number;
  storageDelta: number;
  bundleDelta: number;
  unitPrice: number;
  totalPrice: number;
  breakdownFormula: string;
  storageLabel: string;
  finishLabel: string;
  bundleLabel: string;
  estimatedShipWindow: string;
}

export interface StorageCapacityEstimate {
  totalGb: number;
  reservedOsGb: number;
  availableGb: number;
  approx7bModels: number;
  summaryLine: string;
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

export interface SynthesizedHidPlan {
  targetLabel: string;
  requiresMic: boolean;
  requiresHid: boolean;
  triggerPhrase: string;
  hidTranscript: string;
  steps: Array<{
    stage: string;
    detail: string;
    durationMs: number;
  }>;
}

const BASE_UNIT_PRICE = 649;

const STORAGE_SURCHARGE: Record<StorageTier, { price: number; label: string; totalGb: number }> = {
  '512gb': { price: 0, label: '512 GB Samsung M.2 NVMe', totalGb: 512 },
  '1tb': { price: 70, label: '1 TB Samsung 970 EVO Plus NVMe', totalGb: 1000 },
  '2tb': { price: 160, label: '2 TB Samsung 970 EVO Plus NVMe', totalGb: 2000 },
};

const FINISH_META: Record<ChassisFinish, { price: number; label: string }> = {
  silver: { price: 0, label: 'CNC Anodized Raw Silver' },
  charcoal: { price: 20, label: 'Matte Charcoal-Black Anodized' },
};

const BUNDLE_META: Record<ModelBundle, { label: string; footprintGb: number }> = {
  'qwen-coder': { label: 'Qwen-2.5 7B TensorRT + Whisper-Small', footprintGb: 28 },
  'llama-general': { label: 'Llama-3.2 8B Q4 + FastAPI Agent Stack', footprintGb: 31 },
  'voice-suite': { label: 'Ultra-Low Latency Voice + Android ADB Bridge', footprintGb: 24 },
};

export function calculateBuildSummary(config: BuildConfig): BuildSummary {
  const safeQty = Math.max(1, Math.min(10, Math.floor(config.quantity)));
  const storage = STORAGE_SURCHARGE[config.storage];
  const finish = FINISH_META[config.finish];
  const bundleDelta = 0;
  const unitPrice = BASE_UNIT_PRICE + storage.price + finish.price + bundleDelta;
  const totalPrice = unitPrice * safeQty;

  const baseFormula = `$${BASE_UNIT_PRICE} + $${finish.price} + $${storage.price} + $${bundleDelta}`;
  const breakdownFormula =
    safeQty > 1
      ? `(${baseFormula}) × ${safeQty} = $${totalPrice} · Shipping Included`
      : `${baseFormula} = $${totalPrice} · Shipping Included`;

  return {
    basePrice: BASE_UNIT_PRICE,
    finishDelta: finish.price,
    storageDelta: storage.price,
    bundleDelta,
    unitPrice,
    totalPrice,
    breakdownFormula,
    storageLabel: storage.label,
    finishLabel: finish.label,
    bundleLabel: BUNDLE_META[config.bundle].label,
    estimatedShipWindow:
      config.storage === '2tb'
        ? 'Early Access · Batch 02 Allocation'
        : 'Early Access · Batch 01 Allocation',
  };
}

export function estimateStorageCapacity(
  storage: StorageTier,
  bundle: ModelBundle
): StorageCapacityEstimate {
  const totalGb = STORAGE_SURCHARGE[storage].totalGb;
  const reservedOsGb = 22 + BUNDLE_META[bundle].footprintGb; // Ubuntu 22.04 + CUDA/TensorRT + pre-flashed bundle
  const availableGb = Math.max(0, totalGb - reservedOsGb);
  // Typical Q4_K_M 7B-8B model weight + KV cache footprint ~ 5.2 GB
  const approx7bModels = Math.floor(availableGb / 5.2);

  return {
    totalGb,
    reservedOsGb,
    availableGb,
    approx7bModels,
    summaryLine: `${availableGb} GB free for local weights & RAG (~${approx7bModels} quantized 7B–8B models)`,
  };
}

export function estimateTelemetry(state: HardwareState): TelemetrySnapshot {
  const modeProfiles: Record<
    LvglMode,
    { gpu: number; rpm: number; dba: number; temp: number; tps: number; watts: number }
  > = {
    idle: { gpu: 4, rpm: 1450, dba: 16.9, temp: 33, tps: 0, watts: 4.8 },
    listening: { gpu: 18, rpm: 1950, dba: 17.8, temp: 37, tps: 0, watts: 7.4 },
    inference: { gpu: 88, rpm: 3800, dba: 21.6, temp: 49, tps: 34.6, watts: 14.2 },
    hid: { gpu: 64, rpm: 3100, dba: 19.9, temp: 44, tps: 26.8, watts: 11.6 },
    thermal: { gpu: 96, rpm: 4800, dba: 24.8, temp: 43, tps: 38.2, watts: 15.0 },
  };

  let profile = modeProfiles[state.lvglMode];

  // Physical SPST mic kill switch forces listening mode back to idle acoustics
  if (!state.micEnabled && state.lvglMode === 'listening') {
    profile = { gpu: 3, rpm: 1400, dba: 16.8, temp: 32, tps: 0, watts: 4.4 };
  }

  // Physical DPDT isolation stops USB HID host bridge draw
  if (!state.hidConnected && state.lvglMode === 'hid') {
    profile = { gpu: 12, rpm: 1800, dba: 17.4, temp: 36, tps: 0, watts: 5.9 };
  }

  // 5000mAh 2S 21700 pack (~36Wh usable energy at 7.2V nominal)
  const usableWh = 36.0;
  const runtimeHours = Number((usableWh / profile.watts).toFixed(1));

  return {
    gpuLoadPct: profile.gpu,
    fanRpm: profile.rpm,
    noiseFloorDba: profile.dba,
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
      blockedReason:
        'SPST Microphone Kill Switch is physically OPEN. Flip the mic switch ON to capture voice wake-word.',
      requiresMic: true,
      requiresHid: options.requiresHid,
    };
  }

  if (options.requiresHid && !state.hidConnected) {
    return {
      allowed: false,
      blockedReason:
        'DPDT Data Switch is set to ISOLATED. Slide DPDT to ON to bridge USB HID lines to the host PC.',
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

const INFERENCE_ROUTES: Record<InferenceRoute, InferenceRouteMeta> = {
  'on-device': {
    id: 'on-device',
    label: 'On-Device Orin',
    shortLabel: 'On-Device',
    endpointNote: 'Local TensorRT-LLM / llama.cpp on Jetson Orin Nano · 0 bytes external',
    plannerStage: 'Jetson Orin Planner',
    plannerDetail:
      'FastAPI + TensorRT-LLM executes quantized weights inside 8 GB LPDDR5 (0 bytes sent externally).',
    completionSummary: 'Loop completed on Jetson Orin Nano · 0 bytes sent externally.',
    badgeText: 'LOCAL 0-CLOUD',
  },
  'lan-peer': {
    id: 'lan-peer',
    label: 'Offline LAN Rig',
    shortLabel: 'LAN Peer',
    endpointNote:
      'Offline model hosted on another LAN machine (Ollama / vLLM / llama.cpp server) · 0 cloud bytes',
    plannerStage: 'LAN Peer GPU Planner',
    plannerDetail:
      'FastAPI routes an OpenAI-compatible request over local LAN to an offline workstation GPU (0 cloud packets).',
    completionSummary: 'Loop completed via offline LAN peer GPU · 0 cloud packets.',
    badgeText: 'LAN OFFLINE',
  },
  'cloud-byok': {
    id: 'cloud-byok',
    label: 'Cloud BYOK API',
    shortLabel: 'Cloud BYOK',
    endpointNote:
      'Opt-in frontier cloud model via your own API key in local FastAPI config · zero AEVORA subscription',
    plannerStage: 'Cloud BYOK API Planner',
    plannerDetail:
      'FastAPI calls your configured cloud model endpoint using your own API key and returns deterministic HID steps.',
    completionSummary: 'Loop completed via user BYOK cloud API · Local RP2040 HID execution.',
    badgeText: 'BYOK OPT-IN',
  },
};

export function getInferenceRouteMeta(route: InferenceRoute): InferenceRouteMeta {
  return INFERENCE_ROUTES[route];
}

export function synthesizeCustomHidPlan(
  rawPrompt: string,
  targetOs: TargetOs,
  route: InferenceRoute = 'on-device'
): SynthesizedHidPlan {
  const cleaned = rawPrompt.trim().replace(/\s+/g, ' ');
  const prompt = cleaned.length > 0 ? cleaned.slice(0, 140) : 'Open terminal, run test suite, and copy summary';
  const shortCmd = prompt.length > 46 ? `${prompt.slice(0, 43)}...` : prompt;
  const routeMeta = INFERENCE_ROUTES[route];

  const routeAck =
    route === 'on-device'
      ? 'Completed locally · 0 cloud packets'
      : route === 'lan-peer'
      ? 'Planned on LAN peer GPU (offline) · 0 cloud packets'
      : 'Planned via user BYOK cloud API · Local RP2040 HID';

  const routeHeader =
    route === 'on-device'
      ? 'ROUTE      -> local://jetson-orin-tensorrt'
      : route === 'lan-peer'
      ? 'ROUTE      -> http://workstation.local:11434/v1 (LAN offline)'
      : 'ROUTE      -> https://api.provider/v1 (User BYOK key)';

  if (targetOs === 'android') {
    return {
      targetLabel: 'Android Local Peer',
      requiresMic: true,
      requiresHid: false,
      triggerPhrase: `"Aevora, ${prompt}"`,
      hidTranscript: [
        routeHeader,
        `ADB_LOCAL_BRIDGE -> Pair verified (LAN local peer)`,
        `INTENT_ACTION -> "${shortCmd}"`,
        `LVGL_CONFIRM -> ${routeAck}`,
      ].join('\n'),
      steps: [
        {
          stage: 'Wake-Word & Local STT',
          detail: 'ReSpeaker captures voice prompt; Whisper-Small transcribes locally in 138 ms.',
          durationMs: 520,
        },
        {
          stage: routeMeta.plannerStage,
          detail: routeMeta.plannerDetail,
          durationMs: 700,
        },
        {
          stage: 'Local Peer Dispatch',
          detail: 'Sends encrypted intent packet directly to companion Android handset over local Wi-Fi.',
          durationMs: 760,
        },
        {
          stage: 'LVGL Approval Ring',
          detail: '2.4" circular IPS displays confirmation ring and returns Orin GPU to idle draw.',
          durationMs: 520,
        },
      ],
    };
  }

  const launcherChord =
    targetOs === 'macos'
      ? 'HID_MOD_LGUI + KEY_SPACE  // Spotlight'
      : targetOs === 'windows'
      ? 'HID_MOD_LGUI + KEY_R      // Run Dialog'
      : 'HID_MOD_LCTRL + ALT + T   // Terminal';

  const appTarget =
    targetOs === 'macos'
      ? 'Terminal.app'
      : targetOs === 'windows'
      ? 'wt.exe'
      : 'bash --local';

  const targetLabel =
    targetOs === 'macos'
      ? 'macOS Host (USB HID)'
      : targetOs === 'windows'
      ? 'Windows Host (USB HID)'
      : 'Linux Host (USB HID)';

  const safeLiteral = shortCmd.replace(/"/g, "'");

  return {
    targetLabel,
    requiresMic: true,
    requiresHid: true,
    triggerPhrase: `"Aevora, ${prompt}"`,
    hidTranscript: [
      routeHeader,
      `RP2040_HID -> ${launcherChord}`,
      `HID_TYPE   -> "${appTarget}" + KEY_ENTER`,
      `HID_EXEC   -> "# ${safeLiteral}"`,
      `HOST_ACK   -> ${routeAck}`,
    ].join('\n'),
    steps: [
      {
        stage: 'Wake-Word & Local STT',
        detail: 'ReSpeaker captures spoken prompt; local Whisper transcribes in 140 ms on-device.',
        durationMs: 520,
      },
      {
        stage: routeMeta.plannerStage,
        detail: `${routeMeta.plannerDetail} Maps request to deterministic ${targetLabel} USB HID scan codes.`,
        durationMs: 720,
      },
      {
        stage: 'XIAO RP2040 HID Injection',
        detail: `DPDT bridges D+/D-; RP2040 sends ${launcherChord.split('//')[0].trim()} with zero host driver.`,
        durationMs: 820,
      },
      {
        stage: 'Voice & Ring Confirmation',
        detail: '45 mm neodymium driver confirms completion; LVGL ring settles to standby.',
        durationMs: 540,
      },
    ],
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
