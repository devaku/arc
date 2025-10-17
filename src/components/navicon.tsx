import Image from 'next/image';
export function NavIcon() {
	return (
		<div className="fixed top-4 left-4 z-50">
			<a href="/" title="Go to Home">
				<Image
					src={'http://localhost:3000/images/logo.png'}
					alt="ARC Solver Icon"
					width={100}
					height={100}
					className="rounded-full border-2 border-black shadow-lg"
					priority
				/>
			</a>
		</div>
	);
}
