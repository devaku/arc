'use client';

/**
 * HOOKS
 */

import { useEffect, useRef, useState } from 'react';
import useGetCamera from '@/hooks/useGetCamera';

/**
 * COMPONENTS
 */
import { NavIcon } from '@/components/navicon';

export default function CameraPage() {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	const [canvasHeight, setCanvasHeight] = useState<number>(10);
	const [canvasWidth, setCanvasWidth] = useState<number>(13);

	const [scanningButton, setScanningButton] = useState<
		'Start Scanning' | 'Stop Scanning'
	>('Start Scanning');

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [gridColors, setGridColors] = useState<string[][]>(
		Array(3)
			.fill(null)
			.map(() => Array(3).fill('#FFFFFF'))
	);
	const [savedColors, setSavedColors] = useState<string[][]>(
		Array(3)
			.fill(null)
			.map(() => Array(3).fill('#FFFFFF'))
	);
	const [isSaved, setIsSaved] = useState<boolean>(false);
	const [savedImages, setSavedImages] = useState<string[][][]>([]);

	useGetCamera(videoRef, setLoading, setError);

	function startInterval() {
		// Clear previous intervals
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}

		// Run interval
		intervalRef.current = setInterval(() => {
			readVideoFeed();
		}, 500);
	}

	function computeNewWidth(
		originalWidth: number,
		originalHeight: number,
		newHeight: number
	) {
		if (originalHeight === 0 || newHeight === 0) {
			throw new Error('Height values must be greater than 0.');
		}

		// Compute the scale factor based on the new height
		const scaleFactor = newHeight / originalHeight;

		// Compute the new width based on the scale factor
		const newWidth = originalWidth * scaleFactor;

		return newWidth;
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

		const totalRows = 3;
		const totalColumns = 3;

		// Get correct aspect ratio
		// canvas.width = canvasWidth;
		// canvas.height = canvasHeight;

		// console.log(video.videoWidth);
		// console.log(video.videoHeight);

		// Match canvas size to video display size
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;

		// Draw the current video frame to the canvas
		// The canvas will hold the CURRENT FRAME of a video
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

		// Calculate cell dimensions
		const cellWidth = canvas.width / totalRows;
		const cellHeight = canvas.height / totalColumns;

		captureImageData(ctx, totalRows, totalColumns, cellWidth, cellHeight);

		// Clear canvas and redraw with overlay
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		drawGridOverlay(totalRows, totalColumns, ctx, canvas);
	}

	useEffect(() => {
		return () => stopInterval();
	}, []);

	function rgbToHex(r: number, g: number, b: number) {
		// Ensure the values are within the valid range (0-255)
		r = Math.max(0, Math.min(255, Math.round(r)));
		g = Math.max(0, Math.min(255, Math.round(g)));
		b = Math.max(0, Math.min(255, Math.round(b)));

		// Convert each component to a two-digit hexadecimal string
		const toHex = (c: any) => {
			const hex = c.toString(16);
			return hex.length === 1 ? '0' + hex : hex;
		};

		// Combine the hexadecimal components and prepend '#'
		return '#' + toHex(r) + toHex(g) + toHex(b);
	}

	function drawGridOverlay(
		totalRows: number,
		totalColumns: number,
		ctx: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement
	) {
		/**
		 * ctx is the video frame
		 * canvas contains the DIMENSIONS that image is being captured from
		 */

		// --- Draw 3x3 grid overlay ---
		const lineColor = 'rgba(255, 255, 255, 0.8)';
		const lineWidth = 1;

		ctx.strokeStyle = lineColor;
		ctx.lineWidth = lineWidth;

		// Draw horizontal lines
		for (let i = 1; i < totalRows; i++) {
			const y = (canvas.height / totalRows) * i;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(canvas.width, y);
			ctx.stroke();
		}

		// Draw vertical lines
		for (let i = 1; i < totalColumns; i++) {
			const x = (canvas.width / totalColumns) * i;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();
		}

		// Draw border around entire grid
		ctx.strokeRect(0, 0, canvas.width, canvas.height);
	}

	function captureImageData(
		ctx: CanvasRenderingContext2D,
		totalRows: number,
		totalColumns: number,
		cellWidth: number,
		cellHeight: number
	) {
		// Sample colors from each grid cell
		const newGridColors: string[][] = [];

		for (let row = 0; row < totalRows; row++) {
			newGridColors[row] = [];
			for (let col = 0; col < totalColumns; col++) {
				// Sample from the center of each cell
				const centerX = Math.floor(col * cellWidth + cellWidth / 2);
				const centerY = Math.floor(row * cellHeight + cellHeight / 2);

				// Get pixel data from a small area (5x5 pixels) and average it
				const sampleSize = 5;
				let totalR = 0,
					totalG = 0,
					totalB = 0;
				let pixelCount = 0;

				for (
					let dy = -Math.floor(sampleSize / 2);
					dy <= Math.floor(sampleSize / 2);
					dy++
				) {
					for (
						let dx = -Math.floor(sampleSize / 2);
						dx <= Math.floor(sampleSize / 2);
						dx++
					) {
						const pixelData = ctx.getImageData(
							centerX + dx,
							centerY + dy,
							1,
							1
						).data;
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
	}

	/**
	 * HANDLERS
	 */

	function handleStartClick() {
		console.log('Color Processing Start');
		startInterval();
		setScanningButton('Stop Scanning');
	}

	function handleStopClick() {
		console.log('Color Processing Stop');
		setGridColors(
			Array(3)
				.fill(null)
				.map(() => Array(3).fill('#FFFFFF'))
		);
		stopInterval();
		setScanningButton('Start Scanning');
	}

	function handleSaveClick() {
		console.log('Colors Saved');
		setSavedColors(gridColors);
		setIsSaved(true);
		stopInterval();

		// Add current grid to savedImages array (create a deep copy)
		setSavedImages((prev) => [
			...prev,
			JSON.parse(JSON.stringify(gridColors)),
		]);
	}

	function handleUnsaveClick() {
		console.log('Colors Unsaved - Resume Live');
		setIsSaved(false);
		setSavedColors(
			Array(3)
				.fill(null)
				.map(() => Array(3).fill('#FFFFFF'))
		);
		startInterval();
	}

	function handleGridAdjustSlide(event: React.ChangeEvent<HTMLInputElement>) {
		const newHeight = Number(event.target.value);
		const newWidth = computeNewWidth(canvasWidth, canvasHeight, newHeight);
		setCanvasHeight(newHeight);
		setCanvasWidth(newWidth);
	}

	function deleteSavedImage(index: number) {
		console.log(`Deleting saved image at index ${index}`);
		setSavedImages((prev) => prev.filter((_, i) => i !== index));
	}

	return (
		<div className="flex font-sans flex-col items-center font-io-regular bg-contain justify-items-center min-h-screen p-8 pb-20 gap-10 bpx-4">
			<NavIcon></NavIcon>

			{/* INFORMATION */}
			<div className="flex flex-col gap-5 row-start-2 items-start w-fit h-fit bg-yellow-500 border-10 border-y-yellow-600 border-x-yellow-400 px-8 py-5 rounded-2xl shadow-lg">
				<h1 className="mx-auto text-center text-6xl">
					Rubik's Cube Scanner
				</h1>
				{loading && (
					<p className="mx-auto">Requesting camera access...</p>
				)}
				{error && <p style={{ color: 'red' }}>Error: {error}</p>}
			</div>

			{/* Main Content */}
			<div className="flex flex-row lg:flex-row justify-center items-start gap-8">
				{/* Left Column - Camera Feed */}
				<div className="flex flex-col gap-5 flex-wrap items-center bg-red-500 border-10 border-y-red-600 border-x-red-400 p-4 rounded-lg shadow-lg">
					<h2 className="text-4xl">Camera Feed</h2>
					{/* BUTTONS */}
					<div className="w-full flex items-center justify-evenly">
						<div className="flex flex-col items-center gap-2">
							<label htmlFor="">Grid Adjuster</label>
							<input
								type="range"
								name="canvs-height"
								id=""
								onChange={handleGridAdjustSlide}
								min={10}
								max={640}
							/>
						</div>
						{/* BUTTONS */}
						<div className="flex justify-center gap-5">
							{scanningButton === 'Start Scanning' ? (
								<button
									onClick={handleStartClick}
									className="cursor-pointer w-35 p-2 rounded bg-green-500 border-5 border-y-green-600 border-x-green-400 text-white"
								>
									Start Scanning
								</button>
							) : (
								<button
									onClick={handleStopClick}
									className="cursor-pointer w-35 p-2 rounded bg-blue-500 border-5 border-y-blue-600 border-x-blue-400 text-white"
								>
									Stop Scanning
								</button>
							)}
							{scanningButton === 'Stop Scanning' &&
								(!isSaved ? (
									<button
										onClick={handleSaveClick}
										className="cursor-pointer w-35 p-2 rounded bg-yellow-500 border-5 border-y-yellow-600 border-x-yellow-400 text-white"
									>
										Save Colors
									</button>
								) : (
									<button
										onClick={handleUnsaveClick}
										className="cursor-pointer w-35 p-2 rounded bg-yellow-500 border-5 border-y-yellow-600 border-x-yellow-400 text-white"
									>
										Resume
									</button>
								))}
						</div>
					</div>

					<div className="relative border-4 border-y-red-600 border-x-red-400 rounded-lg w-[500px] h-[500px]">
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
				</div>

				{/* Right Column - 3x3 Color Grid */}
				<div className="flex flex-col items-center bg-blue-500 border-10 border-y-blue-600 border-x-blue-400 p-4 gap-4 rounded-lg min-w-fit shadow-lg">
					<h2 className="text-4xl">
						{isSaved ? 'Saved Colors' : 'Detected Colors'}
					</h2>
					<div className="grid grid-cols-3 gap-2 p-2 min-w-fit border-4 border-y-blue-600 border-x-blue-400 bg-white rounded-lg">
						{(isSaved ? savedColors : gridColors).map(
							(row, rowIndex) =>
								row.map((color, colIndex) => (
									<div
										key={`${rowIndex}-${colIndex}`}
										style={{ backgroundColor: color }}
										className="w-24 h-24 border-2 border-black-500 rounded-2xl"
										title={color}
									/>
								))
						)}
					</div>
					{/* A library of saved photos */}
					<h2 className="text-4xl">Gallery</h2>
					{/* Future feature: Gallery of saved images */}
					<div className="w-fit h-fit bg-white border-4 border-y-blue-600 border-x-blue-400 rounded-lg p-2 mx-auto">
						{savedImages.length === 0 ? (
							<p className="text-gray-600 max-w-50 text-center">
								No saved grids yet. Press "Save Colors" to add
								grids to your gallery!
							</p>
						) : (
							<div className="grid grid-cols-3 gap-2">
								{savedImages.map((image, index) => (
									<button
										key={index}
										onClick={() => deleteSavedImage(index)}
										className="border-2 border-gray-400 rounded-lg p-1 bg-black hover:bg-red-500 hover:border-red-300 transition-colors cursor-pointer"
										title={`Click to delete saved grid ${
											index + 1
										}`}
									>
										<div className="grid grid-cols-3 gap-1">
											{image.map((row, rowIndex) =>
												row.map((color, colIndex) => (
													<div
														key={`${rowIndex}-${colIndex}`}
														style={{
															backgroundColor:
																color,
														}}
														className="w-6 h-6 border border-gray-300 rounded-sm"
														title={color}
													/>
												))
											)}
										</div>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
