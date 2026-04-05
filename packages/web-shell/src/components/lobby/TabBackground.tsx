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
		<div className="absolute inset-0">
			<div className="absolute inset-0" style={{ background: gradient }} />
			<img
				src={src}
				alt=""
				onLoad={() => setLoaded(true)}
				onError={() => setLoaded(false)}
				className="absolute inset-0 w-full h-full object-cover [image-rendering:pixelated] transition-opacity duration-300"
				style={{ opacity: loaded ? overlayOpacity : 0 }}
			/>
		</div>
	);
}
