// Every animated value is a pure function of time (seconds), so any frame can be rendered alone
// and the composition can run at any frame rate (60 fps preview, 240 fps for motion blur).

export type Spring = {response: number; damping: number}; // response: period in seconds, damping: ratio

export const SNAPPY: Spring = {response: 0.42, damping: 0.86};
export const SOFT: Spring = {response: 0.6, damping: 1};
export const LEAD: Spring = {response: 0.32, damping: 0.84};
export const TRAIL: Spring = {response: 0.5, damping: 0.92};
export const CURSOR: Spring = {response: 0.7, damping: 1};
export const QUICK: Spring = {response: 0.22, damping: 1};

/** Closed-form step response of a damped spring going from 0 to 1, started at t = 0. */
export const step = (t: number, s: Spring): number => {
	if (t <= 0) return 0;
	const w = (2 * Math.PI) / s.response;
	const z = s.damping;
	if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
	const wd = w * Math.sqrt(1 - z * z);
	return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
};

export type Key = {t: number; v: number; s?: Spring};

/** A value that retargets several times: one spring per change, summed. */
export const track = (t: number, keys: Key[], fallback: Spring = SNAPPY): number => {
	let v = keys[0].v;
	for (let i = 1; i < keys.length; i++) {
		v += (keys[i].v - keys[i - 1].v) * step(t - keys[i].t, keys[i].s ?? fallback);
	}
	return v;
};

/** 0 → 1 at `on`, back to 0 at `off`. */
export const pulse = (t: number, on: number, off: number, sIn: Spring = SNAPPY, sOut: Spring = sIn) =>
	step(t - on, sIn) - step(t - off, sOut);

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export type Box = {t: number; cx: number; cy: number; w: number; h: number; r: number; light: number};

/**
 * Edges of a morphing box. On each change the edge that moves in the direction of travel rides
 * a faster spring than the opposite edge, so the shape stretches ahead and catches up.
 */
export const morph = (t: number, boxes: Box[]) => {
	const edge = (pick: (b: Box) => number, axis: 'x' | 'y', side: -1 | 1) => {
		const keys: Key[] = boxes.map((b, i) => {
			if (i === 0) return {t: b.t, v: pick(b)};
			const prev = boxes[i - 1];
			const d = axis === 'x' ? b.cx - prev.cx : b.cy - prev.cy;
			const leads = Math.abs(d) < 1 ? null : Math.sign(d) === side;
			return {t: b.t, v: pick(b), s: leads === null ? SNAPPY : leads ? LEAD : TRAIL};
		});
		return track(t, keys);
	};
	const left = edge((b) => b.cx - b.w / 2, 'x', -1);
	const right = edge((b) => b.cx + b.w / 2, 'x', 1);
	const top = edge((b) => b.cy - b.h / 2, 'y', -1);
	const bottom = edge((b) => b.cy + b.h / 2, 'y', 1);
	const r = track(t, boxes.map((b) => ({t: b.t, v: b.r})));
	const light = track(t, boxes.map((b) => ({t: b.t, v: b.light, s: SOFT})));
	return {left, top, w: right - left, h: bottom - top, r, light};
};

/** Visibility of content that swaps inside a morphing container: enters a bit late, leaves fast. */
export const presence = (t: number, enter: number, exit = Infinity) =>
	Math.max(0, Math.min(1, step(t - enter - 0.06, SOFT) - step(t - exit, QUICK)));
