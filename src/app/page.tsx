import Image from 'next/image';
import Link from 'next/link';
import Icon from '../../images/Untitled_Artwor no white borderk.png';

export default function Home() {
	return (
		<div className="flex flex-col justify-between text-black items-center py-5 justify-items-center font-sans gap-16 min-h-screen w-screen mx-auto bg-gradient-to-br from-amber-50 via-orange-100 to-yellow-100">
			{/* Persistent Icon (top-left corner) */}
			<div className="fixed top-4 left-4 z-50">
				<a href="/" title="Go to Home">
					<div className="rounded-full pb-2 border-3 border-amber-800 shadow-2xl w-25 h-25 bg-amber-100/80 flex items-center justify-center">
						<Image
							src={Icon}
							alt="ARC Solver Icon"
							width={80}
							height={80}
							className=""
							priority
						/>
					</div>
				</a>
			</div>
			<main
				className={`pt-0 flex flex-col gap-10 row-start-2 items-start w-fit h-fit bg-gradient-to-br from-amber-100 to-orange-100 border-4 border-amber-800/40 p-6 rounded-2xl shadow-xl" style={{ boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}`}
			>
				<h1 className="text-6xl font-bold mx-auto text-center sm:text-left">
					<Image
						src={Icon}
						alt="ARC Solver Icon"
						width={500}
						height={500}
						className=""
						priority
					/>
				</h1>
				<p className="font-bold text-amber-900" style={{ fontFamily: 'serif' }}>
					ARC Solver is an open-source web application that leverages
					advanced stuff?
				</p>
				<Link
					className={`bg-gradient-to-br mx-auto font-bold text-amber-900 from-amber-50 to-orange-100 border-4 border-amber-800/40 p-6 rounded-2xl shadow-xl" style={{ boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}`}
					href={'/rubiks'}
					style={{ fontFamily: 'serif' }}
				>
					Let's Get Started
				</Link>
			</main>
			<footer
				className={`row-start-3 mx-auto flex gap-[24px] flex-wrap items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 border-4 border-amber-800/40 p-6 rounded-2xl shadow-xl" style={{ boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}`}
			>
				<a
					href="https://github.com/SummerShorts676/ARC-Solver.git"
					className="flex items-center gap-2 hover:underline hover:underline-offset-4 font-bold text-amber-900"
					target="_blank"
					rel="noopener noreferrer"
					style={{ fontFamily: 'serif' }}
				>
					View on GitHub
					<Image
						aria-hidden
						src="/images/github-mark.svg"
						alt=""
						width={16}
						height={16}
						className="stroke-amber-900"
					/>
				</a>
			</footer>
		</div>
	);
}
