import React from 'react';
import {Composition} from 'remotion';
import {TOTAL} from './ad';
import {TOTAL as TOTAL_V1} from './adV1';
import {TOTAL as TOTAL_V2} from './adV2';
import {MotionAd} from './MotionAd';
import {MotionAdV1} from './MotionAdV1';
import {MotionAdV2} from './MotionAdV2';

type Props = {fps: number; variant?: string};

const meta = (total: number) => ({props}: {props: Props}) => ({fps: props.fps, durationInFrames: Math.ceil(total * props.fps)});

const comp = (id: string, component: React.FC, total: number, fps: number) => (
	<Composition id={id} component={component as React.FC<Props>} width={1920} height={1080} fps={fps} durationInFrames={Math.ceil(total * fps)} defaultProps={{fps, variant: 'cinema'}} calculateMetadata={meta(total)} />
);

// MotionAd: bridge into an existing ad (v3, 50 fps to match the ad's 25 fps).
// MotionAdV2: our own generated ad. MotionAdV1: first gag test.
export const Root: React.FC = () => (
	<>
		{comp('MotionAd', MotionAd, TOTAL, 50)}
		{comp('MotionAdV2', MotionAdV2, TOTAL_V2, 60)}
		{comp('MotionAdV1', MotionAdV1, TOTAL_V1, 60)}
	</>
);
