import { colors } from '../../styles/tokens';
import { cn } from '../../utils/cn';
import { PixelButton } from '../ui/PixelButton';

interface GameOverScreenProps {
	runStatus: 'victory' | 'defeat';
	gameOverStats: {
		wavesCleared: number;
		towersPlaced: number;
		timeSurvivedSec: number;
		goldEarned: number;
		xpEarned: number;
	} | null;
	onRestart: () => void;
	onLobby: () => void;
}

export function GameOverScreen({
	runStatus,
	gameOverStats,
	onRestart,
	onLobby,
}: GameOverScreenProps) {
	const resultTitle = runStatus === 'victory' ? '방어 성공' : '방어 실패';

	return (
		<div className="absolute inset-0 z-[3] flex items-center justify-center bg-overlay-dark p-5">
			<div
				className="flex w-[min(100%,360px)] flex-col gap-3.5 bg-panel-96 p-5 text-center"
				style={{
					border: `2px solid ${runStatus === 'victory' ? colors.success : colors.danger}`,
					boxShadow: `6px 6px 0px ${colors.border}`,
				}}
			>
				<img
					src={
						runStatus === 'victory'
							? 'assets/ui/defense-success.png'
							: 'assets/ui/defense-fail.png'
					}
					alt={resultTitle}
					className="mx-auto h-auto w-[200px] [image-rendering:pixelated]"
				/>
				<h2
					className={cn(
						'font-pixel text-base font-normal',
						runStatus === 'victory' ? 'text-success' : 'text-danger',
					)}
				>
					{resultTitle}
				</h2>
				<p className="font-pixel text-xs leading-[1.8] text-text-secondary">
					{runStatus === 'defeat'
						? `웨이브 ${gameOverStats?.wavesCleared ?? '?'}에서 돌파당했습니다`
						: '왕국을 지켜냈습니다!'}
				</p>
				<div className="flex flex-col gap-1.5">
					<p className="font-pixel text-xs text-text-secondary">
						클리어 웨이브: {gameOverStats?.wavesCleared ?? 0}/10
					</p>
					<p className="font-pixel text-xs text-text-secondary">
						배치한 타워: {gameOverStats?.towersPlaced ?? 0}
					</p>
					<p className="font-pixel text-xs text-text-secondary">
						생존 시간: {Math.floor((gameOverStats?.timeSurvivedSec ?? 0) / 60)}:
						{String((gameOverStats?.timeSurvivedSec ?? 0) % 60).padStart(
							2,
							'0',
						)}
					</p>
					<p className="mt-1 font-pixel text-sm text-gold">
						획득 골드: {gameOverStats?.goldEarned ?? 0}G
					</p>
					<p className="mt-0.5 font-pixel text-sm text-info">
						획득 XP: {gameOverStats?.xpEarned ?? 0}
					</p>
				</div>
				<PixelButton
					variant="gold"
					style={{ width: '100%' }}
					onClick={onRestart}
				>
					다시 시작
				</PixelButton>
				<PixelButton
					variant="secondary"
					style={{ width: '100%' }}
					onClick={onLobby}
				>
					로비로 돌아가기
				</PixelButton>
			</div>
		</div>
	);
}
