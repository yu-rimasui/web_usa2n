import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journeyState, phase } from '../src/scroll.js';

test('camera travels through the terminal and the shell opens before passage', () => {
  const start = journeyState(0);
  const passage = journeyState(.56);
  const end = journeyState(1);
  assert.equal(start.opening, 0);
  assert.equal(passage.opening, 1);
  assert.equal(passage.screenOpacity, 0);
  assert.ok(start.camera[2] > passage.camera[2]);
  assert.ok(passage.camera[2] > end.camera[2]);
  assert.equal(end.assembly, 1);
  assert.equal(start.introOpacity, 1);
  assert.equal(end.aboutOpacity, 1);
});

test('scrolling backwards returns exactly to the same scene without accumulated state', () => {
  for (const mobile of [false, true]) {
    const forward = Array.from({ length: 101 }, (_, i) => journeyState(i / 100, mobile));
    for (let i = 100; i >= 0; i--) assert.deepEqual(journeyState(i / 100, mobile), forward[i]);
    for (const state of forward) {
      assert.ok([...state.camera, ...state.target].every(Number.isFinite));
      assert.ok(Math.hypot(...state.camera.map((value, i) => value - state.target[i])) > .5);
      assert.ok(state.introOpacity + state.aboutOpacity <= 1);
    }
  }
});

test('out-of-range progress stays at an endpoint and keyframe boundaries are continuous', () => {
  assert.deepEqual(journeyState(-1), journeyState(0));
  assert.deepEqual(journeyState(3), journeyState(1));
  assert.deepEqual(journeyState(NaN), journeyState(0));
  for (const mobile of [false, true]) {
    for (const p of [.28, .56, .76]) {
      const a = journeyState(p - .00001, mobile);
      const b = journeyState(p + .00001, mobile);
      assert.ok(Math.hypot(...a.camera.map((value, i) => value - b.camera[i])) < .001);
    }
  }
  assert.equal(phase(0, .2, .4), 0);
  assert.equal(phase(1, .2, .4), 1);
});
