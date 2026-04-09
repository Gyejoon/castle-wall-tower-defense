/**
 * 월드맵 위를 돌아다니는 플레이어 아바타.
 *
 * - 위치: transform translate3d (layout 속성 금지, GPU 가속)
 * - 월드 전환: 1.5s ease-in-out CSS transition
 * - idle bob: `wm-character-bob` 키프레임
 *
 * 스프라이트 대신 인라인 SVG 픽셀 아트로 구성 — ComfyUI 자산 생성 없이 UI 완성.
 */

import { UI_COLORS } from '@gld/shared';

type Props = {
	/** 랜드마크 중심 좌표 (MAP_CONTENT 기준 px) */
	top: number;
	left: number;
	/** 캐릭터 픽셀 크기 (기본 32) */
	size?: number;
};

export function MapCharacter({ top, left, size = 32 }: Props) {
	// 랜드마크 상단에 올라앉도록 위치 보정
	const offsetX = left - size / 2;
	const offsetY = top - size - 32;

	return (
		<div
			aria-hidden
			className="wm-character-anchor absolute top-0 left-0 pointer-events-none z-[12] will-change-transform"
			style={{
				width: `${size}px`,
				height: `${size}px`,
				transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
			}}
		>
			<div className="wm-character-bob w-full h-full drop-shadow-[1px_2px_0_rgba(10,8,4,0.6)]">
				<PixelKnight />
			</div>
		</div>
	);
}

/**
 * 16×16 픽셀 기사 — 금 투구, 파란 망토, 은 갑옷.
 * rect 요소 하나하나가 픽셀이며 shape-rendering: crispEdges로 선명.
 */
function PixelKnight() {
	const gold = UI_COLORS.gold;
	const goldDark = UI_COLORS.accent;
	const skin = '#f0c090';
	const dark = UI_COLORS.bg;
	const armor = UI_COLORS.armorPierce;
	const armorDark = '#6a7080';
	const cape = UI_COLORS.info;
	const capeDark = '#2a5a8a';

	// 픽셀 세트: [x, y, color]
	const pixels: Array<[number, number, string]> = [
		// 투구 상단
		[6, 1, gold],
		[7, 1, gold],
		[8, 1, gold],
		[9, 1, gold],
		// 투구
		[5, 2, gold],
		[6, 2, gold],
		[7, 2, gold],
		[8, 2, gold],
		[9, 2, gold],
		[10, 2, gold],
		[5, 3, goldDark],
		[6, 3, skin],
		[7, 3, dark],
		[8, 3, dark],
		[9, 3, skin],
		[10, 3, goldDark],
		[5, 4, gold],
		[6, 4, skin],
		[7, 4, skin],
		[8, 4, skin],
		[9, 4, skin],
		[10, 4, gold],
		// 목
		[6, 5, goldDark],
		[7, 5, skin],
		[8, 5, skin],
		[9, 5, goldDark],
		// 어깨 — 망토 실루엣
		[3, 6, capeDark],
		[4, 6, armorDark],
		[5, 6, armor],
		[6, 6, armor],
		[7, 6, armor],
		[8, 6, armor],
		[9, 6, armor],
		[10, 6, armor],
		[11, 6, armorDark],
		[12, 6, capeDark],
		// 몸통 상단
		[3, 7, cape],
		[4, 7, armorDark],
		[5, 7, armor],
		[6, 7, gold],
		[7, 7, armor],
		[8, 7, armor],
		[9, 7, gold],
		[10, 7, armor],
		[11, 7, armorDark],
		[12, 7, cape],
		// 몸통
		[3, 8, cape],
		[4, 8, armorDark],
		[5, 8, armor],
		[6, 8, armor],
		[7, 8, armor],
		[8, 8, armor],
		[9, 8, armor],
		[10, 8, armor],
		[11, 8, armorDark],
		[12, 8, cape],
		// 허리 (벨트)
		[4, 9, armorDark],
		[5, 9, goldDark],
		[6, 9, gold],
		[7, 9, gold],
		[8, 9, gold],
		[9, 9, gold],
		[10, 9, goldDark],
		[11, 9, armorDark],
		// 다리
		[5, 10, armorDark],
		[6, 10, armorDark],
		[9, 10, armorDark],
		[10, 10, armorDark],
		[5, 11, armorDark],
		[6, 11, armorDark],
		[9, 11, armorDark],
		[10, 11, armorDark],
		[5, 12, armorDark],
		[6, 12, armorDark],
		[9, 12, armorDark],
		[10, 12, armorDark],
		// 부츠
		[4, 13, dark],
		[5, 13, dark],
		[6, 13, dark],
		[9, 13, dark],
		[10, 13, dark],
		[11, 13, dark],
	];

	return (
		<svg
			viewBox="0 0 16 16"
			className="w-full h-full"
			shapeRendering="crispEdges"
			role="img"
			aria-labelledby="wm-character-title"
		>
			<title id="wm-character-title">플레이어 아바타</title>
			{pixels.map(([x, y, color], i) => (
				<rect
					key={`${x}-${y}-${i}`}
					x={x}
					y={y}
					width={1}
					height={1}
					fill={color}
				/>
			))}
		</svg>
	);
}
