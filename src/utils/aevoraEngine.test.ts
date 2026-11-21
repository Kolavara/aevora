import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBuildSummary,
  computeAmbientBloom,
  computeContinuousDialAngle,
  computeExplodedLayerPositions,
  estimateStorageCapacity,
  estimateTelemetry,
  evaluateExecutionReadiness,
  getLvglDialAngle,
  stepLvglMode,
  synthesizeCustomHidPlan,
  validateReservationForm,
  type HardwareState,
} from './aevoraEngine';

const baseState: HardwareState = {
  micEnabled: true,
  hidConnected: true,
  cordlessMode: false,
  lvglMode: 'inference',
  ringAccent: 'amber',
};

test('calculateBuildSummary computes unit and quantity totals accurately', () => {
  const summary = calculateBuildSummary({
    finish: 'charcoal',
    storage: '1tb',
    bundle: 'qwen-coder',
    quantity: 2,
  });

  // 649 base + 70 (1tb) + 20 (charcoal) = 739 * 2 = 1478
  assert.equal(summary.unitPrice, 739);
  assert.equal(summary.totalPrice, 1478);
  assert.equal(summary.storageLabel, '1 TB Samsung 970 EVO Plus NVMe');
});

test('estimateStorageCapacity computes realistic quantized LLM headroom across NVMe tiers', () => {
  const base512 = estimateStorageCapacity('512gb', 'qwen-coder');
  const max2tb = estimateStorageCapacity('2tb', 'voice-suite');

  assert.equal(base512.totalGb, 512);
  assert.ok(base512.availableGb > 400 && base512.availableGb < 512);
  assert.ok(base512.approx7bModels >= 70);

  assert.equal(max2tb.totalGb, 2000);
  assert.ok(max2tb.approx7bModels > base512.approx7bModels * 3);
  assert.match(max2tb.summaryLine, /GB free/);
});

test('estimateTelemetry enforces physical SPST mic kill, DPDT isolation, and acoustic dBA curve', () => {
  const inference = estimateTelemetry(baseState);
  assert.equal(inference.noiseFloorDba, 21.6);

  const micKilled = estimateTelemetry({
    ...baseState,
    micEnabled: false,
    lvglMode: 'listening',
  });
  assert.equal(micKilled.gpuLoadPct, 3);
  assert.equal(micKilled.powerDrawWatts, 4.4);
  assert.equal(micKilled.noiseFloorDba, 16.8);

  const hidIsolated = estimateTelemetry({
    ...baseState,
    hidConnected: false,
    lvglMode: 'hid',
  });
  assert.equal(hidIsolated.tokensPerSec, 0);
  assert.equal(hidIsolated.noiseFloorDba, 17.4);
});

test('evaluateExecutionReadiness blocks workflows when physical switches disconnect lines', () => {
  const micBlocked = evaluateExecutionReadiness(
    { ...baseState, micEnabled: false },
    { requiresMic: true, requiresHid: false }
  );
  assert.equal(micBlocked.allowed, false);
  assert.match(micBlocked.blockedReason ?? '', /SPST/);

  const hidBlocked = evaluateExecutionReadiness(
    { ...baseState, hidConnected: false },
    { requiresMic: false, requiresHid: true }
  );
  assert.equal(hidBlocked.allowed, false);
  assert.match(hidBlocked.blockedReason ?? '', /DPDT/);

  const ready = evaluateExecutionReadiness(baseState, { requiresMic: true, requiresHid: true });
  assert.equal(ready.allowed, true);
  assert.equal(ready.blockedReason, null);
});

test('synthesizeCustomHidPlan generates OS-accurate USB HID keycodes and Android peer intents', () => {
  const macPlan = synthesizeCustomHidPlan('Run pytest on checkout module', 'macos');
  assert.equal(macPlan.requiresMic, true);
  assert.equal(macPlan.requiresHid, true);
  assert.match(macPlan.hidTranscript, /HID_MOD_LGUI \+ KEY_SPACE/);
  assert.match(macPlan.hidTranscript, /Run pytest on checkout module/);
  assert.equal(macPlan.steps.length, 4);

  const winPlan = synthesizeCustomHidPlan('Format invoice sheet', 'windows');
  assert.match(winPlan.hidTranscript, /HID_MOD_LGUI \+ KEY_R/);

  const androidPlan = synthesizeCustomHidPlan('Draft reply to Alex', 'android');
  assert.equal(androidPlan.requiresHid, false);
  assert.match(androidPlan.hidTranscript, /ADB_LOCAL_BRIDGE/);
});

test('validateReservationForm rejects malformed inputs and accepts valid submissions', () => {
  const invalid = validateReservationForm({
    fullName: 'A',
    email: 'not-an-email',
    region: '',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.fullName);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.region);

  const valid = validateReservationForm({
    fullName: 'Alex Rivera',
    email: 'alex@example.com',
    region: 'North America',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('getLvglDialAngle maps each LVGL system mode to its rotary index degree', () => {
  assert.equal(getLvglDialAngle('idle'), 0);
  assert.equal(getLvglDialAngle('listening'), 72);
  assert.equal(getLvglDialAngle('inference'), 144);
  assert.equal(getLvglDialAngle('hid'), 216);
  assert.equal(getLvglDialAngle('thermal'), 288);
});

test('stepLvglMode cycles smoothly forwards and backwards with wrap-around', () => {
  assert.equal(stepLvglMode('idle', 1), 'listening');
  assert.equal(stepLvglMode('thermal', 1), 'idle');
  assert.equal(stepLvglMode('idle', -1), 'thermal');
});

test('computeAmbientBloom scales aura with workload and shifts color on hardware block', () => {
  const thermal = computeAmbientBloom({ ...baseState, lvglMode: 'thermal', ringAccent: 'cobalt' });
  assert.equal(thermal.opacity, 0.7);
  assert.match(thermal.color, /14, 165, 233/);

  const blocked = computeAmbientBloom({ ...baseState, micEnabled: false, lvglMode: 'listening' });
  assert.equal(blocked.opacity, 0.25);
  assert.match(blocked.color, /239, 68, 68/);
});

test('computeContinuousDialAngle wraps smoothly clockwise and counter-clockwise without full rewind', () => {
  assert.equal(computeContinuousDialAngle(288, 'idle'), 360);
  assert.equal(computeContinuousDialAngle(360, 'thermal'), 288);
  assert.equal(computeContinuousDialAngle(144, 'idle'), 0);
});

test('computeExplodedLayerPositions enforces 1:1 95mm stack fit and exact Noctua 40x40x10mm containment at 0% explode', () => {
  const assembled = computeExplodedLayerPositions(-0.5, null);
  assert.ok(assembled.display.yOffset > assembled.mics.yOffset);
  assert.ok(assembled.mics.yOffset > assembled.switches.yOffset);
  assert.ok(assembled.switches.yOffset > assembled.jetson.yOffset);
  assert.ok(assembled.jetson.yOffset > assembled.nvme.yOffset);
  assert.ok(assembled.nvme.yOffset > assembled.coprocessor.yOffset);
  assert.ok(assembled.coprocessor.yOffset > assembled.acoustic.yOffset);
  assert.ok(assembled.acoustic.yOffset > assembled.battery.yOffset);

  const totalHeight = assembled.display.yOffset + 0.098 - (assembled.battery.yOffset - 0.142);
  assert.ok(totalHeight >= 1.95 && totalHeight <= 2.02);

  const switchesBottom = assembled.switches.yOffset - 0.12;
  const acousticTop = assembled.acoustic.yOffset + 0.145;
  assert.ok(assembled.fan.yOffset + 0.418 <= switchesBottom);
  assert.ok(assembled.fan.yOffset - 0.418 >= acousticTop);

  const fanRadial = Math.hypot(assembled.fan.xOffset, assembled.fan.zOffset);
  const outerCornerR = Math.hypot(fanRadial + 0.1045, 0.418);
  assert.ok(outerCornerR <= 1.045, `Outer corner ${outerCornerR.toFixed(4)} exceeded cylinder R=1.045`);

  [0, 0.5, 1].forEach((e) => {
    const tf = computeExplodedLayerPositions(e, null);
    const damperBottom = tf.acoustic.yOffset - 0.137;
    const acousticBottom = tf.acoustic.yOffset - 0.145;
    const upsTop = tf.battery.yOffset + (0.142 + 0.32 * e) + 0.058;
    assert.ok(damperBottom > upsTop && acousticBottom > upsTop, `Collision at explode=${e}`);
  });

  const exploded = computeExplodedLayerPositions(1.5, 'fan');
  assert.ok(exploded.display.yOffset > assembled.display.yOffset);
  assert.ok(Math.hypot(exploded.fan.xOffset, exploded.fan.zOffset) > fanRadial);
  assert.ok(exploded.fan.selectedLift > 0);
  assert.ok(exploded.coprocessor.xOffset < 0);
});
