export function StatDisplay({
	label,
	value,
	color,
}: {
	label: string;
	value: string;
	color: string;
}) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="font-pixel text-[10px] text-text-secondary">
				{label}
			</span>
			<span className="font-pixel text-[13px]" style={{ color }}>
				{value}
			</span>
		</div>
	);
}
