// Prints the timeline of the MotionAd composition as JSON, for the render script.
import {AD, T, TOTAL} from '../src/ad';

console.log(JSON.stringify({total: TOTAL, adStart: T.adStart, adDuration: AD.duration, adVideo: AD.video, adAudio: AD.audio}));
