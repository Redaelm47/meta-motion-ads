import React from 'react';
import {Composition} from 'remotion';
import {TOTAL} from './ad';
import {TOTAL as TOTAL_V1} from './adV1';
import {MotionAd} from './MotionAd';
import {MotionAdV1} from './MotionAdV1';

type Props = {fps: number};

const meta = (total: number) => ({props}: {props: Props}) => ({fps: props.fps, durationInFrames: Math.ceil(total * props.fps)});

export const Root: React.FC = () => (
	<>
		<Composition id="MotionAd" component={MotionAd as React.FC<Props>} width={1920} height={1080} fps={60} durationInFrames={Math.ceil(TOTAL * 60)} defaultProps={{fps: 60}} calculateMetadata={meta(TOTAL)} />
		<Composition id="MotionAdV1" component={MotionAdV1 as React.FC<Props>} width={1920} height={1080} fps={60} durationInFrames={Math.ceil(TOTAL_V1 * 60)} defaultProps={{fps: 60}} calculateMetadata={meta(TOTAL_V1)} />
	</>
);
