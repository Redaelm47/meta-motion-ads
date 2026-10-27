// Pieces every bridge template shares: the YouTube-like player, the ad's yellow bar, source frames
// for time remapping, small helpers.

import React from 'react';
import {Img, staticFile} from 'remotion';
import {VIDEO} from './ad';
import {lerp} from './motion';
import {AD_YELLOW, WHITE, fontFamily} from './ui';

export const W = 1920;
export const H = 1080;
export const YT_RED = '#ff0033';
export const PLAY_BTN = {x: 62, y: 1046}; // the player's play / pause button

export const mix = (a: string, b: string, k: number) => {
	const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
	const [x, y] = [p(a), p(b)];
	return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], k))).join(',')})`;
};
export const far = (x: number, y: number) => Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([a, b]) => Math.hypot(a - x, b - y))) * 1.04;
export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
// The clip stands for a longer video we are in the middle of, as a mid-roll would be.
export const SHOWN = {at: 192 - VIDEO.leadIn, length: 522};

// ---------------------------------------------------------------- video player (YouTube-like, no branding)

const Icon: React.FC<{d: string; size?: number; fill?: boolean}> = ({d, size = 30, fill = true}) => (
	<svg width={size} height={size} viewBox="0 0 24 24">
		<path d={d} fill={fill ? WHITE : 'none'} stroke={fill ? 'none' : WHITE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);
const PLAY = 'M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z';
const PAUSE = 'M6 4h4v16H6zM14 4h4v16h-4z';
const NEXT = 'M5 5.5v13l9-6.5zM16 5h2.5v14H16z';
const VOLUME = 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12';
const GEAR = 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 13.5l1.6 1.2-1.7 3-1.9-.7a7 7 0 0 1-1.6.9l-.3 2h-3.4l-.3-2a7 7 0 0 1-1.6-.9l-1.9.7-1.7-3 1.6-1.2a7 7 0 0 1 0-1.9L4.6 10.4l1.7-3 1.9.7a7 7 0 0 1 1.6-.9l.3-2h3.4l.3 2a7 7 0 0 1 1.6.9l1.9-.7 1.7 3-1.6 1.2a7 7 0 0 1 0 1.9z';
const FULL = 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5';

export const Player: React.FC<{controls: number; progress: number; paused: boolean; press: number; time: number; length: number}> = ({controls, progress, paused, press, time, length}) => (
	<>
		<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 220, background: 'linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.6))', opacity: controls}} />
		<div style={{position: 'absolute', left: 24, right: 24, bottom: 70, height: 5, background: 'rgba(255,255,255,0.3)', opacity: controls}}>
			<div style={{width: `${progress * 100}%`, height: '100%', background: YT_RED}} />
			<div style={{position: 'absolute', left: `${progress * 100}%`, top: -5, width: 15, height: 15, marginLeft: -7.5, borderRadius: 8, background: YT_RED}} />
		</div>
		<div style={{position: 'absolute', left: 0, right: 0, bottom: 14, height: 44, opacity: controls, transform: `translateY(${(1 - controls) * 10}px)`, display: 'flex', alignItems: 'center', fontFamily}}>
			<div style={{marginLeft: 46, transform: `scale(${1 - 0.15 * press})`, display: 'flex'}}>
				<Icon d={paused ? PLAY : PAUSE} size={34} />
			</div>
			<div style={{marginLeft: 26, display: 'flex'}}>
				<Icon d={NEXT} />
			</div>
			<div style={{marginLeft: 26, display: 'flex'}}>
				<Icon d={VOLUME} fill={false} />
			</div>
			<span style={{marginLeft: 24, fontSize: 22, fontWeight: 500, color: WHITE, fontVariantNumeric: 'tabular-nums'}}>
				{clock(time)} / {clock(length)}
			</span>
			<div style={{flex: 1}} />
			<div style={{marginRight: 30, display: 'flex'}}>
				<Icon d={GEAR} fill={false} />
			</div>
			<div style={{marginRight: 44, display: 'flex'}}>
				<Icon d={FULL} fill={false} />
			</div>
		</div>
	</>
);

/** The ad's yellow progress line along the bottom (YouTube style), nothing else. */
export const AdBar: React.FC<{k: number; progress: number; left?: number; width?: number; bottom?: number}> = ({k, progress, left = 0, width = W, bottom = 0}) =>
	k > 0.001 ? (
		<div style={{position: 'absolute', left, width, bottom, height: 4, background: 'rgba(255,255,255,0.25)', transform: `translateY(${(1 - k) * 6}px)`, opacity: k}}>
			<div style={{width: `${progress * 100}%`, height: '100%', background: AD_YELLOW}} />
		</div>
	) : null;

// Source frames around the frozen moment, 60 fps interpolated (tools/frames.sh): any source time
// can be shown, so a template can ramp speed, rewind or replay in slow motion.
const FRAMES = {fps: 60, freezeIndex: 146, count: 153};
export const SOURCE_FIRST = VIDEO.freezeAt - FRAMES.freezeIndex / FRAMES.fps;

export const SourceFrame: React.FC<{s: number; style?: React.CSSProperties}> = ({s, style}) => {
	const i = Math.max(0, Math.min(FRAMES.count - 1, FRAMES.freezeIndex + Math.round((s - VIDEO.freezeAt) * FRAMES.fps)));
	return <Img src={staticFile(`demo/frames/f${String(i).padStart(3, '0')}.jpg`)} style={{position: 'absolute', width: W, height: H, ...style}} />;
};

/** A speed ramp from rate `r0` to `r1` over [t0, t0 + d]: source seconds elapsed since t0. */
export const ramp = (t: number, t0: number, d: number, r0: number, r1: number) => {
	const x = Math.max(0, Math.min(t - t0, d));
	const over = Math.max(0, t - t0 - d);
	return r0 * x + ((r1 - r0) * x * x) / (2 * d) + r1 * over;
};

export const Label: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
	<div style={{fontFamily, color: WHITE, letterSpacing: '-0.02em', ...style}}>{children}</div>
);

export {lerp};
