import React from 'react';
import {Composition} from 'remotion';
import {TOTAL} from './ad';
import {MotionAd} from './MotionAd';

type Props = {fps: number};

export const Root: React.FC = () => (
	<Composition
		id="MotionAd"
		component={MotionAd as React.FC<Props>}
		width={1920}
		height={1080}
		fps={60}
		durationInFrames={Math.ceil(TOTAL * 60)}
		defaultProps={{fps: 60}}
		calculateMetadata={({props}) => ({fps: props.fps, durationInFrames: Math.ceil(TOTAL * props.fps)})}
	/>
);
