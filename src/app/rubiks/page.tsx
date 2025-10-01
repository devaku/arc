'use client';
// pages/camera.js
import { useEffect, useRef, useState } from 'react';
import useGetCamera from '@/hooks/useGetCamera';

export default function CameraPage() {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [rgb, setRgb] = useState();

	const allowed = useGetCamera(videoRef, setLoading, setError);

	useEffect(() => {
		// Only run the set interval if given camera permission
		const interval = setInterval(() => {
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
				const frame = ctx.getImageData(
					0,
					0,
					canvas.width,
					canvas.height
				);
				const pixels = frame.data;
				console.log(pixels);

				// Analyze colors
				const colorCount: any = {};
				for (let i = 0; i < pixels.length; i += 4) {
					const r = pixels[i];
					const g = pixels[i + 1];
					const b = pixels[i + 2];
					// Simple rounding to reduce variations
					const color = `rgb(${Math.round(r / 32) * 32}, ${
						Math.round(g / 32) * 32
					}, ${Math.round(b / 32) * 32})`;
					colorCount[color] = (colorCount[color] || 0) + 1;
				}

				// Get the most frequent color
				const dominantColor = Object.entries(colorCount).sort(
					(a: any, b: any) => b[1] - a[1]
				)[0]?.[0];
				console.log('Dominant color:', dominantColor);
			}
		}, 500); // Run every 500ms

		return () => clearInterval(interval);
	}, [allowed]);

	return (
		<div style={{ padding: 20 }}>
			<h1>Camera Access</h1>
			{loading && <p>Requesting camera access...</p>}
			{error && <p style={{ color: 'red' }}>Error: {error}</p>}
			<video
				ref={videoRef}
				autoPlay
				playsInline
				style={{ width: '100%', maxWidth: 600, borderRadius: 8 }}
			/>
			<canvas ref={canvasRef} style={{ display: 'none' }} />
			<div>
				<p>RGBDATA</p>
			</div>
		</div>
	);
}
