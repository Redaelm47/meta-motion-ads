import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {AD, T, VIDEO, VOICE, WORDS} from './ad';
import {EASE, QUICK, SOFT, Spring, clamp01, glide, glides, lerp, morphGlide, pulse, step} from './motion';
import {Aura, Bokeh, Brackets, EdgeRing, Grain, Letterbox, LightLeak, PALETTE, RimLight, Ripple, Spotlight, Underline, Vignette} from './details';
import {Variant, isCinema, sfxFor} from './variants';
import {Burst, Halftone, NightTint, Scanlines, SpeedLines, TapeGlitch, VhsOsd, neonGlow} from './styles';
import {AD_YELLOW, Cursor, INK, Rise, WHITE, Word, fontFamily, glass} from './ui';
import {H, PLAY_BTN, Player, SHOWN, W, far, mix} from './kit';

const ZOOM_IN: Spring = {response: 0.6, damping: 0.95};
const ZOOM_OUT: Spring = {response: 0.8, damping: 1};
const POP: Spring = {response: 0.38, damping: 0.78};

const BIRTH = {x: 960, y: 700}; // the subject's hand on screen, where the caption pill is born
// Subject in source-frame coordinates, for the lock-on brackets.
const SUBJECT_BOX = {x0: 930, y0: 385, x1: 1330, y1: 745};
const PILL = {left: 1040, cy: 400, wOk: 250, w1: 650, h1: 116, h2: 176, wYou: 380, h: 116, pad: 46, font: 52, line: 62};
// "You" inside the pill: the ad's own artwork, at text size.
const YOU_H = 62;
const YOU_W = (AD.you.w * YOU_H) / AD.you.h;
const AND_W = 100;
const YOU_IN = {x: PILL.left + PILL.pad + AND_W + 12, y: PILL.cy - YOU_H / 2 - 2};

// Width of the reply pill for its words (Geist 600 at 40 px is about 21 px a character).
const backW = (ws: Word[]) => 80 + ws.map((w) => w.w).join(' ').length * 21;

const sourceSeconds = (t: number) => {
	if (t < T.freeze) return VIDEO.leadIn + t * VIDEO.leadInRate;
	if (t < T.resume) return VIDEO.freezeAt;
	return VIDEO.freezeAt + (t - T.resume);
};

// Sound effects per variant: see variants.ts.

const Lines: React.FC<{t: number; lines: Word[][]; out?: number; deco?: (w: Word) => React.ReactNode}> = ({t, lines, out, deco}) => (
	<div style={{textAlign: 'center', whiteSpace: 'pre'}}>
		{lines.map((ws, li) => (
			<div key={li}>
				{ws.map((w, i) => (
					<React.Fragment key={i}>
						<span style={{position: 'relative', display: 'inline-block'}}>
							<Rise t={t} at={w.start - 0.06} out={out === undefined ? undefined : out + (li * 3 + i) * 0.025}>
								{w.w}
							</Rise>
							{deco?.(w)}
						</span>
						{i < ws.length - 1 ? ' ' : null}
					</React.Fragment>
				))}
			</div>
		))}
	</div>
);

const bgFilter = (v: Variant, dim: number) => {
	switch (v) {
		case 'comics':
			return `brightness(${1 - 0.12 * dim}) saturate(${1 + 0.45 * dim}) contrast(${1 + 0.25 * dim}) blur(${2 * dim}px)`;
		case 'neon':
			return `brightness(${1 - 0.45 * dim}) saturate(${1 - 0.4 * dim}) blur(${4 * dim}px)`;
		case 'apple':
			return `brightness(${1 - 0.22 * dim}) blur(${10 * dim}px)`;
		case 'paper':
			return `brightness(${1 - 0.06 * dim}) saturate(${1 - 0.12 * dim}) contrast(${1 + 0.06 * dim})`;
		case 'vhs':
			return `brightness(${1 - 0.2 * dim}) saturate(${1 - 0.25 * dim}) blur(${1.5 * dim}px)`;
		default:
			return `brightness(${1 - 0.42 * dim}) saturate(${1 - 0.3 * dim}) blur(${4 * dim}px)`;
	}
};

// ---------------------------------------------------------------- the film

export const MotionAd: React.FC<{variant?: Variant}> = ({variant = 'cinema'}) => {
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
	const paperK = variant === 'paper' ? glide(t, T.freeze + 0.05, 0.55) - glide(t, T.flood, 0.4) + glide(t, T.contract, 0.4) - glide(t, T.settle + 0.2, 0.5) : 0;

	// Caption pill, born at the subject's hand.
	const pill = morphGlide(t, [
		{t: T.ok - 0.3, cx: BIRTH.x, cy: BIRTH.y, w: 30, h: 30, r: 15},
		{t: T.ok - 0.25, cx: PILL.left + PILL.wOk / 2, cy: PILL.cy, w: PILL.wOk, h: PILL.h, r: PILL.h / 2},
		{t: T.motivated - 0.12, cx: PILL.left + PILL.w1 / 2, cy: PILL.cy, w: PILL.w1, h: PILL.h1, r: PILL.h / 2},
		{t: T.isnthe - 0.1, cx: PILL.left + PILL.w1 / 2, cy: PILL.cy, w: PILL.w1, h: PILL.h2, r: 48},
		{t: T.andyou - 0.1, cx: PILL.left + PILL.wYou / 2, cy: PILL.cy, w: PILL.wYou, h: PILL.h, r: PILL.h / 2},
	], 0.42, 0.6);
	const pillIn = step(t - (T.ok - 0.3), POP);
	pill.r = Math.min(pill.w, pill.h, PILL.h) / 2; // always fully rounded, never a square in between
	const twoLines = glide(t, T.isnthe - 0.1, 0.6);

	// The ad's own "You" flies from the pill to where the ad's first frame has it.
	const youAt = WORDS.andyou[1].start - 0.06;
	const fly = glide(t, T.flood + 0.02, 0.62);
	const you = {x: lerp(YOU_IN.x, AD.you.x, fly), y: lerp(YOU_IN.y, AD.you.y, fly), w: lerp(YOU_W, AD.you.w, fly), h: lerp(YOU_H, AD.you.h, fly)};
	const youPop = step(t - youAt, POP);

	// Paper floods out of the pill, the ad plays on it, then it closes into the play button.
	const pillCx = PILL.left + PILL.wYou / 2;
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
	// Reply pill on the ad's last frame: "Alright." then it widens for "Where were we?".
	const back = morphGlide(t, [
		{t: T.alright - 0.12, cx: 960, cy: 662, w: 30, h: 30, r: 15},
		{t: T.alright - 0.08, cx: 960, cy: 662, w: backW(WORDS.alright), h: 92, r: 46},
		{t: T.where - 0.12, cx: 960, cy: 662, w: backW([...WORDS.alright, ...WORDS.where]), h: 92, r: 46},
	], 0.42, 0.6);
	const backIn = step(t - (T.alright - 0.12), POP);

	return (
		<AbsoluteFill style={{backgroundColor: variant === 'paper' ? '#e4ddd0' : INK, overflow: 'hidden'}}>
			{/* Real footage, camera zooms on the subject while paused */}
			<AbsoluteFill
				style={
					variant === 'paper'
						? {
								overflow: 'hidden',
								transform: `scale(${1 - 0.12 * paperK}) rotate(${-2.5 * paperK}deg)`,
								boxShadow: `0 0 0 ${26 * paperK}px #fbfaf7, 0 ${34 * paperK}px ${90 * paperK}px rgba(0,0,0,${0.35 * paperK})`,
							}
						: undefined
				}
			>
			<AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${ax - fx * s}px, ${ay - fy * s}px) scale(${s})`}}>
				<Sequence durationInFrames={Math.round(T.freeze * fps)}>
					<OffthreadVideo src={staticFile(VIDEO.leadInClip)} muted />
				</Sequence>
				{paused && (
					<>
						<Img src={staticFile(VIDEO.freeze)} style={{position: 'absolute', width: W, height: H, filter: bgFilter(variant, dim)}} />
						{variant === 'neon' && <NightTint k={dim} />}
						{variant === 'comics' && <SpeedLines t={t} k={dim} cx={1125} cy={560} inner={330} scale={s} />}
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
						{!['apple', 'vhs', 'paper'].includes(variant) && <Brackets t={t} box={SUBJECT_BOX} at={T.freeze + 0.12} out={T.ok - 0.1} scale={s} />}
						{variant === 'vhs' && <TapeGlitch t={t} at={T.freeze} src={staticFile(VIDEO.freeze)} />}
					</>
				)}
				<Sequence from={Math.round(T.resume * fps)}>
					<OffthreadVideo src={staticFile(VIDEO.clip)} trimBefore={Math.round(VIDEO.freezeAt * fps)} muted />
				</Sequence>
			</AbsoluteFill>
			</AbsoluteFill>

			{isCinema(variant) && paused && (t < T.adStart || t >= T.contract) && <Vignette k={dim} strength={0.45} />}
			{variant === 'cinema_spot' && paused && (t < T.adStart || t >= T.contract) && <Spotlight x={(VIDEO.subject.x - fx) * s + ax} y={(VIDEO.subject.y - fy) * s + ay} k={dim} />}
			{variant === 'cinema_film' && (t < T.adStart || t >= T.contract) && (
				<>
					{/* warm grade as an overlay: a CSS filter on the zoomed layer would soften it */}
					<div style={{position: 'absolute', inset: 0, background: 'rgba(255,160,80,0.16)', mixBlendMode: 'soft-light'}} />
					<Grain t={t} k={1} />
				</>
			)}
			{variant === 'cinema_leak' && (
				<>
					<LightLeak t={t} at={T.freeze - 0.1} />
					<LightLeak t={t} at={T.andyou + 0.35} dur={0.9} fromLeft={false} />
				</>
			)}
			{isCinema(variant) && <Letterbox size={variant === 'cinema_film' ? 150 : 110} k={glide(t, T.freeze, 0.5) - glide(t, T.flood, 0.4) + glide(t, T.contract, 0.4) - glide(t, T.resume, 0.5)} />}
			{variant === 'bubbles' && paused && t < T.adStart && <Bokeh t={t} k={glide(t, T.ok - 0.3, 0.8)} />}

			{variant === 'comics' && paused && (t < T.adStart || t >= T.contract) && <Halftone k={dim} />}
			{variant === 'comics' && <Burst t={t} at={T.freeze + 0.15} out={T.ok + 0.6} x={330} y={250} word="PAUSE!" />}
			{variant === 'vhs' && paused && (t < T.adStart || t >= T.contract) && (
				<>
					<Scanlines k={dim} />
					<VhsOsd t={t} k={dim} counter={`0:03:12`} />
				</>
			)}

			{/* Glass caption pill */}
			{paused && t > T.ok - 0.3 && t < T.adStart && (
				<div style={{position: 'absolute', left: pill.left, top: pill.top, width: pill.w, height: pill.h, borderRadius: pill.r, ...glass(false), transform: `scale(${pillIn})`, overflow: 'hidden', ...(variant === 'neon' ? neonGlow(t, T.ok - 0.3) : {})}}>
					<Aura t={t} k={0.35 * glide(t, T.ok - 0.2, 0.8) + 0.35 * glide(t, T.andyou - 0.2, 0.6)} />
					<RimLight t={t} radius={pill.r} />
					{/* "Okay." */}
					<div style={{position: 'absolute', left: PILL.left - pill.left, top: PILL.cy - PILL.h / 2 - pill.top, width: PILL.wOk, height: PILL.h, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontWeight: 600, fontSize: PILL.font, letterSpacing: '-0.03em', color: WHITE, textShadow: '0 1px 12px rgba(0,0,0,0.18)'}}>
						<Lines t={t} lines={[WORDS.ok]} out={T.motivated - 0.2} />
					</div>
					{/* "He's really motivated," then "isn't he?" on a second line, the pill growing to hold it */}
					<div style={{position: 'absolute', left: PILL.left - pill.left, top: PILL.cy - PILL.line / 2 - (PILL.line / 2) * twoLines - pill.top, width: PILL.w1, fontFamily, fontWeight: 600, fontSize: PILL.font, lineHeight: `${PILL.line}px`, letterSpacing: '-0.03em', color: WHITE, textShadow: '0 1px 12px rgba(0,0,0,0.18)'}}>
						<Lines t={t} lines={[WORDS.motivated, WORDS.isnthe]} out={T.andyou - 0.22} deco={(w) => (w.w.startsWith('motivated') && t < T.andyou - 0.15 ? <Underline t={t} at={w.start + 0.15} /> : null)} />
					</div>
					<div style={{position: 'absolute', left: PILL.left + PILL.pad - pill.left, top: PILL.cy - PILL.h / 2 - pill.top, height: PILL.h, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 600, fontSize: 54, letterSpacing: '-0.03em', color: WHITE, whiteSpace: 'nowrap'}}>
						<Rise t={t} at={WORDS.andyou[0].start - 0.06} out={T.flood}>
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
						<div style={{position: 'absolute', left: back.left, top: back.top, width: back.w, height: back.h, borderRadius: back.r, background: INK, overflow: 'hidden', transform: `scale(${backIn})`, boxShadow: '0 16px 40px rgba(0,0,0,0.18)'}}>
							<RimLight t={t} radius={back.r} colors={[PALETTE.orange, PALETTE.lilac]} />
							<div style={{position: 'absolute', left: 40, top: 0, height: 92, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 600, fontSize: 40, letterSpacing: '-0.02em', color: WHITE, whiteSpace: 'pre'}}>
								<Lines t={t} lines={[[...WORDS.alright, ...WORDS.where]]} />
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

			<EdgeRing x={centre.x} y={centre.y} r={r} k={t >= T.contract ? EASE(clamp01((t - T.contract) / 0.5)) : EASE(clamp01((t - T.flood) / 0.5))} />
			<Ripple t={t} at={T.press} x={PLAY_BTN.x} y={PLAY_BTN.y} />
			<Ripple t={t} at={T.playPress} x={PLAY_BTN.x} y={PLAY_BTN.y} />
			<Cursor x={cx} y={cy} press={press} />

			{VOICE.map((v) => (
				<Sequence key={v.line.key} from={Math.round(v.t * fps)}>
					<Audio src={staticFile(v.line.file)} />
				</Sequence>
			))}
			{sfxFor(variant).map((e, i) => (
				<Sequence key={i} from={Math.round(e.t * fps)}>
					<Audio src={staticFile(`sfx/${e.src}`)} volume={e.volume} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
