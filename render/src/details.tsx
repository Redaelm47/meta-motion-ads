// Motion-design details layered on the bridges: lock-on brackets, an orbit around the subject,
// a callout line, ripples, a travelling rim light. Scene-space pieces live inside the camera
// transform and divide their stroke by the camera scale so lines keep the same width on screen.

import React from 'react';
import {EASE, clamp01, glide, step} from './motion';
import {LIME, WHITE} from './ui';

const draw = (k: number): React.SVGProps<SVGPathElement> => ({pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - clamp01(k)});

/** Viewfinder corners that snap onto the subject when the video pauses. */
export const Brackets: React.FC<{t: number; box: {x0: number; y0: number; x1: number; y1: number}; at: number; out: number; scale: number}> = ({t, box, at, out, scale}) => {
	const k = glide(t, at, 0.45) - glide(t, out, 0.35);
	if (k <= 0.001) return null;
	const grow = 1 + 0.18 * (1 - step(t - at, {response: 0.5, damping: 0.8}));
	const cx = (box.x0 + box.x1) / 2;
	const cy = (box.y0 + box.y1) / 2;
	const L = 48;
	const corners = [
		[box.x0, box.y0, 1, 1],
		[box.x1, box.y0, -1, 1],
		[box.x1, box.y1, -1, -1],
		[box.x0, box.y1, 1, -1],
	];
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
			<g transform={`translate(${cx} ${cy}) scale(${grow}) translate(${-cx} ${-cy})`}>
				{corners.map(([x, y, dx, dy], i) => (
					<path key={i} d={`M${x} ${y + dy * L} V${y} H${x + dx * L}`} fill="none" stroke={WHITE} strokeWidth={3 / scale} strokeLinecap="round" strokeLinejoin="round" {...draw(k)} />
				))}
			</g>
		</svg>
	);
};

type Orbit = {cx: number; cy: number; rx: number; ry: number; rot: number};
const onOrbit = (o: Orbit, a: number) => {
	const r = (o.rot * Math.PI) / 180;
	const x = o.rx * Math.cos(a);
	const y = o.ry * Math.sin(a);
	return {x: o.cx + x * Math.cos(r) - y * Math.sin(r), y: o.cy + x * Math.sin(r) + y * Math.cos(r), behind: Math.sin(a) < 0};
};

/** A thin orbit around the subject. Render the "back" half under the cutout and the "front" half over it. */
export const OrbitHalf: React.FC<{t: number; orbit: Orbit; half: 'back' | 'front'; at: number; out: number; scale: number}> = ({t, orbit, half, at, out, scale}) => {
	const k = glide(t, at, 0.8) - glide(t, out, 0.35);
	if (k <= 0.001) return null;
	const a = onOrbit(orbit, Math.PI);
	const b = onOrbit(orbit, 0);
	const d = half === 'back'
		? `M${a.x} ${a.y} A${orbit.rx} ${orbit.ry} ${orbit.rot} 0 1 ${b.x} ${b.y}`
		: `M${b.x} ${b.y} A${orbit.rx} ${orbit.ry} ${orbit.rot} 0 1 ${a.x} ${a.y}`;
	const dot = onOrbit(orbit, Math.PI * 0.75 + (t - at) * 2.4);
	const showDot = dot.behind === (half === 'back');
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
			<path d={d} fill="none" stroke={WHITE} strokeOpacity={0.85} strokeWidth={2.5 / scale} strokeLinecap="round" {...draw(k)} />
			{showDot && <circle cx={dot.x} cy={dot.y} r={(7 / scale) * clamp01(k * 2)} fill={LIME} />}
		</svg>
	);
};

/** A callout line from a point on the subject to the caption, with a dot at the subject's end. */
export const Callout: React.FC<{t: number; from: {x: number; y: number}; to: {x: number; y: number}; at: number; out: number}> = ({t, from, to, at, out}) => {
	const k = glide(t, at, 0.5);
	const o = glide(t, out, 0.3);
	if (k <= 0.001 || o >= 0.999) return null;
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
			<path d={`M${from.x} ${from.y} L${to.x} ${to.y}`} fill="none" stroke={WHITE} strokeOpacity={0.8} strokeWidth={2} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k + o} />
			<circle cx={from.x} cy={from.y} r={6 * step(t - at, {response: 0.35, damping: 0.7}) * (1 - o)} fill={LIME} />
			<circle cx={from.x} cy={from.y} r={6 + 14 * clamp01((t - at) / 0.6)} fill="none" stroke={LIME} strokeWidth={2} strokeOpacity={(1 - clamp01((t - at) / 0.6)) * (1 - o)} />
		</svg>
	);
};

/** Two rings that spread from a click. */
export const Ripple: React.FC<{t: number; at: number; x: number; y: number}> = ({t, at, x, y}) => {
	if (t < at || t > at + 0.8) return null;
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
			{[0, 0.1].map((d) => {
				const k = EASE(clamp01((t - at - d) / 0.6));
				return k > 0 && k < 1 ? <circle key={d} cx={x} cy={y} r={10 + 46 * k} fill="none" stroke={WHITE} strokeWidth={3 * (1 - k)} strokeOpacity={1 - k} /> : null;
			})}
		</svg>
	);
};

/** A highlight that travels around the edge of a rounded shape. */
export const RimLight: React.FC<{t: number; radius: number; color?: string; width?: number}> = ({t, radius, color = WHITE, width = 2}) => (
	<div
		style={{
			position: 'absolute',
			inset: 0,
			borderRadius: radius,
			padding: width,
			background: `conic-gradient(from ${t * 140}deg, transparent 0deg, ${color} 50deg, transparent 110deg, transparent 180deg, ${LIME} 230deg, transparent 290deg)`,
			WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
			WebkitMaskComposite: 'xor',
			maskComposite: 'exclude',
			pointerEvents: 'none',
		}}
	/>
);

/** A hand-drawn underline that draws itself under a word. */
export const Underline: React.FC<{t: number; at: number}> = ({t, at}) => (
	<svg viewBox="0 0 100 14" preserveAspectRatio="none" style={{position: 'absolute', left: '-2%', width: '104%', bottom: '-0.12em', height: '0.3em', overflow: 'visible'}}>
		<path d="M2 9 C 25 3, 55 12, 98 5" fill="none" stroke={LIME} strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" {...draw(glide(t, at, 0.45))} />
	</svg>
);

/** A ring riding just outside a growing or shrinking circle (the flood's edge). */
export const EdgeRing: React.FC<{x: number; y: number; r: number; k: number}> = ({x, y, r, k}) =>
	k > 0.02 && k < 0.98 ? (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
			<circle cx={x} cy={y} r={r + 18} fill="none" stroke={LIME} strokeWidth={4} strokeOpacity={Math.sin(Math.PI * k)} />
		</svg>
	) : null;
