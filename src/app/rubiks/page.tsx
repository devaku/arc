'use client';
// pages/camera.js
import { useEffect, useRef, useState } from 'react';
import useGetCamera from '@/hooks/useGetCamera';
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
	const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

	useGetCamera(videoRef, setLoading, setError);

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

				const sampleSize = 5;
				let totalR = 0, totalG = 0, totalB = 0;
				let pixelCount = 0;

				for (let dy = -Math.floor(sampleSize / 2); dy <= Math.floor(sampleSize / 2); dy++) {
					for (let dx = -Math.floor(sampleSize / 2); dx <= Math.floor(sampleSize / 2); dx++) {
						const pixelData = ctx.getImageData(centerX + dx, centerY + dy, 1, 1).data;
						totalR += pixelData[0];
						totalG += pixelData[1];
						totalB += pixelData[2];
						pixelCount++;
					}
				}

				const avgR = Math.floor(totalR / pixelCount);
				const avgG = Math.floor(totalG / pixelCount);
				const avgB = Math.floor(totalB / pixelCount);

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

		// Map to closest Rubik's cube color
		return findClosestRubiksColor(r, g, b);
	}

	function draw3DCube() {
		const canvas = cubeCanvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

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

		function drawFace(face: CubeFace, corners: any[]) {
			const avgZ = corners.reduce((sum, c) => sum + c.z, 0) / 4;
			
			// Only draw faces that are facing the camera (front-facing)
			const v1 = { 
				x: corners[1].x - corners[0].x, 
				y: corners[1].y - corners[0].y, 
				z: corners[1].z - corners[0].z 
			};
			const v2 = { 
				x: corners[3].x - corners[0].x, 
				y: corners[3].y - corners[0].y, 
				z: corners[3].z - corners[0].z 
			};
			
			// Cross product to find normal
			const normal = {
				x: v1.y * v2.z - v1.z * v2.y,
				y: v1.z * v2.x - v1.x * v2.z,
				z: v1.x * v2.y - v1.y * v2.x
			};
			
			// If normal.z is negative, the face is facing away from camera
			if (normal.z < 0) return avgZ;
			
			for (let row = 0; row < 3; row++) {
				for (let col = 0; col < 3; col++) {
					const x0 = corners[0].x + (corners[1].x - corners[0].x) * (col / 3);
					const y0 = corners[0].y + (corners[1].y - corners[0].y) * (col / 3);
					const x1 = corners[0].x + (corners[1].x - corners[0].x) * ((col + 1) / 3);
					const y1 = corners[0].y + (corners[1].y - corners[0].y) * ((col + 1) / 3);

					const x2 = corners[3].x + (corners[2].x - corners[3].x) * (col / 3);
					const y2 = corners[3].y + (corners[2].y - corners[3].y) * (col / 3);
					const x3 = corners[3].x + (corners[2].x - corners[3].x) * ((col + 1) / 3);
					const y3 = corners[3].y + (corners[2].y - corners[3].y) * ((col + 1) / 3);

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
			drawFace(face.data, face.projectedCorners);
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
		stopInterval();
		setScanningButton('Start Scanning');
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

			<div className="flex flex-col gap-5 row-start-2 items-start w-fit h-fit bg-emerald-600 border-10 border-y-emerald-700 border-x-emerald-500 px-8 py-5 rounded-2xl shadow-lg">
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
							{/* Top face */}
							<div className="flex justify-center">
								<div className="grid grid-cols-3 gap-1 bg-black p-2 rounded">
									{cubeState.top.map((row, rowIndex) =>
										row.map((color, colIndex) => (
											<div
												key={`top-${rowIndex}-${colIndex}`}
												style={{ backgroundColor: color }}
												className='w-10 h-10 border-2 border-gray-900 rounded-sm'
											/>
										))
									)}
								</div>
							</div>
							{/* Middle row: left, front, right, back */}
							<div className="flex gap-2">
								<div className="grid grid-cols-3 gap-1 bg-black p-2 rounded">
									{cubeState.left.map((row, rowIndex) =>
										row.map((color, colIndex) => (
											<div
												key={`left-${rowIndex}-${colIndex}`}
												style={{ backgroundColor: color }}
												className='w-10 h-10 border-2 border-gray-900 rounded-sm'
											/>
										))
									)}
								</div>
								<div className="grid grid-cols-3 gap-1 bg-black p-2 rounded">
									{cubeState.front.map((row, rowIndex) =>
										row.map((color, colIndex) => (
											<div
												key={`front-${rowIndex}-${colIndex}`}
												style={{ backgroundColor: color }}
												className='w-10 h-10 border-2 border-gray-900 rounded-sm'
											/>
										))
									)}
								</div>
								<div className="grid grid-cols-3 gap-1 bg-black p-2 rounded">
									{cubeState.right.map((row, rowIndex) =>
										row.map((color, colIndex) => (
											<div
												key={`right-${rowIndex}-${colIndex}`}
												style={{ backgroundColor: color }}
												className='w-10 h-10 border-2 border-gray-900 rounded-sm'
											/>
										))
									)}
								</div>
								<div className="grid grid-cols-3 gap-1 bg-black p-2 rounded">
									{cubeState.back.map((row, rowIndex) =>
										row.map((color, colIndex) => (
											<div
												key={`back-${rowIndex}-${colIndex}`}
												style={{ backgroundColor: color }}
												className='w-10 h-10 border-2 border-gray-900 rounded-sm'
											/>
										))
									)}
								</div>
							</div>
							{/* Bottom face */}
							<div className="flex justify-center">
								<div className="grid grid-cols-3 gap-1 bg-black p-2 rounded">
									{cubeState.bottom.map((row, rowIndex) =>
										row.map((color, colIndex) => (
											<div
												key={`bottom-${rowIndex}-${colIndex}`}
												style={{ backgroundColor: color }}
												className='w-10 h-10 border-2 border-gray-900 rounded-sm'
											/>
										))
									)}
								</div>
							</div>
						</div>
					</div>

					<h2 className='text-4xl mt-4'>3D Preview</h2>
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
					<p className="text-sm text-center">Drag to rotate</p>

					<button
						onClick={resetCube}
						className="cursor-pointer p-2 rounded bg-red-600 border-5 border-y-red-700 border-x-red-500 text-white mt-2"
					>
						Reset Cube
					</button>
				</div>
			</div>
		</div>
	);
}