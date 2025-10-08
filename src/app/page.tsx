import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
	return (
		<div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 bg-[url(/images/dice-427897.jpg)] w-screen sm:p-20 mx-auto">
				<main className="flex flex-col gap-10 row-start-2 items-start w-fit h-fit bg-red-500 border-10 border-y-red-600 border-x-red-400 px-8 pt-15 pb-5 rounded-2xl shadow-lg">
					<h1 className="text-6xl font-bold mx-auto text-center sm:text-left">
						ARC Solver
					</h1>
					<p className="max-w-2xl text-center sm:text-left">
						ARC Solver is an open-source web application that leverages
						advanced
					</p>
					<Link
						className="bg-yellow-500 border-10 border-y-yellow-600 border-x-yellow-400 hover:bg-yellow-700 text-white mx-auto font-bold py-2 px-4 text-4xl rounded-2xl"
						href={"/rubiks"}
					>
						Let's Get Started
					</Link>
				</main>
				<footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center bg-blue-400 border-10 border-y-blue-500 border-x-blue-300 p-4 rounded-lg shadow-lg">
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
