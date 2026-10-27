// Non-cinema looks for the pause (being tested): comics, VHS, printed photo, neon night, minimal.
// None of them draws along the cutout's edge (that amplifies its defects).

import {loadFont} from '@remotion/google-fonts/GeistMono';
import React from 'react';
import {Img} from 'remotion';
import {PALETTE} from './details';
import {EASE, clamp01, glide} from './motion';
import {WHITE, fontFamily} from './ui';

const {fontFamily: mono} = loadFont('normal', {weights: ['500', '700'], subsets: ['latin']});

// ---------------------------------------------------------------- comics

/** Printed dots over the whole frame. */
export const Halftone: React.FC<{k: number}> = ({k}) =>
	k > 0.001 ? (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				opacity: 0.22 * k,
				mixBlendMode: 'multiply',
				backgroundImage: 'radial-gradient(circle at 50% 50%, #000 0 2.2px, transparent 2.6px)',
				backgroundSize: '9px 9px',
			}}
		/>
	) : null;

/** Speed lines converging on the subject, kept well outside its silhouette (scene coordinates). */
export const SpeedLines: React.FC<{t: number; k: number; cx: number; cy: number; inner: number; scale: number}> = ({t, k, cx, cy, inner, scale}) => {
	if (k <= 0.001) return null;
	const lines = Array.from({length: 46}, (_, i) => {
		const a = (i / 46) * Math.PI * 2 + 0.07 * Math.sin(i * 12.9);
		const jitter = 0.5 + 0.5 * Math.sin(i * 7.3 + Math.floor(t * 12) * 1.7);
		const r0 = inner + 40 * jitter;
		const r1 = r0 + (220 + 260 * Math.abs(Math.sin(i * 3.1))) * k;
		return {a, r0, r1, w: (2 + 3 * Math.abs(Math.sin(i * 5.7))) / scale};
	});
	return (
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
			{lines.map(({a, r0, r1, w}, i) => (
				<line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1} stroke={WHITE} strokeOpacity={0.75} strokeWidth={w} strokeLinecap="round" />
			))}
		</svg>
	);
};

/** A comic burst with a word in it, popping in. */
export const Burst: React.FC<{t: number; at: number; out: number; x: number; y: number; word: string}> = ({t, at, out, x, y, word}) => {
	const pop = clamp01(glide(t, at, 0.25)) * (1 - glide(t, out, 0.25));
	if (pop <= 0.001) return null;
	const pts = Array.from({length: 24}, (_, i) => {
		const a = (i / 24) * Math.PI * 2;
		const r = i % 2 ? 120 : 165 + 14 * Math.sin(i * 3.3);
		return `${Math.cos(a) * r},${Math.sin(a) * r * 0.72}`;
	}).join(' ');
	const wobble = Math.sin(t * 9) * 2;
	return (
		<div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${pop}) rotate(${-8 + wobble}deg)`}}>
			<svg width={360} height={280} viewBox="-180 -140 360 280" style={{display: 'block'}}>
				<polygon points={pts} fill={PALETTE.orange} stroke="#1a1a1a" strokeWidth={6} strokeLinejoin="round" />
			</svg>
			<div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontWeight: 800, fontStyle: 'italic', fontSize: 64, letterSpacing: '-0.02em', color: WHITE, WebkitTextStroke: '3px #1a1a1a', paintOrder: 'stroke'}}>
				{word}
			</div>
		</div>
	);
};

// ---------------------------------------------------------------- VHS

export const Scanlines: React.FC<{k: number}> = ({k}) =>
	k > 0.001 ? <div style={{position: 'absolute', inset: 0, opacity: 0.16 * k, backgroundImage: 'repeating-linear-gradient(0deg, #000 0 2px, transparent 2px 5px)'}} /> : null;

/** Tape glitch when it pauses: colour channels split, a tracking band rolls, the picture jumps. */
export const TapeGlitch: React.FC<{t: number; at: number; src: string}> = ({t, at, src}) => {
	const x = t - at;
	if (x < 0 || x > 0.45) return null;
	const k = 1 - EASE(clamp01(x / 0.45));
	const off = 14 * k * (Math.sin(t * 90) > 0 ? 1 : -1);
	const band = ((x / 0.45) * 1.3 - 0.15) * 1080;
	return (
		<>
			<Img src={src} style={{position: 'absolute', left: off, top: 0, width: 1920, height: 1080, mixBlendMode: 'screen', opacity: 0.5 * k, filter: 'sepia(1) saturate(6) hue-rotate(-50deg)'}} />
			<Img src={src} style={{position: 'absolute', left: -off, top: 0, width: 1920, height: 1080, mixBlendMode: 'screen', opacity: 0.5 * k, filter: 'sepia(1) saturate(6) hue-rotate(160deg)'}} />
			<div style={{position: 'absolute', left: 0, right: 0, top: band, height: 60, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.35), transparent)', opacity: k}} />
		</>
	);
};

/** On-screen display of a VCR: PAUSE and a tape counter. */
export const VhsOsd: React.FC<{t: number; k: number; counter: string}> = ({t, k, counter}) =>
	k > 0.001 ? (
		<div style={{position: 'absolute', inset: 0, fontFamily: mono, fontWeight: 700, color: WHITE, textShadow: '3px 3px 0 rgba(0,0,0,0.55)', opacity: k}}>
			<div style={{position: 'absolute', left: 90, top: 120, fontSize: 52, letterSpacing: '0.06em', opacity: Math.floor(t * 2) % 2 === 0 ? 1 : 0.85}}>
				PAUSE <span style={{letterSpacing: 0}}>❚❚</span>
			</div>
			<div style={{position: 'absolute', right: 90, top: 128, fontSize: 40, letterSpacing: '0.06em'}}>SP</div>
			<div style={{position: 'absolute', left: 90, bottom: 150, fontSize: 40, letterSpacing: '0.08em'}}>{counter}</div>
		</div>
	) : null;

// ---------------------------------------------------------------- neon night

/** Night blue over the background (rendered under the subject, so he keeps his colours). */
export const NightTint: React.FC<{k: number}> = ({k}) =>
	k > 0.001 ? <div style={{position: 'absolute', inset: 0, background: `rgba(14,20,64,${0.55 * k})`, mixBlendMode: 'multiply'}} /> : null;

/** Neon glow for a caption pill: orange tube, flickering on. */
export const neonGlow = (t: number, at: number): React.CSSProperties => {
	const x = t - at;
	const on = x < 0 ? 0 : x < 0.05 ? 0.3 : x < 0.1 ? 1 : x < 0.14 ? 0.4 : 1;
	return {
		boxShadow: `0 0 ${10 * on}px ${PALETTE.deep}, 0 0 ${28 * on}px ${PALETTE.orange}, 0 0 ${60 * on}px rgba(239,138,85,${0.6 * on}), inset 0 0 ${14 * on}px rgba(248,166,112,${0.6 * on})`,
		border: `2.5px solid rgba(255,214,180,${0.4 + 0.6 * on})`,
	};
};
