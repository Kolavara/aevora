import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  Keyboard,
  Play,
  RotateCcw,
  Smartphone,
  Terminal,
} from 'lucide-react';
import { AUTOMATION_SCENARIOS, type AutomationScenario } from '../data/hardwareLayers';
import {
  evaluateExecutionReadiness,
  synthesizeCustomHidPlan,
  type HardwareState,
  type TargetOs,
} from '../utils/aevoraEngine';
import { playDetentClick, playSwitchSnap } from '../utils/tactileAudio';
import { MagneticButton } from './MagneticButton';

interface AutomationWorkbenchProps {
  hardwareState: HardwareState;
  soundEnabled: boolean;
  onPatchHardware: (patch: Partial<HardwareState>) => void;
}

const CUSTOM_SCENARIO_ID = 'custom-command';

const TARGET_OS_OPTIONS: Array<{ id: TargetOs; label: string }> = [
  { id: 'macos', label: 'macOS' },
  { id: 'windows', label: 'Windows' },
  { id: 'linux', label: 'Linux' },
  { id: 'android', label: 'Android' },
];

export const AutomationWorkbench: React.FC<AutomationWorkbenchProps> = ({
  hardwareState,
  soundEnabled,
  onPatchHardware,
}) => {
  const [scenarioId, setScenarioId] = useState<string>(AUTOMATION_SCENARIOS[0].id);
  const [customPrompt, setCustomPrompt] = useState<string>(
    'Open terminal, run unit tests, and copy the summary'
  );
  const [targetOs, setTargetOs] = useState<TargetOs>('macos');
  const [activeStepIdx, setActiveStepIdx] = useState<number>(-1);
  const [completed, setCompleted] = useState<boolean>(false);
  const [blockedError, setBlockedError] = useState<string | null>(null);
  const [typedLength, setTypedLength] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  const isCustom = scenarioId === CUSTOM_SCENARIO_ID;

  const customPlan = useMemo(
    () => synthesizeCustomHidPlan(customPrompt, targetOs),
    [customPrompt, targetOs]
  );

  const activeWorkflow = useMemo(() => {
    if (isCustom) {
      return {
        id: CUSTOM_SCENARIO_ID,
        title: `Custom Local Command · ${customPlan.targetLabel}`,
        target: customPlan.targetLabel,
        requiresMic: customPlan.requiresMic,
        requiresHid: customPlan.requiresHid,
        triggerPhrase: customPlan.triggerPhrase,
        hidTranscript: customPlan.hidTranscript,
        steps: customPlan.steps,
      };
    }
    const found: AutomationScenario =
      AUTOMATION_SCENARIOS.find((s) => s.id === scenarioId) ?? AUTOMATION_SCENARIOS[0];
    return found;
  }, [isCustom, customPlan, scenarioId]);

  const clearTimers = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Stream HID output characters live when reaching stage 3 (XIAO RP2040 HID)
  const shouldStream = completed || activeStepIdx >= 2;
  useEffect(() => {
    if (!shouldStream) {
      setTypedLength(0);
      return;
    }
    if (completed) {
      setTypedLength(activeWorkflow.hidTranscript.length);
      return;
    }
    setTypedLength(0);
    const interval = window.setInterval(() => {
      setTypedLength((prev) => {
        if (prev >= activeWorkflow.hidTranscript.length) {
          window.clearInterval(interval);
          return prev;
        }
        return prev + 2;
      });
    }, 24);
    return () => window.clearInterval(interval);
  }, [shouldStream, completed, activeWorkflow.hidTranscript]);

  // Immediately enforce physical switches if flipped while running
  useEffect(() => {
    if (activeStepIdx >= 0 && !completed) {
      const readiness = evaluateExecutionReadiness(hardwareState, {
        requiresMic: activeWorkflow.requiresMic,
        requiresHid: activeWorkflow.requiresHid,
      });
      if (!readiness.allowed) {
        clearTimers();
        setActiveStepIdx(-1);
        setBlockedError(readiness.blockedReason);
      }
    }
  }, [
    hardwareState,
    activeStepIdx,
    completed,
    activeWorkflow.requiresMic,
    activeWorkflow.requiresHid,
  ]);

  const selectScenario = (id: string) => {
    playDetentClick(soundEnabled, 1020);
    clearTimers();
    setScenarioId(id);
    setActiveStepIdx(-1);
    setCompleted(false);
    setBlockedError(null);
  };

  const runScenario = () => {
    clearTimers();
    setCompleted(false);
    setBlockedError(null);

    const readiness = evaluateExecutionReadiness(hardwareState, {
      requiresMic: activeWorkflow.requiresMic,
      requiresHid: activeWorkflow.requiresHid,
    });

    if (!readiness.allowed) {
      playSwitchSnap(soundEnabled, false);
      setActiveStepIdx(-1);
      setBlockedError(readiness.blockedReason);
      return;
    }

    playDetentClick(soundEnabled, 1240);
    let step = 0;

    const syncLvglForStep = (stepIndex: number) => {
      if (stepIndex === 0) {
        onPatchHardware({ lvglMode: activeWorkflow.requiresMic ? 'listening' : 'inference' });
      } else if (stepIndex === 1) {
        onPatchHardware({ lvglMode: 'inference' });
      } else if (stepIndex === 2) {
        onPatchHardware({ lvglMode: activeWorkflow.requiresHid ? 'hid' : 'inference' });
      } else {
        onPatchHardware({ lvglMode: 'inference' });
      }
    };

    const advance = () => {
      setActiveStepIdx(step);
      syncLvglForStep(step);
      if (step < activeWorkflow.steps.length - 1) {
        const delay = activeWorkflow.steps[step].durationMs;
        step += 1;
        timerRef.current = window.setTimeout(advance, delay);
      } else {
        timerRef.current = window.setTimeout(() => {
          playDetentClick(soundEnabled, 1380);
          setCompleted(true);
        }, activeWorkflow.steps[step].durationMs);
      }
    };

    advance();
  };

  const resetScenario = () => {
    playDetentClick(soundEnabled, 880);
    clearTimers();
    setActiveStepIdx(-1);
    setCompleted(false);
    setBlockedError(null);
  };

  const isRunning = activeStepIdx >= 0 && !completed;
  const showHidOutput = completed || activeStepIdx >= 2;
  const progressRatio = completed
    ? 1
    : activeStepIdx >= 0
    ? (activeStepIdx + 1) / activeWorkflow.steps.length
    : 0;

  return (
    <section id="automation" className="scroll-mt-20 py-12 sm:py-16">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0.92, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.02 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
        >
          <div>
            <div className="text-xs font-medium text-zinc-500">03. Local Agentic Orchestration</div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl text-balance">
              Autonomous PC &amp; Android execution with zero host software
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-zinc-600">
            Ubuntu 22.04 and an asynchronous FastAPI loop coordinate TensorRT-LLM with the XIAO RP2040, enumerating as a native USB keyboard and mouse—while obeying your physical hardware switches.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0.92, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.02 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 gap-6 sm:gap-8 rounded-3xl bg-[#18181b] p-4 sm:p-10 text-white lg:grid-cols-12"
        >
          {/* Scenario Selector + Custom Command Composer */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            <div className="space-y-2.5">
              <div className="text-xs font-medium text-zinc-400">Select Local Workflow</div>
              {AUTOMATION_SCENARIOS.map((item) => {
                const active = item.id === scenarioId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectScenario(item.id)}
                    aria-pressed={active}
                    className={`w-full rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[#ff5500] bg-zinc-900'
                        : 'border-white/10 bg-white/4 hover:bg-white/8'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white">{item.title}</span>
                      {item.target.includes('Android') ? (
                        <Smartphone className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
                      ) : (
                        <Terminal className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span>{item.target}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.requiresMic ? 'Voice Trigger' : 'Scheduled Loop'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.requiresHid ? 'USB HID Active' : 'Local Peer'}</span>
                    </div>
                  </button>
                );
              })}

              {/* 4th Option: Interactive Custom Command Synthesizer */}
              <button
                type="button"
                onClick={() => selectScenario(CUSTOM_SCENARIO_ID)}
                aria-pressed={isCustom}
                className={`w-full rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                  isCustom
                    ? 'border-[#ff5500] bg-zinc-900'
                    : 'border-white/10 bg-white/4 hover:bg-white/8'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-white">Custom Local Command</span>
                  <Keyboard className="h-4 w-4 text-[#ff7a33] shrink-0" aria-hidden="true" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span>Type your own prompt</span>
                  <span aria-hidden="true">·</span>
                  <span>Live RP2040 HID keycode synthesis</span>
                </div>
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              {isCustom ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="custom-hid-prompt" className="text-xs font-medium text-zinc-300">
                      Target OS &amp; Spoken Command
                    </label>
                    <div className="flex items-center gap-1 rounded-lg bg-white/6 p-0.5 border border-white/10">
                      {TARGET_OS_OPTIONS.map((opt) => {
                        const activeOs = targetOs === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              playDetentClick(soundEnabled, 1080);
                              setTargetOs(opt.id);
                              setActiveStepIdx(-1);
                              setCompleted(false);
                              setBlockedError(null);
                            }}
                            aria-pressed={activeOs}
                            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                              activeOs
                                ? 'bg-white text-zinc-950'
                                : 'text-zinc-300 hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <input
                    id="custom-hid-prompt"
                    type="text"
                    value={customPrompt}
                    onChange={(e) => {
                      setCustomPrompt(e.target.value);
                      if (completed || activeStepIdx >= 0) {
                        clearTimers();
                        setActiveStepIdx(-1);
                        setCompleted(false);
                      }
                    }}
                    placeholder="e.g. Build Docker image and paste logs into Slack"
                    className="w-full rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 font-mono text-xs text-white placeholder:text-zinc-500 focus:border-[#ff5500] focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  <div className="text-xs font-medium text-zinc-400">Trigger Input</div>
                  <p className="mt-1.5 font-mono text-xs leading-relaxed text-zinc-200">
                    {activeWorkflow.triggerPhrase}
                  </p>
                </>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <MagneticButton
                  type="button"
                  strength={6}
                  onClick={runScenario}
                  disabled={isRunning}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#ff5500] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#e54d00] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isRunning ? 'Running Local Loop...' : 'Run Local Loop'}</span>
                </MagneticButton>

                <button
                  type="button"
                  onClick={resetScenario}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/6 px-3.5 py-2.5 text-xs font-medium text-zinc-200 hover:bg-white/12 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pipeline Trace + Live HID Output Column */}
          <div className="flex flex-col justify-between gap-5 rounded-2xl border border-white/10 bg-zinc-950/70 p-5 sm:p-7 lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
                <div>
                  <div className="text-xs text-zinc-400">FastAPI + TensorRT-LLM Execution Trace</div>
                  <div className="mt-0.5 text-sm font-semibold text-white">{activeWorkflow.title}</div>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !hardwareState.micEnabled;
                      playSwitchSnap(soundEnabled, next);
                      onPatchHardware({ micEnabled: next });
                      if (next) setBlockedError(null);
                    }}
                    aria-pressed={hardwareState.micEnabled}
                    className={`rounded-lg border px-2.5 py-1 transition-colors whitespace-nowrap cursor-pointer ${
                      hardwareState.micEnabled
                        ? 'border-emerald-500/30 bg-emerald-950/35 text-emerald-400 hover:bg-emerald-950/55'
                        : 'border-red-500/35 bg-red-950/45 text-red-400 hover:bg-red-950/65'
                    }`}
                  >
                    SPST {hardwareState.micEnabled ? 'CLOSED' : 'OPEN'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !hardwareState.hidConnected;
                      playSwitchSnap(soundEnabled, next);
                      onPatchHardware({ hidConnected: next });
                      if (next) setBlockedError(null);
                    }}
                    aria-pressed={hardwareState.hidConnected}
                    className={`rounded-lg border px-2.5 py-1 transition-colors whitespace-nowrap cursor-pointer ${
                      hardwareState.hidConnected
                        ? 'border-sky-500/30 bg-sky-950/35 text-sky-400 hover:bg-sky-950/55'
                        : 'border-amber-500/35 bg-amber-950/45 text-amber-400 hover:bg-amber-950/65'
                    }`}
                  >
                    DPDT {hardwareState.hidConnected ? 'HOST' : 'ISOLATED'}
                  </button>
                </div>
              </div>

              {/* Execution Pipeline Progress Bar */}
              <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  animate={{ scaleX: progressRatio }}
                  transition={{ type: 'spring', stiffness: 180, damping: 24 }}
                  className="h-full w-full origin-left bg-[#ff5500]"
                />
              </div>
            </div>

            {blockedError && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/35 bg-red-950/45 p-4 text-sm text-red-100"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400 shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <div className="font-semibold text-white">Blocked by Physical Hardware Switch</div>
                    <p className="mt-1 text-xs leading-relaxed text-red-200">{blockedError}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeWorkflow.requiresMic && !hardwareState.micEnabled && (
                        <button
                          type="button"
                          onClick={() => {
                            playSwitchSnap(soundEnabled, true);
                            onPatchHardware({ micEnabled: true });
                            setBlockedError(null);
                          }}
                          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 cursor-pointer"
                        >
                          Restore SPST Mic Switch
                        </button>
                      )}
                      {activeWorkflow.requiresHid && !hardwareState.hidConnected && (
                        <button
                          type="button"
                          onClick={() => {
                            playSwitchSnap(soundEnabled, true);
                            onPatchHardware({ hidConnected: true });
                            setBlockedError(null);
                          }}
                          className="rounded-lg bg-[#ff5500] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#e54d00] cursor-pointer"
                        >
                          Slide DPDT to Host PC
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-3">
              {activeWorkflow.steps.map((step, idx) => {
                const done = completed || activeStepIdx > idx;
                const current = !completed && activeStepIdx === idx;
                return (
                  <div
                    key={step.stage}
                    className={`rounded-xl border p-4 transition-colors duration-200 ${
                      current
                        ? 'border-[#ff5500] bg-zinc-900'
                        : done
                        ? 'border-emerald-500/30 bg-emerald-950/20'
                        : 'border-white/8 bg-white/3'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs tabular-nums text-zinc-400">
                          0{idx + 1}
                        </span>
                        <span className="text-sm font-medium text-white">{step.stage}</span>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-zinc-400">
                        {done ? 'Done' : current ? 'Active' : `${step.durationMs} ms`}
                      </span>
                    </div>
                    <p className="mt-1.5 pl-7 text-xs leading-relaxed text-zinc-400">
                      {step.detail}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Simulated Host Keystroke / Peer Output Console with Real-Time Typewriter Stream */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/55 p-4 font-mono text-xs">
              <motion.div
                aria-hidden="true"
                animate={{
                  opacity: isRunning && showHidOutput ? 0.45 : completed ? 0.28 : 0,
                  scale: isRunning && showHidOutput ? 1.04 : 0.96,
                }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-none absolute -right-10 -bottom-10 h-44 w-44 rounded-full blur-2xl"
                style={{
                  background: completed
                    ? 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(255, 85, 0, 0.52) 0%, transparent 70%)',
                }}
              />
              <div className="relative z-10 text-[11px] text-zinc-500">Host Output Buffer (XIAO RP2040 HID)</div>
              <pre className="relative z-10 mt-2 whitespace-pre-wrap leading-relaxed text-zinc-200">
                {showHidOutput ? (
                  <>
                    {activeWorkflow.hidTranscript.slice(0, typedLength)}
                    {!completed && typedLength < activeWorkflow.hidTranscript.length && (
                      <span className="ml-0.5 inline-block h-3.5 w-1.5 align-middle bg-[#ff5500]" aria-hidden="true" />
                    )}
                  </>
                ) : isRunning ? (
                  'Preparing quantized action plan on Jetson Orin Nano...'
                ) : (
                  'Ready — click Run Local Loop to observe local HID execution.'
                )}
              </pre>
            </div>

            {completed && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/35 px-4 py-3 text-xs text-emerald-100"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Loop completed on Jetson Orin Nano · 0 bytes sent externally.</span>
                </div>
                <span className="font-mono tabular-nums text-emerald-300">200 OK</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
