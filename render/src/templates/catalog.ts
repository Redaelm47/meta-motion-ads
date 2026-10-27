// The panel of bridge templates, and how one is picked for a (video, ad) pair.
// In the product, Muse Spark watches the video and the ad and fills VideoProfile / AdProfile;
// pick() is deliberately plain rules so the choice is explainable (and editable by a human).

export type Genre = 'sport' | 'action' | 'gaming' | 'vlog' | 'comedy' | 'lifestyle' | 'asmr' | 'cooking' | 'nature' | 'study' | 'podcast' | 'tutorial' | 'news' | 'music';
export type Voice = 'none' | 'narrator' | 'broadcast' | 'inner';

export type Template = {
	id: string;
	comp: string; // Remotion composition id
	name: string;
	idea: string;
	energy: number; // 0 calm .. 1 loud
	voice: Voice;
	fits: Genre[];
	avoid: Genre[];
	needs: {person: boolean; peak: boolean}; // a cut-out person, a peak moment to freeze on
};

export const TEMPLATES: Template[] = [
	{
		id: 'gag',
		comp: 'MotionAd',
		name: 'Gag',
		idea: 'Freeze on the peak, a narrator teases the person ("He\'s really motivated, isn\'t he? And you?"), the ad answers.',
		energy: 0.75,
		voice: 'narrator',
		fits: ['sport', 'action', 'vlog', 'comedy', 'gaming'],
		avoid: ['asmr', 'study', 'news', 'podcast'],
		needs: {person: true, peak: true},
	},
	{
		id: 'replay',
		comp: 'Replay',
		name: 'Replay',
		idea: 'Broadcast voice stops it, rewinds, replays in slow motion, draws the move, "This replay is brought to you by..."',
		energy: 0.9,
		voice: 'broadcast',
		fits: ['sport', 'action', 'gaming'],
		avoid: ['asmr', 'study', 'podcast', 'news', 'cooking'],
		needs: {person: false, peak: true},
	},
	{
		id: 'thought',
		comp: 'Thought',
		name: 'Thought',
		idea: 'A thought bubble in the person\'s inner voice; the thought is the ad. After it, they answer themselves and carry on.',
		energy: 0.5,
		voice: 'inner',
		fits: ['vlog', 'lifestyle', 'comedy', 'sport', 'cooking', 'tutorial'],
		avoid: ['news', 'asmr'],
		needs: {person: true, peak: false},
	},
	{
		id: 'squeeze',
		comp: 'Squeeze',
		name: 'Squeeze',
		idea: 'No voice: the video squeezes into a card, the ad plays beside it (side-by-side, as in sports broadcasts), then the video grows back.',
		energy: 0.3,
		voice: 'none',
		fits: ['podcast', 'tutorial', 'news', 'gaming', 'music', 'study', 'sport'],
		avoid: [],
		needs: {person: false, peak: false},
	},
	{
		id: 'hush',
		comp: 'Hush',
		name: 'Hush',
		idea: 'Nothing snaps: the video slows to a stop, one soft caption, the frame melts into the ad\'s colour, the ad comes into focus.',
		energy: 0.1,
		voice: 'none',
		fits: ['asmr', 'nature', 'cooking', 'study', 'music', 'lifestyle'],
		avoid: ['comedy'],
		needs: {person: false, peak: false},
	},
];

export type VideoProfile = {genre: Genre; energy: number; hasPerson: boolean; hasPeak: boolean; quietAudio?: boolean};
export type AdProfile = {energy: number; tone?: 'playful' | 'premium' | 'serious'};

/** Templates ranked for this pair, best first, with the reasons. Never returns one that cannot run. */
export const pick = (video: VideoProfile, ad: AdProfile) =>
	TEMPLATES.filter((tp) => (!tp.needs.person || video.hasPerson) && (!tp.needs.peak || video.hasPeak))
		.map((tp) => {
			const why: string[] = [];
			let score = 0;
			if (tp.fits.includes(video.genre)) (score += 3), why.push(`made for ${video.genre}`);
			if (tp.avoid.includes(video.genre)) (score -= 5), why.push(`wrong for ${video.genre}`);
			const target = 0.65 * video.energy + 0.35 * ad.energy; // the video sets the mood, the ad nudges it
			score -= 4 * Math.abs(tp.energy - target);
			why.push(`energy ${tp.energy} vs wanted ${target.toFixed(2)}`);
			if (video.quietAudio && tp.voice !== 'none') (score -= 2), why.push('quiet video: no voice over it');
			if (ad.tone === 'serious' && (tp.voice === 'narrator' || tp.voice === 'broadcast')) (score -= 1.5), why.push('serious ad: no teasing');
			return {template: tp, score: Math.round(score * 100) / 100, why};
		})
		.sort((a, b) => b.score - a.score);
