// Replay: for sport, action, gaming highlights. A broadcast voice stops the video ("Wait, wait,
// wait"), rewinds it, replays the move in slow motion, draws the jump's line on the frozen frame,
// and hands over to the sponsor: "This replay is brought to you by..." The ad then floods out of
// the landing spot. (Base44's ad opens on "You": the sentence ends on the ad's own first word.)

import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import json from '../../public/voice/replay/lines.json';
import {AD, VIDEO} from '../ad';
import {PALETTE} from '../details';
import {H, Player, SHOWN, SourceFrame, W, far, ramp} from '../kit';
import {EASE, clamp01, glide, lerp, pulse, step} from '../motion';
import {INK, Rise, WHITE, Word, fontFamily} from '../ui';
import {snap, voiceSet} from './voice';

const V = voiceSet(json);

// The move, in source-frame coordinates: from his leading hand to where he will land.
const ARC = {x0: 960, y0: 520, cx: 800, cy: 430, x1: 770, y1: 700};
const LAND = {x: ARC.x1, y: ARC.y1};
const ZOOM = 1.35;

const SRC0 = VIDEO.freezeAt - 1.3;
const stop = 1.3; // first stop, on the peak
const rewind = stop + 0.25;
const REWIND = 0.75; // back 0.8 s of source
const BACK = 0.8;
const replay = rewind + REWIND + 0.15; // 0.5x, easing to a stop on the peak
const SLOW_RATE = 0.5;
const easeIn = replay + (BACK - (SLOW_RATE * 0.5) / 2) / SLOW_RATE;
const freeze = easeIn + 0.5;
const wait = stop - 0.3;
const again = rewind + 0.35;
const look = freeze - 0.1;
const brought = V.end('look', look) + 0.25;
const flood = V.end('brought', brought) + 0.05;
const adStart = snap(flood + 0.65);
const adEnd = adStart + AD.duration;
const back = adEnd + 0.4;
const contract = V.end('back', back) + 0.1;
const resume = contract + 0.55;
export const TL = {adStart, adEnd, resume, total: resume + 1.8};

const CUES = V.cues({wait, again, look, brought, back});
const W_ = Object.fromEntries(CUES.map((c) => [c.key, c.words])) as Record<string, Word[]>;

const src = (t: number) => {
	if (t < stop) return SRC0 + t;
	if (t < rewind) return VIDEO.freezeAt;
	if (t < replay) return VIDEO.freezeAt - BACK * EASE(clamp01((t - rewind) / REWIND));
	if (t < easeIn) return VIDEO.freezeAt - BACK + SLOW_RATE * (t - replay);
	if (t < resume) return VIDEO.freezeAt - (SLOW_RATE * 0.5) / 2 + ramp(t, easeIn, 0.5, SLOW_RATE, 0);
	return VIDEO.freezeAt + (t - resume);
};

const SFX = [
	{t: stop, src: 'kenney-impactSoft_heavy_000.ogg', volume: 0.32},
	{t: rewind, src: 'mixkit-2608.mp3', volume: 0.22},
	{t: replay, src: 'mixkit-166.mp3', volume: 0.14},
	{t: freeze, src: 'kenney-impactSoft_heavy_000.ogg', volume: 0.2},
	{t: freeze + 0.1, src: 'mixkit-3115.mp3', volume: 0.12},
	{t: freeze + 0.65, src: 'mixkit-2577.mp3', volume: 0.22},
	{t: flood, src: 'mixkit-1492.mp3', volume: 0.28},
	{t: back - 0.1, src: 'mixkit-2577.mp3', volume: 0.25},
	{t: contract, src: 'mixkit-1492.mp3', volume: 0.25},
	{t: resume, src: 'kenney-impactWood_light_000.ogg', volume: 0.3},
];

/** Broadcast tag, top left: REPLAY with a rewind or slow-motion glyph. */
const Tag: React.FC<{t: number; k: number; mode: string}> = ({t, k, mode}) =>
	k > 0.001 ? (
		<div style={{position: 'absolute', left: 80, top: 80, height: 64, display: 'flex', clipPath: `inset(0 ${(1 - k) * 100}% 0 0)`, fontFamily, transform: 'skewX(-10deg)'}}>
			<div style={{width: 14, background: PALETTE.deep}} />
			<div style={{background: WHITE, color: INK, padding: '0 26px', display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 800, letterSpacing: '0.08em'}}>REPLAY</div>
			<div style={{background: INK, color: WHITE, padding: '0 22px', display: 'flex', alignItems: 'center', fontSize: 28, fontWeight: 700, letterSpacing: '0.04em', minWidth: 96, justifyContent: 'center'}}>
				<span style={{opacity: 0.6 + 0.4 * Math.abs(Math.sin(t * 6))}}>{mode}</span>
			</div>
		</div>
	) : null;

/** Lower third that writes the sponsor line word by word. */
const Slate: React.FC<{t: number; k: number; words: Word[]; out: number}> = ({t, k, words, out}) =>
	k > 0.001 ? (
		<div style={{position: 'absolute', left: 80, bottom: 150, display: 'flex', clipPath: `inset(0 ${(1 - k) * 100}% 0 0)`, fontFamily, transform: 'skewX(-10deg)'}}>
			<div style={{width: 14, background: PALETTE.deep}} />
			<div style={{background: 'rgba(14,14,16,0.88)', color: WHITE, padding: '18px 34px', fontSize: 44, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'pre'}}>
				{words.map((w, i) => (
					<React.Fragment key={i}>
						<Rise t={t} at={w.start - 0.06} out={out + i * 0.02}>
							{w.w}
						</Rise>
						{i < words.length - 1 ? ' ' : null}
					</React.Fragment>
				))}
			</div>
		</div>
	) : null;

export const Replay: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const tf = Math.floor(t * 50) / 50;
	const s = src(t);

	// Camera pushes in during the slow motion, out as the action resumes.
	const k = glide(t, replay, 1.6) - glide(t, contract + 0.1, 0.8);
	const sc = lerp(1, ZOOM, k);
	const fx = lerp(W / 2, VIDEO.subject.x - 80, k);
	const fy = lerp(H / 2, VIDEO.subject.y + 40, k);
	const toScreen = (x: number, y: number) => ({x: (x - fx) * sc + W / 2, y: (y - fy) * sc + H / 2});

	const draw = glide(t, freeze + 0.1, 0.6);
	const target = step(t - (freeze + 0.62), {response: 0.4, damping: 0.7});
	const lineOut = glide(t, flood - 0.1, 0.3);
	const tagK = glide(t, rewind, 0.4) - glide(t, flood - 0.2, 0.3);
	const slateK = glide(t, brought - 0.1, 0.4) - glide(t, flood + 0.1, 0.3);
	const backK = glide(t, back - 0.1, 0.4) - glide(t, contract + 0.05, 0.3);
	const controls = 1 - glide(t, stop - 0.2, 0.3) + glide(t, contract + 0.4, 0.4) - glide(t, resume + 1.2, 0.4);
	const paused = t >= stop && t < resume;
	const grade = pulse(t, stop, resume, {response: 0.5, damping: 1});

	// The ad floods out of the landing spot, and closes back into it.
	const land = toScreen(LAND.x, LAND.y);
	const radius = (tt: number) => {
		const ck = EASE(clamp01((tt - contract) / 0.5));
		return ck > 0 ? Math.sqrt(1 - ck) * far(land.x, land.y) : Math.sqrt(EASE(clamp01((tt - flood) / 0.55))) * far(land.x, land.y);
	};
	const r = radius(t);
	const feather = Math.max(1.5, Math.abs(r - radius(t - 1 / 50)));

	const d = `M${ARC.x0} ${ARC.y0} Q${ARC.cx} ${ARC.cy} ${ARC.x1} ${ARC.y1}`;
	return (
		<AbsoluteFill style={{background: INK, overflow: 'hidden'}}>
			<AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${W / 2 - fx * sc}px, ${H / 2 - fy * sc}px) scale(${sc})`}}>
				{t < resume ? (
					<SourceFrame s={s} style={{filter: `saturate(${1 - 0.25 * grade}) contrast(${1 + 0.08 * grade})`}} />
				) : (
					<Sequence from={Math.round(resume * fps)}>
						<OffthreadVideo src={staticFile(VIDEO.clip)} trimBefore={Math.round(VIDEO.freezeAt * fps)} muted />
					</Sequence>
				)}
				{/* telestrator: the jump's line and where he lands */}
				{draw > 0 && t < adStart && (
					<svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible', opacity: 1 - lineOut}}>
						<mask id="drawn">
							<path d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth={14 / sc} strokeDasharray={1} strokeDashoffset={1 - draw} />
						</mask>
						<path d={d} fill="none" stroke={WHITE} strokeWidth={5 / sc} strokeLinecap="round" strokeDasharray={`${14 / sc} ${12 / sc}`} mask="url(#drawn)" style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'}} />
						<ellipse cx={LAND.x} cy={LAND.y} rx={46 * target} ry={16 * target} fill="none" stroke={PALETTE.orange} strokeWidth={5 / sc} />
						<ellipse cx={LAND.x} cy={LAND.y} rx={20 * target} ry={7 * target} fill={PALETTE.orange} opacity={0.9} />
					</svg>
				)}
			</AbsoluteFill>
			{/* replay grade: a little darker at the edges while it is ours */}
			<AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,${0.35 * grade}) 100%)`}} />

			<Tag t={t} k={tagK} mode={t < replay ? '◀◀' : t < freeze ? '▶ ½×' : '❚❚'} />
			{t < adStart && <Slate t={t} k={slateK} words={W_.brought} out={flood} />}

			<Player controls={clamp01(controls)} progress={clamp01((SHOWN.at + src(tf)) / SHOWN.length)} paused={paused} press={0} time={SHOWN.at + src(tf)} length={SHOWN.length} />

			{t >= flood && r > 0.5 && (
				<AbsoluteFill style={{background: AD.paper, maskImage: `radial-gradient(circle ${r}px at ${land.x}px ${land.y}px, #000 ${Math.max(0, r - feather)}px, transparent ${r}px)`}}>
					<Img src={staticFile(t < adEnd ? 'ad/first.png' : 'ad/last.png')} style={{position: 'absolute', width: W, height: H}} />
					{t >= adEnd && <Slate t={t} k={backK} words={W_.back} out={contract} />}
				</AbsoluteFill>
			)}

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
