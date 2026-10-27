// Inner-voice scripts for the ThoughtScript template. Reda's rule: the thought comes from what the
// person is doing in the video and leads to the ad's message (here, an app: Base44).

import land from '../../public/voice/thought_land/lines.json';
import plan from '../../public/voice/thought_plan/lines.json';
import type {GagScript} from './gags';

type Chunk = [key: string, gapAfter: number];
export type ThoughtScript = {voice: GagScript['voice']; bubbles: Chunk[][]; out: Chunk[]};

export const THOUGHTS: Record<string, ThoughtScript> = {
	// "Note to self: an app that tells me where to land." / "Later. Landing first."
	land: {voice: land, bubbles: [[['note', 0.2]], [['app', 0.05], ['land', 0.5]]], out: [['later', 0.3], ['landing', 0.3]]},
	// "Mid-air. No plan. If only there was an app for this..." / "Okay. Plan B: jump."
	plan: {voice: plan, bubbles: [[['midair', 0.25]], [['noplan', 0.35]], [['ifonly', 0.05], ['appfor', 0.5]]], out: [['okay', 0.25], ['planb', 0.3]]},
};
