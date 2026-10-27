// Motion-design details layered on the bridges: lock-on brackets, the subject's outline, an aura
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

/**
 * A thick white outline that goes around the subject: it starts at the top of the head, two
 * strokes run down both sides with a bright tip each and meet at the feet. Thick on purpose, it
 * covers the small errors of the cutout's edge; the warm glow stays faint. Then a short segment in
 * the ad's orange keeps running around it.
 */
// Drawn in screen space with the camera's transform on the path: an SVG filter inside the zoomed
// layer makes Chrome rasterise that whole layer at low resolution.
export const SubjectOutline: React.FC<{
	t: number;
	d: string;
	pts: number[][];
	at: number;
	out: number;
	camera: {tx: number; ty: number; s: number};
	origin: {x: number; y: number};
	grow: number;
}> = ({t, d, pts, at, out, camera, origin, grow}) => {
	const k = clamp01(glide(t, at, 1.15));
	const gone = glide(t, out, 0.35);
	if (k <= 0.001 || gone >= 0.999) return null;
	const scale = camera.s * grow;
	const u = (v: number) => v / scale;
	const half = k / 2;
	const dash = {pathLength: 1, strokeDasharray: `${half} ${Math.max(0, 1 - k)} ${half} 0`};
	const tip = (f: number) => pts[Math.min(pts.length - 1, Math.floor(((f % 1) + 1) % 1 * pts.length))];
	const tips = k > 0.01 && k < 0.995 ? [tip(half), tip(1 - half)] : [];
	const run = ((t - at - 1.15) * 0.4) % 1;
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity: 1 - gone}}>
			<defs>
				<filter id="outline-glow" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation={u(6)} />
				</filter>
			</defs>
			<g transform={`translate(${camera.tx} ${camera.ty}) scale(${camera.s}) translate(${origin.x} ${origin.y}) scale(${grow}) translate(${-origin.x} ${-origin.y})`}>
				<path d={d} fill="none" stroke={PALETTE.deep} strokeWidth={u(22)} strokeLinejoin="round" filter="url(#outline-glow)" opacity={0.35} {...dash} />
				<path d={d} fill="none" stroke={WHITE} strokeWidth={u(13)} strokeLinejoin="round" strokeLinecap="round" {...dash} />
				{tips.map(([x, y], i) => (
					<g key={i}>
						<circle cx={x} cy={y} r={u(16)} fill={PALETTE.deep} opacity={0.5} filter="url(#outline-glow)" />
						<circle cx={x} cy={y} r={u(8.5)} fill={WHITE} />
					</g>
				))}
				{k >= 0.995 && t > at + 1.15 && (
					<path d={d} fill="none" stroke={PALETTE.deep} strokeWidth={u(13)} strokeLinecap="round" pathLength={1} strokeDasharray="0.08 0.92" strokeDashoffset={-run} />
				)}
			</g>
		</svg>
	);
};

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
