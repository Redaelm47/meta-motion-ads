// Prints the timeline of the MotionAd composition as JSON, for the render script.
import {BLUR_RANGES, TOTAL} from '../src/ad';

console.log(JSON.stringify({total: TOTAL, blur: BLUR_RANGES}));
