// Billboard: the ad lives in the video's own world. On pause, a flat surface of the scene (here the
// black tarp on the fence behind him) lights up like a stadium LED board showing the ad's first
// frame, then the camera dives into it until the board is the screen: the ad starts. Back: the
// camera pulls out of the board, it switches off, play. Silent, or with a narrator line (LINES). Needs a flat surface in the frame
// (found by Muse Spark, segmented by SAM 3.1 in the product); here it is measured by hand.

import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {AD, T as GAG, VIDEO} from '../ad';
import {Ripple} from '../details';
import {H, PLAY_BTN, Player, SHOWN, W, SourceFrame} from '../kit';
import {QUICK, clamp01, glide, glides, lerp, morphGlide, pulse, step} from '../motion';
import {textWidth} from '../textWidth';
import {Cursor, INK, WHITE, Word, Words, fontFamily, glass} from '../ui';
import look from '../../public/voice/bb_look/lines.json';
import behind from '../../public/voice/bb_behind/lines.json';
import {snap, voiceSet} from './voice';

// The board: 16:9, on the left tarp panel (source-frame coordinates). The lamp post stands in front.
const BOARD = {x: 608, y: 450, w: 290, h: (290 * 9) / 16};
const C0 = {x: BOARD.x + BOARD.w / 2, y: BOARD.y + BOARD.h / 2};
const DIVE = W / BOARD.w; // camera scale at which the board is the screen
const POLE = {x: 736, w: 18, y: 380, h: 300};

const press = GAG.press;
const freeze = GAG.freeze;
const DIVE_D = 1.25;

// Spoken versions (Reda: "on ne dit rien", e.g. "Look at that"): a narrator line, the board
// switching on with it, a line on the way back. `on` is where in the line the board lights up.
type Line = [key: string, gapAfter: number];
const LINES: Record<string, {voice: Parameters<typeof voiceSet>[0]; in: Line[]; onAt: number; out: Line[]}> = {
	look: {voice: look, in: [['wait', 0.35], ['look', 0.6]], onAt: -0.05, out: [['anyway', 0.25]]},
	behind: {voice: behind, in: [['psst', 0.3], ['behind', 0.6]], onAt: 0.2, out: [['okay', 0.25], ['eyes', 0.2]]},
};

export const timeline = (name?: string) => {
	const script = name ? LINES[name] : null;
	const V = script ? voiceSet(script.voice) : null;
	const cues: {key: string; t: number; words: Word[]; file: string}[] = [];
	let at = freeze + 0.5;
	const cue = ([key, gap]: Line) => {
		const c = {key, t: at, words: V!.words(key, at), file: V!.line(key).file};
		cues.push(c);
		at = V!.end(key, at) + gap;
		return c;
	};
	const ins = script ? script.in.map(cue) : [];
	const on = script ? ins[ins.length - 1].t + script.onAt : freeze + 0.75;
	const dive = script ? at : on + 1.15;
	const adStart = snap(dive + DIVE_D);
	const adEnd = adStart + AD.duration;
	const pull = adEnd + 0.35;
	at = pull + DIVE_D + 0.15;
	const outs = script ? script.out.map(cue) : [];
	const off = script ? at + 0.1 : pull + DIVE_D + 0.5;
	const settle = off + 0.4;
	const playPress = settle + 0.45;
	const resume = playPress + 0.12;
	return {on, dive, adStart, adEnd, pull, off, settle, playPress, resume, ins, outs, cues, total: resume + (VIDEO.end - VIDEO.freezeAt) + 0.4};
};
export const TL = timeline();
export const TLS = Object.fromEntries(Object.keys(LINES).map((k) => [k, timeline(k)]));

const sourceSeconds = (t: number, resume: number) => (t < freeze ? VIDEO.leadIn + t * VIDEO.leadInRate : t < resume ? VIDEO.freezeAt : VIDEO.freezeAt + (t - resume));

const sfxFor = (L: ReturnType<typeof timeline>) => [
	{t: press, src: 'kenney-click_002.ogg', volume: 0.2},
	{t: freeze, src: 'kenney-impactSoft_heavy_000.ogg', volume: 0.25},
	{t: L.on, src: 'kenney-switch1.ogg', volume: 0.4},
	{t: L.on + 0.05, src: 'kenney-glass_002.ogg', volume: 0.12},
	{t: L.dive, src: 'mixkit-1492.mp3', volume: 0.3},
	{t: L.pull, src: 'mixkit-1492.mp3', volume: 0.25},
	{t: L.off, src: 'kenney-switch2.ogg', volume: 0.35},
	{t: L.playPress, src: 'kenney-click_002.ogg', volume: 0.2},
];

// The narrator's caption: a glass pill above the board, sized to its words.
const CAP = {left: 560, cy: 330, h: 96, font: 44, pad: 40};
const Caption: React.FC<{t: number; lines: {t: number; words: Word[]}[]; out: number}> = ({t, lines, out}) => {
	if (!lines.length || t < lines[0].t - 0.2 || t > out + 0.5) return null;
	const text = (ls: {words: Word[]}[]) => ls.flatMap((l) => l.words).map((w) => w.w).join(' ');
	const box = morphGlide(t, [
		{t: lines[0].t - 0.2, cx: CAP.left + 20, cy: CAP.cy, w: 40, h: 40, r: 20},
		...lines.map((l, i) => {
			const w = 2 * CAP.pad + textWidth(text(lines.slice(0, i + 1)), CAP.font, -0.02);
			return {t: l.t - (i ? 0.12 : 0.15), cx: CAP.left + w / 2, cy: CAP.cy, w, h: CAP.h, r: CAP.h / 2};
		}),
	], 0.42, 0.6);
	const k = step(t - (lines[0].t - 0.2), {response: 0.38, damping: 0.78}) * (1 - glide(t, out, 0.3));
	return (
		<div style={{position: 'absolute', left: box.left, top: box.top, width: box.w, height: box.h, borderRadius: Math.min(box.w, box.h) / 2, ...glass(false), transform: `scale(${k})`, overflow: 'hidden'}}>
			<div style={{position: 'absolute', left: CAP.pad, top: 0, height: CAP.h, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 600, fontSize: CAP.font, letterSpacing: '-0.02em', color: WHITE, whiteSpace: 'pre', textShadow: '0 1px 12px rgba(0,0,0,0.2)'}}>
				<span>
					<Words t={t} words={lines.flatMap((l) => l.words)} />
				</span>
			</div>
		</div>
	);
};

export const Billboard: React.FC<{line?: string}> = ({line}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const tf = Math.floor(t * 50) / 50;
	const L = line ? TLS[line] : TL;
	const {on, dive, adStart, adEnd, pull, off, settle, playPress, resume} = L;
	const paused = t >= freeze && t < resume;

	// Camera: u = 0 the frame as shot, u = 1 inside the board. Zoom in log space, so the dive keeps speed.
	const u = 0.06 * glide(t, freeze + 0.2, 1.2) + 0.94 * glide(t, dive, DIVE_D) - 0.94 * glide(t, pull, DIVE_D) - 0.06 * glide(t, settle - 0.2, 0.8);
	const s = Math.exp(u * Math.log(DIVE));
	const bx = lerp(C0.x, W / 2, u);
	const by = lerp(C0.y, H / 2, u);

	// The board switches on column by column (and off the other way), with a little flicker.
	const lit = glide(t, on, 0.38) - glide(t, off, 0.38);
	const flicker = t > on && t < on + 0.3 ? (Math.floor((t - on) * 40) % 3 === 1 ? 0.75 : 1) : 1;
	const dim = glide(t, freeze + 0.1, 0.6) - glide(t, settle, 0.6);
	const led = 1 - glide(t, dive + DIVE_D * 0.45, DIVE_D * 0.5) + glide(t, pull, DIVE_D * 0.5);

	const controls = 1 - glide(t, dive, 0.3) + glide(t, off - 0.2, 0.35) - glide(t, resume + 1.0, 0.4);
	const keys = [
		{t: 0, x: 1780, y: 1220},
		{t: 0.2, x: PLAY_BTN.x, y: PLAY_BTN.y + 2},
		{t: 1.4, x: 1480, y: 960},
		{t: dive, x: 1760, y: 1250},
		{t: off - 0.3, x: 1300, y: 880},
		{t: settle - 0.3, x: PLAY_BTN.x, y: PLAY_BTN.y + 2},
		{t: resume + 0.5, x: 1500, y: 1240},
	];
	const cx = glides(t, keys.map((c) => ({t: c.t, v: c.x, d: 0.8})));
	const cy = glides(t, keys.map((c) => ({t: c.t, v: c.y, d: 0.8})));
	const pressK = pulse(t, press, press + 0.12, QUICK) + pulse(t, playPress, playPress + 0.12, QUICK);
	// The lamp post is nearer than the fence: it slides out of the way faster than the camera moves.
	const poleAway = glide(t, dive, DIVE_D * 0.8) - glide(t, pull + DIVE_D * 0.2, DIVE_D * 0.8);

	return (
		<AbsoluteFill style={{background: INK, overflow: 'hidden'}}>
			<AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${bx - C0.x * s}px, ${by - C0.y * s}px) scale(${s})`}}>
				<Sequence durationInFrames={Math.round((freeze - 0.06) * fps)}>
					<OffthreadVideo src={staticFile(VIDEO.leadInClip)} muted />
				</Sequence>
				{/* the slow-motion clip's last frames decode black: bridge them with source frames */}
				{t >= freeze - 0.06 && t < freeze && <SourceFrame s={VIDEO.leadIn + t * VIDEO.leadInRate} />}
				{paused && <Img src={staticFile(VIDEO.freeze)} style={{position: 'absolute', width: W, height: H, filter: `brightness(${1 - 0.22 * dim}) saturate(${1 - 0.15 * dim})`}} />}
				<Sequence from={Math.round(resume * fps)}>
					<OffthreadVideo src={staticFile(VIDEO.clip)} trimBefore={Math.round(VIDEO.freezeAt * fps)} muted />
				</Sequence>
				{lit > 0.001 && (
					<>
						{/* light spilling on the fence and the ground around the board */}
						<div style={{position: 'absolute', left: BOARD.x - 160, top: BOARD.y - 120, width: BOARD.w + 320, height: BOARD.h + 300, background: 'radial-gradient(ellipse at 50% 40%, rgba(252,230,210,0.45), transparent 65%)', mixBlendMode: 'screen', opacity: lit * led}} />
						<div style={{position: 'absolute', left: BOARD.x, top: BOARD.y, width: BOARD.w, height: BOARD.h, overflow: 'hidden', clipPath: `inset(0 ${(1 - lit) * 100}% 0 0)`, filter: `brightness(${flicker * lerp(0.9, 1, 1 - led)})`, outline: `${2 * led}px solid #111`}}>
							<Img src={staticFile(t < adEnd ? 'ad/first.png' : 'ad/last.png')} style={{width: '100%', height: '100%'}} />
							{/* LED pitch, gone once we are inside the board */}
							<div style={{position: 'absolute', inset: 0, opacity: 0.35 * led, backgroundImage: 'radial-gradient(circle, transparent 0 0.55px, rgba(0,0,0,0.55) 0.75px)', backgroundSize: '2px 2px'}} />
							<div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 6px rgba(0,0,0,0.5)', opacity: led}} />
						</div>
						{/* the lamp post, in front of the board */}
						<Img
							src={staticFile(VIDEO.freeze)}
							style={{position: 'absolute', width: W, height: H, clipPath: `inset(${POLE.y}px ${W - POLE.x - POLE.w}px ${H - POLE.y - POLE.h}px ${POLE.x}px)`, transform: `translateX(${-poleAway * 260}px)`, opacity: 1 - poleAway, filter: `brightness(${1 - 0.22 * dim})`}}
						/>
					</>
				)}
			</AbsoluteFill>

			<Caption t={t} lines={L.ins} out={dive + 0.1} />
			<Caption t={t} lines={L.outs} out={off} />
			<Player controls={clamp01(controls)} progress={clamp01((SHOWN.at + sourceSeconds(tf, resume)) / SHOWN.length)} paused={paused} press={pressK} time={SHOWN.at + sourceSeconds(tf, resume)} length={SHOWN.length} />
			<Ripple t={t} at={press} x={PLAY_BTN.x} y={PLAY_BTN.y} />
			<Ripple t={t} at={playPress} x={PLAY_BTN.x} y={PLAY_BTN.y} />
			<Cursor x={cx} y={cy} press={pressK} />

			{L.cues.map((c) => (
				<Sequence key={c.key + c.t} from={Math.round(c.t * fps)}>
					<Audio src={staticFile(c.file)} />
				</Sequence>
			))}
			{sfxFor(L).map((e, i) => (
				<Sequence key={i} from={Math.round(e.t * fps)}>
					<Audio src={staticFile(`sfx/${e.src}`)} volume={e.volume} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
