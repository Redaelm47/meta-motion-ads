// Detail and sound variants. Reda chose cinema (default); bubbles is kept as the alternative.

import {T} from './ad';

export type Variant = 'cinema' | 'cinema_film' | 'cinema_leak' | 'cinema_spot' | 'bubbles' | 'comics' | 'vhs' | 'paper' | 'neon' | 'apple';
export const VARIANT_NAMES: Variant[] = ['cinema', 'cinema_film', 'cinema_leak', 'cinema_spot', 'bubbles', 'comics', 'vhs', 'paper', 'neon', 'apple'];
export const isCinema = (v: Variant) => v.startsWith('cinema');

type Sfx = {t: number; src: string; volume: number};

const outro: Sfx[] = [
	{t: T.alright - 0.08, src: 'mixkit-2577.mp3', volume: 0.3},
	{t: T.contract, src: 'mixkit-166.mp3', volume: 0.2},
	{t: T.settle, src: 'mixkit-3115.mp3', volume: 0.12},
	{t: T.playPress, src: 'kenney-click_002.ogg', volume: 0.2},
];
const click: Sfx = {t: T.press, src: 'kenney-click_002.ogg', volume: 0.2};

const CINEMA_SFX: Sfx[] = [
	{t: T.freeze, src: 'mixkit-1492.mp3', volume: 0.3},
	{t: T.freeze + 0.05, src: 'kenney-impactSoft_heavy_000.ogg', volume: 0.4},
	{t: T.ok - 0.3, src: 'mixkit-2577.mp3', volume: 0.25},
	{t: T.motivated - 0.12, src: 'mixkit-3115.mp3', volume: 0.12},
	{t: T.andyou - 0.1, src: 'mixkit-3115.mp3', volume: 0.16},
	{t: T.flood, src: 'mixkit-1492.mp3', volume: 0.3},
	{t: T.land - 0.05, src: 'kenney-impactWood_light_000.ogg', volume: 0.34},
];

export const SOUNDS: Record<Variant, Sfx[]> = {
	// Comic book: punch and pop, a burst, speed lines, printed dots.
	comics: [
		{t: T.freeze, src: 'kenney-impactPunch_medium_000.ogg', volume: 0.4},
		{t: T.freeze + 0.15, src: 'mixkit-2364.mp3', volume: 0.3},
		{t: T.ok - 0.3, src: 'mixkit-731.mp3', volume: 0.3},
		{t: T.motivated - 0.12, src: 'mixkit-3115.mp3', volume: 0.12},
		{t: T.andyou - 0.1, src: 'mixkit-3115.mp3', volume: 0.16},
		{t: T.flood, src: 'mixkit-1492.mp3', volume: 0.25},
		{t: T.land - 0.05, src: 'kenney-impactWood_light_000.ogg', volume: 0.34},
	],
	// Video tape: the VCR's pause click, a tape glitch, scanlines and the on-screen display.
	vhs: [
		{t: T.freeze, src: 'kenney-switch2.ogg', volume: 0.45},
		{t: T.freeze + 0.02, src: 'mixkit-2608.mp3', volume: 0.15},
		{t: T.ok - 0.3, src: 'mixkit-2577.mp3', volume: 0.25},
		{t: T.motivated - 0.12, src: 'mixkit-3115.mp3', volume: 0.12},
		{t: T.andyou - 0.1, src: 'mixkit-3115.mp3', volume: 0.16},
		{t: T.flood, src: 'mixkit-2608.mp3', volume: 0.25},
		{t: T.land - 0.05, src: 'kenney-impactWood_light_000.ogg', volume: 0.3},
	],
	// The pause is a printed photo: shutter, then the print lands with a paper sound.
	paper: [
		{t: T.freeze, src: 'mixkit-1133.mp3', volume: 0.5},
		{t: T.freeze + 0.4, src: 'mixkit-2995.mp3', volume: 0.3},
		{t: T.ok - 0.3, src: 'mixkit-2577.mp3', volume: 0.25},
		{t: T.motivated - 0.12, src: 'mixkit-3115.mp3', volume: 0.12},
		{t: T.andyou - 0.1, src: 'mixkit-3115.mp3', volume: 0.16},
		{t: T.flood, src: 'mixkit-166.mp3', volume: 0.2},
		{t: T.land - 0.05, src: 'kenney-impactWood_light_000.ogg', volume: 0.34},
	],
	// Neon night: the scene goes night blue, the caption lights up like a sign.
	neon: [
		{t: T.freeze, src: 'kenney-switch1.ogg', volume: 0.4},
		{t: T.freeze + 0.1, src: 'kenney-glass_002.ogg', volume: 0.15},
		{t: T.ok - 0.3, src: 'kenney-switch2.ogg', volume: 0.3},
		{t: T.motivated - 0.12, src: 'mixkit-3115.mp3', volume: 0.12},
		{t: T.andyou - 0.1, src: 'mixkit-3115.mp3', volume: 0.16},
		{t: T.flood, src: 'mixkit-1492.mp3', volume: 0.25},
		{t: T.land - 0.05, src: 'kenney-impactWood_light_000.ogg', volume: 0.3},
	],
	// Apple-like: nothing on the picture but blur and glass, very soft sounds.
	apple: [
		{t: T.freeze, src: 'mixkit-166.mp3', volume: 0.12},
		{t: T.ok - 0.3, src: 'mixkit-2577.mp3', volume: 0.18},
		{t: T.andyou - 0.1, src: 'mixkit-3115.mp3', volume: 0.1},
		{t: T.flood, src: 'mixkit-166.mp3', volume: 0.15},
		{t: T.land - 0.05, src: 'kenney-maximize_001.ogg', volume: 0.15},
	],
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
	cinema: CINEMA_SFX,
	// Cinema, plus film grain, a warm grade and wider (2.39:1) bars.
	cinema_film: CINEMA_SFX,
	// Cinema, plus a warm light leak in the ad's colours sweeping across at the pause and before the ad.
	cinema_leak: [...CINEMA_SFX, {t: T.andyou + 0.4, src: 'mixkit-2608.mp3', volume: 0.18}],
	// Cinema, plus a pool of light on the subject, everything else darker.
	cinema_spot: CINEMA_SFX,
};

// Cinema (chosen by Reda) also closes like a trailer: cinematic whoosh as the ad closes, low hit as we land back.
const cinemaOutro: Sfx[] = [
	{t: T.alright - 0.08, src: 'mixkit-2577.mp3', volume: 0.3},
	{t: T.contract, src: 'mixkit-1492.mp3', volume: 0.3},
	{t: T.contract + 0.45, src: 'kenney-impactSoft_heavy_000.ogg', volume: 0.3},
	{t: T.playPress, src: 'kenney-click_002.ogg', volume: 0.2},
];

export const sfxFor = (v: Variant): Sfx[] => [click, ...SOUNDS[v], ...(isCinema(v) ? cinemaOutro : outro)];
