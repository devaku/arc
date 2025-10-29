
 'use client';
// pages/camera.js
import { useEffect, useRef, useState } from 'react';
import useGetCamera from '@/hooks/useGetCamera';
import useScaleToViewport from '@/hooks/useScaleToViewport';
import { cubeStateToCubejsString } from '@/lib/cubeAdapter';
import dynamic from 'next/dynamic';
import SolverAnimator from '@/components/SolverAnimator';
import Icon from '../../../images/ARC Solver PNG.png';
import Image from 'next/image';

type CubeFace = string[][];

interface CubeState {
	front: CubeFace;
	back: CubeFace;
	left: CubeFace;
	right: CubeFace;
	top: CubeFace;
	bottom: CubeFace;
}

export default function CameraPage() {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const cubeCanvasRef = useRef<HTMLCanvasElement | null>(null);

	const [scanningButton, setScanningButton] = useState<'Start Scanning' | 'Stop Scanning'>('Start Scanning');
	const [currentFace, setCurrentFace] = useState<keyof CubeState>('front');

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [gridColors, setGridColors] = useState<string[][]>(
		Array(3)
			.fill(null)
			.map(() => Array(3).fill('#FFFFFF'))
	);
    
	const emptyFace = Array(3).fill(null).map(() => Array(3).fill('#CCCCCC'));
    
	const [cubeState, setCubeState] = useState<CubeState>({
		front: emptyFace,
		back: emptyFace,
		left: emptyFace,
		right: emptyFace,
		top: emptyFace,
		bottom: emptyFace,
	});

	const [mouseDown, setMouseDown] = useState(false);
	const [rotation, setRotation] = useState({ x: -20, y: 30 });
	const [moves, setMoves] = useState<string[]>([]);
	const [solutionStr, setSolutionStr] = useState<string>('');
	const [debugVisible, setDebugVisible] = useState<boolean>(false);
	const [debugStateStr, setDebugStateStr] = useState<string>('');
	const [debugCounts, setDebugCounts] = useState<Record<string, number>>({});
	const [manualEdit, setManualEdit] = useState<boolean>(false);
	const COLOR_ORDER = ['#FFFFFF', '#FFD500', '#B71234', '#FF5800', '#0046AD', '#009B48'];

	function cycleSticker(face: keyof CubeState, row: number, col: number) {
		setCubeState(prev => {
			const next = JSON.parse(JSON.stringify(prev)) as CubeState;
			const cur = (next[face][row][col] || '').toUpperCase();
			const idx = COLOR_ORDER.findIndex(c => c.toUpperCase() === cur);
			const newColor = COLOR_ORDER[(idx + 1) % COLOR_ORDER.length];
			next[face][row][col] = newColor;
			return next;
		});
	}
	const [colorMode, setColorMode] = useState<'lab' | 'rgb'>('lab');
	const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

	// animation refs for view buttons
	const animRef = useRef<number | null>(null);
	const rotationRef = useRef(rotation);
	useEffect(() => { rotationRef.current = rotation; }, [rotation]);

	useEffect(() => {
		return () => {
			if (animRef.current) cancelAnimationFrame(animRef.current);
		};
	}, []);

	function animateTo(target: { x: number; y: number }, duration = 800) {
		if (animRef.current) cancelAnimationFrame(animRef.current);

		const start = performance.now();
		const from = { ...rotationRef.current };

		function ease(t: number) { return 1 - Math.pow(1 - t, 3); }

		function step(now: number) {
			const t = Math.min(1, (now - start) / duration);
			const e = ease(t);
			setRotation({
				x: from.x + (target.x - from.x) * e,
				y: from.y + (target.y - from.y) * e,
			});

			if (t < 1) {
				animRef.current = requestAnimationFrame(step);
			} else {
				animRef.current = null;
			}
		}

		animRef.current = requestAnimationFrame(step);
	}

	function viewSide(side: 'front' | 'right' | 'back' | 'left' | 'top' | 'bottom') {
		// reset quickly to a neutral pose then animate to target for a nicer effect
		const reset = { x: -20, y: 30 };
		setRotation(reset);
		rotationRef.current = reset;

		const presets: Record<string, { x: number; y: number }> = {
			// slightly tilted, head-on views like the provided screenshot
			front: { x: -6, y: 0 },
			right: { x: -6, y: 90 },
			back: { x: -6, y: 180 },
			left: { x: -6, y: 270 },
			// top and bottom are more extreme
			top: { x: -80, y: 0 },
			bottom: { x: 80, y: 0 },
		};

		const target = presets[side];
		// make the UI select the face that we're viewing so "Save to" maps correctly
		setCurrentFace(side as keyof CubeState);
		setTimeout(() => animateTo(target, 900), 30);
	}

	useGetCamera(videoRef, setLoading, setError);

	// scaling
	const designWidth = 1400;
	const scale = useScaleToViewport(designWidth, 0.35);

	function startInterval() {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}

		intervalRef.current = setInterval(() => {
			readVideoFeed();
		}, 500);
	}

	function stopInterval() {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}

	function readVideoFeed() {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const video = videoRef.current;
		if (!video) return;

		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;

		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

		const cellWidth = canvas.width / 3;
		const cellHeight = canvas.height / 3;

		const newGridColors: string[][] = [];

		for (let row = 0; row < 3; row++) {
			newGridColors[row] = [];
			for (let col = 0; col < 3; col++) {
				const centerX = Math.floor(col * cellWidth + cellWidth / 2);
				const centerY = Math.floor(row * cellHeight + cellHeight / 2);


				// more robust sampling: take a larger sample and use median per channel to avoid highlights
				const sampleSize = 9; // 9x9 neighborhood
				const Rs: number[] = [];
				const Gs: number[] = [];
				const Bs: number[] = [];

				for (let dy = -Math.floor(sampleSize / 2); dy <= Math.floor(sampleSize / 2); dy++) {
					for (let dx = -Math.floor(sampleSize / 2); dx <= Math.floor(sampleSize / 2); dx++) {
						const x = centerX + dx;
						const y = centerY + dy;
						if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
						const pixelData = ctx.getImageData(x, y, 1, 1).data;
						Rs.push(pixelData[0]);
						Gs.push(pixelData[1]);
						Bs.push(pixelData[2]);
					}
				}

				function median(arr: number[]) {
					if (arr.length === 0) return 0;
					arr.sort((a, b) => a - b);
					const mid = Math.floor(arr.length / 2);
					return arr.length % 2 === 1 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
				}

				const avgR = median(Rs);
				const avgG = median(Gs);
				const avgB = median(Bs);

				newGridColors[row][col] = rgbToHex(avgR, avgG, avgB);
			}
		}

		setGridColors(newGridColors);

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const lineColor = 'rgba(255, 255, 255, 0.8)';
		const lineWidth = 3;
		ctx.strokeStyle = lineColor;
		ctx.lineWidth = lineWidth;

		for (let i = 1; i < 3; i++) {
			const y = (canvas.height / 3) * i;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(canvas.width, y);
			ctx.stroke();
		}

		for (let i = 1; i < 3; i++) {
			const x = (canvas.width / 3) * i;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();
		}

		ctx.strokeRect(0, 0, canvas.width, canvas.height);
	}

	useEffect(() => {
		// start scanning immediately when component mounts
		startInterval();
		setScanningButton('Stop Scanning');

		return () => stopInterval();
	}, []);

	useEffect(() => {
		draw3DCube();
	}, [cubeState, rotation]);

	// Standard Rubik's Cube colors
	const RUBIKS_COLORS = {
		white: { r: 255, g: 255, b: 255, hex: '#FFFFFF' },
		yellow: { r: 255, g: 213, b: 0, hex: '#FFD500' },
		red: { r: 183, g: 18, b: 52, hex: '#B71234' },
		orange: { r: 255, g: 88, b: 0, hex: '#FF5800' },
		blue: { r: 0, g: 70, b: 173, hex: '#0046AD' },
		green: { r: 0, g: 155, b: 72, hex: '#009B48' },
	};

	function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
		// Euclidean distance in RGB color space
		return Math.sqrt(
			Math.pow(r1 - r2, 2) +
			Math.pow(g1 - g2, 2) +
			Math.pow(b1 - b2, 2)
		);
	}

	function findClosestRubiksColor(r: number, g: number, b: number) {
		let closestColor = RUBIKS_COLORS.white.hex;
		let minDistance = Infinity;

		for (const [colorName, colorValue] of Object.entries(RUBIKS_COLORS)) {
			const distance = colorDistance(r, g, b, colorValue.r, colorValue.g, colorValue.b);
			if (distance < minDistance) {
				minDistance = distance;
				closestColor = colorValue.hex;
			}
		}

		return closestColor;
	}

	function rgbToHex(r: number, g: number, b: number) {
		r = Math.max(0, Math.min(255, Math.round(r)));
		g = Math.max(0, Math.min(255, Math.round(g)));
		b = Math.max(0, Math.min(255, Math.round(b)));

		// Convert sampled RGB to Lab and pick nearest Rubik color by DeltaE (Lab distance)

		function rgbToXyz(r: number, g: number, b: number) {
			// sRGB (D65)
			r = r / 255;
			g = g / 255;
			b = b / 255;

			function pivot(c: number) {
				return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
			}

			r = pivot(r);
			g = pivot(g);
			b = pivot(b);

			return {
				x: (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100,
				y: (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100,
				z: (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100,
			};
		}

		function xyzToLab(x: number, y: number, z: number) {
			// D65 reference white
			const refX = 95.047;
			const refY = 100.0;
			const refZ = 108.883;

			x = x / refX;
			y = y / refY;
			z = z / refZ;

			function pivot(t: number) {
				return t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t) + 16 / 116;
			}

			const fx = pivot(x);
			const fy = pivot(y);
			const fz = pivot(z);

			return {
				L: (116 * fy) - 16,
				a: 500 * (fx - fy),
				b: 200 * (fy - fz),
			};
		}

		function rgbToLabLocal(rn: number, gn: number, bn: number) {
			const xyz = rgbToXyz(rn, gn, bn);
			return xyzToLab(xyz.x, xyz.y, xyz.z);
		}

		function deltaE(lab1: any, lab2: any) {
			// simple Euclidean in Lab space (deltaE76)
			return Math.sqrt(
				Math.pow(lab1.L - lab2.L, 2) +
				Math.pow(lab1.a - lab2.a, 2) +
				Math.pow(lab1.b - lab2.b, 2)
			);
		}

		if (colorMode === 'rgb') {
			// fallback to simple RGB euclidean distance
			return findClosestRubiksColor(r, g, b);
		}

		const sampleLab = rgbToLabLocal(r, g, b);
		let best = { hex: RUBIKS_COLORS.white.hex, dist: Infinity };
		for (const [name, val] of Object.entries(RUBIKS_COLORS)) {
			const lab = rgbToLabLocal(val.r, val.g, val.b);
			const d = deltaE(sampleLab, lab);
			if (d < best.dist) {
				best = { hex: val.hex, dist: d };
			}
		}

		return best.hex;
	}

	function draw3DCube() {
		const canvas = cubeCanvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d')!;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const cubeSize = 120;
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;

		const rotX = (rotation.x * Math.PI) / 180;
		const rotY = (rotation.y * Math.PI) / 180;

		function rotatePoint(x: number, y: number, z: number) {
			let tempY = y * Math.cos(rotX) - z * Math.sin(rotX);
			let tempZ = y * Math.sin(rotX) + z * Math.cos(rotX);
			y = tempY;
			z = tempZ;

			let tempX = x * Math.cos(rotY) + z * Math.sin(rotY);
			tempZ = -x * Math.sin(rotY) + z * Math.cos(rotY);
			x = tempX;
			z = tempZ;

			return { x, y, z };
		}

		function project(x: number, y: number, z: number) {
			const perspective = 800;
			const scale = perspective / (perspective + z + 400);
			return {
				x: centerX + x * scale,
				y: centerY + y * scale,
				scale: scale
			};
		}

		function drawFace(face: CubeFace, projected: any[], original3D: any[]) {
			const avgZ = original3D.reduce((sum, c) => sum + c.z, 0) / 4;

			// Compute normal from the original 3D rotated corners (not projected)
			const v1 = {
				x: original3D[1].x - original3D[0].x,
				y: original3D[1].y - original3D[0].y,
				z: original3D[1].z - original3D[0].z,
			};
			const v2 = {
				x: original3D[3].x - original3D[0].x,
				y: original3D[3].y - original3D[0].y,
				z: original3D[3].z - original3D[0].z,
			};

			const normal = {
				x: v1.y * v2.z - v1.z * v2.y,
				y: v1.z * v2.x - v1.x * v2.z,
				z: v1.x * v2.y - v1.y * v2.x,
			};

			// Cull faces that face away from the camera. Sign flipped so outside faces are drawn correctly.
			if (normal.z > 0) return avgZ;

			for (let row = 0; row < 3; row++) {
				for (let col = 0; col < 3; col++) {
					const x0 = projected[0].x + (projected[1].x - projected[0].x) * (col / 3);
					const y0 = projected[0].y + (projected[1].y - projected[0].y) * (col / 3);
					const x1 = projected[0].x + (projected[1].x - projected[0].x) * ((col + 1) / 3);
					const y1 = projected[0].y + (projected[1].y - projected[0].y) * ((col + 1) / 3);

					const x2 = projected[3].x + (projected[2].x - projected[3].x) * (col / 3);
					const y2 = projected[3].y + (projected[2].y - projected[3].y) * (col / 3);
					const x3 = projected[3].x + (projected[2].x - projected[3].x) * ((col + 1) / 3);
					const y3 = projected[3].y + (projected[2].y - projected[3].y) * ((col + 1) / 3);

					const topLeftX = x0 + (x2 - x0) * (row / 3);
					const topLeftY = y0 + (y2 - y0) * (row / 3);
					const topRightX = x1 + (x3 - x1) * (row / 3);
					const topRightY = y1 + (y3 - y1) * (row / 3);

					const bottomLeftX = x0 + (x2 - x0) * ((row + 1) / 3);
					const bottomLeftY = y0 + (y2 - y0) * ((row + 1) / 3);
					const bottomRightX = x1 + (x3 - x1) * ((row + 1) / 3);
					const bottomRightY = y1 + (y3 - y1) * ((row + 1) / 3);

					ctx.beginPath();
					ctx.moveTo(topLeftX, topLeftY);
					ctx.lineTo(topRightX, topRightY);
					ctx.lineTo(bottomRightX, bottomRightY);
					ctx.lineTo(bottomLeftX, bottomLeftY);
					ctx.closePath();

					ctx.fillStyle = face[row][col];
					ctx.fill();
					ctx.strokeStyle = '#000';
					ctx.lineWidth = 2;
					ctx.stroke();
				}
			}

			return avgZ;
		}

		const faces = [
			{
				name: 'front',
				corners: [
					rotatePoint(-cubeSize, -cubeSize, cubeSize),
					rotatePoint(cubeSize, -cubeSize, cubeSize),
					rotatePoint(cubeSize, cubeSize, cubeSize),
					rotatePoint(-cubeSize, cubeSize, cubeSize),
				],
				data: cubeState.front
			},
			{
				name: 'back',
				corners: [
					rotatePoint(cubeSize, -cubeSize, -cubeSize),
					rotatePoint(-cubeSize, -cubeSize, -cubeSize),
					rotatePoint(-cubeSize, cubeSize, -cubeSize),
					rotatePoint(cubeSize, cubeSize, -cubeSize),
				],
				data: cubeState.back
			},
			{
				name: 'left',
				corners: [
					rotatePoint(-cubeSize, -cubeSize, -cubeSize),
					rotatePoint(-cubeSize, -cubeSize, cubeSize),
					rotatePoint(-cubeSize, cubeSize, cubeSize),
					rotatePoint(-cubeSize, cubeSize, -cubeSize),
				],
				data: cubeState.left
			},
			{
				name: 'right',
				corners: [
					rotatePoint(cubeSize, -cubeSize, cubeSize),
					rotatePoint(cubeSize, -cubeSize, -cubeSize),
					rotatePoint(cubeSize, cubeSize, -cubeSize),
					rotatePoint(cubeSize, cubeSize, cubeSize),
				],
				data: cubeState.right
			},
			{
				name: 'top',
				corners: [
					rotatePoint(-cubeSize, -cubeSize, -cubeSize),
					rotatePoint(cubeSize, -cubeSize, -cubeSize),
					rotatePoint(cubeSize, -cubeSize, cubeSize),
					rotatePoint(-cubeSize, -cubeSize, cubeSize),
				],
				data: cubeState.top
			},
			{
				name: 'bottom',
				corners: [
					rotatePoint(-cubeSize, cubeSize, cubeSize),
					rotatePoint(cubeSize, cubeSize, cubeSize),
					rotatePoint(cubeSize, cubeSize, -cubeSize),
					rotatePoint(-cubeSize, cubeSize, -cubeSize),
				],
				data: cubeState.bottom
			},
		];

		const projectedFaces = faces.map(face => ({
			...face,
			projectedCorners: face.corners.map(c => project(c.x, c.y, c.z)),
			avgZ: face.corners.reduce((sum, c) => sum + c.z, 0) / 4
		}));

		projectedFaces.sort((a, b) => b.avgZ - a.avgZ);

		projectedFaces.forEach(face => {
			drawFace(face.data, face.projectedCorners, face.corners);
		});
	}

	function handleStartClick() {
		console.log('Color Processing Start');
		startInterval();
		setScanningButton('Stop Scanning');
	}

	function handleStopClick() {
		console.log('Color Processing Stop');
		setGridColors(Array(3).fill(null).map(() => Array(3).fill('#FFFFFF')));
		stopInterval();
		setScanningButton('Start Scanning');
	}

	function handleSaveClick() {
		console.log(`Colors Saved to ${currentFace} face`);
		setCubeState(prev => ({
			...prev,
			[currentFace]: JSON.parse(JSON.stringify(gridColors))
		}));
		// Ask user whether they want to move to the next face and continue scanning
		const order: (keyof CubeState)[] = ['front', 'right', 'back', 'left', 'top', 'bottom'];
		const idx = order.indexOf(currentFace);
		const next = order[(idx + 1) % order.length];

		const goNext = typeof window !== 'undefined' ? window.confirm(`Saved ${currentFace}. Move camera to ${next} and continue scanning?`) : false;

		if (goNext) {
			setCurrentFace(next);
			// ensure scanning is running
			startInterval();
			setScanningButton('Stop Scanning');
		} else {
			stopInterval();
			setScanningButton('Start Scanning');
		}
	}

	async function handleSolveClick() {
		try {
			// build and validate the cubejs state string before calling the solver
			const stateStrPreview = cubeStateToCubejsString(cubeState);
			// expose debug info for user: stateStr and per-face counts
			setDebugStateStr(stateStrPreview);
			const counts: Record<string, number> = {};
			for (const ch of stateStrPreview) counts[ch] = (counts[ch] || 0) + 1;
			setDebugCounts(counts);
			function validateState(s: string) {
				if (!s || s.length !== 54) return 'state string must be 54 characters long';
				const counts: Record<string, number> = {};
				for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;
				const required = ['U','R','F','D','L','B'];
				for (const r of required) {
					if (counts[r] !== 9) return `expected 9 stickers of ${r}, found ${counts[r] || 0}`;
				}
				// check centers (4th sticker of each 9-block) are unique
				const centers = [4,13,22,31,40,49].map(i => s[i]);
				const uniqueCenters = new Set(centers);
				if (uniqueCenters.size !== 6) return `face centers are not unique (${centers.join(',')})`;
				return null;
			}

			const validationError = validateState(stateStrPreview);
			if (validationError) {
				console.warn('Invalid cube state for solver:', validationError, { stateStr: stateStrPreview });
				setSolutionStr(`Invalid cube state: ${validationError}`);
				setMoves([]);
				return;
			}
			// dynamic import so build doesn't fail if package isn't installed yet
			const cubejsModule: any = await import('cubejs');
			// normalize possible exports (commonjs vs ESM)
			const cubejs: any =
				(cubejsModule && typeof cubejsModule.solve === 'function' && cubejsModule) ||
				(cubejsModule && cubejsModule.default && typeof cubejsModule.default.solve === 'function' && cubejsModule.default) ||
				(cubejsModule && typeof cubejsModule.default === 'function' && cubejsModule.default) ||
				cubejsModule;

			const stateStr = cubeStateToCubejsString(cubeState);
			let solution: string | null = null;
			// Try multiple calling patterns to support different cubejs builds
			try {
				if (cubejs && typeof cubejs.solve === 'function') {
					solution = cubejs.solve(stateStr);
				} else if (cubejs && cubejs.default && typeof cubejs.default.solve === 'function') {
					solution = cubejs.default.solve(stateStr);
				} else if (typeof cubejs === 'function') {
					// could be a function or a class
					try {
						const maybe = (cubejs as any)(stateStr);
						if (typeof maybe === 'string') solution = maybe;
					} catch (err: any) {
						// if it's a class constructor, try new
						if (/class constructors must be invoked with 'new'/.test(String(err.message))) {
							const inst = new (cubejs as any)();
							if (typeof inst.solve === 'function') {
								solution = inst.solve(stateStr);
							} else if (typeof inst === 'function') {
								solution = inst(stateStr);
							}
						} else {
							throw err;
						}
					}
				} else if (cubejs && typeof cubejs === 'object') {
					// try common named exports
					const candidates = ['Cube', 'Solver', 'CubeJS'];
					for (const c of candidates) {
						const ctor = (cubejs as any)[c];
						if (typeof ctor === 'function') {
							try {
								const inst = new ctor();
								if (typeof inst.solve === 'function') {
									solution = inst.solve(stateStr);
									break;
								}
							} catch (e) {
								// ignore and continue
							}
						}
					}
				}
			} catch (err) {
				console.error('Solver invocation failed shape test:', err, { cubejs });
				throw err;
			}
			setSolutionStr(solution || '');
			setMoves((solution || '').split(/\s+/).filter(Boolean));
		} catch (e) {
			console.error('Solver error', e);
			setSolutionStr('Error computing solution (is cubejs installed?)');
		}
	}

	function handleMouseDown(e: React.MouseEvent) {
		setMouseDown(true);
		setLastMouse({ x: e.clientX, y: e.clientY });
	}

	function handleMouseMove(e: React.MouseEvent) {
		if (!mouseDown) return;

		const deltaX = e.clientX - lastMouse.x;
		const deltaY = e.clientY - lastMouse.y;

		setRotation(prev => ({
			x: prev.x + deltaY * 0.5,
			y: prev.y + deltaX * 0.5
		}));

		setLastMouse({ x: e.clientX, y: e.clientY });
	}

	function handleMouseUp() {
		setMouseDown(false);
	}

	function resetCube() {
		setCubeState({
			front: emptyFace,
			back: emptyFace,
			left: emptyFace,
			right: emptyFace,
			top: emptyFace,
			bottom: emptyFace,
		});
	}

	return (
		<div className="flex font-sans flex-col w-screen h-full items-center font-io-regular bg-contain justify-items-center min-h-screen p-8 pb-20 gap-10 bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 px-4">
			<div className="fixed top-4 left-4 z-50">
				<a href="/" title="Go to Home">
					<Image
						src={Icon}
						alt="ARC Solver Icon"
						width={100}
						height={100}
						className="rounded-full border-2 border-black shadow-lg"
						priority
					/>
				</a>
			</div>
			{/* scaled container */}
			<div style={{ width: designWidth + 'px', transform: `scale(${scale})`, transformOrigin: 'top center' }}>

			<div className="flex flex-col gap-5 row-start-2 items-center w-fit bg-emerald-600 border-10 border-y-emerald-700 border-x-emerald-500 px-8 py-5 rounded-2xl shadow-lg mx-auto mb-10">
				<h1 className="mx-auto text-center text-6xl">Rubik's Cube Scanner</h1>
				{loading && <p className='mx-auto'>Requesting camera access...</p>}
				{error && <p style={{ color: 'red' }}>Error: {error}</p>}
			</div>

			<div className="flex flex-row lg:flex-row justify-center items-start gap-8">
				<div className="flex flex-col gap-5 flex-wrap items-center bg-emerald-600 border-10 border-y-emerald-700 border-x-emerald-500 p-4 rounded-lg shadow-lg">
					<h2 className="text-4xl">Camera Feed</h2>
					<div className="relative border-4 border-y-emerald-700 border-x-emerald-500 rounded-lg w-[500px] h-[500px]">
						<video
							ref={videoRef}
							autoPlay
							playsInline
							className="w-full h-full rounded-lg bg-black object-cover"
						/>
						<canvas
							ref={canvasRef}
							className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-md"
						/>

					</div>
					<div className="flex flex-col gap-3 items-center">
						<label className="text-xl">Select Face:</label>
						<select 
							value={currentFace} 
							onChange={(e) => setCurrentFace(e.target.value as keyof CubeState)}
							className="p-2 rounded bg-white text-black border-2 border-emerald-700"
						>
							<option value="front">Front</option>
							<option value="back">Back</option>
							<option value="left">Left</option>
							<option value="right">Right</option>
							<option value="top">Top</option>
							<option value="bottom">Bottom</option>
						</select>
					</div>
					<div className="flex justify-center gap-5">
						{scanningButton === "Start Scanning" ? (
							<button
								onClick={handleStartClick}
								className="cursor-pointer w-35 p-2 rounded bg-emerald-600 border-5 border-y-emerald-700 border-x-emerald-500 text-white"
							>
								Start Scanning
							</button>
						) : (
							<button
								onClick={handleStopClick}
								className="cursor-pointer w-35 p-2 rounded bg-emerald-600 border-5 border-y-emerald-700 border-x-emerald-500 text-white"
							>
								Stop Scanning
							</button>
						)}
						{scanningButton === "Stop Scanning" && (
							<button
								onClick={handleSaveClick}
								className="cursor-pointer w-35 p-2 rounded bg-emerald-600 border-5 border-y-emerald-700 border-x-emerald-500 text-white"
							>
								Save to {currentFace}
							</button>
						)}
					</div>
				</div>

				<div className="flex flex-col items-center bg-emerald-600 border-10 border-y-emerald-700 border-x-emerald-500 p-4 gap-4 rounded-lg min-w-fit shadow-lg">
					<h2 className="text-4xl">Current Scan</h2>
					<div className="grid grid-cols-3 gap-2 p-2 min-w-fit border-4 border-y-emerald-700 border-x-emerald-500 bg-white rounded-lg">
						{gridColors.map((row, rowIndex) =>
							row.map((color, colIndex) => (
								<div
									key={`${rowIndex}-${colIndex}`}
									style={{ backgroundColor: color }}
									className="w-16 h-16 border-2 border-black-500 rounded-lg"
									title={color}
								/>
							))
						)}
					</div>

					<h2 className='text-4xl mt-4'>Cube Net</h2>
					<div className='w-fit h-fit bg-gray-800 border-4 border-y-emerald-700 border-x-emerald-500 rounded-lg p-6'>
						<div className="flex flex-col items-center gap-2">
							<div className="flex items-center gap-4 mb-2">
								<h3 className="text-lg text-white">Cube Net</h3>
								<button onClick={() => setManualEdit(m => !m)} className={`text-sm px-2 py-1 rounded ${manualEdit ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white'}`}>
									{manualEdit ? 'Manual Edit: ON' : 'Manual Edit: OFF'}
								</button>
							</div>
							{/* Labeled 3x2 cube net: Row1 = Top / Front / Right ; Row2 = Left / Back / Bottom */}
							<div className="grid grid-cols-3 gap-4">
								{/* Top */}
								<div className="flex flex-col items-center">
									<h4 className="text-sm text-white mb-2">Top</h4>
									<div className="grid grid-cols-3 gap-1 bg-black p-2 rounded">
										{cubeState.top.map((row, rowIndex) => row.map((color, colIndex) => (
											<div
												key={`top-${rowIndex}-${colIndex}`}
												style={{ backgroundColor: color }}
												className={`w-10 h-10 border-2 border-gray-900 rounded-sm ${manualEdit ? 'cursor-pointer' : ''}`}
												onClick={() => manualEdit && cycleSticker('top', rowIndex, colIndex)}
											/>
										))).flat()}
									</div>
								</div>

								{/* Front */}
								<div className="flex flex-col items-center">
									<h4 className="text-sm text-white mb-2">Front</h4>
									<div className="grid grid-cols-3 gap-1 bg-black p-2 rounded">
										{cubeState.front.map((row, rowIndex) => row.map((color, colIndex) => (
											<div
												key={`front-${rowIndex}-${colIndex}`}
												style={{ backgroundColor: color }}
												className={`w-10 h-10 border-2 border-gray-900 rounded-sm ${manualEdit ? 'cursor-pointer' : ''}`}
												onClick={() => manualEdit && cycleSticker('front', rowIndex, colIndex)}
											/>
										))).flat()}
									</div>
								</div>

								{/* Right */}
								<div className="flex flex-col items-center">
									<h4 className="text-sm text-white mb-2">Right</h4>
									<div className="grid grid-cols-3 gap-1 bg-black p-2 rounded">
										{cubeState.right.map((row, rowIndex) => row.map((color, colIndex) => (
											<div
												key={`right-${rowIndex}-${colIndex}`}
												style={{ backgroundColor: color }}
												className={`w-10 h-10 border-2 border-gray-900 rounded-sm ${manualEdit ? 'cursor-pointer' : ''}`}
												onClick={() => manualEdit && cycleSticker('right', rowIndex, colIndex)}
											/>
										))).flat()}
									</div>
								</div>

								{/* Left */}
								<div className="flex flex-col items-center">
									<h4 className="text-sm text-white mb-2">Left</h4>
									<div className="grid grid-cols-3 gap-1 bg-black p-2 rounded">
										{cubeState.left.map((row, rowIndex) => row.map((color, colIndex) => (
											<div
												key={`left-${rowIndex}-${colIndex}`}
												style={{ backgroundColor: color }}
												className={`w-10 h-10 border-2 border-gray-900 rounded-sm ${manualEdit ? 'cursor-pointer' : ''}`}
												onClick={() => manualEdit && cycleSticker('left', rowIndex, colIndex)}
											/>
										))).flat()}
									</div>
								</div>

								{/* Back */}
								<div className="flex flex-col items-center">
									<h4 className="text-sm text-white mb-2">Back</h4>
									<div className="grid grid-cols-3 gap-1 bg-black p-2 rounded">
										{cubeState.back.map((row, rowIndex) => row.map((color, colIndex) => (
											<div
												key={`back-${rowIndex}-${colIndex}`}
												style={{ backgroundColor: color }}
												className={`w-10 h-10 border-2 border-gray-900 rounded-sm ${manualEdit ? 'cursor-pointer' : ''}`}
												onClick={() => manualEdit && cycleSticker('back', rowIndex, colIndex)}
											/>
										))).flat()}
									</div>
								</div>

								{/* Bottom */}
								<div className="flex flex-col items-center">
									<h4 className="text-sm text-white mb-2">Bottom</h4>
									<div className="grid grid-cols-3 gap-1 bg-black p-2 rounded">
										{cubeState.bottom.map((row, rowIndex) => row.map((color, colIndex) => (
											<div
												key={`bottom-${rowIndex}-${colIndex}`}
												style={{ backgroundColor: color }}
												className={`w-10 h-10 border-2 border-gray-900 rounded-sm ${manualEdit ? 'cursor-pointer' : ''}`}
												onClick={() => manualEdit && cycleSticker('bottom', rowIndex, colIndex)}
											/>
										))).flat()}
									</div>
								</div>
							</div>
						</div>
					</div>

					<h2 className='text-4xl mt-4'>3D Preview</h2>
							<div className="flex items-start gap-4">
								<canvas
									ref={cubeCanvasRef}
									width={400}
									height={400}
									className="border-4 border-y-emerald-700 border-x-emerald-500 bg-gray-100 rounded-lg cursor-move"
									onMouseDown={handleMouseDown}
									onMouseMove={handleMouseMove}
									onMouseUp={handleMouseUp}
									onMouseLeave={handleMouseUp}
								/>

								{/* view buttons */}
								<div className="flex flex-col gap-2">
									<button onClick={() => viewSide('front')} className={`p-2 rounded ${currentFace === 'front' ? 'bg-white text-black' : 'bg-emerald-600 text-white'}`}>Front</button>
									<button onClick={() => viewSide('right')} className={`p-2 rounded ${currentFace === 'right' ? 'bg-white text-black' : 'bg-emerald-600 text-white'}`}>Right</button>
									<button onClick={() => viewSide('back')} className={`p-2 rounded ${currentFace === 'back' ? 'bg-white text-black' : 'bg-emerald-600 text-white'}`}>Back</button>
									<button onClick={() => viewSide('left')} className={`p-2 rounded ${currentFace === 'left' ? 'bg-white text-black' : 'bg-emerald-600 text-white'}`}>Left</button>
									<button onClick={() => viewSide('top')} className={`p-2 rounded ${currentFace === 'top' ? 'bg-white text-black' : 'bg-emerald-600 text-white'}`}>Top</button>
									<button onClick={() => viewSide('bottom')} className={`p-2 rounded ${currentFace === 'bottom' ? 'bg-white text-black' : 'bg-emerald-600 text-white'}`}>Bottom</button>
								</div>
							</div>
					<p className="text-sm text-center">Drag to rotate</p>

					<button
						onClick={resetCube}
						className="cursor-pointer p-2 rounded bg-red-600 border-5 border-y-red-700 border-x-red-500 text-white mt-2"
					>
						Reset Cube
					</button>

					<div className="flex gap-2 mt-3 items-center">
						<button onClick={handleSolveClick} className="px-3 py-1 rounded bg-blue-600 text-white">Solve</button>
						{solutionStr && <div className="text-sm ml-2">{solutionStr}</div>}
					</div>

					<div className="mt-2">
						<button className="text-sm underline" onClick={() => setDebugVisible(v => !v)}>{debugVisible ? 'Hide' : 'Show'} debug state</button>
						{debugVisible && (
							<div className="mt-2 bg-gray-900 text-white p-3 rounded">
								<div className="mb-2 text-xs opacity-80">Generated cube state string (54 chars) — copy for debugging:</div>
								<div className="mb-2 flex gap-2 items-center">
									<span className="text-xs opacity-80">Color mapping:</span>
									<button className={`text-xs px-2 py-1 rounded ${colorMode==='lab' ? 'bg-emerald-500 text-white' : 'bg-white/10'}`} onClick={() => { setColorMode('lab'); readVideoFeed(); }}>Lab (recommended)</button>
									<button className={`text-xs px-2 py-1 rounded ${colorMode==='rgb' ? 'bg-emerald-500 text-white' : 'bg-white/10'}`} onClick={() => { setColorMode('rgb'); readVideoFeed(); }}>RGB (fallback)</button>
								</div>
								<textarea readOnly value={debugStateStr} className="w-full h-24 text-sm p-2 bg-black/50" />
								<div className="mt-2 text-sm">Per-face counts:</div>
								<div className="flex gap-3 mt-1 text-xs">
									{['U','R','F','D','L','B'].map(k => (
										<div key={k} className="px-2 py-1 bg-white/5 rounded">{k}: {debugCounts[k] || 0}</div>
									))}
								</div>
							</div>
						)}
					</div>

					{moves.length > 0 && (
						<div className="w-full mt-4">
							<SolverAnimator moves={moves} />
						</div>
					)}
				</div>
			</div>
			</div>
		</div>
	);
}