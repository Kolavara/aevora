export type SubsystemCategory = 'all' | 'compute' | 'acoustic' | 'privacy' | 'power';

export interface HardwareLayer {
  id: string;
  index: string;
  name: string;
  component: string;
  category: Exclude<SubsystemCategory, 'all'>;
  pinTopPct: number;
  pinLeftPct: number;
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
    pinTopPct: 8,
    pinLeftPct: 50,
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
    pinTopPct: 18,
    pinLeftPct: 50,
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
    pinTopPct: 29,
    pinLeftPct: 50,
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
    pinTopPct: 41,
    pinLeftPct: 48,
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
    pinTopPct: 48,
    pinLeftPct: 45,
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
    pinTopPct: 55,
    pinLeftPct: 36,
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
    pinTopPct: 54,
    pinLeftPct: 68,
    summary:
      'Side-mounted 40 mm Noctua PWM fan pulls cool base intake air upward past the speaker plenum, across the Jetson heatsink fins, and exhausts heat horizontally out the right louvers.',
    specs: [
      { label: 'Fan', value: 'Noctua NF-A4x10 PWM' },
      { label: 'Flow Path', value: 'Base → Fins → Side Out' },
      { label: 'Acoustic', value: 'Anti-Vibration Pads' },
    ],
  },
  {
    id: 'acoustic',
    index: '08',
    name: 'Speaker Acoustic Chamber',
    component: 'Sealed Enclosure + Downward Driver + Red Damper',
    category: 'acoustic',
    pinTopPct: 69,
    pinLeftPct: 48,
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
    pinTopPct: 84,
    pinLeftPct: 54,
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
