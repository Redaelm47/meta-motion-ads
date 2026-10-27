// Motion-design details layered on the bridges: lock-on brackets, an aura
// in the ad's own colours, ripples, a travelling rim light. Scene-space pieces live inside the camera
// transform and divide their stroke by the camera scale so lines keep the same width on screen.

import React from 'react';
import {EASE, clamp01, glide, step} from './motion';
import {WHITE} from './ui';

// The incoming ad's palette (sampled from its gradient scene), so our bridge already looks like it.
export const PALETTE = {cream: '#fcf9f6', orange: '#f8a670', peach: '#f3bb90', rose: '#e4b7ac', lilac: '#d7c7c9', ink: '#343434', deep: '#ef8a55'};

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
export const RimLight: React.FC<{t: number; radius: number; colors?: [string, string]; width?: number}> = ({t, radius, colors = [PALETTE.peach, PALETTE.lilac], width = 2}) => (
	<div
		style={{
			position: 'absolute',
			inset: 0,
			borderRadius: radius,
			padding: width,
			background: `conic-gradient(from ${t * 140}deg, transparent 0deg, ${colors[0]} 50deg, transparent 110deg, transparent 180deg, ${colors[1]} 230deg, transparent 290deg)`,
			WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
			WebkitMaskComposite: 'xor',
			maskComposite: 'exclude',
			pointerEvents: 'none',
		}}
	/>
);

/** A hand-drawn underline that draws itself under a word. */
export const Underline: React.FC<{t: number; at: number; color?: string}> = ({t, at, color = PALETTE.orange}) => (
	<svg viewBox="0 0 100 14" preserveAspectRatio="none" style={{position: 'absolute', left: '-2%', width: '104%', bottom: '-0.12em', height: '0.3em', overflow: 'visible'}}>
		<path d="M2 9 C 25 3, 55 12, 98 5" fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" {...draw(glide(t, at, 0.45))} />
	</svg>
);

/** A ring riding just outside a growing or shrinking circle (the flood's edge). */
export const EdgeRing: React.FC<{x: number; y: number; r: number; k: number; color?: string}> = ({x, y, r, k, color = PALETTE.orange}) =>
	k > 0.02 && k < 0.98 ? (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
			<circle cx={x} cy={y} r={r + 18} fill="none" stroke={color} strokeWidth={4} strokeOpacity={Math.sin(Math.PI * k)} />
		</svg>
	) : null;

/** The ad's moving gradient (orange, peach, lilac), tinting a glass shape from the inside. */
export const Aura: React.FC<{t: number; k: number}> = ({t, k}) => {
	if (k <= 0.001) return null;
	const p = (ph: number, ax: number) => 50 + ax * Math.sin(t * 0.9 + ph);
	return (
		<div
			style={{
				position: 'absolute',
				inset: '-20%',
				opacity: k,
				filter: 'blur(16px)',
				background: [
					`radial-gradient(circle at ${p(0, 30)}% ${p(1.3, 25)}%, ${PALETTE.deep} 0%, transparent 42%)`,
					`radial-gradient(circle at ${p(2.1, 35)}% ${p(0.4, 30)}%, ${PALETTE.lilac} 0%, transparent 50%)`,
					`radial-gradient(circle at ${p(4.0, 25)}% ${p(2.7, 20)}%, ${PALETTE.peach} 0%, transparent 48%)`,
				].join(', '),
			}}
		/>
	);
};

// ---------------------------------------------------------------- variant pieces (cinema, bubbles)

/** Darkened edges that close in while the frame is frozen. */
export const Vignette: React.FC<{k: number; strength?: number}> = ({k, strength = 0.55}) =>
	k > 0.001 ? <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 45% 50%, transparent 45%, rgba(0,0,0,${strength * k}) 100%)`}} /> : null;

/** Cinema bars sliding in from the top and bottom. */
export const Letterbox: React.FC<{k: number; size?: number}> = ({k, size = 110}) =>
	k > 0.001 ? (
		<>
			<div style={{position: 'absolute', left: 0, right: 0, top: 0, height: size * k, background: '#000'}} />
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: size * k, background: '#000'}} />
		</>
	) : null;

/** Soft out-of-focus discs in the ad's colours, drifting slowly up, kept away from the subject. */
const BOKEH = [
	[1240, 640, 70, PALETTE.orange],
	[1460, 520, 46, PALETTE.lilac],
	[1660, 760, 90, PALETTE.peach],
	[1780, 420, 38, PALETTE.orange],
	[1320, 880, 54, PALETTE.lilac],
	[1560, 960, 34, PALETTE.peach],
	[140, 300, 60, PALETTE.peach],
	[230, 860, 80, PALETTE.orange],
	[90, 620, 40, PALETTE.lilac],
] as const;
export const Bokeh: React.FC<{t: number; k: number}> = ({t, k}) =>
	k > 0.001 ? (
		<>
			{BOKEH.map(([x, y, r, c], i) => {
				const rise = (t * (14 + i * 3)) % 200;
				const pop = clamp01(k * 1.4 - i * 0.05);
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: x - r + 10 * Math.sin(t * 0.8 + i),
							top: y - r - rise,
							width: 2 * r,
							height: 2 * r,
							borderRadius: r,
							background: `radial-gradient(circle at 35% 35%, ${WHITE}, ${c} 55%, transparent 72%)`,
							opacity: 0.55 * pop,
							transform: `scale(${pop})`,
							filter: 'blur(5px)',
						}}
					/>
				);
			})}
		</>
	) : null;
