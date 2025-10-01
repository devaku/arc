import { RefObject, useEffect, useState } from 'react';

export default function useGetCamera(
	videoRef: RefObject<HTMLVideoElement | null>,
	setLoading: React.Dispatch<React.SetStateAction<boolean>>,
	setError: React.Dispatch<React.SetStateAction<string | null>>
) {
	const [allowed, setAllowed] = useState<boolean>(false);
	useEffect(() => {
		async function getCamera() {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: true,
				});
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					setAllowed(true);
				}
				setLoading(false);
			} catch (err: any) {
				setError(err.message);
				setLoading(false);
				setAllowed(false);
			}
		}

		getCamera();

		// Cleanup on unmount: stop the video stream
		return () => {
			if (videoRef.current && videoRef.current.srcObject) {
				if (videoRef.current.srcObject instanceof MediaStream) {
					videoRef.current.srcObject
						.getTracks()
						.forEach((track) => track.stop());
				}
			}
		};
	}, []);

	return allowed;
}
