import Image from 'next/image';
import Link from 'next/link';
import Icon from '../../images/ARC Solver PNG.png';


export default function Home() {
	return (
		<div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen font-sans p-8 pb-20 gap-16 w-screen sm:p-20 mx-auto bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100">
			{/* Persistent Icon (top-left corner) */}
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
				<main className="flex flex-col gap-10 row-start-2 items-start w-fit h-fit bg-emerald-600 border-10 border-y-emerald-700 border-x-emerald-500 px-8 pt-15 pb-5 rounded-2xl shadow-lg">
					<h1 className="text-6xl font-bold mx-auto text-center sm:text-left">
						ARC Solver
					</h1>
					<p className="max-w-2xl text-center sm:text-left">
						ARC Solver is an open-source web application that leverages
						advanced
					</p>
					<Link
						className="bg-emerald-600 border-10 border-y-emerald-700 border-x-emerald-500 hover:bg-emerald-700 text-white mx-auto font-bold py-2 px-4 text-4xl rounded-2xl"
						href={"/rubiks"}
					>
						Let's Get Started
					</Link>
				</main>
				<footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center bg-emerald-600 border-10 border-y-emerald-700 border-x-emerald-500 p-4 rounded-lg shadow-lg">
					<a
						href="https://github.com/SummerShorts676/ARC-Solver.git"
						className="flex items-center gap-2 hover:underline hover:underline-offset-4"
						target="_blank"
						rel="noopener noreferrer"
					>
						<Image
							aria-hidden
							src="/images/github-mark-white.svg"
							alt=""
							width={16}
							height={16}
						/>
						GitHub
					</a>
				</footer>
		</div>
	);
}