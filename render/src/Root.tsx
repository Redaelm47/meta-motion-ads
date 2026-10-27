import React from 'react';
import {Composition} from 'remotion';
import {TOTAL} from './ad';
import {TOTAL as TOTAL_V1} from './adV1';
import {TOTAL as TOTAL_V2} from './adV2';
import {MotionAd} from './MotionAd';
import {MotionAdV1} from './MotionAdV1';
import {MotionAdV2} from './MotionAdV2';
import {Billboard, TL as BILLBOARD} from './templates/Billboard';
import {Gag, TLS as GAG_TLS} from './templates/Gag';
import {Hush, TL as HUSH} from './templates/Hush';
import {Replay, TL as REPLAY} from './templates/Replay';
import {Squeeze, TL as SQUEEZE} from './templates/Squeeze';
import {Thought, TL as THOUGHT} from './templates/Thought';

type Props = {fps: number; variant?: string};

const meta = (total: number) => ({props}: {props: Props}) => ({fps: props.fps, durationInFrames: Math.ceil(total * props.fps)});

const comp = (id: string, component: React.FC, total: number, fps: number) => (
	<Composition id={id} component={component as React.FC<Props>} width={1920} height={1080} fps={fps} durationInFrames={Math.ceil(total * fps)} defaultProps={{fps, variant: 'cinema'}} calculateMetadata={meta(total)} />
);

// MotionAd: the "gag" bridge template (v3). The other templates of the panel: src/templates/catalog.ts.
// MotionAdV2: our own generated ad. MotionAdV1: first gag test.
export const Root: React.FC = () => (
	<>
		{comp('MotionAd', MotionAd, TOTAL, 50)}
		{comp('Replay', Replay, REPLAY.total, 50)}
		{comp('Thought', Thought, THOUGHT.total, 50)}
		{comp('Squeeze', Squeeze, SQUEEZE.total, 50)}
		{comp('Hush', Hush, HUSH.total, 50)}
		{comp('Billboard', Billboard, BILLBOARD.total, 50)}
		{Object.entries(GAG_TLS).map(([name, tl]) => (
			<React.Fragment key={name}>{comp(`Gag-${name}`, () => <Gag script={name} />, tl.total, 50)}</React.Fragment>
		))}
		{comp('MotionAdV2', MotionAdV2, TOTAL_V2, 60)}
		{comp('MotionAdV1', MotionAdV1, TOTAL_V1, 60)}
	</>
);
