// The ad's look, brought in before the ad: a "sun" disc filled with a flowing gradient (orange,
// peach, lilac, cream), like the sun in Base44's logo and its "Just You" scene. WebGL fragment
// shader, driven only by `time`, so any frame renders the same on its own.

import React, {useLayoutEffect, useRef} from 'react';

const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 res;
uniform float time;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
	float v = 0.0, a = 0.5;
	for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 1.9 + 3.1; a *= 0.45; }
	return v;
}

void main() {
	vec2 uv = gl_FragCoord.xy / res;
	vec2 p = uv * 2.0 - 1.0;
	float t = time * 0.22;
	// domain warping, slow and smooth like the ad's fluid gradient
	vec2 q = vec2(fbm(p * 0.9 + vec2(0.0, t)), fbm(p * 0.9 + vec2(5.2, -t)));
	vec2 r = vec2(fbm(p * 1.0 + 1.8 * q + vec2(1.7, 9.2) + t * 0.6), fbm(p * 1.0 + 1.8 * q + vec2(8.3, 2.8) - t * 0.5));
	float n = fbm(p * 1.0 + 2.0 * r);
	n = clamp(0.5 + 2.6 * (n - 0.41), 0.0, 1.0); // spread the values so every colour of the ad shows up

	vec3 cream = vec3(0.988, 0.976, 0.965);
	vec3 orange = vec3(0.973, 0.640, 0.420);
	vec3 deep = vec3(0.945, 0.540, 0.330);
	vec3 peach = vec3(0.965, 0.760, 0.600);
	vec3 lilac = vec3(0.800, 0.790, 0.930);
	vec3 butter = vec3(0.970, 0.920, 0.800);

	// Like Base44's gradient: orange waves with lilac and pale butter between them, a fine grain.
	float m = n + 0.15 * (0.5 - length(p));
	vec3 col = mix(orange, peach, smoothstep(0.3, 0.48, m));
	col = mix(col, lilac, smoothstep(0.48, 0.66, m));
	col = mix(col, butter, smoothstep(0.7, 0.9, m));
	col = mix(deep, col, smoothstep(0.05, 0.28, m));
	col += (hash(gl_FragCoord.xy) - 0.5) * 0.025;
	gl_FragColor = vec4(col, 1.0);
}`;

export const SunShader: React.FC<{time: number; size: number; style?: React.CSSProperties}> = ({time, size, style}) => {
	const ref = useRef<HTMLCanvasElement>(null);
	const state = useRef<{gl: WebGLRenderingContext; loc: {res: WebGLUniformLocation | null; time: WebGLUniformLocation | null}} | null>(null);

	useLayoutEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;
		if (!state.current) {
			const gl = canvas.getContext('webgl', {preserveDrawingBuffer: true, premultipliedAlpha: false});
			if (!gl) return;
			const shader = (type: number, src: string) => {
				const sh = gl.createShader(type)!;
				gl.shaderSource(sh, src);
				gl.compileShader(sh);
				return sh;
			};
			const prog = gl.createProgram()!;
			gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
			gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
			gl.linkProgram(prog);
			gl.useProgram(prog);
			const buf = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, buf);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
			const attr = gl.getAttribLocation(prog, 'p');
			gl.enableVertexAttribArray(attr);
			gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
			state.current = {gl, loc: {res: gl.getUniformLocation(prog, 'res'), time: gl.getUniformLocation(prog, 'time')}};
		}
		const {gl, loc} = state.current;
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.uniform2f(loc.res, canvas.width, canvas.height);
		gl.uniform1f(loc.time, time);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}, [time]);

	return <canvas ref={ref} width={size} height={size} style={{width: size, height: size, ...style}} />;
};
