// One ad placement. In the product this comes from the pipeline: the moment and the script from
// Muse Spark, the cutout from SAM 3.1, the product visual from Muse Image. Hand-written for now.
// The timeline hangs on the voice: every scene starts on a line, every caption word on its timing.

import voice from '../public/voice/lines.json';

export const AD = {
	video: 'demo/clip.mp4',
	// Lead-in slowed to 0.75x with motion-interpolated frames (ffmpeg minterpolate), so it plays without judder.
	leadInClip: 'demo/leadin.mp4',
	freeze: 'demo/freeze.png',
	person: 'demo/person.png',
	hero: 'demo/hero.jpg',
	thumbs: ['demo/thumb1.jpg', 'demo/thumb2.jpg', 'demo/thumb3.jpg'],
	// Source seconds
	leadIn: 2.0,
	freezeAt: 88 / 30,
	end: 5.6,
	leadInRate: 0.75,
	// Where the subject is in the source frame, and where the camera puts it on screen.
	subject: {x: 1140, y: 540},
	anchor: {x: 720, y: 560},
	zoom: 1.6,
	brand: {name: 'nova', prompt: 'A site for my parkour videos', site: 'leomoves.nova.site', siteName: 'Leo Moves'},
};

export type Word = {w: string; start: number; end: number};
type Line = {key: string; text: string; file: string; duration: number; words: Word[]};

const LINES = Object.fromEntries((voice.lines as Line[]).map((l) => [l.key, l])) as Record<string, Line>;

/** Words of a line as displayed (from the script), timed by the voice (by index, or spread evenly). */
const timedWords = (key: string, start: number): Word[] => {
	const line = LINES[key];
	const shown = line.text.split(' ').filter((w) => w !== '...');
	const spoken = line.words;
	return shown.map((w, i) => {
		const s = spoken.length === shown.length ? spoken[i] : null;
		const a = s ? s.start : (i / shown.length) * line.duration;
		const b = s ? s.end : ((i + 1) / shown.length) * line.duration;
		return {w, start: start + a, end: start + b};
	});
};

const freeze = (AD.freezeAt - AD.leadIn) / AD.leadInRate;
const end = (k: string, start: number) => start + LINES[k].duration;

const gag1 = freeze + 0.6;
const gag2 = end('gag1', gag1) + 0.35;
const flood = end('gag2', gag2) + 0.45;
const hook = flood + 0.3;
const ask = end('hook', hook) + 0.55;
const send = end('ask', ask) + 0.2;
const build = send + 0.25;
const live = Math.max(end('build', build) + 0.6, send + 2.6);
const publish = live + 0.05;
const endLine = Math.max(end('live', live) + 1.1, publish + 2.2);
const playPress = end('end', endLine) + 1.0;
const resume = playPress + 0.55;

export const T = {
	press: 1.12,
	freeze,
	gag1,
	gag2,
	flood,
	hook,
	ask,
	typeFrom: ask + 0.25,
	typeTo: end('ask', ask),
	send,
	build,
	nav: send + 0.4,
	heroIris: send + 0.6,
	heroTitle: send + 1.0,
	cards: [send + 1.3, send + 1.45, send + 1.6],
	live,
	publish,
	spinnerDone: publish + 0.65,
	toast: publish + 0.85,
	end: endLine,
	logo: endLine - 0.95,
	cta: endLine + 0.75,
	playPress,
	contract: playPress + 0.08,
	resume,
};

export const VOICE = [
	{t: gag1, line: LINES.gag1},
	{t: gag2, line: LINES.gag2},
	{t: hook, line: LINES.hook},
	{t: ask, line: LINES.ask},
	{t: build, line: LINES.build},
	{t: live, line: LINES.live},
	{t: endLine, line: LINES.end},
];

export const WORDS = {
	gag1: timedWords('gag1', gag1),
	gag2: timedWords('gag2', gag2),
	hook: timedWords('hook', hook),
	end: timedWords('end', endLine),
};

export const TOTAL = resume + (AD.end - AD.freezeAt) + 0.3;
