import {loadFont} from '@remotion/google-fonts/Geist';
import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {AD, T} from './ad';
import {Box, CURSOR, QUICK, SOFT, Spring, lerp, morph, presence, pulse, step, track} from './motion';

const {fontFamily} = loadFont('normal', {weights: ['400', '500', '600'], subsets: ['latin']});

const W = 1920;
const H = 1080;
const INK = '#0e0e0f';
const PAPER = '#ffffff';

const ZOOM_IN: Spring = {response: 0.9, damping: 0.95};
const ZOOM_OUT: Spring = {response: 0.85, damping: 1};

const mix = (a: string, b: string, k: number) => {
	const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
	const [x, y] = [p(a), p(b)];
	return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], k))).join(',')})`;
};

// The one shape: player control → gag lines → product card → resume pill → player control.
const BOXES: Box[] = [
	{t: 0, cx: 960, cy: 980, w: 300, h: 64, r: 32, light: 0},
	{t: T.line1, cx: 1070 + 260, cy: 420, w: 520, h: 104, r: 52, light: 0},
	{t: T.line2, cx: 1070 + 165, cy: 420, w: 330, h: 104, r: 52, light: 0},
	{t: T.card, cx: 1070 + 320, cy: 500, w: 640, h: 400, r: 36, light: 1},
	{t: T.resumePill, cx: 1070 + 140, cy: 790, w: 280, h: 88, r: 44, light: 0},
	{t: T.resume, cx: 960, cy: 980, w: 300, h: 64, r: 32, light: 0},
];

const Fade: React.FC<{k: number; style?: React.CSSProperties; children: React.ReactNode}> = ({k, style, children}) => (
	<div
		style={{
			position: 'absolute',
			opacity: k,
			filter: k < 0.999 ? `blur(${(1 - k) * 10}px)` : undefined,
			transform: `translateY(${(1 - k) * 8}px)`,
			...style,
		}}
	>
		{children}
	</div>
);

const PauseIcon: React.FC<{color: string}> = ({color}) => (
	<svg width="22" height="24" viewBox="0 0 22 24">
		<rect x="2" y="2" width="6" height="20" rx="2" fill={color} />
		<rect x="14" y="2" width="6" height="20" rx="2" fill={color} />
	</svg>
);

const PlayIcon: React.FC<{color: string; size?: number}> = ({color, size = 24}) => (
	<svg width={size} height={size} viewBox="0 0 24 24">
		<path d="M6 3.5v17a1 1 0 0 0 1.5.87l14-8.5a1 1 0 0 0 0-1.74l-14-8.5A1 1 0 0 0 6 3.5z" fill={color} />
	</svg>
);

const Cursor: React.FC<{x: number; y: number; press: number}> = ({x, y, press}) => (
	<svg
		width="34"
		height="48"
		viewBox="0 0 17 24"
		style={{position: 'absolute', left: x - 3, top: y - 2, transform: `scale(${1 - 0.16 * press})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))'}}
	>
		<path d="M1.5 1.5v17.3l4.3-4.1 3 6.6 2.6-1.2-3-6.5h6z" fill={INK} stroke={PAPER} strokeWidth="1.3" strokeLinejoin="round" />
	</svg>
);

const sourceSeconds = (t: number) => {
	if (t < T.freeze) return AD.leadIn + t * AD.leadInRate;
	if (t < T.resume) return AD.freezeAt;
	return AD.freezeAt + (t - T.resume);
};

const SFX: {t: number; src: string; volume: number}[] = [
	{t: T.press, src: 'kenney-click_002.ogg', volume: 0.7},
	{t: T.freeze, src: 'mixkit-166.mp3', volume: 0.35},
	{t: T.line1, src: 'mixkit-3115.mp3', volume: 0.35},
	{t: T.line2, src: 'mixkit-1396.mp3', volume: 0.4},
	{t: T.card, src: 'mixkit-2577.mp3', volume: 0.45},
	...T.bars.map((t) => ({t, src: 'mixkit-1396.mp3', volume: 0.22})),
	{t: T.resumePill, src: 'mixkit-3115.mp3', volume: 0.3},
	{t: T.resumePress, src: 'kenney-click_003.ogg', volume: 0.7},
	{t: T.resume, src: 'mixkit-166.mp3', volume: 0.25},
];

export const MotionAd: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;

	// Camera: zooms onto the subject while the video is paused.
	const k = pulse(t, T.freeze, T.resume, ZOOM_IN, ZOOM_OUT);
	const drift = 1 + 0.012 * Math.max(0, Math.min(t, T.resume) - T.freeze) * k;
	const s = lerp(1, AD.zoom, k) * drift;
	const fx = lerp(W / 2, AD.subject.x, k);
	const fy = lerp(H / 2, AD.subject.y, k);
	const ax = lerp(W / 2, AD.anchor.x, k);
	const ay = lerp(H / 2, AD.anchor.y, k);
	const dim = pulse(t, T.freeze + 0.05, T.resume, SOFT, ZOOM_OUT);
	const paused = t >= T.freeze && t < T.resume;

	// The morphing shape.
	const box = morph(t, BOXES);
	const fill = mix(INK, PAPER, box.light);
	const press = pulse(t, T.press, T.press + 0.12, QUICK) + pulse(t, T.resumePress, T.resumePress + 0.12, QUICK);
	const shapeScale = 1 - 0.035 * press;

	const playerIn = Math.max(presence(t, -1, T.line1), presence(t, T.resume));
	const progress = (sourceSeconds(t) - AD.leadIn) / (AD.end - AD.leadIn);

	// Cursor: real moves to the pause control, then to the resume pill.
	const cx = track(t, [{t: 0, v: 1760}, {t: 0.2, v: 848}, {t: 1.45, v: 1000, s: SOFT}, {t: 4.25, v: 1150}, {t: 5.55, v: 1780}], CURSOR);
	const cy = track(t, [{t: 0, v: 1200}, {t: 0.2, v: 984}, {t: 1.45, v: 1046, s: SOFT}, {t: 4.25, v: 794}, {t: 5.55, v: 1220}], CURSOR);
	const cursorPress = pulse(t, T.press, T.press + 0.12, QUICK) + pulse(t, T.resumePress, T.resumePress + 0.12, QUICK);

	const text: React.CSSProperties = {fontFamily, color: PAPER, fontSize: 42, fontWeight: 600, letterSpacing: '-0.02em', whiteSpace: 'nowrap'};
	const center: React.CSSProperties = {inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'};

	return (
		<AbsoluteFill style={{backgroundColor: INK, overflow: 'hidden'}}>
			<AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${ax - fx * s}px, ${ay - fy * s}px) scale(${s})`}}>
				<Sequence durationInFrames={Math.round(T.freeze * fps)}>
					<OffthreadVideo src={staticFile(AD.video)} trimBefore={Math.round(AD.leadIn * fps)} playbackRate={AD.leadInRate} muted />
				</Sequence>
				{paused && (
					<>
						<Img
							src={staticFile(AD.freeze)}
							style={{position: 'absolute', width: W, height: H, filter: `brightness(${1 - 0.5 * dim}) saturate(${1 - 0.4 * dim}) blur(${4 * dim}px)`}}
						/>
						<Img
							src={staticFile(AD.person)}
							style={{
								position: 'absolute',
								width: W,
								height: H,
								transformOrigin: `${AD.subject.x}px ${AD.subject.y}px`,
								transform: `scale(${1 + 0.025 * dim})`,
								filter: `drop-shadow(0 ${18 * dim}px ${26 * dim}px rgba(0,0,0,${0.45 * dim}))`,
							}}
						/>
					</>
				)}
				<Sequence from={Math.round(T.resume * fps)}>
					<OffthreadVideo src={staticFile(AD.video)} trimBefore={Math.round(AD.freezeAt * fps)} muted />
				</Sequence>
			</AbsoluteFill>

			{/* The shape, in screen space */}
			<div
				style={{
					position: 'absolute',
					left: box.left,
					top: box.top,
					width: box.w,
					height: box.h,
					borderRadius: box.r,
					background: fill,
					overflow: 'hidden',
					transform: `scale(${shapeScale})`,
					boxShadow: `0 ${10 + 20 * box.light}px ${30 + 40 * box.light}px rgba(0,0,0,${0.25 + 0.1 * box.light})`,
				}}
			>
				<Fade k={playerIn} style={{inset: 0}}>
					<div style={{position: 'absolute', left: 26, top: 20}}>
						{paused ? <PlayIcon color={PAPER} /> : <PauseIcon color={PAPER} />}
					</div>
					<div style={{position: 'absolute', left: 70, right: 92, top: 29, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.22)'}}>
						<div style={{width: `${Math.max(0, Math.min(1, progress)) * 100}%`, height: '100%', borderRadius: 3, background: PAPER}} />
					</div>
					<div style={{position: 'absolute', right: 24, top: 18, fontFamily, fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums'}}>
						0:0{Math.floor(sourceSeconds(t))}
					</div>
				</Fade>

				<Fade k={presence(t, T.line1, T.line2)} style={center}>
					<span style={text}>{AD.gag[0]}</span>
				</Fade>
				<Fade k={presence(t, T.line2, T.card)} style={center}>
					<span style={text}>{AD.gag[1]}</span>
				</Fade>

				{/* Product card, laid out for its final 640 x 400 size */}
				<Fade k={presence(t, T.card, T.resumePill)} style={{left: 0, top: 0, width: 640, height: 400}}>
					<div style={{position: 'absolute', left: 40, top: 36, display: 'flex', alignItems: 'center', gap: 16}}>
						<div style={{width: 52, height: 52, borderRadius: 14, background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontWeight: 600, fontSize: 28, color: PAPER}}>N</div>
						<span style={{fontFamily, fontWeight: 600, fontSize: 30, color: INK, letterSpacing: '-0.02em'}}>{AD.brand.name}</span>
					</div>
					<span style={{position: 'absolute', right: 40, top: 50, fontFamily, fontSize: 18, fontWeight: 500, color: '#8a8a8f'}}>Sponsored</span>
					<Fade k={presence(t, T.card + 0.12)} style={{left: 40, top: 112, width: 560}}>
						<div style={{fontFamily, fontWeight: 600, fontSize: 40, lineHeight: 1.12, color: INK, letterSpacing: '-0.025em'}}>{AD.brand.headline.map((l) => <div key={l}>{l}</div>)}</div>
					</Fade>
					{/* A site that builds itself, bar by bar */}
					<div style={{position: 'absolute', left: 40, top: 236, width: 300, height: 128, borderRadius: 14, background: '#f2f2f3', overflow: 'hidden'}}>
						<div style={{position: 'absolute', left: 14, top: 12, display: 'flex', gap: 6}}>
							{[0, 1, 2].map((i) => (
								<div key={i} style={{width: 9, height: 9, borderRadius: 5, background: '#d4d4d8'}} />
							))}
						</div>
						{T.bars.map((bt, i) => {
							const g = step(t - bt, {response: 0.45, damping: 0.88});
							const widths = [200, 150, 230];
							return (
								<div key={i} style={{position: 'absolute', left: 16, top: 38 + i * 28, height: i === 0 ? 18 : 12, width: widths[i] * g, borderRadius: 6, background: i === 0 ? INK : '#c9c9ce', opacity: Math.min(1, g * 1.5)}} />
							);
						})}
					</div>
					<Fade k={presence(t, T.cta)} style={{right: 40, top: 300}}>
						<div style={{height: 60, padding: '0 28px', borderRadius: 30, background: INK, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 600, fontSize: 24, color: PAPER}}>{AD.brand.cta}</div>
					</Fade>
				</Fade>

				<Fade k={presence(t, T.resumePill, T.resume)} style={{...center, gap: 14}}>
					<PlayIcon color={PAPER} size={26} />
					<span style={{...text, fontSize: 32}}>Resume</span>
				</Fade>
			</div>

			<Cursor x={cx} y={cy} press={cursorPress} />

			{SFX.map((e, i) => (
				<Sequence key={i} from={Math.round(e.t * fps)}>
					<Audio src={staticFile(`sfx/${e.src}`)} volume={e.volume} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
