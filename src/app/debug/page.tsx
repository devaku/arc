'use client';
import React, { useState } from 'react';

export default function ColorBox() {
	const [hexvalue, setHexvalue] = useState('#00ff00');

	return (
		<div>
			<input
				type="text"
				value={hexvalue}
				onChange={(e) => setHexvalue(e.target.value)}
				className="mb-4 p-2 border"
			/>
			<div
				style={{ backgroundColor: hexvalue }}
				className={`h-[600px] w-[600px]`}
			/>
		</div>
	);
}
