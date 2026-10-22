const clamp = value => Math.min(1, Math.max(0, value));
export const phase = (progress, start, end) => {
  const value = clamp((progress - start) / (end - start));
  return value * value * (3 - 2 * value);
};

function interpolate(stops, progress) {
  const index = stops.findIndex(stop => progress <= stop[0]);
  if (index <= 0) return stops[index < 0 ? stops.length - 1 : 0][1];
  const [start, from] = stops[index - 1];
  const [end, to] = stops[index];
  const t = phase(progress, start, end);
  return from.map((value, i) => value + (to[i] - value) * t);
}

export function journeyState(progress, mobile = false) {
  const p = clamp(Number.isFinite(progress) ? progress : 0);
  const camera = interpolate(mobile ? [
    [0, [7.5, 5.8, 16.8]], [.28, [3.4, 2.8, 9]],
    [.56, [1.5, 1.1, 1.7]], [.76, [2, 2.4, -2.6]], [1, [8.2, 6.2, -.4]]
  ] : [
    [0, [7.6, 4.7, 12.7]], [.28, [3.4, 2.2, 8]],
    [.56, [1.5, 1.1, 1.7]], [.76, [2, 2.4, -2.6]], [1, [8.9, 5.7, 0]]
  ], p);
  const target = interpolate([
    [0, mobile ? [1.3, 2.1, 0] : [-1.1, .35, 0]],
    [.28, [1.5, .45, -.5]], [.56, [1.5, .4, -7]],
    [.76, [1.5, .3, -10]], [1, mobile ? [1.2, 3.2, -10] : [-1.1, .4, -10]]
  ], p);
  return {
    progress: p, camera, target,
    opening: phase(p, .16, .43),
    screenOpacity: 1 - phase(p, .3, .47),
    assembly: phase(p, .46, .81),
    introOpacity: 1 - phase(p, .06, .23),
    aboutOpacity: phase(p, .79, .93),
    passageOpacity: phase(p, .26, .37) * (1 - phase(p, .46, .57)),
    chapter: p >= .72 ? 1 : 0
  };
}
