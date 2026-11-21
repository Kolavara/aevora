export type SubsystemCategory = 'all' | 'compute' | 'acoustic' | 'privacy' | 'power';

export interface HardwareLayer {
  id: string;
  index: string;
  name: string;
  component: string;
  category: Exclude<SubsystemCategory, 'all'>;
  summary: string;
  specs: Array<{ label: string; value: string }>;
}

export const HARDWARE_LAYERS: HardwareLayer[] = [
  {
    id: 'display',
    index: '01',
    name: 'Top Cover & Display',
    component: '2.4" Circular IPS LCD (240×240)',
    category: 'compute',
    summary:
      'Brushed Ø100 mm aluminum crown housing a flush 2.4-inch circular IPS display running LVGL for real-time voice waveforms, inference progress rings, and diagnostics.',
    specs: [
      { label: 'Panel', value: '2.4" Circular IPS' },
      { label: 'Resolution', value: '240 × 240 px' },
      { label: 'Cover', value: 'Beveled Optical Glass' },
    ],
  },
  {
    id: 'mics',
    index: '02',
    name: 'Top Electronics & Mic PCB',
    component: 'Display Driver + ReSpeaker Array + FFC Bridge',
    category: 'acoustic',
    summary:
      'Circular upper electronics board carrying the IPS display driver, far-field ReSpeaker microphone array, LED ring control IC, and copper FFC ribbon interconnect.',
    specs: [
      { label: 'Audio Array', value: 'Far-Field ReSpeaker' },
      { label: 'LED Control', value: 'Addressable Driver' },
      { label: 'Interconnect', value: 'Shielded FFC Ribbon' },
    ],
  },
  {
    id: 'switches',
    index: '03',
    name: 'LED Light-Guide & Control Ring',
    component: 'Hollow Collar + SPST Toggle + Mic Mute Pill',
    category: 'privacy',
    summary:
      'CNC-machined hollow aluminum collar seating the internal 360° amber/cobalt light-guiding ring at top, and physical SPST mic cutoff + DPDT HID slide switch on the front face.',
    specs: [
      { label: 'Light Guide', value: '360° Recessed Ring' },
      { label: 'Mic Cutoff', value: 'SPST Mechanical Open' },
      { label: 'Host Bridge', value: 'DPDT Slide Switch' },
    ],
  },
  {
    id: 'jetson',
    index: '04',
    name: 'Compute Tier',
    component: 'NVIDIA Jetson Orin Nano (69.6×45mm) + Heatsink',
    category: 'compute',
    summary:
      'Ubuntu 22.04 carrier running quantized local LLMs via TensorRT-LLM and llama.cpp under a longitudinal multi-fin aluminum heatsink cooled by crossflow air.',
    specs: [
      { label: 'GPU', value: '1024-Core Ampere' },
      { label: 'Thermal', value: '11-Fin Aluminum Sink' },
      { label: 'Memory', value: '8 GB LPDDR5' },
    ],
  },
  {
    id: 'nvme',
    index: '05',
    name: 'NVMe Storage',
    component: 'Samsung 970 EVO Plus M.2 2280 SSD',
    category: 'compute',
    summary:
      'Mounted parallel beneath the Jetson Orin Nano carrier to store quantized LLM weights, embeddings, and local files with zero external network transfer.',
    specs: [
      { label: 'Form Factor', value: 'M.2 2280 NVMe PCIe' },
      { label: 'Capacity', value: '512 GB / 1 TB / 2 TB' },
      { label: 'Placement', value: 'Under-Carrier Slot' },
    ],
  },
  {
    id: 'coprocessor',
    index: '06',
    name: 'Deterministic Coprocessor',
    component: 'Seeed Studio XIAO RP2040 (USB-Host)',
    category: 'privacy',
    summary:
      'Cantilevered dual Cortex-M0+ microcontroller providing deterministic native USB HID keyboard/mouse emulation, switch state sensing, and closed-loop PWM fan control.',
    specs: [
      { label: 'MCU', value: 'Dual ARM Cortex-M0+' },
      { label: 'Host Port', value: 'Native USB-C HID' },
      { label: 'Host Driver', value: 'Zero Software Needed' },
    ],
  },
  {
    id: 'fan',
    index: '07',
    name: 'Active Side Exhaust',
    component: 'Noctua NF-A4x10 5V PWM + Exhaust Louvers',
    category: 'compute',
    summary:
      'Side-mounted 40 mm Noctua PWM fan pulls cool base intake air upward past the speaker plenum, across the Jetson heatsink fins, and exhausts heat horizontally out the right louvers.',
    specs: [
      { label: 'Fan', value: 'Noctua NF-A4x10 PWM' },
      { label: 'Flow Path', value: 'Base → Fins → Side Out' },
      { label: 'Acoustic', value: '16.9–24.8 dBA Range' },
    ],
  },
  {
    id: 'acoustic',
    index: '08',
    name: 'Speaker Acoustic Chamber',
    component: 'Sealed Enclosure + Downward Driver + Red Damper',
    category: 'acoustic',
    summary:
      'Machined cutaway housing with acoustic foam damping holding a downward-firing 45 mm neodymium driver and thick red silicone isolator ring, flanked by cool air riser channels.',
    specs: [
      { label: 'Driver', value: '45mm 5W Neodymium' },
      { label: 'Isolation', value: 'Red Silicone Damping Ring' },
      { label: 'Liner', value: '0.1L Foam-Damped ABS' },
    ],
  },
  {
    id: 'battery',
    index: '09',
    name: 'UPS Power & 21700 Battery Bay',
    component: 'Waveshare UPS HAT (C) + 2× 21700 Cells + Base Vents',
    category: 'power',
    summary:
      'Waveshare 5V/5A buck-boost UPS board seated above twin 5000 mAh green 21700 Li-ion cells inside a 360° slotted CNC intake base with preserved USB-C PD port.',
    specs: [
      { label: 'Battery', value: '2× 21700 (2S 5000 mAh)' },
      { label: 'Power Stage', value: 'Waveshare UPS HAT (C)' },
      { label: 'Intake', value: '360° Slotted Base Vents' },
    ],
  },
];

export interface AutomationScenario {
  id: string;
  title: string;
  target: 'Host PC (USB HID)' | 'Android Companion' | 'PC + Android Loop';
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

export const AUTOMATION_SCENARIOS: AutomationScenario[] = [
  {
    id: 'repo-compile',
    title: 'Voice-Triggered Repo Check & PR Summary',
    target: 'Host PC (USB HID)',
    requiresMic: true,
    requiresHid: true,
    triggerPhrase: '"Aevora, run the test suite on my active terminal and copy the summary."',
    hidTranscript: '$ npm test && git status --short\n> 14 passed (0 failed) in 380ms\n> M src/hid_bridge.cpp',
    steps: [
      { stage: 'Wake-Word & Local STT', detail: 'ReSpeaker captures prompt; local Whisper transcribes in 140 ms (0 cloud packets).', durationMs: 600 },
      { stage: 'Jetson Orin Planner', detail: 'FastAPI + TensorRT-LLM breaks task into deterministic keyboard shortcut sequence.', durationMs: 750 },
      { stage: 'XIAO RP2040 HID', detail: 'DPDT bridges USB lines; RP2040 types `npm test && git status` into focused terminal.', durationMs: 850 },
      { stage: 'Local Voice Readout', detail: '45mm neodymium speaker summarizes 14 passing specs via sealed 0.1L chamber.', durationMs: 650 },
    ],
  },
  {
    id: 'desktop-form',
    title: 'Zero-Software Cross-App Entry',
    target: 'Host PC (USB HID)',
    requiresMic: false,
    requiresHid: true,
    triggerPhrase: 'Scheduled FastAPI agent loop triggered from NVMe local inbox',
    hidTranscript: 'HID KEY_TAB -> "Nordic CNC Supply"\nHID KEY_TAB -> "$1,480.00"\nHID ENTER -> Ledger Entry Saved',
    steps: [
      { stage: 'NVMe Local Read', detail: 'Reads encrypted PDF invoice stored on Samsung 970 EVO Plus M.2 SSD.', durationMs: 550 },
      { stage: 'Quantized Extraction', detail: 'llama.cpp extracts vendor, total, and line items at 34.6 tokens/sec.', durationMs: 800 },
      { stage: 'Native HID Injection', detail: 'Enumerates as standard USB keyboard/mouse—tabs across fields with zero host agent installed.', durationMs: 900 },
      { stage: 'LVGL Ring Confirmation', detail: '2.4" circular IPS displays completion ring; returns GPU to 4% idle draw.', durationMs: 550 },
    ],
  },
  {
    id: 'android-triage',
    title: 'Cordless Android Desk Triage',
    target: 'Android Companion',
    requiresMic: true,
    requiresHid: false,
    triggerPhrase: '"Aevora, draft replies for urgent messages while I am on battery."',
    hidTranscript: 'Local Peer -> 3 drafts queued on-device\n[1] "Reviewing CAD rev B now."\n[2] "Shipping batch confirmed."',
    steps: [
      { stage: 'Cordless UPS Switch', detail: 'Waveshare UPS HAT draws cleanly from 5000mAh 2S 21700 pack with zero interruption.', durationMs: 550 },
      { stage: 'Local Android Bridge', detail: 'Fetches notification queue over local peer link—no third-party cloud relay.', durationMs: 700 },
      { stage: 'On-Device Drafting', detail: 'Jetson Orin Nano drafts 3 concise responses entirely in local 8GB LPDDR5 memory.', durationMs: 800 },
      { stage: 'LVGL Approval Ring', detail: 'Circular IPS previews drafts for single-tap confirmation on the top glass face.', durationMs: 600 },
    ],
  },
];

export type SpecGroupId = 'compute' | 'acoustics' | 'mechanical' | 'box';

export interface TechnicalSpecGroup {
  id: SpecGroupId;
  label: string;
  rows: Array<{ label: string; value: string; note?: string }>;
}

export const TECHNICAL_SPECS: TechnicalSpecGroup[] = [
  {
    id: 'compute',
    label: 'Compute & Local AI',
    rows: [
      { label: 'Primary SoC', value: 'NVIDIA Jetson Orin Nano 8 GB', note: '1024-core Ampere GPU · 6-core Arm Cortex-A78AE' },
      { label: 'AI Throughput', value: '40 TOPS (INT8) · 34.6 tok/s', note: 'Quantized Q4_K_M / FP8 via TensorRT-LLM & llama.cpp' },
      { label: 'Coprocessor', value: 'Seeed Studio XIAO RP2040', note: 'Dual Cortex-M0+ deterministic USB HID & PWM controller' },
      { label: 'Local Storage', value: '512 GB / 1 TB / 2 TB NVMe', note: 'Samsung 970 EVO Plus M.2 2280 PCIe Gen3 x4' },
      { label: 'Operating Stack', value: 'Ubuntu 22.04 LTS + FastAPI', note: 'Open local REST/WebSocket agent runtime, zero telemetry' },
    ],
  },
  {
    id: 'acoustics',
    label: 'Privacy & Acoustics',
    rows: [
      { label: 'Mic Kill Switch', value: 'SPST Mechanical Cutoff', note: 'Physically opens PCB power & I2S rail to ReSpeaker array' },
      { label: 'USB Data Air-Gap', value: 'DPDT Slide Switch', note: 'Physically disconnects USB D+/D- lines from host PC' },
      { label: 'Microphone Array', value: 'Far-Field ReSpeaker 4-Mic', note: 'On-device beamforming & Whisper-Small wake pipeline' },
      { label: 'Speaker Chamber', value: '45 mm 5W Neodymium Driver', note: '0.1 L foam-damped ABS cavity + red silicone elastomer damper' },
      { label: 'Acoustic Floor', value: '16.9 dBA idle · 24.8 dBA peak', note: 'Noctua NF-A4x10 5V PWM on anti-vibration mounts' },
    ],
  },
  {
    id: 'mechanical',
    label: 'Mechanical & Power',
    rows: [
      { label: 'Dimensions', value: '100.0 mm Ø × 95.0 mm H', note: 'CNC-machined 6061 aluminum · ±0.05 mm concentricity' },
      { label: 'Mass', value: '450 g (bottom-weighted)', note: 'Low center of gravity with anti-slip elastomer ring pad' },
      { label: 'Top Interface', value: '2.4" Circular IPS (240×240)', note: 'LVGL UI under beveled glass + 360° PMMA light-guide ring' },
      { label: 'Battery & UPS', value: '2× 21700 (2S 5000 mAh / 36 Wh)', note: 'Waveshare UPS HAT (C) · 2.5–7.5 hr cordless operation' },
      { label: 'External I/O', value: 'USB-C PD (5V/3A) + USB-C HID', note: 'Zero-software host keyboard/mouse emulation + Wi-Fi 6 / BT 5.2' },
    ],
  },
  {
    id: 'box',
    label: 'What’s in the Box',
    rows: [
      { label: 'AEVORA Companion', value: '1× Pre-assembled Unit', note: 'Flashed with Ubuntu 22.04, LVGL firmware & chosen model suite' },
      { label: 'Host HID Cable', value: '1.5 m Braided USB-C to USB-C', note: 'Shielded low-capacitance data lead for XIAO RP2040 bridge' },
      { label: 'Power Adapter', value: '30 W GaN USB-C PD Supply', note: 'Regional plug (NA / EU-UK / APAC) for pass-through charging' },
      { label: 'Service Kit', value: '1.5 mm Hex Key + Spec Card', note: 'Full access to M.2 NVMe bay & replaceable 21700 battery pack' },
    ],
  },
];

export interface ComparisonRow {
  criterion: string;
  aevora: string;
  cloudDevice: string;
}

export const LOCAL_VS_CLOUD_ROWS: ComparisonRow[] = [
  {
    criterion: 'Microphone Privacy',
    aevora: 'SPST hardware open-circuit severs PCB mic rail',
    cloudDevice: 'Software mute flag controlled by remote firmware',
  },
  {
    criterion: 'Host PC Automation',
    aevora: 'Native USB-C HID (zero host software or admin rights)',
    cloudDevice: 'Requires screen-recording daemon or cloud OAuth',
  },
  {
    criterion: 'Recurring Cost',
    aevora: '$0 / month forever — own weights on local NVMe',
    cloudDevice: '$20–$30 / month subscription + token caps',
  },
  {
    criterion: 'Offline & Air-Gapped Use',
    aevora: '100% functional offline + cordless 2S UPS battery',
    cloudDevice: 'Unusable without live cloud API connection',
  },
  {
    criterion: 'Voice-to-First-Token',
    aevora: '~140 ms local Whisper + 34.6 tok/s TensorRT-LLM',
    cloudDevice: '600–1,400 ms network upload & cloud queue jitter',
  },
];
