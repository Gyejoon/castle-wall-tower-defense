export function EmptyState() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-5 py-10">
			<span className="text-center font-pixel text-[13px] leading-[1.8] text-text-secondary">
				아직 타워가 없습니다.
				<br />
				소환의 제단에서 타워를 획득하세요!
			</span>
		</div>
	);
}
