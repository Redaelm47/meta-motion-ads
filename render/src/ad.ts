// v3: the ad already exists (here a Base44 ad). We only build the bridge in and the bridge out,
// written from what the ad says and shows. In the product, Muse Spark watches both videos and
// finds the hook (this ad opens on the word "You"), SAM 3.1 cuts out the subject.

import bridge from '../public/bridge/lines.json';
import type {Word} from './ui';

export const VIDEO = {
	clip: 'demo/clip.mp4',
	leadInClip: 'demo/leadin.mp4', // 0.75x slow motion with interpolated frames
	freeze: 'demo/freeze.png',
	person: 'demo/person.png',
	leadIn: 2.0,
	freezeAt: 88 / 30,
	end: 5.6,
	leadInRate: 0.75,
	subject: {x: 1140, y: 540},
	anchor: {x: 720, y: 560},
	zoom: 1.6,
};

export const AD = {
	video: 'ad/base44.mp4',
	audio: 'ad/base44_full.wav', // the ad's own sound, music included (it's their ad, not ours)
	duration: 1410 / 25,
	brand: 'Base44',
	site: 'base44.com',
	paper: '#fcf9f6', // background of the ad's first and last frames
	letterInk: '#343434',
	// The ad opens on "You": its own artwork, cut out of the first frame, lands exactly there.
	you: {letters: 'ad/you_letters.png', sun: 'ad/you_sun.png', x: 710, y: 425, w: 448, h: 219},
};

type Line = {key: string; text: string; file: string; duration: number; words: Word[]};
const LINES = Object.fromEntries((bridge.lines as Line[]).map((l) => [l.key, l])) as Record<string, Line>;

const timed = (key: string, start: number): Word[] => {
	const line = LINES[key];
	const shown = line.text.split(' ');
	return shown.map((w, i) => {
		const s = line.words.length === shown.length ? line.words[i] : null;
		return {w, start: start + (s ? s.start : (i / shown.length) * line.duration), end: start + (s ? s.end : ((i + 1) / shown.length) * line.duration)};
	});
};
const end = (k: string, start: number) => start + LINES[k].duration;

const FPS = 50;
const snap = (x: number) => Math.round(x * FPS) / FPS; // cut points sit on whole output frames

// Natural delivery: one chunk per breath, with the silences placed here. About 0.3-0.4 s between
// sentences, longer beats (0.6-0.8 s) where the joke needs to land.
const freeze = (VIDEO.freezeAt - VIDEO.leadIn) / VIDEO.leadInRate;
const ok = freeze + 0.6; // let the frozen jump sink in first
const motivated = end('ok', ok) + 0.35;
const isnthe = end('motivated', motivated) + 0.22;
const andyou = end('isnthe', isnthe) + 0.6; // the beat
const flood = end('andyou', andyou) + 0.08;
const adStart = snap(flood + 0.7);
const adEnd = adStart + AD.duration;
const alright = adEnd + 0.5; // stay on the ad's last line for a moment
const where = end('alright', alright) + 0.3;
const contract = end('where', where) + 0.35;
const settle = contract + 0.45; // back on the paused video: the camera eases out before it plays again
const playPress = settle + 0.6;
const resume = playPress + 0.12;

export const T = {press: 1.12, freeze, ok, motivated, isnthe, andyou, flood, land: flood + 0.64, adStart, adEnd, alright, where, contract, settle, playPress, resume};
export const VOICE = (['ok', 'motivated', 'isnthe', 'andyou', 'alright', 'where'] as const).map((k) => ({t: T[k], line: LINES[k]}));
export const WORDS = Object.fromEntries(VOICE.map((v) => [v.line.key, timed(v.line.key, v.t)])) as Record<'ok' | 'motivated' | 'isnthe' | 'andyou' | 'alright' | 'where', Word[]>;
export const TOTAL = resume + (VIDEO.end - VIDEO.freezeAt) + 0.4;
/** Parts that move fast enough to need motion blur (rendered with subframes). */
export const BLUR_RANGES: [number, number][] = [
	[0, adStart],
	[adEnd, TOTAL],
];
