// Which bridge template for which video? Prints pick() on a few example profiles.
// npx tsx tools/pick.ts
import {AdProfile, VideoProfile, pick} from '../src/templates/catalog';

const base44: AdProfile = {energy: 0.6, tone: 'playful'};
const EXAMPLES: [string, VideoProfile][] = [
	['parkour jump (this demo)', {genre: 'sport', energy: 0.85, hasPerson: true, hasPeak: true, hasSurface: true}],
	['ASMR soap cutting', {genre: 'asmr', energy: 0.05, hasPerson: false, hasPeak: false, quietAudio: true}],
	['two-hour podcast', {genre: 'podcast', energy: 0.3, hasPerson: true, hasPeak: false}],
	['daily vlog', {genre: 'vlog', energy: 0.5, hasPerson: true, hasPeak: false}],
	['cooking, slow', {genre: 'cooking', energy: 0.25, hasPerson: true, hasPeak: false}],
	['gaming clutch moment', {genre: 'gaming', energy: 0.9, hasPerson: false, hasPeak: true}],
];
for (const [name, video] of EXAMPLES) {
	const ranked = pick(video, base44);
	console.log(`${name}:  ${ranked.map((r) => `${r.template.name} ${r.score}`).join('  >  ')}`);
	console.log(`   why ${ranked[0].template.name}: ${ranked[0].why.join('; ')}`);
}
