'use client';
// pages/camera.js
import { useEffect, useRef, useState } from 'react';
import useGetCamera from '@/hooks/useGetCamera';

export default function CameraPage() {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [rgb, setRgb] = useState<string>('#FFFFFF');

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

	function stopInterval() {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}

	function readVideoFeed() {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (video && canvas) {
			// Telling the canvas that you want
			// To draw 2D images on it
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				return;
			}

			// Set canvas size to video size
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;

			// image source itself,
			// starting origin x, y,
			// and then the dimensions of the image you want drawn.
			// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

			// Once image is drawn, grab a FRAME
			const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const pixels = frame.data;
			// console.log(pixels);

			// Analyze colors
			const colorCount: any = {};
			for (let i = 0; i < pixels.length; i += 4) {
				const r = pixels[i];
				const g = pixels[i + 1];
				const b = pixels[i + 2];
				// Simple rounding to reduce variations
				const color = `${Math.round(r / 32) * 32}, ${
					Math.round(g / 32) * 32
				}, ${Math.round(b / 32) * 32}`;
				colorCount[color] = (colorCount[color] || 0) + 1;
			}

			// Get the most frequent color
			const dominantColor = Object.entries(colorCount).sort(
				(a: any, b: any) => b[1] - a[1]
			)[0]?.[0];

			let temp = dominantColor.split(',');
			let rgbValues = temp.map((el) => Number(el));
			let hexValue = rgbToHex(rgbValues[0], rgbValues[1], rgbValues[2]);

			hexValue = hexValue.toUpperCase();
			console.log(hexValue);
			setRgb(hexValue);
		}
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

	/**
	 * HANDLERS
	 */

	function handleStartClick() {
		console.log('Color Processing Start');
		startInterval();
	}

	function handleStopClick() {
		console.log('Color Processing Stop');
		setRgb('#FFFFFF');
		stopInterval();
	}
	return (
		<div className="flex flex-col mt-5">
			{/* BUTTONS */}
			<div className="flex justify-center gap-2">
				<button
					onClick={handleStartClick}
					className="cursor-pointer p-2 rounded bg-green-500 text-black"
				>
					Start Processing Color
				</button>
				<button
					onClick={handleStopClick}
					className="cursor-pointer p-2 rounded bg-red-500 text-white"
				>
					Stop Processing Color
				</button>
			</div>

			{/* Table */}
			<div className="flex justify-around">
				{/* Left Column */}
				<div className="flex flex-col items-center w-full">
					{/* INFORMATION */}
					<div>
						<h1 className="text-center">Camera Access</h1>
						{loading && <p>Requesting camera access...</p>}
						{error && (
							<p style={{ color: 'red' }}>Error: {error}</p>
						)}
					</div>

					{/* VIDEO */}
					{/* <div className="h-[600px] w-[600px] bg-sky-500"></div> */}
					<video
						ref={videoRef}
						autoPlay
						playsInline
						style={{
							width: '100%',
							maxWidth: 600,
							borderRadius: 8,
						}}
					/>
					<canvas ref={canvasRef} style={{ display: 'none' }} />
				</div>
				{/* Right Column */}
				<div className="flex flex-col items-center w-full">
					<h1 className="text-center">RGBDATA</h1>
					<div>
						<div
							style={{ backgroundColor: rgb }}
							className={`h-[600px] w-[600px]`}
						></div>
					</div>
				</div>
			</div>
		</div>
	);
}
