// Hush: for ASMR, cooking, nature, study, anything quiet. Nothing snaps and nothing shouts: no
// voice, no click. The video slows down to a stop by itself, the background falls out of focus,
// one soft caption, then the frame melts into the ad's own paper colour and the ad's first frame
// comes into focus. Back the same way, and the video speeds up again from a standstill.

import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {AD, VIDEO} from '../ad';
import {H, Player, SHOWN, SourceFrame, W, ramp} from '../kit';
import {clamp01, glide} from '../motion';
import {WHITE, fontFamily} from '../ui';
import {snap} from './voice';

const SRC0 = VIDEO.freezeAt - 1.9;
const slow = 1.2; // speed ramp 1x -> 0 over SLOW seconds, landing exactly on the frozen moment
const SLOW = 1.4;
const freeze = slow + SLOW;
const caption = freeze + 0.45;
const melt = caption + 1.5;
const adStart = snap(melt + 1.7);
const adEnd = adStart + AD.duration;
const meltBack = adEnd + 0.6;
const welcome = meltBack + 1.3;
const rise = welcome + 1.2; // speed ramp 0 -> 1x
const RISE = 1.3;
const resume = rise + RISE;
export const TL = {freeze, adStart, adEnd, resume, total: resume + 1.6};

const src = (t: number) => {
	if (t < slow) return SRC0 + t;
	if (t < freeze) return SRC0 + slow + ramp(t, slow, SLOW, 1, 0);
	if (t < rise) return VIDEO.freezeAt;
	return VIDEO.freezeAt + ramp(t, rise, RISE, 0, 1);
};

const SFX = [
	{t: caption, src: 'kenney-glass_002.ogg', volume: 0.06},
	{t: melt + 0.2, src: 'mixkit-166.mp3', volume: 0.05},
	{t: welcome, src: 'kenney-glass_002.ogg', volume: 0.05},
];

/** Words that come into focus one after the other. */
const Soft: React.FC<{t: number; at: number; out: number; text: string}> = ({t, at, out, text}) => (
	<div style={{position: 'absolute', left: 0, right: 0, top: 800, textAlign: 'center', fontFamily, fontWeight: 400, fontSize: 58, letterSpacing: '0.005em', color: WHITE, textShadow: '0 2px 24px rgba(0,0,0,0.35)'}}>
		{text.split(' ').map((w, i) => {
			const k = glide(t, at + i * 0.22, 0.9) * (1 - glide(t, out + i * 0.06, 0.6));
			return (
				<span key={i} style={{display: 'inline-block', margin: '0 0.14em', opacity: k, filter: `blur(${(1 - k) * 10}px)`, transform: `translateY(${(1 - k) * 10}px)`}}>
					{w}
				</span>
			);
		})}
	</div>
);

export const Hush: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const s = src(t);

	// A slow push-in towards him, and depth: background soft, him sharp.
	const push = 1 + 0.07 * glide(t, slow, 3) - 0.07 * glide(t, rise - 0.6, 1.8);
	const depth = glide(t, freeze - 0.2, 1.3) - glide(t, rise - 0.4, 1.2);
	// The frame melts into the ad's paper, the ad's first frame comes into focus (and back after).
	const toPaper = glide(t, melt, 1.1) - glide(t, meltBack + 0.6, 1.1);
	const adFocus = glide(t, melt + 0.9, 0.9);
	const adOut = glide(t, meltBack, 1.0);
	const controls = 1 - glide(t, slow, 0.8) + glide(t, rise, 0.6) - glide(t, resume + 0.9, 0.5);
	const paused = t >= freeze && t < rise;
	const tf = Math.floor(t * 50) / 50;

	return (
		<AbsoluteFill style={{background: AD.paper, overflow: 'hidden'}}>
			<AbsoluteFill style={{transformOrigin: `${VIDEO.subject.x}px ${VIDEO.subject.y}px`, transform: `scale(${push})`, filter: toPaper > 0.001 ? `blur(${toPaper * 36}px)` : undefined}}>
				{t >= freeze && t < rise ? (
					<>
						<Img src={staticFile(VIDEO.freeze)} style={{position: 'absolute', width: W, height: H, filter: `blur(${depth * 7}px) brightness(${1 - 0.14 * depth})`}} />
						<Img src={staticFile(VIDEO.person)} style={{position: 'absolute', width: W, height: H, opacity: depth > 0.001 ? 1 : 0}} />
					</>
				) : t < resume ? (
					<SourceFrame s={s} />
				) : (
					<Sequence from={Math.round(resume * fps)}>
						<OffthreadVideo src={staticFile(VIDEO.clip)} trimBefore={Math.round((VIDEO.freezeAt + RISE / 2) * fps)} muted />
					</Sequence>
				)}
			</AbsoluteFill>
			{toPaper > 0.001 && <AbsoluteFill style={{background: AD.paper, opacity: toPaper}} />}
			{t > melt + 0.9 && t < adStart && <Img src={staticFile('ad/first.png')} style={{position: 'absolute', width: W, height: H, opacity: adFocus, filter: `blur(${(1 - adFocus) * 28}px)`}} />}
			{t >= adEnd && adOut < 1 && <Img src={staticFile('ad/last.png')} style={{position: 'absolute', width: W, height: H, opacity: 1 - adOut, filter: `blur(${adOut * 28}px)`}} />}

			{/* a soft shade under the caption, so it reads on a bright wall */}
			<AbsoluteFill style={{background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.38) 100%)', opacity: glide(t, caption - 0.3, 1) * (1 - glide(t, melt - 0.2, 0.8)) + glide(t, welcome - 0.3, 1) * (1 - glide(t, rise + 0.3, 0.8))}} />
			{t < adStart && <Soft t={t} at={caption} out={melt - 0.2} text="take a breath." />}
			{t > adEnd && <Soft t={t} at={welcome} out={rise + 0.3} text="and we're back." />}

			<Player controls={clamp01(controls)} progress={clamp01((SHOWN.at + src(tf)) / SHOWN.length)} paused={paused} press={0} time={SHOWN.at + src(tf)} length={SHOWN.length} />

			{SFX.map((e, i) => (
				<Sequence key={i} from={Math.round(e.t * fps)}>
					<Audio src={staticFile(`sfx/${e.src}`)} volume={e.volume} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
