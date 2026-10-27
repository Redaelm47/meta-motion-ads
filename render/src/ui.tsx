import {loadFont} from '@remotion/google-fonts/Geist';
import React from 'react';
import {glide} from './motion';

export const {fontFamily} = loadFont('normal', {weights: ['400', '500', '600', '700', '800'], subsets: ['latin']});

export const INK = '#0e0e10';
export const WHITE = '#ffffff';
export const LIME = '#cdf24f';
export const AD_YELLOW = '#ffcc00';

export type Word = {w: string; start: number; end: number};

/** A word that rises into view through a mask line, and leaves upward through it. */
export const Rise: React.FC<{t: number; at: number; out?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({t, at, out = Infinity, children, style}) => {
	const k = glide(t, at, 0.4);
	const o = glide(t, out, 0.3);
	return (
		<span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: '0.06em 0.02em 0.14em', margin: '-0.06em -0.02em -0.14em', ...style}}>
			<span style={{display: 'inline-block', transform: `translateY(${(1 - k) * 115 - o * 115}%)`}}>{children}</span>
		</span>
	);
};

export const Words: React.FC<{t: number; words: Word[]; out?: number}> = ({t, words, out}) => (
	<>
		{words.map((w, i) => (
			<React.Fragment key={i}>
				<Rise t={t} at={w.start - 0.06} out={out === undefined ? undefined : out + i * 0.03}>
					{w.w}
				</Rise>
				{i < words.length - 1 ? ' ' : null}
			</React.Fragment>
		))}
	</>
);

/** Frosted glass: the scene behind, blurred and lifted, a top sheen, a bright rim, a soft shadow. */
export const glass = (dark: boolean): React.CSSProperties => ({
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

export const PauseIcon: React.FC<{color: string}> = ({color}) => (
	<svg width="20" height="22" viewBox="0 0 20 22">
		<rect x="2" y="1" width="5.5" height="20" rx="2" fill={color} />
		<rect x="12.5" y="1" width="5.5" height="20" rx="2" fill={color} />
	</svg>
);

export const PlayIcon: React.FC<{color: string; size?: number}> = ({color, size = 22}) => (
	<svg width={size} height={size} viewBox="0 0 24 24">
		<path d="M6 3.5v17a1 1 0 0 0 1.5.87l14-8.5a1 1 0 0 0 0-1.74l-14-8.5A1 1 0 0 0 6 3.5z" fill={color} />
	</svg>
);

export const Cursor: React.FC<{x: number; y: number; press: number}> = ({x, y, press}) => (
	<svg
		width="36"
		height="50"
		viewBox="0 0 17 24"
		style={{position: 'absolute', left: x - 3, top: y - 2, transform: `scale(${1 - 0.16 * press})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))'}}
	>
		<path d="M1.5 1.5v17.3l4.3-4.1 3 6.6 2.6-1.2-3-6.5h6z" fill={INK} stroke={WHITE} strokeWidth="1.3" strokeLinejoin="round" />
	</svg>
);
