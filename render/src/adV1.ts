// One ad placement. In the product this comes from the pipeline: the moment and the gag from
// Muse Spark, the cutout from SAM 3.1, the product visual from Muse Image. Hand-written for now.

export const AD = {
	video: 'demo/clip.mp4',
	freeze: 'demo/freeze.png',
	person: 'demo/person.png',
	videoFps: 30,
	// Source seconds
	leadIn: 2.0,
	freezeAt: 88 / 30,
	end: 5.6,
	leadInRate: 0.75,
	// Where the subject is in the source frame, and where the camera puts it on screen.
	subject: {x: 1140, y: 540},
	anchor: {x: 720, y: 560},
	zoom: 1.6,
	brand: {name: 'Nova', headline: ['Launch your website', 'in 5 minutes.'], cta: 'Try Nova'},
	gag: ["He's motivated.", 'And you?'],
};

// Timeline in output seconds, on a 120 BPM grid (one beat = 0.5 s).
export const T = {
	freeze: (AD.freezeAt - AD.leadIn) / AD.leadInRate,
	press: 1.12,
	line1: 1.5,
	line2: 2.5,
	card: 3.0,
	bars: [3.5, 3.75, 4.0],
	cta: 4.0,
	resumePill: 4.5,
	resumePress: 5.05,
	resume: 5.25,
};
export const TOTAL = T.resume + (AD.end - AD.freezeAt) + 0.3;
