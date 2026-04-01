import { useState } from 'react';

interface TabBackgroundProps {
	src: string;
	gradient: string;
	overlayOpacity?: number;
}

export function TabBackground({
	src,
	gradient,
	overlayOpacity = 1,
}: TabBackgroundProps) {
	const [loaded, setLoaded] = useState(false);

	return (
		<div style={{ position: 'absolute', inset: 0 }}>
			<div style={{ position: 'absolute', inset: 0, background: gradient }} />
			<img
				src={src}
				alt=""
				onLoad={() => setLoaded(true)}
				onError={() => setLoaded(false)}
				style={{
					position: 'absolute',
					inset: 0,
					width: '100%',
					height: '100%',
					objectFit: 'cover',
					imageRendering: 'pixelated',
					opacity: loaded ? overlayOpacity : 0,
					transition: 'opacity 0.3s',
				}}
			/>
		</div>
	);
}
