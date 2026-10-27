// Squeeze: no voice, no gag. The paused video squeezes into a card on the left and the ad plays in
// a bigger card beside it, the way sports broadcasts run side-by-side ads (squeezeback, double box).
// The viewer never loses sight of where they were. For calm, serious or long-form content
// (podcasts, tutorials, news, streams) and any ad.

import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {AD, VIDEO} from '../ad';
import {H, Player, SHOWN, SourceFrame, W} from '../kit';
import {clamp01, glide, lerp, morphGlide} from '../motion';
import {INK, fontFamily} from '../ui';
import {snap} from './voice';

// Layout: video card on the left, ad card on the right, centred, 64 px gutters.
const AD_CARD = {x: 768, y: 234, w: 1088, h: 612, r: 28};
const VID_CARD = {x: 64, y: 360, w: 640, h: 360, r: 22};
const SRC0 = VIDEO.freezeAt - 1.6; // source time at t = 0: the run-up, then the jump

const freeze = 1.6;
const squeeze = freeze + 0.35;
const adStart = snap(squeeze + 1.05);
const adEnd = adStart + AD.duration;
const unsqueeze = adEnd + 0.35;
const resume = unsqueeze + 1.0;
export const TL = {freeze, squeeze, adStart, adEnd, unsqueeze, resume, total: resume + 1.6, adRect: AD_CARD};

const sourceSeconds = (t: number) => (t < freeze ? SRC0 + t : t < resume ? VIDEO.freezeAt : VIDEO.freezeAt + (t - resume));

const SFX = [
	{t: squeeze, src: 'mixkit-166.mp3', volume: 0.14},
	{t: squeeze + 0.15, src: 'mixkit-3115.mp3', volume: 0.1},
	{t: adEnd + 0.15, src: 'mixkit-3115.mp3', volume: 0.1},
	{t: unsqueeze, src: 'mixkit-166.mp3', volume: 0.14},
	{t: resume - 0.05, src: 'kenney-click_002.ogg', volume: 0.12},
];

const full = {cx: W / 2, cy: H / 2, w: W, h: H, r: 0};
const card = {cx: VID_CARD.x + VID_CARD.w / 2, cy: VID_CARD.y + VID_CARD.h / 2, w: VID_CARD.w, h: VID_CARD.h, r: VID_CARD.r};

export const Squeeze: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;
	const tf = Math.floor(t * 50) / 50;
	const paused = t >= freeze && t < resume;

	const v = morphGlide(t, [
		{t: 0, ...full},
		{t: squeeze, ...card},
		{t: unsqueeze, ...full},
	], 0.7, 0.95);
	const k = glide(t, squeeze, 0.8) - glide(t, unsqueeze, 0.8);
	const adIn = glide(t, squeeze + 0.1, 0.85) - glide(t, adEnd + 0.15, 0.7);
	const adX = lerp(W + 60, AD_CARD.x, adIn);
	const labels = glide(t, squeeze + 0.55, 0.5) - glide(t, adEnd + 0.1, 0.35);
	const controls = 1 - glide(t, squeeze - 0.1, 0.3) + glide(t, unsqueeze + 0.5, 0.4) - glide(t, resume + 0.9, 0.4);
	const inAd = t >= adStart && t < adEnd;

	return (
		<AbsoluteFill style={{background: AD.paper, overflow: 'hidden'}}>
			{/* The ad's card */}
			{adIn > 0.001 && (
				<div style={{position: 'absolute', left: adX, top: AD_CARD.y, width: AD_CARD.w, height: AD_CARD.h, borderRadius: AD_CARD.r, overflow: 'hidden', background: AD.paper, boxShadow: '0 30px 80px rgba(52,40,30,0.18), 0 6px 18px rgba(52,40,30,0.10)'}}>
					{!inAd && <Img src={staticFile(t < adStart ? AD.first : AD.last)} style={{width: '100%', height: '100%'}} />}
				</div>
			)}
			<div style={{position: 'absolute', left: AD_CARD.x + 4, top: AD_CARD.y - 46, fontFamily, fontSize: 24, fontWeight: 500, letterSpacing: '-0.01em', color: '#8a7f78', opacity: labels, transform: `translateY(${(1 - labels) * 8}px)`}}>
				Sponsored · {AD.brand}
			</div>

			{/* The video, squeezed into its card and back */}
			<div style={{position: 'absolute', left: v.left, top: v.top, width: v.w, height: v.h, borderRadius: v.r, overflow: 'hidden', background: INK, boxShadow: `0 ${24 * k}px ${70 * k}px rgba(52,40,30,${0.22 * k})`}}>
				<div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `scale(${v.w / W}, ${v.h / H})`}}>
					{t < resume ? (
						<SourceFrame s={sourceSeconds(t)} />
					) : (
						<Sequence from={Math.round(resume * fps)}>
							<OffthreadVideo src={staticFile(VIDEO.clip)} trimBefore={Math.round(VIDEO.freezeAt * fps)} muted />
						</Sequence>
					)}
					<Player controls={clamp01(controls)} progress={clamp01((SHOWN.at + sourceSeconds(tf)) / SHOWN.length)} paused={paused} press={0} time={SHOWN.at + sourceSeconds(tf)} length={SHOWN.length} />
				</div>
				{/* paused mark on the card */}
				<div style={{position: 'absolute', left: '50%', top: '50%', width: 64, height: 64, marginLeft: -32, marginTop: -32, borderRadius: 32, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: labels, transform: `scale(${0.8 + 0.2 * labels})`}}>
					<div style={{width: 7, height: 24, borderRadius: 2, background: '#fff'}} />
					<div style={{width: 7, height: 24, borderRadius: 2, background: '#fff'}} />
				</div>
			</div>
			<div style={{position: 'absolute', left: VID_CARD.x + 4, top: VID_CARD.y + VID_CARD.h + 22, fontFamily, fontSize: 26, fontWeight: 500, letterSpacing: '-0.01em', color: AD.letterInk, opacity: labels, transform: `translateY(${(1 - labels) * 8}px)`}}>
				Back right after this.
			</div>

			{SFX.map((e, i) => (
				<Sequence key={i} from={Math.round(e.t * fps)}>
					<Audio src={staticFile(`sfx/${e.src}`)} volume={e.volume} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
