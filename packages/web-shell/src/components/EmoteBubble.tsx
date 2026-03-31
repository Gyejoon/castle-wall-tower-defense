import { EMOTES } from '@gld/shared';
import { useEffect, useState } from 'react';
import { colors, fonts } from '../styles/tokens';

interface EmoteBubbleProps {
	emoteId: string;
	onDone: () => void;
	position?: 'left' | 'right';
}

export function EmoteBubble({
	emoteId,
	onDone,
	position = 'right',
}: EmoteBubbleProps) {
	const [phase, setPhase] = useState<'in' | 'out'>('in');
	const emote = EMOTES.find((entry) => entry.id === emoteId);

	useEffect(() => {
		const fadeOutTimer = setTimeout(() => setPhase('out'), 4000);
		const removeTimer = setTimeout(onDone, 4600);
		return () => {
			clearTimeout(fadeOutTimer);
			clearTimeout(removeTimer);
		};
	}, [onDone]);

	if (!emote) return null;

	return (
		<div
			style={{
				position: 'absolute',
				bottom: 80,
				[position]: 16,
				background: colors.panel,
				border: `2px solid ${colors.gold}`,
				boxShadow: `0 0 8px ${colors.gold}40`,
				padding: '8px 14px',
				fontFamily: fonts.pixel,
				fontSize: '11px',
				color: colors.text,
				textShadow: '1px 1px 2px #000',
				opacity: phase === 'in' ? 1 : 0,
				transform: phase === 'in' ? 'translateY(0)' : 'translateY(-16px)',
				transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
				pointerEvents: 'none',
				zIndex: 110,
				whiteSpace: 'nowrap',
			}}
		>
			<span style={{ marginRight: 6 }}>{emote.emoji}</span>
			{emote.text}
		</div>
	);
}
