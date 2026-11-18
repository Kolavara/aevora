import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBuildSummary,
  computeAmbientBloom,
  computeContinuousDialAngle,
  computeExplodedLayerPositions,
  computeInspectionFocus,
  estimateTelemetry,
  evaluateExecutionReadiness,
  getLvglDialAngle,
  stepLvglMode,
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

test('estimateTelemetry enforces physical SPST mic kill and DPDT isolation states', () => {
  const micKilled = estimateTelemetry({
    ...baseState,
    micEnabled: false,
    lvglMode: 'listening',
  });
  assert.equal(micKilled.gpuLoadPct, 3);
  assert.equal(micKilled.powerDrawWatts, 4.4);

  const hidIsolated = estimateTelemetry({
    ...baseState,
    hidConnected: false,
    lvglMode: 'hid',
  });
  assert.equal(hidIsolated.tokensPerSec, 0);
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
    fullName: 'Aryan Gurudath',
    email: 'aryan@example.com',
    region: 'North America',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('computeInspectionFocus clamps pan translations safely when zoomed', () => {
  assert.deepEqual(computeInspectionFocus(41, 48, false), {
    scale: 1,
    translateXPct: 0,
    translateYPct: 0,
  });

  const topPin = computeInspectionFocus(10, 5, true);
  assert.equal(topPin.scale, 1.42);
  assert.equal(topPin.translateXPct, 14);
  assert.equal(topPin.translateYPct, 18);

  const bottomPin = computeInspectionFocus(85, 92, true);
  assert.equal(bottomPin.translateXPct, -14);
  assert.equal(bottomPin.translateYPct, -18);
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
  // Thermal (288 deg) -> Standby (0 mod 360) steps +72 deg clockwise to 360, not -288 deg
  assert.equal(computeContinuousDialAngle(288, 'idle'), 360);
  // Standby (360 deg) -> Thermal (288) steps -72 deg counter-clockwise to 288
  assert.equal(computeContinuousDialAngle(360, 'thermal'), 288);
  // Inference (144) -> Standby (0) steps -144 deg shortest arc to 0
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

  // Total 0% height: crownTop (+0.098) - baseBottom (-0.142) = 1.982 units (~94.8 mm ≈ 95 mm target)
  const totalHeight = (assembled.display.yOffset + 0.098) - (assembled.battery.yOffset - 0.142);
  assert.ok(totalHeight >= 1.95 && totalHeight <= 2.02);

  // Fan 40mm height (±0.418) must fit vertically inside open bay between switches bottom (+0.505) & acoustic top (-0.345)
  const switchesBottom = assembled.switches.yOffset - 0.12;
  const acousticTop = assembled.acoustic.yOffset + 0.145;
  assert.ok(assembled.fan.yOffset + 0.418 <= switchesBottom);
  assert.ok(assembled.fan.yOffset - 0.418 >= acousticTop);

  // Outer fan corner (radial = rFan + 0.1045, halfWidth = 0.418) must stay inside R = 1.045 cylinder
  const fanRadial = Math.hypot(assembled.fan.xOffset, assembled.fan.zOffset);
  const outerCornerR = Math.hypot(fanRadial + 0.1045, 0.418);
  assert.ok(outerCornerR <= 1.045, `Outer corner ${outerCornerR.toFixed(4)} exceeded cylinder R=1.045`);

  // Red damper & acoustic bottom must stay cleanly above Waveshare UPS HAT top across 0%, 50%, 100% explode
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




