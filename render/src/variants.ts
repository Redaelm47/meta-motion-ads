// Detail and sound variants. Reda chose cinema (default); bubbles is kept as the alternative.

import {T} from './ad';

export type Variant = 'cinema' | 'bubbles';
export const VARIANT_NAMES: Variant[] = ['cinema', 'bubbles'];

type Sfx = {t: number; src: string; volume: number};

const outro: Sfx[] = [
	{t: T.alright - 0.08, src: 'mixkit-2577.mp3', volume: 0.3},
	{t: T.contract, src: 'mixkit-166.mp3', volume: 0.2},
	{t: T.settle, src: 'mixkit-3115.mp3', volume: 0.12},
	{t: T.playPress, src: 'kenney-click_002.ogg', volume: 0.2},
];
const click: Sfx = {t: T.press, src: 'kenney-click_002.ogg', volume: 0.2};

export const SOUNDS: Record<Variant, Sfx[]> = {
	// Soft and round: bubble sounds, out-of-focus discs in the ad's colours.
	bubbles: [
		{t: T.freeze, src: 'mixkit-1317.mp3', volume: 0.35},
		{t: T.ok - 0.3, src: 'mixkit-2925.mp3', volume: 0.35},
		{t: T.motivated - 0.12, src: 'mixkit-1317.mp3', volume: 0.2},
		{t: T.andyou - 0.1, src: 'mixkit-2925.mp3', volume: 0.3},
		{t: T.flood, src: 'mixkit-2608.mp3', volume: 0.25},
		{t: T.land - 0.05, src: 'mixkit-2577.mp3', volume: 0.3},
	],
	// Trailer feel: cinematic whoosh and low hit, cinema bars, darker edges.
	cinema: [
		{t: T.freeze, src: 'mixkit-1492.mp3', volume: 0.3},
		{t: T.freeze + 0.05, src: 'kenney-impactSoft_heavy_000.ogg', volume: 0.4},
		{t: T.ok - 0.3, src: 'mixkit-2577.mp3', volume: 0.25},
		{t: T.motivated - 0.12, src: 'mixkit-3115.mp3', volume: 0.12},
		{t: T.andyou - 0.1, src: 'mixkit-3115.mp3', volume: 0.16},
		{t: T.flood, src: 'mixkit-1492.mp3', volume: 0.3},
		{t: T.land - 0.05, src: 'kenney-impactWood_light_000.ogg', volume: 0.34},
	],
};

// Cinema (chosen by Reda) also closes like a trailer: cinematic whoosh as the ad closes, low hit as we land back.
const cinemaOutro: Sfx[] = [
	{t: T.alright - 0.08, src: 'mixkit-2577.mp3', volume: 0.3},
	{t: T.contract, src: 'mixkit-1492.mp3', volume: 0.3},
	{t: T.contract + 0.45, src: 'kenney-impactSoft_heavy_000.ogg', volume: 0.3},
	{t: T.playPress, src: 'kenney-click_002.ogg', volume: 0.2},
];

export const sfxFor = (v: Variant): Sfx[] => [click, ...SOUNDS[v], ...(v === 'cinema' ? cinemaOutro : outro)];
