import React, { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  Cpu,
  Fan,
  Radio,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  computeAmbientBloom,
  computeContinuousDialAngle,
  estimateTelemetry,
  getLvglDialAngle,
  stepLvglMode,
  type HardwareState,
  type LvglMode,
  type RingAccent,
} from '../utils/aevoraEngine';
import { playDetentClick, playSwitchSnap, playWakeChime, playWakeChimeReverse } from '../utils/tactileAudio';
import { MagneticButton } from './MagneticButton';

interface TactilePrivacyTwinProps {
  hardwareState: HardwareState;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onChange: (next: HardwareState) => void;
}

const LVGL_MODES: Array<{ id: LvglMode; label: string; caption: string }> = [
  { id: 'idle', label: 'Standby', caption: '4% GPU · Quiet Desk Watch' },
  { id: 'listening', label: 'Listening', caption: 'ReSpeaker Wake-Word Capture' },
  { id: 'inference', label: 'Inference', caption: 'TensorRT-LLM Local Reasoning' },
  { id: 'hid', label: 'HID Typing', caption: 'RP2040 Native USB Injection' },
  { id: 'thermal', label: 'Thermal Peak', caption: 'Noctua PWM Active Ramp' },
];

export const TactilePrivacyTwin: React.FC<TactilePrivacyTwinProps> = ({
  hardwareState,
  soundEnabled,
  onToggleSound,
  onChange,
}) => {
  const [wakeTestStatus, setWakeTestStatus] = useState<'idle' | 'blocked' | 'capturing' | 'answered'>('idle');
  const [pulseSeq, setPulseSeq] = useState(0);
  const [dialAngle, setDialAngle] = useState<number>(() => getLvglDialAngle(hardwareState.lvglMode));
  const wakeTimerRef = useRef<number | null>(null);
  const panAccumRef = useRef<number>(0);
  const panSwitchAtRef = useRef<number>(0);

  const [isDesktopInteractive, setIsDesktopInteractive] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
    const sync = () => setIsDesktopInteractive(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  const dialX = useMotionValue(0);
  const dialY = useMotionValue(0);
  const smoothDialX = useSpring(dialX, { stiffness: 180, damping: 24 });
  const smoothDialY = useSpring(dialY, { stiffness: 180, damping: 24 });
  const dialRotateX = useTransform(smoothDialY, [-0.5, 0.5], [7.5, -7.5]);
  const dialRotateY = useTransform(smoothDialX, [-0.5, 0.5], [-7.5, 7.5]);
  const bezelLightX = useTransform(smoothDialX, [-0.5, 0.5], [20, 80]);
  const bezelLightY = useTransform(smoothDialY, [-0.5, 0.5], [20, 80]);
  const bezelSheen = useMotionTemplate`radial-gradient(240px circle at ${bezelLightX}% ${bezelLightY}%, rgba(255,255,255,0.45), transparent 65%)`;

  const handleDialPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDesktopInteractive || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    dialX.set((e.clientX - rect.left) / rect.width - 0.5);
    dialY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleDialPointerLeave = () => {
    dialX.set(0);
    dialY.set(0);
  };

  useEffect(() => {
    setDialAngle((prev) => computeContinuousDialAngle(prev, hardwareState.lvglMode));
  }, [hardwareState.lvglMode]);

  useEffect(() => {
    return () => {
      if (wakeTimerRef.current !== null) window.clearTimeout(wakeTimerRef.current);
    };
  }, []);

  const telemetry = estimateTelemetry(hardwareState);
  const ambientBloom = computeAmbientBloom(hardwareState);

  const isAmber = hardwareState.ringAccent === 'amber';
  const ringStroke = isAmber ? '#ff5500' : '#0ea5e9';
  const ringGlow = isAmber ? 'rgba(255, 85, 0, 0.35)' : 'rgba(14, 165, 233, 0.35)';

  const micKilledInListen = !hardwareState.micEnabled && hardwareState.lvglMode === 'listening';
  const hidBlockedInTyping = !hardwareState.hidConnected && hardwareState.lvglMode === 'hid';

  const progressRatio =
    micKilledInListen || hidBlockedInTyping ? 0.08 : telemetry.gpuLoadPct / 100;

  const setMode = (lvglMode: LvglMode) => {
    playDetentClick(soundEnabled, 1040);
    setPulseSeq((s) => s + 1);
    onChange({ ...hardwareState, lvglMode });
  };

  const setAccent = (ringAccent: RingAccent) => {
    playDetentClick(soundEnabled, ringAccent === 'amber' ? 1120 : 940);
    onChange({ ...hardwareState, ringAccent });
  };

  const triggerWakeWordTest = () => {
    if (wakeTimerRef.current !== null) window.clearTimeout(wakeTimerRef.current);

    if (!hardwareState.micEnabled) {
      playSwitchSnap(soundEnabled, false);
      setWakeTestStatus('blocked');
      setPulseSeq((s) => s + 1);
      return;
    }

    playWakeChime(soundEnabled);
    setPulseSeq((s) => s + 1);
    setWakeTestStatus('capturing');
    onChange({ ...hardwareState, lvglMode: 'listening' });

    wakeTimerRef.current = window.setTimeout(() => {
      playWakeChimeReverse(soundEnabled);
      onChange({ ...hardwareState, lvglMode: 'inference' });
      setWakeTestStatus('answered');
    }, 1100);
  };

  const waveformBars = [0.35, 0.72, 0.95, 0.55, 0.88, 0.42, 0.78, 0.92, 0.5, 0.68, 0.36];

  return (
    <section id="privacy-twin" className="scroll-mt-20 py-12 sm:py-16">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0.92, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.02 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
        >
          <div>
            <div className="text-xs font-medium text-zinc-500">01. Interactive Hardware Twin</div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl text-balance">
              Test the physical switches &amp; circular LVGL interface
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-zinc-600">
            Privacy on AEVORA is physical. Flip the SPST microphone cutoff, slide the DPDT host data bridge, drag the bezel, or tap the 2.4-inch IPS glass to interact directly.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0.92, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.02 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 gap-6 sm:gap-8 rounded-3xl bg-white p-3.5 sm:p-10 border border-zinc-900/8 lg:grid-cols-12 lg:items-center"
        >
          {/* Left: Top-Down Interactive 2.4" Circular IPS + Machined Aluminum Bezel with Ambient Bloom & Pan Scrub */}
          <div
            onPointerMove={handleDialPointerMove}
            onPointerLeave={handleDialPointerLeave}
            className="relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#eae8e1] px-4 py-7 sm:p-10 lg:col-span-6"
          >
            {/* Dynamic Ambient Optical Bloom Aura behind the Machined Dial */}
            <motion.div
              aria-hidden="true"
              animate={{
                opacity: ambientBloom.opacity,
                scale: ambientBloom.scale,
              }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: `radial-gradient(circle, ${ambientBloom.color} 0%, transparent 66%)`,
              }}
              className="pointer-events-none absolute h-[300px] w-[300px] sm:h-[390px] sm:w-[390px] rounded-full blur-2xl"
            />

            <motion.div
              data-testid="lvgl-hardware-dial"
              style={
                isDesktopInteractive
                  ? {
                      perspective: 900,
                      rotateX: dialRotateX,
                      rotateY: dialRotateY,
                      touchAction: 'pan-y',
                    }
                  : { touchAction: 'pan-y' }
              }
              onPanStart={() => {
                if (!isDesktopInteractive) return;
                panAccumRef.current = 0;
              }}
              onPan={(_e, info) => {
                if (!isDesktopInteractive) return;
                panAccumRef.current += info.delta.x;
                if (Math.abs(panAccumRef.current) >= 48) {
                  const dir = panAccumRef.current > 0 ? 1 : -1;
                  panAccumRef.current = 0;
                  setWakeTestStatus('idle');
                  setMode(stepLvglMode(hardwareState.lvglMode, dir));
                }
              }}
              className={`relative z-10 flex aspect-square w-full max-w-[252px] min-[380px]:max-w-[274px] sm:max-w-[336px] items-center justify-center rounded-full bg-gradient-to-b from-[#e3e3df] via-[#c2c2bc] to-[#989891] p-[4.5%] ring-1 ring-white/55 shadow-[0_26px_52px_-14px_rgba(24,24,27,0.28),inset_0_2px_4px_rgba(255,255,255,0.8)] will-change-transform ${
                isDesktopInteractive ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
            >
              {/* Subtle CNC Machined Concentric Lathe Texture */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full opacity-35 bg-[repeating-radial-gradient(circle_at_center,rgba(255,255,255,0.14)_0px,rgba(255,255,255,0.14)_1px,transparent_1px,transparent_3px)]"
              />

              {/* Specular Light Highlight Sweeping Machined Aluminum Bezel */}
              <motion.div
                aria-hidden="true"
                style={{ background: bezelSheen }}
                className="pointer-events-none absolute inset-0 rounded-full"
              />

              {/* Optical Wake-Word Ripple Halo */}
              <AnimatePresence>
                {pulseSeq > 0 && (
                  <motion.span
                    key={pulseSeq}
                    aria-hidden="true"
                    initial={{ scale: 0.94, opacity: 0.65 }}
                    animate={{ scale: 1.12, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                    className="pointer-events-none absolute inset-0 rounded-full border-2"
                    style={{
                      borderColor: !hardwareState.micEnabled && wakeTestStatus === 'blocked' ? '#ef4444' : ringStroke,
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Front Alignment Notch Seated Flush in Outer Machined Chamfer */}
              <div
                aria-hidden="true"
                className="absolute bottom-[1.4%] left-1/2 h-[2.4%] w-[1.8%] -translate-x-1/2 rounded-xs transition-colors duration-300"
                style={{ backgroundColor: ringStroke }}
              />

              {/* Outer Diffuser Well + Refined Addressable LED Light Ring */}
              <div
                className="relative flex h-full w-full items-center justify-center rounded-full bg-[#111215] p-[3.2%] transition-all duration-300"
                style={{
                  boxShadow: `0 0 26px ${ringGlow}, inset 0 0 14px rgba(0,0,0,0.85)`,
                  border: `2.5px solid ${ringStroke}`,
                }}
              >
                {/* 2.4-Inch Circular IPS LCD Screen (Proportionally Scaled via Container Queries) */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.985 }}
                  onClick={triggerWakeWordTest}
                  aria-label="Tap 2.4-inch IPS display to trigger local wake-word test"
                  style={{ containerType: 'inline-size' }}
                  className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-full bg-[#08090c] text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {/* Subtle optical glass glare */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.08),transparent_55%)]"
                  />

                  {/* Fixed 5-Station Engraved Mode Detents on Outer Track */}
                  <svg
                    viewBox="0 0 240 240"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    aria-hidden="true"
                  >
                    <circle
                      cx="120"
                      cy="120"
                      r="112"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="1"
                      strokeDasharray="1 10.7"
                    />
                    {[0, 72, 144, 216, 288].map((deg) => (
                      <line
                        key={deg}
                        x1="120"
                        y1="5.5"
                        x2="120"
                        y2="11"
                        stroke="rgba(255,255,255,0.34)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        transform={`rotate(${deg} 120 120)`}
                      />
                    ))}
                  </svg>

                  {/* Continuous Shortest-Path Spring-Animated Rotary Mode Marker */}
                  <motion.svg
                    viewBox="0 0 240 240"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    initial={false}
                    animate={{ rotate: dialAngle }}
                    transition={{ type: 'spring', stiffness: 170, damping: 24 }}
                    aria-hidden="true"
                  >
                    <circle
                      cx="120"
                      cy="8"
                      r="3.2"
                      fill={ringStroke}
                      opacity="0.35"
                    />
                    <circle
                      cx="120"
                      cy="8"
                      r="2"
                      fill="#ffffff"
                      stroke={ringStroke}
                      strokeWidth="1.4"
                    />
                  </motion.svg>

                  {/* Delicate LVGL Telemetry Progress Hairline Arc */}
                  <svg
                    viewBox="0 0 240 240"
                    className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
                    aria-hidden="true"
                  >
                    <circle
                      cx="120"
                      cy="120"
                      r="103"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="3.5"
                    />
                    <motion.circle
                      cx="120"
                      cy="120"
                      r="103"
                      fill="none"
                      stroke={micKilledInListen || hidBlockedInTyping || wakeTestStatus === 'blocked' ? '#ef4444' : ringStroke}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 103}
                      animate={{
                        strokeDashoffset:
                          2 * Math.PI * 103 * (1 - Math.max(0.06, progressRatio)),
                      }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    />
                  </svg>

                  {/* Safe Inner Circular Content Zone (Well Clear of r=103 Progress Ring) */}
                  <div className="relative z-10 flex w-[68cqi] flex-col items-center text-center">
                    <span className="font-mono text-[clamp(8px,3.4cqi,10px)] tracking-[0.14em] text-zinc-400">
                      {hardwareState.cordlessMode ? 'UPS · 2S BATT' : 'USB-C · 5V/3A'}
                    </span>

                    <div className="mt-[2.2cqi] font-display text-[clamp(14px,7.2cqi,20px)] font-semibold leading-tight tracking-tight text-white">
                      {wakeTestStatus === 'blocked' && !hardwareState.micEnabled
                        ? 'Mic Open'
                        : micKilledInListen
                        ? 'Mic Cut'
                        : hidBlockedInTyping
                        ? 'USB Airgap'
                        : wakeTestStatus === 'capturing'
                        ? 'Wake Heard'
                        : LVGL_MODES.find((m) => m.id === hardwareState.lvglMode)?.label}
                    </div>

                    {/* Balanced 9-Bar Interactive Voice Waveform */}
                    <div
                      className="my-[4.5cqi] flex h-[10cqi] items-center justify-center gap-[1.3cqi]"
                      aria-label={hardwareState.micEnabled ? 'Voice waveform active' : 'Microphone physically disconnected'}
                    >
                      {waveformBars.slice(1, 10).map((bar, idx) => {
                        const activeWave =
                          hardwareState.micEnabled &&
                          (hardwareState.lvglMode === 'listening' ||
                            hardwareState.lvglMode === 'inference' ||
                            hardwareState.lvglMode === 'hid');
                        const targetHeight = activeWave ? `${Math.max(18, Math.round(bar * 95))}%` : '18%';
                        return (
                          <motion.span
                            key={idx}
                            className="w-[1.6cqi] rounded-full"
                            style={{
                              backgroundColor: !hardwareState.micEnabled
                                ? '#52525b'
                                : ringStroke,
                            }}
                            animate={{
                              height: activeWave
                                ? [targetHeight, `${Math.max(20, Math.round((1 - bar * 0.55) * 90))}%`, targetHeight]
                                : '18%',
                            }}
                            transition={
                              activeWave
                                ? {
                                    repeat: Infinity,
                                    duration: 0.9 + (idx % 3) * 0.2,
                                    ease: 'easeInOut',
                                  }
                                : { duration: 0.2 }
                            }
                          />
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-x-[4.5cqi] gap-y-[1.2cqi] font-mono text-[clamp(9px,3.9cqi,11.5px)] tabular-nums text-zinc-200">
                      <div>
                        <span className="text-zinc-500">GPU </span>
                        <span>{telemetry.gpuLoadPct}%</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">FAN </span>
                        <span>{telemetry.fanRpm}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">TPS </span>
                        <span>{telemetry.tokensPerSec > 0 ? telemetry.tokensPerSec : '0.0'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">TMP </span>
                        <span>{telemetry.chassisTempC}°C</span>
                      </div>
                    </div>

                    <div className="mt-[4cqi] flex items-center gap-[2.5cqi] font-mono text-[clamp(8px,3.4cqi,10px)]">
                      <span className={hardwareState.micEnabled ? 'text-emerald-400' : 'text-red-400'}>
                        {hardwareState.micEnabled ? 'MIC LIVE' : 'MIC CUT'}
                      </span>
                      <span className="text-zinc-600" aria-hidden="true">/</span>
                      <span className={hardwareState.hidConnected ? 'text-sky-400' : 'text-amber-400'}>
                        {hardwareState.hidConnected ? 'HID ON' : 'HID ISO'}
                      </span>
                    </div>
                  </div>
                </motion.button>
              </div>
            </motion.div>

            {/* Ring Accent, Sound Toggle & Magnetic Wake-Word Trigger */}
            <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-2.5">
              <div className="flex items-center gap-1 rounded-xl bg-white/85 p-1 border border-zinc-900/8">
                <button
                  type="button"
                  onClick={() => setAccent('amber')}
                  aria-pressed={hardwareState.ringAccent === 'amber'}
                  className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    hardwareState.ringAccent === 'amber'
                      ? 'text-white'
                      : 'text-zinc-700 hover:text-zinc-950'
                  }`}
                >
                  {hardwareState.ringAccent === 'amber' && (
                    <motion.span
                      layoutId="dial-ring-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-lg bg-zinc-900"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">Amber Ring</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccent('cobalt')}
                  aria-pressed={hardwareState.ringAccent === 'cobalt'}
                  className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    hardwareState.ringAccent === 'cobalt'
                      ? 'text-white'
                      : 'text-zinc-700 hover:text-zinc-950'
                  }`}
                >
                  {hardwareState.ringAccent === 'cobalt' && (
                    <motion.span
                      layoutId="dial-ring-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-lg bg-zinc-900"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">Neon Blue Ring</span>
                </button>
              </div>

              <MagneticButton
                type="button"
                strength={6}
                onClick={triggerWakeWordTest}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff5500] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#e54d00] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Test Wake-Word</span>
              </MagneticButton>

              <button
                type="button"
                onClick={() => {
                  const next = !soundEnabled;
                  onToggleSound();
                  if (next) playDetentClick(true, 1280);
                }}
                aria-pressed={soundEnabled}
                aria-label={soundEnabled ? 'Mute tactile switch sound' : 'Enable tactile switch sound'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-900/10 bg-white/85 text-zinc-700 hover:bg-white hover:text-zinc-950 cursor-pointer"
              >
                {soundEnabled ? (
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Mobile/Tablet Quick Hardware Toggle Bar right below the IPS ring */}
            <div
              data-testid="mobile-quick-hardware-toggles"
              className="relative z-10 mt-5 grid w-full max-w-[340px] grid-cols-2 gap-2 lg:hidden"
            >
              <button
                type="button"
                onClick={() => {
                  const next = !hardwareState.micEnabled;
                  playSwitchSnap(soundEnabled, next);
                  setWakeTestStatus('idle');
                  onChange({ ...hardwareState, micEnabled: next });
                }}
                aria-pressed={hardwareState.micEnabled}
                className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                  hardwareState.micEnabled
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-red-600 bg-red-600 text-white'
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-wide opacity-80">
                  Mic Kill
                </span>
                <span className="mt-0.5 text-xs font-semibold">
                  {hardwareState.micEnabled ? 'Active (Closed)' : 'Cut (Open)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !hardwareState.hidConnected;
                  playSwitchSnap(soundEnabled, next);
                  onChange({ ...hardwareState, hidConnected: next });
                }}
                aria-pressed={hardwareState.hidConnected}
                className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                  hardwareState.hidConnected
                    ? 'border-[#ff5500] bg-[#ff5500] text-white'
                    : 'border-zinc-900/15 bg-white text-zinc-900'
                }`}
              >
                <span className="font-mono text-[10px] uppercase tracking-wide opacity-80">
                  PC HID Bridge
                </span>
                <span className="mt-0.5 text-xs font-semibold">
                  {hardwareState.hidConnected ? 'Connected' : 'Air-Gapped'}
                </span>
              </button>
            </div>

            <p className="relative z-10 mt-3 text-center text-xs text-zinc-600">
              {wakeTestStatus !== 'idle'
                ? wakeTestStatus === 'blocked' && !hardwareState.micEnabled
                  ? 'Rejected: SPST hardware switch is open—no audio signal reaches ReSpeaker.'
                  : wakeTestStatus === 'capturing'
                  ? 'ReSpeaker captured wake-word locally in 140 ms...'
                  : 'Answered on-device via TensorRT-LLM (0 bytes sent externally).'
                : isDesktopInteractive
                ? 'Drag aluminum bezel horizontally to cycle states · Tap IPS glass for wake-word'
                : 'Tap IPS glass for wake-word · Toggle switches or swipe states below'}
            </p>
          </div>

          {/* Right: Tactile Hardware Switches & Workload Controls */}
          <div className="flex flex-col gap-6 lg:col-span-6">
            <div>
              <div className="text-xs font-semibold text-zinc-900">LVGL System State</div>
              <div
                data-testid="lvgl-state-tabs"
                className="mt-2.5 flex flex-nowrap overflow-x-auto gap-1.5 rounded-xl bg-[#f2f1ec] p-1.5 border border-zinc-900/8 lg:flex-wrap lg:overflow-visible"
              >
                {LVGL_MODES.map((mode) => {
                  const active = hardwareState.lvglMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setWakeTestStatus('idle');
                        setMode(mode.id);
                      }}
                      aria-pressed={active}
                      className={`relative rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'text-zinc-950'
                          : 'text-zinc-600 hover:text-zinc-950'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="lvgl-mode-pill"
                          transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                          className="absolute inset-0 rounded-lg bg-white shadow-sm"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-10">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {LVGL_MODES.find((m) => m.id === hardwareState.lvglMode)?.caption}
              </p>
            </div>

            <div className="divide-y divide-zinc-900/8 rounded-2xl border border-zinc-900/10 bg-[#faf9f6]">
              {/* Switch 1: SPST Microphone Kill Switch with Live Pivoting Contact Blade */}
              <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-900/8">
                    <svg viewBox="0 0 28 20" className="h-5 w-6" aria-hidden="true">
                      <line x1="2" y1="13" x2="8" y2="13" stroke="#52525b" strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="20" y1="13" x2="26" y2="13" stroke="#52525b" strokeWidth="1.8" strokeLinecap="round" />
                      <motion.line
                        x1="8"
                        y1="13"
                        x2="20"
                        y2="13"
                        initial={false}
                        animate={{
                          rotate: hardwareState.micEnabled ? 0 : -34,
                          stroke: hardwareState.micEnabled ? '#ff5500' : '#dc2626',
                        }}
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                        style={{ transformOrigin: '8px 13px' }}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      <circle cx="8" cy="13" r="2" fill={hardwareState.micEnabled ? '#18181b' : '#dc2626'} />
                      <circle cx="20" cy="13" r="2" fill={hardwareState.micEnabled ? '#18181b' : '#a1a1aa'} />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-950">
                      SPST Hardware Microphone Kill Switch
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">
                      {hardwareState.micEnabled
                        ? 'Closed PCB rail — ReSpeaker mic array powered for local capture.'
                        : 'Open circuit — microphone rail physically severed at the PCB.'}
                    </p>
                  </div>
                </div>
                <motion.button
                  type="button"
                  role="switch"
                  aria-checked={hardwareState.micEnabled}
                  aria-label="SPST Microphone Kill Switch"
                  style={{ touchAction: 'pan-y' }}
                  onPanEnd={(_e, info) => {
                    if (Math.abs(info.offset.x) > 8) {
                      panSwitchAtRef.current = performance.now();
                    }
                    if (info.offset.x > 12 && !hardwareState.micEnabled) {
                      playSwitchSnap(soundEnabled, true);
                      setWakeTestStatus('idle');
                      onChange({ ...hardwareState, micEnabled: true });
                    } else if (info.offset.x < -12 && hardwareState.micEnabled) {
                      playSwitchSnap(soundEnabled, false);
                      setWakeTestStatus('idle');
                      onChange({ ...hardwareState, micEnabled: false });
                    }
                  }}
                  onClick={() => {
                    if (performance.now() - panSwitchAtRef.current < 220) return;
                    const next = !hardwareState.micEnabled;
                    playSwitchSnap(soundEnabled, next);
                    setWakeTestStatus('idle');
                    onChange({ ...hardwareState, micEnabled: next });
                  }}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5500] ${
                    hardwareState.micEnabled ? 'bg-zinc-900' : 'bg-red-600'
                  }`}
                >
                  <motion.span
                    initial={false}
                    animate={{ x: hardwareState.micEnabled ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                    className="block h-6 w-6 rounded-full bg-white shadow-sm will-change-transform"
                  />
                </motion.button>
              </div>

              {/* Switch 2: DPDT Host Data Slide Switch with Sliding D+/D- Conductor Schematic */}
              <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-900/8">
                    <svg viewBox="0 0 28 20" className="h-5 w-6" aria-hidden="true">
                      <line x1="2" y1="6" x2="9" y2="6" stroke="#71717a" strokeWidth="1.6" strokeLinecap="round" />
                      <line x1="19" y1="6" x2="26" y2="6" stroke="#71717a" strokeWidth="1.6" strokeLinecap="round" />
                      <line x1="2" y1="14" x2="9" y2="14" stroke="#71717a" strokeWidth="1.6" strokeLinecap="round" />
                      <line x1="19" y1="14" x2="26" y2="14" stroke="#71717a" strokeWidth="1.6" strokeLinecap="round" />
                      <motion.g
                        initial={false}
                        animate={{
                          x: hardwareState.hidConnected ? 0 : -4.5,
                          opacity: hardwareState.hidConnected ? 1 : 0.45,
                        }}
                        transition={{ type: 'spring', stiffness: 460, damping: 30 }}
                      >
                        <line
                          x1="9"
                          y1="6"
                          x2="19"
                          y2="6"
                          stroke={hardwareState.hidConnected ? '#ff5500' : '#71717a'}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        <line
                          x1="9"
                          y1="14"
                          x2="19"
                          y2="14"
                          stroke={hardwareState.hidConnected ? '#ff5500' : '#71717a'}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        <line
                          x1="14"
                          y1="3.5"
                          x2="14"
                          y2="16.5"
                          stroke={hardwareState.hidConnected ? '#18181b' : '#71717a'}
                          strokeWidth="1.3"
                          strokeDasharray="2 1.5"
                        />
                      </motion.g>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-950">
                      DPDT USB Data-Routing Slide Switch
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">
                      {hardwareState.hidConnected
                        ? 'D+/D- bridged — XIAO RP2040 enumerates as native USB keyboard & mouse.'
                        : 'Air-gapped — USB D+/D- lines physically disconnected from host PC.'}
                    </p>
                  </div>
                </div>
                <motion.button
                  type="button"
                  role="switch"
                  aria-checked={hardwareState.hidConnected}
                  aria-label="DPDT USB Data Slide Switch"
                  style={{ touchAction: 'pan-y' }}
                  onPanEnd={(_e, info) => {
                    if (Math.abs(info.offset.x) > 8) {
                      panSwitchAtRef.current = performance.now();
                    }
                    if (info.offset.x > 12 && !hardwareState.hidConnected) {
                      playSwitchSnap(soundEnabled, true);
                      onChange({ ...hardwareState, hidConnected: true });
                    } else if (info.offset.x < -12 && hardwareState.hidConnected) {
                      playSwitchSnap(soundEnabled, false);
                      onChange({ ...hardwareState, hidConnected: false });
                    }
                  }}
                  onClick={() => {
                    if (performance.now() - panSwitchAtRef.current < 220) return;
                    const next = !hardwareState.hidConnected;
                    playSwitchSnap(soundEnabled, next);
                    onChange({ ...hardwareState, hidConnected: next });
                  }}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5500] ${
                    hardwareState.hidConnected ? 'bg-[#ff5500]' : 'bg-zinc-300'
                  }`}
                >
                  <motion.span
                    initial={false}
                    animate={{ x: hardwareState.hidConnected ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                    className="block h-6 w-6 rounded-full bg-white shadow-sm will-change-transform"
                  />
                </motion.button>
              </div>

              {/* Switch 3: Cordless UPS Battery Toggle with Animated Power Gauge */}
              <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-900/8">
                    <svg viewBox="0 0 28 20" className="h-5 w-6" aria-hidden="true">
                      <rect x="3" y="5" width="20" height="10" rx="2" fill="none" stroke="#18181b" strokeWidth="1.6" />
                      <rect x="23.5" y="8" width="2" height="4" rx="0.8" fill="#18181b" />
                      <motion.rect
                        x="5"
                        y="7"
                        height="6"
                        rx="1"
                        initial={false}
                        animate={{
                          width: hardwareState.cordlessMode ? 12 : 16,
                          fill: hardwareState.cordlessMode ? '#18181b' : '#10b981',
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-950">
                      Waveshare UPS HAT Cordless Operation
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">
                      {hardwareState.cordlessMode
                        ? `Cordless 5000mAh 2S pack · Est. ${telemetry.estimatedRuntimeHours} hrs at ${telemetry.powerDrawWatts}W.`
                        : 'Tethered via preserved USB-C 5V/3A port · Pass-through charging active.'}
                    </p>
                  </div>
                </div>
                <motion.button
                  type="button"
                  role="switch"
                  aria-checked={hardwareState.cordlessMode}
                  aria-label="Cordless Battery Mode"
                  style={{ touchAction: 'pan-y' }}
                  onPanEnd={(_e, info) => {
                    if (Math.abs(info.offset.x) > 8) {
                      panSwitchAtRef.current = performance.now();
                    }
                    if (info.offset.x > 12 && !hardwareState.cordlessMode) {
                      playSwitchSnap(soundEnabled, true);
                      onChange({ ...hardwareState, cordlessMode: true });
                    } else if (info.offset.x < -12 && hardwareState.cordlessMode) {
                      playSwitchSnap(soundEnabled, false);
                      onChange({ ...hardwareState, cordlessMode: false });
                    }
                  }}
                  onClick={() => {
                    if (performance.now() - panSwitchAtRef.current < 220) return;
                    const next = !hardwareState.cordlessMode;
                    playSwitchSnap(soundEnabled, next);
                    onChange({ ...hardwareState, cordlessMode: next });
                  }}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5500] ${
                    hardwareState.cordlessMode ? 'bg-zinc-900' : 'bg-zinc-300'
                  }`}
                >
                  <motion.span
                    initial={false}
                    animate={{ x: hardwareState.cordlessMode ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                    className="block h-6 w-6 rounded-full bg-white shadow-sm will-change-transform"
                  />
                </motion.button>
              </div>
            </div>

            {/* Live Hardware Bus Continuity + Single-Line Mobile-Clean Telemetry Strip */}
            <div className="rounded-2xl bg-[#f2f1ec] p-3.5 sm:p-4 border border-zinc-900/8 font-mono tabular-nums text-xs">
              <div className="grid grid-cols-3 gap-2 border-b border-zinc-900/8 pb-2.5 text-[10px] sm:text-[11px]">
                <div className="whitespace-nowrap">
                  <span className="text-zinc-500">MIC </span>
                  <span className={hardwareState.micEnabled ? 'font-semibold text-zinc-900' : 'font-semibold text-red-600'}>
                    {hardwareState.micEnabled ? 'CLOSED' : 'OPEN'}
                  </span>
                </div>
                <div className="text-center whitespace-nowrap">
                  <span className="text-zinc-500">USB </span>
                  <span className={hardwareState.hidConnected ? 'font-semibold text-[#ff5500]' : 'font-semibold text-zinc-600'}>
                    {hardwareState.hidConnected ? 'D+/D-' : 'AIRGAP'}
                  </span>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="text-zinc-500">RAIL </span>
                  <span className="font-semibold text-zinc-900">
                    {hardwareState.cordlessMode ? '2S UPS' : 'USB-C'}
                  </span>
                </div>
              </div>

              <div
                data-testid="hardware-telemetry-grid"
                className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 sm:gap-3"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <Cpu className="mt-0.5 h-3.5 w-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-zinc-500 whitespace-nowrap">Orin GPU</div>
                    <div className="font-semibold text-zinc-950 whitespace-nowrap">
                      {telemetry.gpuLoadPct}%
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 min-w-0">
                  <Fan className="mt-0.5 h-3.5 w-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-zinc-500 whitespace-nowrap">Fan</div>
                    <div className="font-semibold text-zinc-950 whitespace-nowrap">
                      {telemetry.fanRpm} RPM
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 min-w-0">
                  <Volume2 className="mt-0.5 h-3.5 w-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-zinc-500 whitespace-nowrap">Noise</div>
                    <div className="font-semibold text-zinc-950 whitespace-nowrap">
                      {telemetry.noiseFloorDba} dBA
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 min-w-0">
                  <Zap className="mt-0.5 h-3.5 w-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-zinc-500 whitespace-nowrap">Power</div>
                    <div className="font-semibold text-zinc-950 whitespace-nowrap">
                      {telemetry.powerDrawWatts}W · {telemetry.estimatedRuntimeHours}h
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
