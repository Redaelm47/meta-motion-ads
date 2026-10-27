import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {AD, T, VIDEO, VOICE, WORDS} from './ad';
import {EASE, QUICK, SOFT, Spring, clamp01, glide, glides, lerp, morphGlide, pulse, step} from './motion';
import {AD_YELLOW, Cursor, INK, Rise, WHITE, Word, fontFamily, glass} from './ui';

const W = 1920;
const H = 1080;

const ZOOM_IN: Spring = {response: 0.6, damping: 0.95};
const ZOOM_OUT: Spring = {response: 0.8, damping: 1};
const POP: Spring = {response: 0.38, damping: 0.78};
const YT_RED = '#ff0033';

const PLAY_BTN = {x: 62, y: 1046}; // the player's play / pause button
const BIRTH = {x: 960, y: 700}; // the subject's hand on screen, where the caption pill is born
const PILL = {left: 1040, cy: 400, w1: 640, h1: 176, w2: 380, h2: 116, pad: 46, font: 52};
// "You" inside the pill: the ad's own artwork, at text size.
const YOU_H = 62;
const YOU_W = (AD.you.w * YOU_H) / AD.you.h;
const AND_W = 100;
const YOU_IN = {x: PILL.left + PILL.pad + AND_W + 12, y: PILL.cy - YOU_H / 2 - 2};

const mix = (a: string, b: string, k: number) => {
	const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
	const [x, y] = [p(a), p(b)];
	return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], k))).join(',')})`;
};
const far = (x: number, y: number) => Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([a, b]) => Math.hypot(a - x, b - y))) * 1.04;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
// The clip stands for a longer video we are in the middle of, as a mid-roll would be.
const SHOWN = {at: 192 - VIDEO.leadIn, length: 522};

const sourceSeconds = (t: number) => {
	if (t < T.freeze) return VIDEO.leadIn + t * VIDEO.leadInRate;
	if (t < T.resume) return VIDEO.freezeAt;
	return VIDEO.freezeAt + (t - T.resume);
};

// Reda's validated recordings and levels (no ticks, no typing sounds).
const SFX: {t: number; src: string; volume: number}[] = [
	{t: T.press, src: 'kenney-click_002.ogg', volume: 0.2},
	{t: T.freeze, src: 'mixkit-166.mp3', volume: 0.2},
	{t: T.gag1 - 0.3, src: 'mixkit-2577.mp3', volume: 0.3},
	{t: T.gag2 - 0.1, src: 'mixkit-3115.mp3', volume: 0.18},
	{t: T.flood, src: 'mixkit-166.mp3', volume: 0.2},
	{t: T.land - 0.05, src: 'kenney-impactWood_light_000.ogg', volume: 0.34},
	{t: T.back - 0.08, src: 'mixkit-2577.mp3', volume: 0.3},
	{t: T.contract, src: 'mixkit-166.mp3', volume: 0.2},
	{t: T.settle, src: 'mixkit-3115.mp3', volume: 0.12},
	{t: T.playPress, src: 'kenney-click_002.ogg', volume: 0.2},
];

const Lines: React.FC<{t: number; lines: Word[][]; out?: number}> = ({t, lines, out}) => (
	<div style={{textAlign: 'center', whiteSpace: 'pre'}}>
		{lines.map((ws, li) => (
			<div key={li}>
				{ws.map((w, i) => (
					<React.Fragment key={i}>
						<Rise t={t} at={w.start - 0.06} out={out === undefined ? undefined : out + (li * 3 + i) * 0.025}>
							{w.w}
						</Rise>
						{i < ws.length - 1 ? ' ' : null}
					</React.Fragment>
				))}
			</div>
		))}
	</div>
);

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

const Player: React.FC<{controls: number; progress: number; paused: boolean; press: number; time: number; length: number}> = ({controls, progress, paused, press, time, length}) => (
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

// ---------------------------------------------------------------- the film

export const MotionAd: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const tf = Math.floor(t * 50) / 50; // counters read the output frame, not the subframe

	// Camera on the frozen frame: in when it pauses, out once we are back from the ad.
	const k = pulse(t, T.freeze, T.settle, ZOOM_IN, ZOOM_OUT);
	const drift = 1 + 0.015 * Math.max(0, Math.min(t, T.flood) - T.freeze) * k;
	const s = lerp(1, VIDEO.zoom, k) * drift;
	const fx = lerp(W / 2, VIDEO.subject.x, k);
	const fy = lerp(H / 2, VIDEO.subject.y, k);
	const ax = lerp(W / 2, VIDEO.anchor.x, k);
	const ay = lerp(H / 2, VIDEO.anchor.y, k);
	const dim = pulse(t, T.freeze + 0.05, T.settle, SOFT, ZOOM_OUT);
	const paused = t >= T.freeze && t < T.resume;

	// Caption pill, born at the subject's hand.
	const pill = morphGlide(t, [
		{t: T.gag1 - 0.3, cx: BIRTH.x, cy: BIRTH.y, w: 30, h: 30, r: 15},
		{t: T.gag1 - 0.25, cx: PILL.left + PILL.w1 / 2, cy: PILL.cy, w: PILL.w1, h: PILL.h1, r: 48},
		{t: T.gag2 - 0.1, cx: PILL.left + PILL.w2 / 2, cy: PILL.cy, w: PILL.w2, h: PILL.h2, r: PILL.h2 / 2},
	], 0.42, 0.6);
	const pillIn = step(t - (T.gag1 - 0.3), POP);

	// The ad's own "You" flies from the pill to where the ad's first frame has it.
	const youAt = WORDS.gag2[1].start - 0.06;
	const fly = glide(t, T.flood + 0.02, 0.62);
	const you = {x: lerp(YOU_IN.x, AD.you.x, fly), y: lerp(YOU_IN.y, AD.you.y, fly), w: lerp(YOU_W, AD.you.w, fly), h: lerp(YOU_H, AD.you.h, fly)};
	const youPop = step(t - youAt, POP);

	// Paper floods out of the pill, the ad plays on it, then it closes into the play button.
	const pillCx = PILL.left + PILL.w2 / 2;
	const radius = (tt: number) => {
		const ck = EASE(clamp01((tt - T.contract) / 0.5));
		return ck > 0 ? Math.sqrt(1 - ck) * far(PLAY_BTN.x, PLAY_BTN.y) : Math.sqrt(EASE(clamp01((tt - T.flood) / 0.5))) * far(pillCx, PILL.cy);
	};
	const r = radius(t);
	const feather = Math.max(1.5, Math.abs(r - radius(t - 1 / 50)));
	const centre = t >= T.contract ? PLAY_BTN : {x: pillCx, y: PILL.cy};
	const showPaper = t >= T.flood && r > 0.5;
	const inAd = t >= T.adStart && t < T.adEnd;

	// Player controls show while the mouse is active, hide during the ad (only its yellow bar stays).
	const controls = 1 - glide(t, T.flood, 0.3) + glide(t, T.adEnd + 0.15, 0.35) - glide(t, T.resume + 1.0, 0.4);
	const adBar = t >= T.adStart && t < T.adEnd + 0.5 ? 1 - glide(t, T.adEnd + 0.15, 0.3) : 0;
	const adProgress = clamp01((tf - T.adStart) / AD.duration);
	const progress = clamp01((SHOWN.at + sourceSeconds(tf)) / SHOWN.length);

	// Cursor: pause, step aside, gone during the ad, back to press play.
	const keys = [
		{t: 0, x: 1780, y: 1220},
		{t: 0.2, x: PLAY_BTN.x, y: PLAY_BTN.y + 2},
		{t: 1.4, x: 1480, y: 960},
		{t: T.flood, x: 1760, y: 1250},
		{t: T.adEnd + 0.15, x: 1300, y: 880},
		{t: T.settle - 0.35, x: PLAY_BTN.x, y: PLAY_BTN.y + 2},
		{t: T.resume + 0.5, x: 1500, y: 1240},
	];
	const cx = glides(t, keys.map((c) => ({t: c.t, v: c.x, d: 0.8})));
	const cy = glides(t, keys.map((c) => ({t: c.t, v: c.y, d: 0.8})));
	const press = pulse(t, T.press, T.press + 0.12, QUICK) + pulse(t, T.playPress, T.playPress + 0.12, QUICK);
	const backIn = step(t - (T.back - 0.08), POP);

	return (
		<AbsoluteFill style={{backgroundColor: INK, overflow: 'hidden'}}>
			{/* Real footage, camera zooms on the subject while paused */}
			<AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${ax - fx * s}px, ${ay - fy * s}px) scale(${s})`}}>
				<Sequence durationInFrames={Math.round(T.freeze * fps)}>
					<OffthreadVideo src={staticFile(VIDEO.leadInClip)} muted />
				</Sequence>
				{paused && (
					<>
						<Img src={staticFile(VIDEO.freeze)} style={{position: 'absolute', width: W, height: H, filter: `brightness(${1 - 0.42 * dim}) saturate(${1 - 0.3 * dim}) blur(${4 * dim}px)`}} />
						<Img
							src={staticFile(VIDEO.person)}
							style={{
								position: 'absolute',
								width: W,
								height: H,
								transformOrigin: `${VIDEO.subject.x}px ${VIDEO.subject.y}px`,
								transform: `scale(${1 + 0.025 * dim})`,
								filter: `drop-shadow(0 ${18 * dim}px ${26 * dim}px rgba(0,0,0,${0.45 * dim}))`,
							}}
						/>
					</>
				)}
				<Sequence from={Math.round(T.resume * fps)}>
					<OffthreadVideo src={staticFile(VIDEO.clip)} trimBefore={Math.round(VIDEO.freezeAt * fps)} muted />
				</Sequence>
			</AbsoluteFill>

			{/* Glass caption pill */}
			{paused && t > T.gag1 - 0.3 && t < T.adStart && (
				<div style={{position: 'absolute', left: pill.left, top: pill.top, width: pill.w, height: pill.h, borderRadius: pill.r, ...glass(false), transform: `scale(${pillIn})`, overflow: 'hidden'}}>
					<div style={{position: 'absolute', left: PILL.left - pill.left, top: PILL.cy - PILL.h1 / 2 - pill.top, width: PILL.w1, height: PILL.h1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontWeight: 600, fontSize: PILL.font, lineHeight: '62px', letterSpacing: '-0.03em', color: WHITE, textShadow: '0 1px 12px rgba(0,0,0,0.18)'}}>
						<Lines t={t} lines={[WORDS.gag1.slice(0, 3), WORDS.gag1.slice(3)]} out={T.gag2 - 0.22} />
					</div>
					<div style={{position: 'absolute', left: PILL.left + PILL.pad - pill.left, top: PILL.cy - PILL.h2 / 2 - pill.top, height: PILL.h2, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 600, fontSize: 54, letterSpacing: '-0.03em', color: WHITE, whiteSpace: 'nowrap'}}>
						<Rise t={t} at={WORDS.gag2[0].start - 0.06} out={T.flood}>
							And
						</Rise>
						<span style={{display: 'inline-block', width: 12 + YOU_W + 12}} />
						<Rise t={t} at={youAt + 0.1} out={T.flood}>
							?
						</Rise>
					</div>
				</div>
			)}

			{/* Paper world: flood, then the ad, then its last frame */}
			{showPaper && (
				<AbsoluteFill style={{background: AD.paper, maskImage: `radial-gradient(circle ${r}px at ${centre.x}px ${centre.y}px, #000 ${Math.max(0, r - feather)}px, transparent ${r}px)`}}>
					{inAd && (
						<Sequence from={Math.round(T.adStart * fps)} durationInFrames={Math.round(AD.duration * fps)} layout="none">
							<OffthreadVideo src={staticFile(AD.video)} muted style={{width: W, height: H}} />
						</Sequence>
					)}
					{t >= T.adEnd && <Img src={staticFile('ad/last.png')} style={{position: 'absolute', width: W, height: H}} />}
					{t >= T.adEnd && (
						<div style={{position: 'absolute', left: 0, right: 0, top: 616, display: 'flex', justifyContent: 'center'}}>
							<div style={{height: 92, padding: '0 40px', borderRadius: 46, background: INK, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 600, fontSize: 40, letterSpacing: '-0.02em', color: WHITE, transform: `scale(${backIn})`, boxShadow: '0 16px 40px rgba(0,0,0,0.18)', whiteSpace: 'pre'}}>
								<Lines t={t} lines={[WORDS.back]} />
							</div>
						</div>
					)}
				</AbsoluteFill>
			)}

			{/* The ad's own "You", flying to its place in the ad's first frame */}
			{t >= youAt && t < T.adStart && (
				<div style={{position: 'absolute', left: you.x, top: you.y, width: you.w, height: you.h, transform: `scale(${youPop})`, transformOrigin: 'center'}}>
					<div
						style={{
							position: 'absolute',
							inset: 0,
							background: mix('#ffffff', AD.letterInk, fly),
							WebkitMaskImage: `url(${staticFile(AD.you.letters)})`,
							WebkitMaskSize: '100% 100%',
							maskImage: `url(${staticFile(AD.you.letters)})`,
							maskSize: '100% 100%',
						}}
					/>
					<Img src={staticFile(AD.you.sun)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
				</div>
			)}

			<Player controls={clamp01(controls)} progress={progress} paused={paused} press={press} time={SHOWN.at + sourceSeconds(tf)} length={SHOWN.length} />

			{/* Ad: yellow progress along the bottom, nothing else (same as the middle part made by tools/render.py) */}
			{adBar > 0.001 && (
				<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(255,255,255,0.25)', transform: `translateY(${(1 - adBar) * 6}px)`}}>
					<div style={{width: `${adProgress * 100}%`, height: '100%', background: AD_YELLOW}} />
				</div>
			)}

			<Cursor x={cx} y={cy} press={press} />

			{VOICE.map((v) => (
				<Sequence key={v.line.key} from={Math.round(v.t * fps)}>
					<Audio src={staticFile(v.line.file)} />
				</Sequence>
			))}
			{SFX.map((e, i) => (
				<Sequence key={i} from={Math.round(e.t * fps)}>
					<Audio src={staticFile(`sfx/${e.src}`)} volume={e.volume} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
