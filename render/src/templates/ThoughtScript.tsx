// Thought, driven by a script: the same bubble as Thought (which stays as Reda validated it), with
// the person's inner lines taken from data (src/templates/thoughts.ts). Rule from Reda's feedback:
// the thought must come from what the person is doing in the video and lead to the ad's message.

import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {AD, T as GAG, VIDEO} from '../ad';
import {Aura, PALETTE, RimLight, Ripple, Vignette} from '../details';
import {H, PLAY_BTN, Player, SHOWN, SourceFrame, W, far} from '../kit';
import {EASE, QUICK, SOFT, Spring, clamp01, glide, glides, lerp, morphGlide, pulse, step} from '../motion';
import {textWidth} from '../textWidth';
import {Cursor, INK, WHITE, Word, Words, fontFamily, glass} from '../ui';
import {THOUGHTS, ThoughtScript as Script} from './thoughts';
import {snap, voiceSet} from './voice';

const POP: Spring = {response: 0.38, damping: 0.78};
const ZOOM_IN: Spring = {response: 0.6, damping: 0.95};
const ZOOM_OUT: Spring = {response: 0.8, damping: 1};
const PUFF_AT = [0.45, 0.6, 0.75];
// Puffs and bubble rise from the head, measured on screen once the camera has zoomed in (offsets
// tuned on the parkour clip, the bubble kept inside the frame).
const HEAD = {x: VIDEO.anchor.x + (VIDEO.head.x - VIDEO.subject.x) * VIDEO.zoom, y: VIDEO.anchor.y + (VIDEO.head.y - VIDEO.subject.y) * VIDEO.zoom};
const LIFT = Math.min(206, HEAD.y - 150); // how far above the head the bubble sits
const PUFFS = [
	{x: HEAD.x + 118, y: HEAD.y - LIFT * 0.53, r: 11},
	{x: HEAD.x + 172, y: HEAD.y - LIFT * 0.77, r: 17},
	{x: HEAD.x + 244, y: HEAD.y - LIFT, r: 25},
];
const BUB = {left: HEAD.x + 292, cy: HEAD.y - LIFT, h1: 116, h2: 176, font: 50, line: 60, pad: 50};
const BACK = {left: 840, cy: 640, h: 96, font: 42, pad: 44};
const bubW = (s: string) => textWidth(s, BUB.font, -0.03);
const backW = (s: string) => textWidth(s, BACK.font, -0.02);
const textOf = (ws: Word[]) => ws.map((w) => w.w).join(' ');

export const timeline = (script: Script) => {
	const V = voiceSet(script.voice);
	const freeze = GAG.freeze;
	let at = freeze + 1.05;
	const cues: {key: string; t: number; words: Word[]; file: string}[] = [];
	const cue = ([key, gap]: [string, number]) => {
		const c = {key, t: at, words: V.words(key, at), file: V.line(key).file};
		cues.push(c);
		at = V.end(key, at) + gap;
		return c;
	};
	const bubbles = script.bubbles.map((lines) => lines.map(cue));
	const flood = at;
	const adStart = snap(flood + 0.7);
	const adEnd = adStart + AD.duration;
	at = adEnd + 0.55;
	const outs = script.out.map(cue);
	const contract = at;
	const settle = contract + 0.45;
	const playPress = settle + 0.5;
	const resume = playPress + 0.12;
	return {freeze, bubbles, flood, adStart, adEnd, outs, contract, settle, playPress, resume, cues, total: resume + (VIDEO.end - VIDEO.freezeAt) + 0.4};
};
export const TLS = Object.fromEntries(Object.entries(THOUGHTS).map(([k, s]) => [k, timeline(s)]));

export const ThoughtScripted: React.FC<{script: string}> = ({script}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const tf = Math.floor(t * 50) / 50;
	const L = TLS[script];
	const {freeze, bubbles, flood, adStart, adEnd, outs, contract, settle, playPress, resume} = L;
	const press = GAG.press;
	const first = bubbles[0][0].t;

	const k = pulse(t, freeze, settle, ZOOM_IN, ZOOM_OUT);
	const s = lerp(1, VIDEO.zoom, k) * (1 + 0.012 * Math.max(0, Math.min(t, flood) - freeze) * k);
	const fx = lerp(W / 2, VIDEO.subject.x, k);
	const fy = lerp(H / 2, VIDEO.subject.y, k);
	const ax = lerp(W / 2, VIDEO.anchor.x, k);
	const ay = lerp(H / 2, VIDEO.anchor.y, k);
	const dim = pulse(t, freeze + 0.05, settle, SOFT, ZOOM_OUT);
	const paused = t >= freeze && t < resume;

	// Bubble states: one per bubble; a second line makes it taller and lowers it a little.
	const keys = [{t: first - 0.2, cx: PUFFS[2].x + 30, cy: PUFFS[2].y, w: 40, h: 40, r: 20}];
	const size = (lines: {words: Word[]}[]) => {
		const w = 2 * BUB.pad + Math.max(...lines.map((l) => bubW(textOf(l.words))));
		return lines.length > 1 ? {w, h: BUB.h2, cy: BUB.cy + 10} : {w, h: BUB.h1, cy: BUB.cy};
	};
	bubbles.forEach((ls, i) => {
		const one = size([ls[0]]);
		keys.push({t: ls[0].t - (i ? 0.12 : 0.15), cx: BUB.left + one.w / 2, cy: one.cy, w: one.w, h: one.h, r: one.h / 2});
		if (ls.length > 1) {
			const two = size(ls);
			keys.push({t: ls[1].t - 0.1, cx: BUB.left + two.w / 2, cy: two.cy, w: two.w, h: two.h, r: two.h / 2});
		}
	});
	const bub = morphGlide(t, keys, 0.42, 0.6);
	bub.r = Math.min(bub.w, bub.h) / 2;
	const bubIn = step(t - (first - 0.2), POP);
	const last = size(bubbles[bubbles.length - 1]);

	const bc = {x: BUB.left + last.w / 2, y: last.cy};
	const radius = (tt: number) => {
		const ck = EASE(clamp01((tt - contract) / 0.5));
		return ck > 0 ? Math.sqrt(1 - ck) * far(PLAY_BTN.x, PLAY_BTN.y) : Math.sqrt(EASE(clamp01((tt - flood) / 0.5))) * far(bc.x, bc.y);
	};
	const r = radius(t);
	const feather = Math.max(1.5, Math.abs(r - radius(t - 1 / 50)));
	const centre = t >= contract ? PLAY_BTN : bc;

	// The answer on the ad's last frame: a dark bubble, widening with each line.
	const outWords = outs.flatMap((o) => o.words);
	const back = morphGlide(t, [
		{t: outs[0].t - 0.12, cx: BACK.left + 15, cy: BACK.cy, w: 30, h: 30, r: 15},
		...outs.map((o, i) => {
			const w = 2 * BACK.pad + backW(textOf(outs.slice(0, i + 1).flatMap((x) => x.words)));
			return {t: o.t - (i ? 0.12 : 0.08), cx: BACK.left + w / 2, cy: BACK.cy, w, h: BACK.h, r: BACK.h / 2};
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
	const pressK = pulse(t, press, press + 0.12, QUICK) + pulse(t, playPress, playPress + 0.12, QUICK);
	const sourceSeconds = (x: number) => (x < freeze ? VIDEO.leadIn + x * VIDEO.leadInRate : x < resume ? VIDEO.freezeAt : VIDEO.freezeAt + (x - resume));
	const text: React.CSSProperties = {fontFamily, fontWeight: 600, fontSize: BUB.font, lineHeight: `${BUB.line}px`, letterSpacing: '-0.03em', color: WHITE, textShadow: '0 1px 12px rgba(0,0,0,0.18)', whiteSpace: 'nowrap'};
	const sfx = [
		{t: press, src: 'kenney-click_002.ogg', volume: 0.2},
		{t: freeze, src: 'mixkit-1492.mp3', volume: 0.22},
		...PUFF_AT.map((d, i) => ({t: freeze + d, src: 'mixkit-2577.mp3', volume: 0.12 + 0.04 * i})),
		{t: first - 0.15, src: 'mixkit-2577.mp3', volume: 0.25},
		...bubbles.flatMap((ls, i) => [...(i ? [ls[0]] : []), ...ls.slice(1)]).map((c) => ({t: c.t - 0.1, src: 'mixkit-3115.mp3', volume: 0.12})),
		{t: flood, src: 'mixkit-1492.mp3', volume: 0.28},
		{t: outs[0].t - 0.12, src: 'mixkit-2577.mp3', volume: 0.28},
		{t: contract, src: 'mixkit-1492.mp3', volume: 0.25},
		{t: playPress, src: 'kenney-click_002.ogg', volume: 0.2},
		{t: resume + 0.15, src: 'kenney-impactWood_light_000.ogg', volume: 0.25},
	];

	return (
		<AbsoluteFill style={{background: INK, overflow: 'hidden'}}>
			<AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${ax - fx * s}px, ${ay - fy * s}px) scale(${s})`}}>
				<Sequence durationInFrames={Math.round((freeze - 0.06) * fps)}>
					<OffthreadVideo src={staticFile(VIDEO.leadInClip)} muted />
				</Sequence>
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

			{t < adStart &&
				PUFFS.map((p, i) => {
					const pk = step(t - (freeze + PUFF_AT[i]), POP) * (1 - glide(t, flood - 0.05, 0.25));
					return pk > 0.001 ? <div key={i} style={{position: 'absolute', left: p.x - p.r, top: p.y - p.r, width: 2 * p.r, height: 2 * p.r, borderRadius: p.r, ...glass(false), transform: `scale(${pk})`}} /> : null;
				})}
			{t > first - 0.2 && t < adStart && (
				<div style={{position: 'absolute', left: bub.left, top: bub.top, width: bub.w, height: bub.h, borderRadius: bub.r, ...glass(false), transform: `scale(${bubIn})`, overflow: 'hidden'}}>
					<Aura t={t} k={0.3 * glide(t, first, 0.8) + 0.3 * glide(t, bubbles[bubbles.length - 1][0].t, 0.6)} />
					<RimLight t={t} radius={bub.r} />
					{bubbles.map((ls, i) => {
						const next = i < bubbles.length - 1 ? bubbles[i + 1][0].t - 0.25 : flood;
						const two = ls.length > 1 ? glide(t, ls[1].t - 0.1, 0.6) : 0;
						const cyI = ls.length > 1 ? BUB.cy + 10 * two : BUB.cy;
						return (
							<div key={i} style={{position: 'absolute', left: BUB.left + BUB.pad - bub.left, top: cyI - BUB.line / 2 - (BUB.line / 2) * two - bub.top, ...text}}>
								{ls.map((l) => (
									<div key={l.key}>
										<Words t={t} words={l.words} out={next} />
									</div>
								))}
							</div>
						);
					})}
				</div>
			)}

			{t >= flood && r > 0.5 && (
				<AbsoluteFill style={{background: AD.paper, maskImage: `radial-gradient(circle ${r}px at ${centre.x}px ${centre.y}px, #000 ${Math.max(0, r - feather)}px, transparent ${r}px)`}}>
					<Img src={staticFile(t < adEnd ? AD.first : AD.last)} style={{position: 'absolute', width: W, height: H, opacity: t < adEnd ? glide(t, flood + 0.25, 0.4) : 1}} />
					{t >= adEnd && (
						<>
							{[{x: BACK.left - 10, y: BACK.cy + 72, r: 9, d: 0.2}, {x: BACK.left + 30, y: BACK.cy + 42, r: 14, d: 0.1}].map((p, i) => {
								const pk = step(t - (outs[0].t - 0.12 - p.d), POP);
								return <div key={i} style={{position: 'absolute', left: p.x - p.r, top: p.y - p.r, width: 2 * p.r, height: 2 * p.r, borderRadius: p.r, background: INK, transform: `scale(${pk})`}} />;
							})}
							<div style={{position: 'absolute', left: back.left, top: back.top, width: back.w, height: back.h, borderRadius: back.r, background: INK, overflow: 'hidden', transform: `scale(${backIn})`, boxShadow: '0 16px 40px rgba(0,0,0,0.18)'}}>
								<RimLight t={t} radius={back.r} colors={[PALETTE.orange, PALETTE.lilac]} />
								<div style={{position: 'absolute', left: BACK.pad, top: 0, height: BACK.h, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 600, fontSize: BACK.font, letterSpacing: '-0.02em', color: WHITE, whiteSpace: 'pre'}}>
									<span>
										<Words t={t} words={outWords} />
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

			{L.cues.map((c) => (
				<Sequence key={c.key + c.t} from={Math.round(c.t * fps)}>
					<Audio src={staticFile(c.file)} />
				</Sequence>
			))}
			{sfx.map((e, i) => (
				<Sequence key={i} from={Math.round(e.t * fps)}>
					<Audio src={staticFile(`sfx/${e.src}`)} volume={e.volume} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
