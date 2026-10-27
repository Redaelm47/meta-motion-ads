// Thought: for vlogs, lifestyle, everyday people. Mid-jump, a thought bubble rises from his head,
// in his own inner voice: "Hmm... What if I just... built an app instead?" The thought is the ad:
// the bubble floods into it. After the ad he answers himself, "Nah. Jump first.", and jumps.
// Gentler than the gag: an idea, not a joke at his expense.

import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import json from '../../public/voice/thought/lines.json';
import {AD, T as GAG, VIDEO} from '../ad';
import {Aura, PALETTE, RimLight, Ripple, Vignette} from '../details';
import {H, PLAY_BTN, Player, SHOWN, W, far, SourceFrame} from '../kit';
import {EASE, QUICK, SOFT, Spring, clamp01, glide, glides, lerp, morphGlide, pulse, step} from '../motion';
import {Cursor, INK, WHITE, Words, fontFamily, glass} from '../ui';
import {snap, voiceSet} from './voice';

const V = voiceSet(json);
const POP: Spring = {response: 0.38, damping: 0.78};
const ZOOM_IN: Spring = {response: 0.6, damping: 0.95};
const ZOOM_OUT: Spring = {response: 0.8, damping: 1};

const press = GAG.press;
const freeze = GAG.freeze;
const hmm = freeze + 1.05;
const whatif = V.end('hmm', hmm) + 0.3;
const built = V.end('whatif', whatif) + 0.1;
const flood = V.end('built', built) + 0.5; // let the idea land
const adStart = snap(flood + 0.7);
const adEnd = adStart + AD.duration;
const nah = adEnd + 0.55;
const jump = V.end('nah', nah) + 0.35;
const contract = V.end('jump', jump) + 0.3;
const settle = contract + 0.45;
const playPress = settle + 0.5;
const resume = playPress + 0.12;
export const TL = {adStart, adEnd, resume, total: resume + (VIDEO.end - VIDEO.freezeAt) + 0.4};

const CUES = V.cues({hmm, whatif, built, nah, jump});
const WD = Object.fromEntries(CUES.map((c) => [c.key, c.words]));

// Thought bubble, screen space, above and right of his head (head at about 520, 410 when zoomed).
const PUFFS = [
	{x: 636, y: 306, r: 11, at: freeze + 0.45},
	{x: 690, y: 258, r: 17, at: freeze + 0.6},
	{x: 762, y: 210, r: 25, at: freeze + 0.75},
];
const BUB = {left: 810, cy: 210, w1: 300, w2: 560, w3: 640, h1: 116, h2: 176, font: 50, line: 60};

const sourceSeconds = (t: number) => (t < freeze ? VIDEO.leadIn + t * VIDEO.leadInRate : t < resume ? VIDEO.freezeAt : VIDEO.freezeAt + (t - resume));

const SFX = [
	{t: press, src: 'kenney-click_002.ogg', volume: 0.2},
	{t: freeze, src: 'mixkit-1492.mp3', volume: 0.22},
	...PUFFS.map((p, i) => ({t: p.at, src: 'mixkit-2577.mp3', volume: 0.12 + 0.04 * i})),
	{t: hmm - 0.15, src: 'mixkit-2577.mp3', volume: 0.25},
	{t: built - 0.1, src: 'mixkit-3115.mp3', volume: 0.12},
	{t: flood, src: 'mixkit-1492.mp3', volume: 0.28},
	{t: nah - 0.12, src: 'mixkit-2577.mp3', volume: 0.28},
	{t: contract, src: 'mixkit-1492.mp3', volume: 0.25},
	{t: playPress, src: 'kenney-click_002.ogg', volume: 0.2},
	{t: resume + 0.15, src: 'kenney-impactWood_light_000.ogg', volume: 0.25},
];

export const Thought: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const tf = Math.floor(t * 50) / 50;

	const k = pulse(t, freeze, settle, ZOOM_IN, ZOOM_OUT);
	const s = lerp(1, VIDEO.zoom, k) * (1 + 0.012 * Math.max(0, Math.min(t, flood) - freeze) * k);
	const fx = lerp(W / 2, VIDEO.subject.x, k);
	const fy = lerp(H / 2, VIDEO.subject.y, k);
	const ax = lerp(W / 2, VIDEO.anchor.x, k);
	const ay = lerp(H / 2, VIDEO.anchor.y, k);
	const dim = pulse(t, freeze + 0.05, settle, SOFT, ZOOM_OUT);
	const paused = t >= freeze && t < resume;

	const bub = morphGlide(t, [
		{t: hmm - 0.2, cx: PUFFS[2].x + 30, cy: PUFFS[2].y, w: 40, h: 40, r: 20},
		{t: hmm - 0.15, cx: BUB.left + BUB.w1 / 2, cy: BUB.cy, w: BUB.w1, h: BUB.h1, r: BUB.h1 / 2},
		{t: whatif - 0.12, cx: BUB.left + BUB.w2 / 2, cy: BUB.cy, w: BUB.w2, h: BUB.h1, r: BUB.h1 / 2},
		{t: built - 0.1, cx: BUB.left + BUB.w3 / 2, cy: BUB.cy + 10, w: BUB.w3, h: BUB.h2, r: BUB.h2 / 2},
	], 0.42, 0.6);
	bub.r = Math.min(bub.w, bub.h) / 2;
	const bubIn = step(t - (hmm - 0.2), POP);
	const twoLines = glide(t, built - 0.1, 0.6);

	// The bubble floods into the ad's paper (showing the ad's first frame), and closes into play.
	const bc = {x: BUB.left + BUB.w3 / 2, y: BUB.cy + 10};
	const radius = (tt: number) => {
		const ck = EASE(clamp01((tt - contract) / 0.5));
		return ck > 0 ? Math.sqrt(1 - ck) * far(PLAY_BTN.x, PLAY_BTN.y) : Math.sqrt(EASE(clamp01((tt - flood) / 0.5))) * far(bc.x, bc.y);
	};
	const r = radius(t);
	const feather = Math.max(1.5, Math.abs(r - radius(t - 1 / 50)));
	const centre = t >= contract ? PLAY_BTN : bc;

	// His answer, on the ad's last frame: small puffs, then the bubble.
	const back = morphGlide(t, [
		{t: nah - 0.12, cx: 900, cy: 640, w: 30, h: 30, r: 15},
		{t: nah - 0.08, cx: 1000, cy: 640, w: 200, h: 96, r: 48},
		{t: jump - 0.12, cx: 1040, cy: 640, w: 440, h: 96, r: 48},
	], 0.42, 0.6);
	const backIn = step(t - (nah - 0.12), POP);

	const controls = 1 - glide(t, flood, 0.3) + glide(t, adEnd + 0.15, 0.35) - glide(t, resume + 1.0, 0.4);
	const keys = [
		{t: 0, x: 1780, y: 1220},
		{t: 0.2, x: PLAY_BTN.x, y: PLAY_BTN.y + 2},
		{t: 1.4, x: 1480, y: 960},
		{t: flood, x: 1760, y: 1250},
		{t: adEnd + 0.15, x: 1300, y: 880},
		{t: settle - 0.35, x: PLAY_BTN.x, y: PLAY_BTN.y + 2},
		{t: resume + 0.5, x: 1500, y: 1240},
	];
	const cx = glides(t, keys.map((c) => ({t: c.t, v: c.x, d: 0.8})));
	const cy = glides(t, keys.map((c) => ({t: c.t, v: c.y, d: 0.8})));
	const pressK = pulse(t, press, press + 0.12, QUICK) + pulse(t, playPress, playPress + 0.12, QUICK);
	const text: React.CSSProperties = {fontFamily, fontWeight: 600, fontSize: BUB.font, lineHeight: `${BUB.line}px`, letterSpacing: '-0.03em', color: WHITE, textShadow: '0 1px 12px rgba(0,0,0,0.18)', whiteSpace: 'nowrap'};

	return (
		<AbsoluteFill style={{background: INK, overflow: 'hidden'}}>
			<AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${ax - fx * s}px, ${ay - fy * s}px) scale(${s})`}}>
				<Sequence durationInFrames={Math.round((freeze - 0.06) * fps)}>
					<OffthreadVideo src={staticFile(VIDEO.leadInClip)} muted />
				</Sequence>
				{/* the slow-motion clip's last frames decode black: bridge them with source frames */}
				{t >= freeze - 0.06 && t < freeze && <SourceFrame s={VIDEO.leadIn + t * VIDEO.leadInRate} />}
				{paused && (
					<>
						<Img src={staticFile(VIDEO.freeze)} style={{position: 'absolute', width: W, height: H, filter: `brightness(${1 - 0.36 * dim}) saturate(${1 - 0.25 * dim}) blur(${4 * dim}px)`}} />
						<Img src={staticFile(VIDEO.person)} style={{position: 'absolute', width: W, height: H, transformOrigin: `${VIDEO.subject.x}px ${VIDEO.subject.y}px`, transform: `scale(${1 + 0.025 * dim})`, filter: `drop-shadow(0 ${18 * dim}px ${26 * dim}px rgba(0,0,0,${0.45 * dim}))`}} />
					</>
				)}
				<Sequence from={Math.round(resume * fps)}>
					<OffthreadVideo src={staticFile(VIDEO.clip)} trimBefore={Math.round(VIDEO.freezeAt * fps)} muted />
				</Sequence>
			</AbsoluteFill>
			{paused && (t < adStart || t >= contract) && <Vignette k={dim} strength={0.4} />}

			{/* the thought: three puffs, then the bubble */}
			{t < adStart &&
				PUFFS.map((p, i) => {
					const pk = step(t - p.at, POP) * (1 - glide(t, flood - 0.05, 0.25));
					return pk > 0.001 ? <div key={i} style={{position: 'absolute', left: p.x - p.r, top: p.y - p.r, width: 2 * p.r, height: 2 * p.r, borderRadius: p.r, ...glass(false), transform: `scale(${pk})`}} /> : null;
				})}
			{t > hmm - 0.2 && t < adStart && (
				<div style={{position: 'absolute', left: bub.left, top: bub.top, width: bub.w, height: bub.h, borderRadius: bub.r, ...glass(false), transform: `scale(${bubIn})`, overflow: 'hidden'}}>
					<Aura t={t} k={0.3 * glide(t, hmm, 0.8) + 0.3 * glide(t, built, 0.6)} />
					<RimLight t={t} radius={bub.r} />
					<div style={{position: 'absolute', left: 0, right: 0, top: BUB.cy - BUB.h1 / 2 - bub.top, height: BUB.h1, display: 'flex', alignItems: 'center', paddingLeft: BUB.left + 50 - bub.left, ...text}}>
						<span>
							<Words t={t} words={WD.hmm} out={whatif - 0.25} />
						</span>
					</div>
					<div style={{position: 'absolute', left: BUB.left + 50 - bub.left, top: BUB.cy + 10 - BUB.line / 2 - (BUB.line / 2) * twoLines - bub.top, ...text}}>
						<div>
							<Words t={t} words={WD.whatif} out={flood} />
						</div>
						<div>
							<Words t={t} words={WD.built} out={flood} />
						</div>
					</div>
				</div>
			)}

			{t >= flood && r > 0.5 && (
				<AbsoluteFill style={{background: AD.paper, maskImage: `radial-gradient(circle ${r}px at ${centre.x}px ${centre.y}px, #000 ${Math.max(0, r - feather)}px, transparent ${r}px)`}}>
					<Img src={staticFile(t < adEnd ? 'ad/first.png' : 'ad/last.png')} style={{position: 'absolute', width: W, height: H, opacity: t < adEnd ? glide(t, flood + 0.25, 0.4) : 1}} />
					{t >= adEnd && (
						<>
							{[{x: 830, y: 712, r: 9, d: 0.2}, {x: 870, y: 682, r: 14, d: 0.1}].map((p, i) => {
								const pk = step(t - (nah - 0.12 - p.d), POP);
								return <div key={i} style={{position: 'absolute', left: p.x - p.r, top: p.y - p.r, width: 2 * p.r, height: 2 * p.r, borderRadius: p.r, background: INK, transform: `scale(${pk})`}} />;
							})}
							<div style={{position: 'absolute', left: back.left, top: back.top, width: back.w, height: back.h, borderRadius: back.r, background: INK, overflow: 'hidden', transform: `scale(${backIn})`, boxShadow: '0 16px 40px rgba(0,0,0,0.18)'}}>
								<RimLight t={t} radius={back.r} colors={[PALETTE.orange, PALETTE.lilac]} />
								<div style={{position: 'absolute', left: 44, top: 0, height: 96, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 600, fontSize: 42, letterSpacing: '-0.02em', color: WHITE, whiteSpace: 'pre'}}>
									<span>
										<Words t={t} words={[...WD.nah, ...WD.jump]} />
									</span>
								</div>
							</div>
						</>
					)}
				</AbsoluteFill>
			)}

			<Player controls={clamp01(controls)} progress={clamp01((SHOWN.at + sourceSeconds(tf)) / SHOWN.length)} paused={paused} press={pressK} time={SHOWN.at + sourceSeconds(tf)} length={SHOWN.length} />
			<Ripple t={t} at={press} x={PLAY_BTN.x} y={PLAY_BTN.y} />
			<Ripple t={t} at={playPress} x={PLAY_BTN.x} y={PLAY_BTN.y} />
			<Cursor x={cx} y={cy} press={pressK} />

			{CUES.map((c) => (
				<Sequence key={c.key} from={Math.round(c.t * fps)}>
					<Audio src={staticFile(c.file)} />
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
