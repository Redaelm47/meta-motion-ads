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
	voice: 'ad/base44_voice.wav', // the ad's voice track, music removed (Demucs)
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

const freeze = (VIDEO.freezeAt - VIDEO.leadIn) / VIDEO.leadInRate;
const gag1 = freeze + 0.3;
const gag2 = end('gag1', gag1) + 0.12;
const flood = end('gag2', gag2) + 0.05;
const adStart = flood + 0.7;
const adEnd = adStart + AD.duration;
const back = adEnd + 0.15;
const playPress = end('back', back) + 0.35;
const resume = playPress + 0.5;

export const T = {press: 1.12, freeze, gag1, gag2, flood, adStart, adEnd, back, playPress, contract: playPress + 0.06, resume};
export const VOICE = [
	{t: gag1, line: LINES.gag1},
	{t: gag2, line: LINES.gag2},
	{t: back, line: LINES.back},
];
export const WORDS = {gag1: timed('gag1', gag1), gag2: timed('gag2', gag2), back: timed('back', back)};
export const TOTAL = resume + (VIDEO.end - VIDEO.freezeAt) + 0.3;
/** Parts that move fast enough to need motion blur (rendered with subframes). */
export const BLUR_RANGES: [number, number][] = [
	[0, adStart + 0.1],
	[adEnd - 0.1, TOTAL],
];
