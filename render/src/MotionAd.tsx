import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {AD, T, VIDEO, VOICE, WORDS} from './ad';
import {EASE, QUICK, SOFT, Spring, clamp01, glide, glides, lerp, morphGlide, pulse, step} from './motion';
import {AD_YELLOW, Cursor, INK, PauseIcon, PlayIcon, Rise, WHITE, Words, fontFamily, glass} from './ui';

const W = 1920;
const H = 1080;

const ZOOM_IN: Spring = {response: 0.6, damping: 0.95};
const ZOOM_OUT: Spring = {response: 0.7, damping: 1};
const POP: Spring = {response: 0.38, damping: 0.78};

const PLAYER = {cx: 960, cy: 1000, w: 360, h: 64};
const PLAY_ICON = {x: PLAYER.cx - PLAYER.w / 2 + 34, y: PLAYER.cy};
const BIRTH = {x: 960, y: 700}; // the subject's hand on screen, where the caption pill is born
const PILL = {left: 1050, cy: 400, h: 116, w1: 500, w2: 380, pad: 46, font: 54};
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

const sourceSeconds = (t: number) => {
	if (t < T.freeze) return VIDEO.leadIn + t * VIDEO.leadInRate;
	if (t < T.resume) return VIDEO.freezeAt;
	return VIDEO.freezeAt + (t - T.resume);
};

const SFX: {t: number; src: string; volume: number}[] = [
	{t: T.press, src: 'kenney-click_002.ogg', volume: 0.2},
	{t: T.freeze, src: 'mixkit-166.mp3', volume: 0.18},
	{t: T.flood, src: 'mixkit-166.mp3', volume: 0.25},
	{t: T.playPress, src: 'kenney-click_002.ogg', volume: 0.2},
	{t: T.contract, src: 'mixkit-166.mp3', volume: 0.22},
];

export const MotionAd: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const tf = Math.floor(t * 50) / 50; // counters read the output frame, not the subframe

	// Camera on the frozen frame.
	const k = pulse(t, T.freeze, T.resume, ZOOM_IN, ZOOM_OUT);
	const drift = 1 + 0.015 * Math.max(0, Math.min(t, T.flood) - T.freeze) * k;
	const s = lerp(1, VIDEO.zoom, k) * drift;
	const fx = lerp(W / 2, VIDEO.subject.x, k);
	const fy = lerp(H / 2, VIDEO.subject.y, k);
	const ax = lerp(W / 2, VIDEO.anchor.x, k);
	const ay = lerp(H / 2, VIDEO.anchor.y, k);
	const dim = pulse(t, T.freeze + 0.05, T.resume, SOFT, ZOOM_OUT);
	const paused = t >= T.freeze && t < T.resume;

	// Caption pill, born at the subject's hand.
	const pill = morphGlide(t, [
		{t: T.gag1 - 0.3, cx: BIRTH.x, cy: BIRTH.y, w: 30, h: 30, r: 15},
		{t: T.gag1 - 0.25, cx: PILL.left + PILL.w1 / 2, cy: PILL.cy, w: PILL.w1, h: PILL.h, r: PILL.h / 2},
		{t: T.gag2 - 0.1, cx: PILL.left + PILL.w2 / 2, cy: PILL.cy, w: PILL.w2, h: PILL.h, r: PILL.h / 2},
	], 0.42, 0.6);
	const pillIn = step(t - (T.gag1 - 0.3), POP);

	// The ad's own "You" flies from the pill to where the ad's first frame has it.
	const youAt = WORDS.gag2[1].start - 0.06;
	const fly = glide(t, T.flood + 0.02, 0.62);
	const you = {
		x: lerp(YOU_IN.x, AD.you.x, fly),
		y: lerp(YOU_IN.y, AD.you.y, fly),
		w: lerp(YOU_W, AD.you.w, fly),
		h: lerp(YOU_H, AD.you.h, fly),
	};
	const youPop = step(t - youAt, POP);

	// Paper floods out of the pill, the ad plays on it, then it contracts into the play button.
	const pillCx = PILL.left + PILL.w2 / 2;
	const radius = (tt: number) => {
		const ck = EASE(clamp01((tt - T.contract) / 0.48));
		return ck > 0 ? Math.sqrt(1 - ck) * far(PLAY_ICON.x, PLAY_ICON.y) : Math.sqrt(EASE(clamp01((tt - T.flood) / 0.5))) * far(pillCx, PILL.cy);
	};
	const r = radius(t);
	const feather = Math.max(1.5, Math.abs(r - radius(t - 1 / 50)));
	const contracting = t >= T.contract;
	const centre = contracting ? PLAY_ICON : {x: pillCx, y: PILL.cy};
	const showPaper = t >= T.flood && r > 0.5;
	const inAd = t >= T.adStart && t < T.adEnd;

	// Ad progress, YouTube style: yellow bar and a countdown.
	const adProgress = clamp01((tf - T.adStart) / AD.duration);
	const adLeft = Math.max(0, Math.ceil(T.adEnd - Math.max(tf, T.adStart)));
	const adUi = step(t - (T.adStart + 0.2), POP) * (1 - glide(t, T.adEnd, 0.3));

	// Player: hides during the ad, comes back for the cursor to resume.
	const playerHide = glide(t, T.flood, 0.5) - glide(t, T.adEnd + 0.05, 0.5);

	// Cursor: pause, leave, come back, play.
	const keys = [
		{t: 0, x: 1780, y: 1220},
		{t: 0.2, x: PLAY_ICON.x, y: PLAY_ICON.y + 2},
		{t: 1.4, x: 1010, y: 1070},
		{t: T.flood, x: 1700, y: 1250},
		{t: T.adEnd - 0.2, x: PLAY_ICON.x, y: PLAY_ICON.y + 2},
		{t: T.resume + 0.3, x: 1780, y: 1240},
	];
	const cx = glides(t, keys.map((c) => ({t: c.t, v: c.x, d: 0.8})));
	const cy = glides(t, keys.map((c) => ({t: c.t, v: c.y, d: 0.8})));
	const press = pulse(t, T.press, T.press + 0.12, QUICK) + pulse(t, T.playPress, T.playPress + 0.12, QUICK);

	const progress = (sourceSeconds(tf) - VIDEO.leadIn) / (VIDEO.end - VIDEO.leadIn);
	const backIn = step(t - (T.back - 0.08), POP) * (1 - glide(t, T.playPress, 0.3));

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
					<div style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontWeight: 600, fontSize: PILL.font, letterSpacing: '-0.03em', color: WHITE, whiteSpace: 'nowrap', textShadow: '0 1px 12px rgba(0,0,0,0.18)'}}>
						<span style={{position: 'absolute'}}>
							<Words t={t} words={WORDS.gag1} out={T.gag2 - 0.18} />
						</span>
					</div>
					<div style={{position: 'absolute', left: PILL.pad - (pill.left - (PILL.left)), top: 0, height: PILL.h, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 600, fontSize: PILL.font, letterSpacing: '-0.03em', color: WHITE, whiteSpace: 'nowrap'}}>
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

					{/* Back to the video: the gag answers the ad's last line */}
					{t >= T.adEnd && (
						<div style={{position: 'absolute', left: 0, right: 0, top: 616, display: 'flex', justifyContent: 'center'}}>
							<div style={{height: 92, padding: '0 40px', borderRadius: 46, background: INK, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 600, fontSize: 40, letterSpacing: '-0.02em', color: WHITE, transform: `scale(${backIn})`, boxShadow: '0 16px 40px rgba(0,0,0,0.18)'}}>
								<span style={{whiteSpace: 'pre'}}>
									<Words t={t} words={WORDS.back} />
								</span>
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
							background: AD.letterInk === '' ? WHITE : mix('#ffffff', AD.letterInk, fly),
							WebkitMaskImage: `url(${staticFile(AD.you.letters)})`,
							WebkitMaskSize: '100% 100%',
							maskImage: `url(${staticFile(AD.you.letters)})`,
							maskSize: '100% 100%',
						}}
					/>
					<Img src={staticFile(AD.you.sun)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
				</div>
			)}

			{/* Ad progress: yellow bar along the bottom, countdown bottom-left */}
			{adUi > 0.001 && (
				<>
					<div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 7, background: 'rgba(0,0,0,0.12)', transform: `scaleY(${adUi})`, transformOrigin: 'bottom'}}>
						<div style={{width: `${adProgress * 100}%`, height: '100%', background: AD_YELLOW}} />
					</div>
					<div style={{position: 'absolute', left: 40, bottom: 34, height: 50, padding: '0 20px 0 8px', borderRadius: 25, background: 'rgba(14,14,16,0.72)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', gap: 12, transform: `scale(${adUi})`, transformOrigin: 'left center', fontFamily, fontVariantNumeric: 'tabular-nums'}}>
						<div style={{height: 34, padding: '0 11px', borderRadius: 17, background: AD_YELLOW, display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: 18, color: INK}}>Ad</div>
						<span style={{fontWeight: 600, fontSize: 20, color: WHITE}}>0:{String(adLeft).padStart(2, '0')}</span>
						<span style={{fontWeight: 500, fontSize: 20, color: 'rgba(255,255,255,0.7)'}}>· {AD.site}</span>
					</div>
				</>
			)}

			{/* Player control */}
			<div
				style={{
					position: 'absolute',
					left: PLAYER.cx - PLAYER.w / 2,
					top: PLAYER.cy - PLAYER.h / 2,
					width: PLAYER.w,
					height: PLAYER.h,
					borderRadius: PLAYER.h / 2,
					...glass(true),
					transform: `translateY(${playerHide * 140}px) scale(${1 - 0.04 * press})`,
				}}
			>
				<div style={{position: 'absolute', left: 23, top: 20}}>{paused ? <PlayIcon color={WHITE} /> : <PauseIcon color={WHITE} />}</div>
				<div style={{position: 'absolute', left: 66, right: 94, top: 29, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.22)'}}>
					<div style={{width: `${clamp01(progress) * 100}%`, height: '100%', borderRadius: 3, background: WHITE}} />
				</div>
				<div style={{position: 'absolute', right: 24, top: 18, fontFamily, fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums'}}>0:0{Math.floor(sourceSeconds(tf))}</div>
			</div>

			<Cursor x={cx} y={cy} press={press} />

			{VOICE.map((v) => (
				<Sequence key={v.line.key} from={Math.round(v.t * fps)}>
					<Audio src={staticFile(v.line.file)} />
				</Sequence>
			))}
			<Sequence from={Math.round(T.adStart * fps)} durationInFrames={Math.round(AD.duration * fps)}>
				<Audio src={staticFile(AD.voice)} />
			</Sequence>
			{SFX.map((e, i) => (
				<Sequence key={i} from={Math.round(e.t * fps)}>
					<Audio src={staticFile(`sfx/${e.src}`)} volume={e.volume} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
