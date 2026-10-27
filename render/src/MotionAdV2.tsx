import {loadFont} from '@remotion/google-fonts/Geist';
import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {AD, T, VOICE, WORDS, Word} from './adV2';
import {EASE, QUICK, SOFT, Spring, clamp01, glide, glides, lerp, morphGlide, pulse, step} from './motion';

const {fontFamily} = loadFont('normal', {weights: ['400', '500', '600', '700', '800'], subsets: ['latin']});

const W = 1920;
const H = 1080;
const INK = '#0e0e10';
const PAPER = '#f5f5f2';
const LIME = '#cdf24f';
const WHITE = '#ffffff';

const ZOOM_IN: Spring = {response: 0.9, damping: 0.95};
const ZOOM_OUT: Spring = {response: 0.85, damping: 1};
const POP: Spring = {response: 0.42, damping: 0.78};

// ---------------------------------------------------------------- building blocks

/** A word that rises into view through a mask line, and leaves upward through it. */
const Rise: React.FC<{t: number; at: number; out?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({t, at, out = Infinity, children, style}) => {
	const k = glide(t, at, 0.45);
	const o = glide(t, out, 0.35);
	return (
		<span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: '0.06em 0.02em 0.14em', margin: '-0.06em -0.02em -0.14em', ...style}}>
			<span style={{display: 'inline-block', transform: `translateY(${(1 - k) * 115 - o * 115}%)`}}>{children}</span>
		</span>
	);
};

const Words: React.FC<{t: number; words: Word[]; out?: number; render?: (w: Word, i: number) => React.ReactNode}> = ({t, words, out, render}) => (
	<>
		{words.map((w, i) => (
			<React.Fragment key={i}>
				<Rise t={t} at={w.start - 0.06} out={out === undefined ? undefined : out + i * 0.03}>
					{render ? render(w, i) : w.w}
				</Rise>
				{i < words.length - 1 ? ' ' : null}
			</React.Fragment>
		))}
	</>
);

/** Frosted glass: the scene behind, blurred and lifted, a top sheen, a bright rim, a soft shadow. */
const glass = (dark: boolean): React.CSSProperties => ({
	background: dark
		? 'linear-gradient(180deg, rgba(40,40,44,0.72), rgba(14,14,16,0.82))'
		: 'linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.14))',
	backdropFilter: dark ? 'blur(18px) saturate(1.3)' : 'blur(24px) saturate(1.7) brightness(1.08)',
	border: `1.5px solid ${dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.6)'}`,
	boxShadow: dark
		? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 14px 40px rgba(0,0,0,0.35)'
		: 'inset 0 1.5px 0 rgba(255,255,255,0.75), inset 0 -10px 24px rgba(255,255,255,0.08), 0 28px 70px rgba(0,0,0,0.38)',
	boxSizing: 'border-box',
});

const PauseIcon: React.FC<{color: string}> = ({color}) => (
	<svg width="20" height="22" viewBox="0 0 20 22">
		<rect x="2" y="1" width="5.5" height="20" rx="2" fill={color} />
		<rect x="12.5" y="1" width="5.5" height="20" rx="2" fill={color} />
	</svg>
);
const PlayIcon: React.FC<{color: string; size?: number}> = ({color, size = 22}) => (
	<svg width={size} height={size} viewBox="0 0 24 24">
		<path d="M6 3.5v17a1 1 0 0 0 1.5.87l14-8.5a1 1 0 0 0 0-1.74l-14-8.5A1 1 0 0 0 6 3.5z" fill={color} />
	</svg>
);
const ArrowUp: React.FC = () => (
	<svg width="34" height="34" viewBox="0 0 24 24">
		<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke={WHITE} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);
const Check: React.FC<{color: string; size?: number}> = ({color, size = 22}) => (
	<svg width={size} height={size} viewBox="0 0 24 24">
		<path d="M5 12.5 10 17.5 19.5 7" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

const Cursor: React.FC<{x: number; y: number; press: number}> = ({x, y, press}) => (
	<svg
		width="36"
		height="50"
		viewBox="0 0 17 24"
		style={{position: 'absolute', left: x - 3, top: y - 2, transform: `scale(${1 - 0.16 * press})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))'}}
	>
		<path d="M1.5 1.5v17.3l4.3-4.1 3 6.6 2.6-1.2-3-6.5h6z" fill={INK} stroke={WHITE} strokeWidth="1.3" strokeLinejoin="round" />
	</svg>
);

const sourceSeconds = (t: number) => {
	if (t < T.freeze) return AD.leadIn + t * AD.leadInRate;
	if (t < T.resume) return AD.freezeAt;
	return AD.freezeAt + (t - T.resume);
};

// ---------------------------------------------------------------- layout constants

const PLAYER = {cx: 960, cy: 1000, w: 360, h: 64};
const PLAY_ICON = {x: PLAYER.cx - PLAYER.w / 2 + 34, y: PLAYER.cy};
const BAR = {cx: 960, cy: 600, w: 1040, h: 120};
const SEND = {x: BAR.cx + BAR.w / 2 - 62, y: BAR.cy};
const BROWSER = {cx: 960, cy: 545, w: 1320, h: 790};
const PUBLISH = {x: 1197, y: 104}; // inside the browser
const GAG = {left: 1050, cy: 400, h: 116, w1: 520, w2: 330};
const BIRTH = {x: 960, y: 700}; // the subject's hand on screen, where the caption pill is born

/** Slow push on the ad world, so it never sits still. Maps ad coordinates to the screen. */
const adScale = (t: number) => 1 + 0.05 * clamp01((t - T.flood) / (T.playPress - T.flood));
const toScreen = (t: number, x: number, y: number) => {
	const s = adScale(t);
	return {x: (x - W / 2) * s + W / 2, y: (y - H / 2) * s + H / 2};
};

const SFX: {t: number; src: string; volume: number}[] = [
	{t: T.press, src: 'kenney-click_002.ogg', volume: 0.22},
	{t: T.freeze, src: 'mixkit-166.mp3', volume: 0.2},
	{t: T.flood, src: 'mixkit-166.mp3', volume: 0.3},
	{t: T.send, src: 'kenney-click_002.ogg', volume: 0.22},
	{t: T.send + 0.05, src: 'mixkit-3115.mp3', volume: 0.2},
	{t: T.publish, src: 'kenney-click_002.ogg', volume: 0.22},
	{t: T.toast, src: 'mixkit-2577.mp3', volume: 0.18},
	{t: T.end, src: 'mixkit-2577.mp3', volume: 0.28},
	{t: T.playPress, src: 'kenney-click_002.ogg', volume: 0.22},
	{t: T.contract, src: 'mixkit-166.mp3', volume: 0.25},
];

// ---------------------------------------------------------------- the ad world (white page)

const AdWorld: React.FC<{t: number}> = ({t}) => {
	const s = adScale(t);
	const hookOut = T.ask - 0.45;

	// The prompt bar grows into the browser, which later shrinks into the logo mark.
	const box = morphGlide(t, [
		{t: T.ask - 0.05, cx: BAR.cx, cy: BAR.cy, w: 120, h: 120, r: 60},
		{t: T.ask, cx: BAR.cx, cy: BAR.cy, w: BAR.w, h: BAR.h, r: 60},
		{t: T.send + 0.05, cx: BROWSER.cx, cy: BROWSER.cy, w: BROWSER.w, h: BROWSER.h, r: 30},
		{t: T.logo, cx: 777, cy: 470, w: 170, h: 170, r: 50},
	], 0.6, 0.85);
	const barPop = step(t - (T.ask - 0.05), POP);
	const sendPress = pulse(t, T.send, T.send + 0.12, QUICK);
	const inkFlood = glide(t, T.logo + 0.45, 0.35);
	const typed = AD.brand.prompt.slice(0, Math.round(AD.brand.prompt.length * clamp01((t - T.typeFrom) / (T.typeTo - T.typeFrom))));
	const caret = t < T.send && Math.floor(t * 2) % 2 === 0;
	const glow = 1 - glide(t, T.send, 0.5);

	// Publish button: pill → spinner → "Live".
	const pub = morphGlide(t, [
		{t: 0, cx: PUBLISH.x, cy: PUBLISH.y, w: 150, h: 50, r: 25},
		{t: T.publish + 0.05, cx: PUBLISH.x + 51, cy: PUBLISH.y, w: 48, h: 48, r: 24},
		{t: T.spinnerDone, cx: PUBLISH.x + 7, cy: PUBLISH.y, w: 136, h: 50, r: 25},
	], 0.45, 0.6);
	const pubPress = pulse(t, T.publish, T.publish + 0.12, QUICK);
	const liveK = glide(t, T.spinnerDone, 0.4);

	const heroK = glide(t, T.heroIris, 0.7);
	const heroR = Math.sqrt(heroK) * 760;

	return (
		<AbsoluteFill style={{background: PAPER, transform: `scale(${s})`}}>
			{/* Hook, typed on the voice */}
			<div style={{position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', fontFamily, fontWeight: 600, fontSize: 92, lineHeight: '112px', letterSpacing: '-0.035em', color: INK}}>
				<div>
					<Words t={t} words={WORDS.hook.slice(0, 4)} out={hookOut} />
				</div>
				<div>
					<Words
						t={t}
						words={WORDS.hook.slice(4)}
						out={hookOut + 0.1}
						render={(w) =>
							w.w.startsWith('website') ? (
								<span style={{position: 'relative'}}>
									<span
										style={{
											position: 'absolute',
											left: -8,
											right: -8,
											top: '52%',
											bottom: '2%',
											background: LIME,
											borderRadius: 10,
											zIndex: -1,
											transformOrigin: 'left center',
											transform: `scaleX(${glide(t, w.start + 0.05, 0.5)})`,
										}}
									/>
									{w.w}
								</span>
							) : (
								w.w
							)
						}
					/>
				</div>
			</div>

			{/* Wordmark above the prompt bar */}
			<div style={{position: 'absolute', left: 0, right: 0, top: 410, textAlign: 'center', fontFamily, fontWeight: 700, fontSize: 64, letterSpacing: '-0.045em', color: INK}}>
				<Rise t={t} at={T.ask + 0.05} out={T.send}>
					nova<span style={{color: '#9cc21a'}}>.</span>
				</Rise>
			</div>

			{/* Iridescent glow behind the bar */}
			{t > T.ask - 0.05 && glow > 0.01 && (
				<div
					style={{
						position: 'absolute',
						left: box.left - 30,
						top: box.top - 30,
						width: box.w + 60,
						height: box.h + 60,
						borderRadius: box.r + 30,
						background: `conic-gradient(from ${t * 90}deg, #ff8ad8, #ffb86b, ${LIME}, #6be3ff, #a898ff, #ff8ad8)`,
						filter: 'blur(34px)',
						opacity: 0.75,
						transform: `scale(${glow * barPop})`,
					}}
				/>
			)}

			{/* The shape: prompt bar → browser → logo mark */}
			{t > T.ask - 0.05 && (
				<div
					style={{
						position: 'absolute',
						left: box.left,
						top: box.top,
						width: box.w,
						height: box.h,
						borderRadius: box.r,
						background: WHITE,
						overflow: 'hidden',
						transform: `scale(${(t < T.ask ? barPop : 1) * (1 - 0.02 * sendPress)})`,
						boxShadow: `0 ${18 + 20 * glide(t, T.send, 0.8)}px ${50 + 40 * glide(t, T.send, 0.8)}px rgba(14,14,16,0.16), 0 0 0 1px rgba(14,14,16,0.06)`,
					}}
				>
					{/* Bar content */}
					<div style={{position: 'absolute', left: 52, top: 0, height: BAR.h, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 500, fontSize: 40, color: INK, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}>
						<Rise t={t} at={-1} out={T.send + 0.02}>
							<span>
								{typed}
								<span style={{display: 'inline-block', width: 3, height: 44, marginLeft: 4, verticalAlign: '-6px', background: caret ? INK : 'transparent'}} />
							</span>
						</Rise>
					</div>
					<div
						style={{
							position: 'absolute',
							left: SEND.x - (BAR.cx - BAR.w / 2) - 40 + (box.w - BAR.w) / 2,
							top: BAR.h / 2 - 40 + (box.h - BAR.h) / 2,
							width: 80,
							height: 80,
							borderRadius: 40,
							background: INK,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							transform: `scale(${(1 - glide(t, T.send + 0.05, 0.3)) * (1 - 0.1 * sendPress)})`,
						}}
					>
						<ArrowUp />
					</div>

					{/* Browser content, laid out for its final size and centred in the growing shape */}
					<div style={{position: 'absolute', left: (box.w - BROWSER.w) / 2, top: (box.h - BROWSER.h) / 2, width: BROWSER.w, height: BROWSER.h}}>
						<div style={{position: 'absolute', left: 28, top: 22, display: 'flex', gap: 9}}>
							{['#ff6159', '#ffbd2e', '#28c941'].map((c, i) => (
								<div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c, transform: `scale(${step(t - (T.send + 0.4 + i * 0.05), POP)})`}} />
							))}
						</div>
						<div style={{position: 'absolute', left: 450, top: 14, width: 420, height: 34, borderRadius: 17, background: '#f1f1ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontSize: 18, fontWeight: 500, color: '#77777c', transform: `scaleX(${glide(t, T.send + 0.4, 0.6)})`}}>
							<Rise t={t} at={T.send + 0.6}>
								{AD.brand.site}
							</Rise>
						</div>
						<div style={{position: 'absolute', left: 0, right: 0, top: 60, height: 1, background: '#ececea', transformOrigin: 'center', transform: `scaleX(${glide(t, T.send + 0.35, 0.7)})`}} />

						{/* Nav */}
						<div style={{position: 'absolute', left: 48, top: 82, fontFamily, fontWeight: 700, fontSize: 30, letterSpacing: '-0.03em', color: INK}}>
							<Rise t={t} at={T.nav}>{AD.brand.siteName}</Rise>
						</div>
						<div style={{position: 'absolute', left: 760, top: 90, display: 'flex', gap: 34, fontFamily, fontWeight: 500, fontSize: 20, color: '#6a6a70'}}>
							{['Videos', 'About', 'Contact'].map((l, i) => (
								<Rise key={l} t={t} at={T.nav + 0.06 + i * 0.05}>{l}</Rise>
							))}
						</div>

						{/* Publish → spinner → Live */}
						<div
							style={{
								position: 'absolute',
								left: pub.left,
								top: pub.top,
								width: pub.w,
								height: pub.h,
								borderRadius: pub.r,
								background: liveK > 0 ? `rgb(${Math.round(lerp(14, 205, liveK))},${Math.round(lerp(14, 242, liveK))},${Math.round(lerp(16, 79, liveK))})` : INK,
								overflow: 'hidden',
								transform: `scale(${step(t - T.nav - 0.15, POP) * (1 - 0.05 * pubPress)})`,
							}}
						>
							<div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontWeight: 600, fontSize: 20, color: WHITE}}>
								<Rise t={t} at={-1} out={T.publish + 0.03}>Publish</Rise>
							</div>
							{t > T.publish + 0.15 && t < T.spinnerDone + 0.05 && (
								<svg width="48" height="48" viewBox="0 0 48 48" style={{position: 'absolute', left: (pub.w - 48) / 2, top: 0, transform: `rotate(${t * 720}deg)`}}>
									<circle cx="24" cy="24" r="11" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3.5" />
									<path d="M24 13a11 11 0 0 1 11 11" fill="none" stroke={WHITE} strokeWidth="3.5" strokeLinecap="round" />
								</svg>
							)}
							<div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily, fontWeight: 600, fontSize: 21, color: INK}}>
								<Rise t={t} at={T.spinnerDone + 0.05}>
									<span style={{display: 'inline-flex', alignItems: 'center', gap: 8}}>
										<Check color={INK} size={22} /> Live
									</span>
								</Rise>
							</div>
						</div>

						{/* Hero: the frozen moment itself, opening like an iris */}
						<div style={{position: 'absolute', left: 48, top: 140, width: 1224, height: 360, borderRadius: 22, overflow: 'hidden', clipPath: `circle(${heroR}px at 612px 180px)`}}>
							<Img src={staticFile(AD.hero)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 38%', transform: `scale(${1.08 - 0.08 * heroK})`}} />
							<div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55))'}} />
							<div style={{position: 'absolute', left: 44, bottom: 34, fontFamily, color: WHITE}}>
								<div style={{fontWeight: 800, fontSize: 92, letterSpacing: '-0.045em', lineHeight: 1}}>
									<Rise t={t} at={T.heroTitle}>LEO MOVES</Rise>
								</div>
								<div style={{fontWeight: 500, fontSize: 26, opacity: 0.85, marginTop: 10}}>
									<Rise t={t} at={T.heroTitle + 0.12}>Parkour. Every day.</Rise>
								</div>
							</div>
						</div>

						{/* Video cards */}
						{AD.thumbs.map((src, i) => {
							const k = glide(t, T.cards[i], 0.6);
							return (
								<div key={src} style={{position: 'absolute', left: 48 + i * 416, top: 528, width: 392, height: 222, borderRadius: 18, overflow: 'hidden', clipPath: `inset(${(1 - k) * 100}% 0 0 0 round 18px)`, transform: `translateY(${(1 - k) * 26}px)`}}>
									<Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
									<div style={{position: 'absolute', left: 16, bottom: 14, width: 44, height: 44, borderRadius: 22, ...glass(false), display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
										<PlayIcon color={WHITE} size={18} />
									</div>
								</div>
							);
						})}

					</div>

					{/* Ink floods the mark from its centre, then the lime dot */}
					{inkFlood > 0 && (
						<div style={{position: 'absolute', inset: 0, background: INK, clipPath: `circle(${Math.sqrt(inkFlood) * 130}px at 50% 50%)`}}>
							<div style={{position: 'absolute', left: '50%', top: '50%', width: 46, height: 46, marginLeft: -23, marginTop: -23, borderRadius: 23, background: LIME, transform: `scale(${step(t - (T.logo + 0.75), POP)})`}} />
						</div>
					)}
				</div>
			)}

			{/* Toast, above the browser */}
			<div style={{position: 'absolute', left: 0, right: 0, top: 58, display: 'flex', justifyContent: 'center'}}>
				<div style={{height: 58, padding: '0 26px', borderRadius: 29, background: INK, display: 'flex', alignItems: 'center', gap: 12, fontFamily, fontWeight: 500, fontSize: 22, color: WHITE, transform: `scale(${step(t - T.toast, POP) * (1 - glide(t, T.logo - 0.1, 0.4))})`, boxShadow: '0 14px 34px rgba(0,0,0,0.25)'}}>
					<div style={{width: 12, height: 12, borderRadius: 6, background: LIME}} />
					<Rise t={t} at={T.toast + 0.08}>{AD.brand.site} is live</Rise>
				</div>
			</div>

			{/* End card: wordmark and call to action */}
			<div style={{position: 'absolute', left: 898, top: 470 - 92, fontFamily, fontWeight: 700, fontSize: 168, lineHeight: '184px', letterSpacing: '-0.06em', color: INK}}>
				<Rise t={t} at={WORDS.end[0].start - 0.08}>
					nova<span style={{color: '#9cc21a'}}>.</span>
				</Rise>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center'}}>
				<div style={{height: 88, padding: '0 44px', borderRadius: 44, background: INK, display: 'flex', alignItems: 'center', gap: 14, fontFamily, fontWeight: 600, fontSize: 32, color: WHITE, transform: `scale(${step(t - (WORDS.end[1].start - 0.05), POP)})`}}>
					<Words t={t} words={WORDS.end.slice(1).map((w) => ({...w, w: w.w.replace(/\.$/, '')}))} />
					<span style={{color: LIME}}>→</span>
				</div>
			</div>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- the film

export const MotionAdV2: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const t = frame / fps;

	// Camera on the frozen frame.
	const k = pulse(t, T.freeze, T.resume, ZOOM_IN, ZOOM_OUT);
	const drift = 1 + 0.012 * Math.max(0, Math.min(t, T.resume) - T.freeze) * k;
	const s = lerp(1, AD.zoom, k) * drift;
	const fx = lerp(W / 2, AD.subject.x, k);
	const fy = lerp(H / 2, AD.subject.y, k);
	const ax = lerp(W / 2, AD.anchor.x, k);
	const ay = lerp(H / 2, AD.anchor.y, k);
	const dim = pulse(t, T.freeze + 0.05, T.resume, SOFT, ZOOM_OUT);
	const paused = t >= T.freeze && t < T.resume;

	// Caption pill, born at the subject's hand.
	const gag = morphGlide(t, [
		{t: T.gag1 - 0.35, cx: BIRTH.x, cy: BIRTH.y, w: 30, h: 30, r: 15},
		{t: T.gag1 - 0.3, cx: GAG.left + GAG.w1 / 2, cy: GAG.cy, w: GAG.w1, h: GAG.h, r: GAG.h / 2},
		{t: T.gag2 - 0.15, cx: GAG.left + GAG.w2 / 2, cy: GAG.cy, w: GAG.w2, h: GAG.h, r: GAG.h / 2},
	], 0.5, 0.7);
	const gagIn = step(t - (T.gag1 - 0.35), POP);

	// Flood out of the caption pill, contraction into the play button.
	const far = (x: number, y: number) => Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([a, b]) => Math.hypot(a - x, b - y))) * 1.04;
	const floodK = EASE(clamp01((t - T.flood) / 0.42));
	const contractK = EASE(clamp01((t - T.contract) / 0.48));
	const showAd = t >= T.flood && contractK < 1;
	const gagX = GAG.left + GAG.w2 / 2;
	const radius = (tt: number) => {
		const ck = EASE(clamp01((tt - T.contract) / 0.48));
		return ck > 0 ? Math.sqrt(1 - ck) * far(PLAY_ICON.x, PLAY_ICON.y) : Math.sqrt(EASE(clamp01((tt - T.flood) / 0.42))) * far(gagX, GAG.cy);
	};
	const r = radius(t);
	// The edge is feathered by how far it travels in one output frame, so the motion blur stays smooth.
	const feather = Math.max(1.5, Math.abs(r - radius(t - 1 / 60)));
	const cxy = contractK > 0 ? PLAY_ICON : {x: gagX, y: GAG.cy};

	// Cursor: pause, send, publish, play.
	const send = toScreen(T.send, SEND.x, SEND.y);
	const pubAt = toScreen(T.publish, BROWSER.cx - BROWSER.w / 2 + PUBLISH.x, BROWSER.cy - BROWSER.h / 2 + PUBLISH.y);
	const cursorKeys = [
		{t: 0, x: 1780, y: 1220},
		{t: 0.2, x: PLAY_ICON.x, y: PLAY_ICON.y + 2},
		{t: 1.45, x: 1010, y: 1070},
		{t: T.send - 0.95, x: send.x, y: send.y + 4},
		{t: T.publish - 0.95, x: pubAt.x, y: pubAt.y + 4},
		{t: T.publish + 0.45, x: pubAt.x + 120, y: pubAt.y + 160},
		{t: T.playPress - 0.95, x: PLAY_ICON.x, y: PLAY_ICON.y + 2},
		{t: T.resume + 0.35, x: 1780, y: 1230},
	];
	const cx = glides(t, cursorKeys.map((c) => ({t: c.t, v: c.x, d: 0.85})));
	const cy = glides(t, cursorKeys.map((c) => ({t: c.t, v: c.y, d: 0.85})));
	const presses = [T.press, T.send, T.publish, T.playPress];
	const cursorPress = presses.reduce((a, p) => a + pulse(t, p, p + 0.12, QUICK), 0);
	const playerPress = pulse(t, T.press, T.press + 0.12, QUICK) + pulse(t, T.playPress, T.playPress + 0.12, QUICK);

	const progress = (sourceSeconds(t) - AD.leadIn) / (AD.end - AD.leadIn);
	// Counters read the output frame's time, not the motion-blur subframe's, or the digits smear.
	const tf = Math.floor(t * 60) / 60;
	const adLeft = Math.max(0, Math.ceil(T.resume - Math.max(tf, T.freeze)));
	const badge = step(t - (T.freeze + 0.35), POP) * (1 - glide(t, T.resume - 0.1, 0.4));

	return (
		<AbsoluteFill style={{backgroundColor: INK, overflow: 'hidden'}}>
			{/* Real footage, camera zooms on the subject while paused */}
			<AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${ax - fx * s}px, ${ay - fy * s}px) scale(${s})`}}>
				<Sequence durationInFrames={Math.round(T.freeze * fps)}>
					<OffthreadVideo src={staticFile(AD.leadInClip)} muted />
				</Sequence>
				{paused && (
					<>
						<Img src={staticFile(AD.freeze)} style={{position: 'absolute', width: W, height: H, filter: `brightness(${1 - 0.42 * dim}) saturate(${1 - 0.3 * dim}) blur(${4 * dim}px)`}} />
						<Img
							src={staticFile(AD.person)}
							style={{
								position: 'absolute',
								width: W,
								height: H,
								transformOrigin: `${AD.subject.x}px ${AD.subject.y}px`,
								transform: `scale(${1 + 0.025 * dim})`,
								filter: `drop-shadow(0 ${18 * dim}px ${26 * dim}px rgba(0,0,0,${0.45 * dim}))`,
							}}
						/>
					</>
				)}
				<Sequence from={Math.round(T.resume * fps)}>
					<OffthreadVideo src={staticFile(AD.video)} trimBefore={Math.round(AD.freezeAt * fps)} muted />
				</Sequence>
			</AbsoluteFill>

			{/* Glass caption pill over the frozen frame */}
			{paused && t > T.gag1 - 0.35 && t < T.flood + 0.5 && (
				<div style={{position: 'absolute', left: gag.left, top: gag.top, width: gag.w, height: gag.h, borderRadius: gag.r, ...glass(false), transform: `scale(${gagIn})`, overflow: 'hidden'}}>
					<div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontWeight: 600, fontSize: 54, letterSpacing: '-0.03em', color: WHITE, whiteSpace: 'nowrap', textShadow: '0 1px 12px rgba(0,0,0,0.18)'}}>
						<span style={{position: 'absolute'}}>
							<Words t={t} words={WORDS.gag1} out={T.gag2 - 0.25} />
						</span>
						<span style={{position: 'absolute'}}>
							<Words t={t} words={WORDS.gag2} render={(w) => (w.w.startsWith('you') ? <span style={{color: LIME}}>{w.w}</span> : w.w)} />
						</span>
					</div>
				</div>
			)}

			{/* The ad: floods out of the pill, contracts into the play button */}
			{showAd && (
				<AbsoluteFill style={{maskImage: `radial-gradient(circle ${r}px at ${cxy.x}px ${cxy.y}px, #000 ${Math.max(0, r - feather)}px, transparent ${r}px)`}}>
					<AdWorld t={t} />
				</AbsoluteFill>
			)}

			{/* Player control, always there */}
			<div
				style={{
					position: 'absolute',
					left: PLAYER.cx - PLAYER.w / 2,
					top: PLAYER.cy - PLAYER.h / 2,
					width: PLAYER.w,
					height: PLAYER.h,
					borderRadius: PLAYER.h / 2,
					...glass(true),
					transform: `scale(${1 - 0.04 * playerPress})`,
				}}
			>
				<div style={{position: 'absolute', left: 23, top: 20}}>{paused ? <PlayIcon color={WHITE} /> : <PauseIcon color={WHITE} />}</div>
				<div style={{position: 'absolute', left: 66, right: 94, top: 29, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.22)'}}>
					<div style={{width: `${clamp01(progress) * 100}%`, height: '100%', borderRadius: 3, background: WHITE}} />
					{paused && <div style={{position: 'absolute', left: `${clamp01(progress) * 100}%`, top: -4, width: 5, height: 14, marginLeft: -2.5, borderRadius: 2, background: LIME, transform: `scaleY(${badge})`}} />}
				</div>
				<div style={{position: 'absolute', right: 24, top: 18, fontFamily, fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.85)', fontVariantNumeric: 'tabular-nums'}}>
					0:0{Math.floor(sourceSeconds(tf))}
				</div>
			</div>

			{/* "Ad" badge with countdown */}
			{badge > 0.001 && (
				<div style={{position: 'absolute', left: 48, top: PLAYER.cy - 28, height: 56, padding: '0 22px 0 10px', borderRadius: 28, ...glass(true), display: 'flex', alignItems: 'center', gap: 14, transform: `scale(${badge})`, transformOrigin: 'left center'}}>
					<div style={{height: 36, padding: '0 12px', borderRadius: 18, background: LIME, display: 'flex', alignItems: 'center', fontFamily, fontWeight: 700, fontSize: 19, color: INK}}>Ad</div>
					<span style={{fontFamily, fontWeight: 500, fontSize: 21, color: 'rgba(255,255,255,0.9)', fontVariantNumeric: 'tabular-nums'}}>
						Nova · 0:{String(adLeft).padStart(2, '0')}
					</span>
				</div>
			)}

			<Cursor x={cx} y={cy} press={cursorPress} />

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

