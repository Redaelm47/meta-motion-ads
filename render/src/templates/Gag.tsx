// Gag, driven by a script: the same freeze, camera, glass pill, flood and way back as MotionAd
// (cinema look), but the lines come from data (src/templates/gags.ts), so any joke can be played.
// The pill sizes itself to each line. A script can end on the ad's own first word ("You"): the
// narrator leaves the sentence hanging ("No, it's...") and the ad's artwork lands in the pill to
// finish it, then flies to its place in the ad's first frame. In the product, Muse Spark writes
// the script for each (video, ad) pair, following docs/references-humour.md.

import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {AD, T as BASE, VIDEO} from '../ad';
import {Aura, Brackets, EdgeRing, Letterbox, PALETTE, RimLight, Ripple, Vignette} from '../details';
import {H, PLAY_BTN, Player, SHOWN, SourceFrame, W, far, mix} from '../kit';
import {EASE, QUICK, SOFT, Spring, clamp01, glide, glides, lerp, morphGlide, pulse, step} from '../motion';
import {Cursor, INK, Rise, WHITE, Word, fontFamily, glass} from '../ui';
import {textWidth} from '../textWidth';
import {GAGS, GagScript} from './gags';
import {snap, voiceSet} from './voice';

const ZOOM_IN: Spring = {response: 0.6, damping: 0.95};
const ZOOM_OUT: Spring = {response: 0.8, damping: 1};
const POP: Spring = {response: 0.38, damping: 0.78};
const SUBJECT_BOX = VIDEO.box;
// The pill is born at the subject's hand side, on screen once the camera has zoomed in.
const BIRTH = {x: VIDEO.anchor.x + 240, y: VIDEO.anchor.y + 140};
const PILL = {left: 1000, cy: 400, h1: 116, h2: 176, pad: 46, font: 52, line: 62};
const YOU_H = 62;
const YOU_W = (AD.you.w * YOU_H) / AD.you.h;
const BACK = {cy: 662, h: 92, pad: 40, font: 40};

// Words are separated by a space each in the layout, so measuring the joined text is exact.
const pillW = (s: string) => textWidth(s, PILL.font, -0.03);
const backW = (s: string) => textWidth(s, BACK.font, -0.02);

/** Everything timed from the voice takes: when each line plays, pill states, cut points. */
export const timeline = (script: GagScript) => {
	const V = voiceSet(script.voice);
	const freeze = BASE.freeze;
	let at = freeze + 0.6;
	const cues: {key: string; t: number; words: Word[]; file: string}[] = [];
	const pills = script.pills.map((lines) => {
		const ls = lines.map(([key, gap]) => {
			const c = {key, t: at, words: V.words(key, at), file: V.line(key).file};
			cues.push(c);
			at = V.end(key, at) + gap;
			return c;
		});
		return ls;
	});
	const youAt = script.you ? at : null;
	const flood = script.you ? at + 0.5 : at;
	const adStart = snap(flood + 0.7);
	const adEnd = adStart + AD.duration;
	at = adEnd + 0.5;
	const outs = script.out.map(([key, gap]) => {
		const c = {key, t: at, words: V.words(key, at), file: V.line(key).file};
		cues.push(c);
		at = V.end(key, at) + gap;
		return c;
	});
	const contract = at + 0.05;
	const settle = contract + 0.45;
	const playPress = settle + 0.6;
	const resume = playPress + 0.12;
	return {freeze, pills, youAt, flood, adStart, adEnd, outs, contract, settle, playPress, resume, cues, total: resume + (VIDEO.end - VIDEO.freezeAt) + 0.4};
};
export const TLS = Object.fromEntries(Object.entries(GAGS).map(([k, s]) => [k, timeline(s)]));

const sfx = (L: ReturnType<typeof timeline>) => [
	{t: BASE.press, src: 'kenney-click_002.ogg', volume: 0.2},
	{t: L.freeze, src: 'mixkit-1492.mp3', volume: 0.3},
	{t: L.freeze + 0.05, src: 'kenney-impactSoft_heavy_000.ogg', volume: 0.4},
	{t: L.pills[0][0].t - 0.3, src: 'mixkit-2577.mp3', volume: 0.25},
	...L.pills.slice(1).map((p) => ({t: p[0].t - 0.12, src: 'mixkit-3115.mp3', volume: 0.13})),
	...(L.youAt ? [{t: L.youAt - 0.06, src: 'mixkit-2577.mp3', volume: 0.3}] : []),
	{t: L.flood, src: 'mixkit-1492.mp3', volume: 0.3},
	{t: L.flood + 0.59, src: 'kenney-impactWood_light_000.ogg', volume: 0.34},
	{t: L.outs[0].t - 0.08, src: 'mixkit-2577.mp3', volume: 0.3},
	{t: L.contract, src: 'mixkit-1492.mp3', volume: 0.3},
	{t: L.contract + 0.45, src: 'kenney-impactSoft_heavy_000.ogg', volume: 0.3},
	{t: L.playPress, src: 'kenney-click_002.ogg', volume: 0.2},
];

const Line: React.FC<{t: number; words: Word[]; out: number}> = ({t, words, out}) => (
	<div>
		{words.map((w, i) => (
			<React.Fragment key={i}>
				<Rise t={t} at={w.start - 0.06} out={out + i * 0.025}>
					{w.w}
				</Rise>
				{i < words.length - 1 ? ' ' : null}
			</React.Fragment>
		))}
	</div>
);

export const Gag: React.FC<{script?: string}> = ({script = 'superman'}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const tf = Math.floor(t * 50) / 50;
	const L = TLS[script];
	const {freeze, pills, youAt, flood, adStart, adEnd, outs, contract, settle, playPress, resume} = L;
	const textOf = (ws: Word[]) => ws.map((w) => w.w).join(' ');

	const k = pulse(t, freeze, settle, ZOOM_IN, ZOOM_OUT);
	const s = lerp(1, VIDEO.zoom, k) * (1 + 0.015 * Math.max(0, Math.min(t, flood) - freeze) * k);
	const fx = lerp(W / 2, VIDEO.subject.x, k);
	const fy = lerp(H / 2, VIDEO.subject.y, k);
	const ax = lerp(W / 2, VIDEO.anchor.x, k);
	const ay = lerp(H / 2, VIDEO.anchor.y, k);
	const dim = pulse(t, freeze + 0.05, settle, SOFT, ZOOM_OUT);
	const paused = t >= freeze && t < resume;

	// Pill states: one per pill, a second line makes it taller; the last one makes room for "You".
	const sizes = pills.map((ls, i) => {
		const w = Math.max(...ls.map((l) => pillW(textOf(l.words)))) + (i === pills.length - 1 && youAt ? 16 + YOU_W : 0);
		return {w: 2 * PILL.pad + w, h: ls.length > 1 ? PILL.h2 : PILL.h1};
	});
	const keys = [{t: pills[0][0].t - 0.3, cx: BIRTH.x, cy: BIRTH.y, w: 30, h: 30, r: 15}];
	pills.forEach((ls, i) => {
		const first = {w: 2 * PILL.pad + pillW(textOf(ls[0].words)), h: PILL.h1};
		const one = ls.length > 1 ? first : sizes[i];
		keys.push({t: ls[0].t - (i ? 0.12 : 0.25), cx: PILL.left + one.w / 2, cy: PILL.cy, w: one.w, h: one.h, r: PILL.h1 / 2});
		if (ls.length > 1) keys.push({t: ls[1].t - 0.1, cx: PILL.left + sizes[i].w / 2, cy: PILL.cy, w: sizes[i].w, h: sizes[i].h, r: PILL.h1 / 2});
	});
	if (youAt) {
		const last = sizes[sizes.length - 1];
		keys.push({t: youAt - 0.12, cx: PILL.left + last.w / 2, cy: PILL.cy, w: last.w, h: last.h, r: PILL.h1 / 2});
	}
	const pill = morphGlide(t, keys, 0.42, 0.6);
	pill.r = Math.min(pill.w, pill.h, PILL.h1) / 2;
	const pillIn = step(t - (pills[0][0].t - 0.3), POP);

	// The ad's own "You", landing at the end of the last line, then flying to the ad's first frame.
	const lastLine = pills[pills.length - 1];
	const youX = PILL.left + PILL.pad + pillW(textOf(lastLine[lastLine.length - 1].words)) + 16;
	const youY = PILL.cy + (lastLine.length > 1 ? PILL.line / 2 : 0) - YOU_H / 2 - 2;
	const fly = glide(t, flood + 0.02, 0.62);
	const you = {x: lerp(youX, AD.you.x, fly), y: lerp(youY, AD.you.y, fly), w: lerp(YOU_W, AD.you.w, fly), h: lerp(YOU_H, AD.you.h, fly)};
	const youPop = youAt ? step(t - (youAt - 0.06), POP) : 0;

	const pc = {x: pill.cx, y: PILL.cy};
	const radius = (tt: number) => {
		const ck = EASE(clamp01((tt - contract) / 0.5));
		return ck > 0 ? Math.sqrt(1 - ck) * far(PLAY_BTN.x, PLAY_BTN.y) : Math.sqrt(EASE(clamp01((tt - flood) / 0.5))) * far(pc.x, pc.y);
	};
	const r = radius(t);
	const feather = Math.max(1.5, Math.abs(r - radius(t - 1 / 50)));
	const centre = t >= contract ? PLAY_BTN : pc;

	// Way back: one dark pill on the ad's last frame, widening with each line.
	const outWords = outs.flatMap((o) => o.words);
	const back = morphGlide(t, [
		{t: outs[0].t - 0.12, cx: 960, cy: BACK.cy, w: 30, h: 30, r: 15},
		...outs.map((o, i) => {
			const w = 2 * BACK.pad + backW(textOf(outs.slice(0, i + 1).flatMap((x) => x.words)));
			return {t: o.t - (i ? 0.12 : 0.08), cx: 960, cy: BACK.cy, w, h: BACK.h, r: BACK.h / 2};
		}),
	], 0.42, 0.6);
	const backIn = step(t - (outs[0].t - 0.12), POP);

	const controls = 1 - glide(t, flood, 0.3) + glide(t, adEnd + 0.15, 0.35) - glide(t, resume + 1.0, 0.4);
	const cursor = [
		{t: 0, x: 1780, y: 1220},
		{t: 0.2, x: PLAY_BTN.x, y: PLAY_BTN.y + 2},
		{t: 1.4, x: 1480, y: 960},
		{t: flood, x: 1760, y: 1250},
		{t: adEnd + 0.15, x: 1300, y: 880},
		{t: settle - 0.35, x: PLAY_BTN.x, y: PLAY_BTN.y + 2},
		{t: resume + 0.5, x: 1500, y: 1240},
	];
	const cx = glides(t, cursor.map((c) => ({t: c.t, v: c.x, d: 0.8})));
	const cy = glides(t, cursor.map((c) => ({t: c.t, v: c.y, d: 0.8})));
	const pressK = pulse(t, BASE.press, BASE.press + 0.12, QUICK) + pulse(t, playPress, playPress + 0.12, QUICK);
	const sourceSeconds = (x: number) => (x < freeze ? VIDEO.leadIn + x * VIDEO.leadInRate : x < resume ? VIDEO.freezeAt : VIDEO.freezeAt + (x - resume));
	const text: React.CSSProperties = {fontFamily, fontWeight: 600, fontSize: PILL.font, lineHeight: `${PILL.line}px`, letterSpacing: '-0.03em', color: WHITE, textShadow: '0 1px 12px rgba(0,0,0,0.18)', whiteSpace: 'nowrap'};

	return (
		<AbsoluteFill style={{background: INK, overflow: 'hidden'}}>
			<AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${ax - fx * s}px, ${ay - fy * s}px) scale(${s})`}}>
				<Sequence durationInFrames={Math.round((freeze - 0.06) * fps)}>
					<OffthreadVideo src={staticFile(VIDEO.leadInClip)} muted />
				</Sequence>
				{t >= freeze - 0.06 && t < freeze && <SourceFrame s={VIDEO.leadIn + t * VIDEO.leadInRate} />}
				{paused && (
					<>
						<Img src={staticFile(VIDEO.freeze)} style={{position: 'absolute', width: W, height: H, filter: `brightness(${1 - 0.42 * dim}) saturate(${1 - 0.3 * dim}) blur(${4 * dim}px)`}} />
						<Img src={staticFile(VIDEO.person)} style={{position: 'absolute', width: W, height: H, transformOrigin: `${VIDEO.subject.x}px ${VIDEO.subject.y}px`, transform: `scale(${1 + 0.025 * dim})`, filter: `drop-shadow(0 ${18 * dim}px ${26 * dim}px rgba(0,0,0,${0.45 * dim}))`}} />
						<Brackets t={t} box={SUBJECT_BOX} at={freeze + 0.12} out={pills[0][0].t - 0.1} scale={s} />
					</>
				)}
				<Sequence from={Math.round(resume * fps)}>
					<OffthreadVideo src={staticFile(VIDEO.clip)} trimBefore={Math.round(VIDEO.freezeAt * fps)} muted />
				</Sequence>
			</AbsoluteFill>
			{paused && (t < adStart || t >= contract) && <Vignette k={dim} strength={0.45} />}
			<Letterbox k={glide(t, freeze, 0.5) - glide(t, flood, 0.4) + glide(t, contract, 0.4) - glide(t, resume, 0.5)} />

			{paused && t > pills[0][0].t - 0.3 && t < adStart && (
				<div style={{position: 'absolute', left: pill.left, top: pill.top, width: pill.w, height: pill.h, borderRadius: pill.r, ...glass(false), transform: `scale(${pillIn})`, overflow: 'hidden'}}>
					<Aura t={t} k={0.35 * glide(t, pills[0][0].t, 0.8) + 0.35 * glide(t, (youAt ?? flood) - 0.3, 0.6)} />
					<RimLight t={t} radius={pill.r} />
					{pills.map((ls, i) => {
						const next = i < pills.length - 1 ? pills[i + 1][0].t - 0.22 : flood;
						const two = ls.length > 1 ? glide(t, ls[1].t - 0.1, 0.6) : 0;
						return (
							<div key={i} style={{position: 'absolute', left: PILL.left + PILL.pad - pill.left, top: PILL.cy - PILL.line / 2 - (PILL.line / 2) * two - pill.top, ...text}}>
								{ls.map((l) => (
									<Line key={l.key} t={t} words={l.words} out={next} />
								))}
							</div>
						);
					})}
				</div>
			)}

			{t >= flood && r > 0.5 && (
				<AbsoluteFill style={{background: AD.paper, maskImage: `radial-gradient(circle ${r}px at ${centre.x}px ${centre.y}px, #000 ${Math.max(0, r - feather)}px, transparent ${r}px)`}}>
					{/* without the flying "You", the ad's first frame shows through the flood */}
					{!youAt && t < adEnd && <Img src={staticFile(AD.first)} style={{position: 'absolute', width: W, height: H, opacity: glide(t, flood + 0.25, 0.4)}} />}
					{t >= adEnd && <Img src={staticFile(AD.last)} style={{position: 'absolute', width: W, height: H}} />}
					{t >= adEnd && (
						<div style={{position: 'absolute', left: back.left, top: back.top, width: back.w, height: back.h, borderRadius: back.r, background: INK, overflow: 'hidden', transform: `scale(${backIn})`, boxShadow: '0 16px 40px rgba(0,0,0,0.18)'}}>
							<RimLight t={t} radius={back.r} colors={[PALETTE.orange, PALETTE.lilac]} />
							<div style={{position: 'absolute', left: BACK.pad, top: 0, height: BACK.h, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 600, fontSize: 40, letterSpacing: '-0.02em', color: WHITE, whiteSpace: 'pre'}}>
								<Line t={t} words={outWords} out={Infinity} />
							</div>
						</div>
					)}
				</AbsoluteFill>
			)}

			{youAt && t >= youAt - 0.06 && t < adStart && (
				<div style={{position: 'absolute', left: you.x, top: you.y, width: you.w, height: you.h, transform: `scale(${youPop})`, transformOrigin: 'center'}}>
					<div style={{position: 'absolute', inset: 0, background: mix('#ffffff', AD.letterInk, fly), WebkitMaskImage: `url(${staticFile(AD.you.letters)})`, WebkitMaskSize: '100% 100%', maskImage: `url(${staticFile(AD.you.letters)})`, maskSize: '100% 100%'}} />
					<Img src={staticFile(AD.you.sun)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
				</div>
			)}

			<Player controls={clamp01(controls)} progress={clamp01((SHOWN.at + sourceSeconds(tf)) / SHOWN.length)} paused={paused} press={pressK} time={SHOWN.at + sourceSeconds(tf)} length={SHOWN.length} />
			<EdgeRing x={centre.x} y={centre.y} r={r} k={t >= contract ? EASE(clamp01((t - contract) / 0.5)) : EASE(clamp01((t - flood) / 0.5))} />
			<Ripple t={t} at={BASE.press} x={PLAY_BTN.x} y={PLAY_BTN.y} />
			<Ripple t={t} at={playPress} x={PLAY_BTN.x} y={PLAY_BTN.y} />
			<Cursor x={cx} y={cy} press={pressK} />

			{L.cues.map((c) => (
				<Sequence key={c.key + c.t} from={Math.round(c.t * fps)}>
					<Audio src={staticFile(c.file)} />
				</Sequence>
			))}
			{sfx(L).map((e, i) => (
				<Sequence key={i} from={Math.round(e.t * fps)}>
					<Audio src={staticFile(`sfx/${e.src}`)} volume={e.volume} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
