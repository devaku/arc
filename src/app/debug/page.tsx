'use client';
export default function DebugPage() {
	function handleClick() {
		console.log('I CLICKED');
	}
	return <div onClick={handleClick}>Return</div>;
}
