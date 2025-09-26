'use client';
// pages/camera.js
import { useEffect, useRef, useState } from 'react';

export default function CameraPage() {
	const videoRef = useRef(null);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function getCamera() {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: true,
				});
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}
				setLoading(false);
			} catch (err) {
				setError(err.message);
				setLoading(false);
			}
		}

		getCamera();

		// Cleanup on unmount: stop the video stream
		return () => {
			if (videoRef.current && videoRef.current.srcObject) {
				videoRef.current.srcObject
					.getTracks()
					.forEach((track) => track.stop());
			}
		};
	}, []);

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
		</div>
	);
}
