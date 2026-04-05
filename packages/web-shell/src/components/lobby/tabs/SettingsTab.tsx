import { uiMobileArt } from '../../../assets/uiMobileArt';
import { useGameStore } from '../../../stores/gameStore';
import { colors } from '../../../styles/tokens';
import { TabBackground } from '../TabBackground';

export function SettingsTab() {
	const screenShake = useGameStore((s) => s.screenShake);
	const toggleScreenShake = useGameStore((s) => s.toggleScreenShake);
	const showDamageNumbers = useGameStore((s) => s.showDamageNumbers);
	const toggleDamageNumbers = useGameStore((s) => s.toggleDamageNumbers);

	return (
		<div
			id="tabpanel-settings"
			role="tabpanel"
			aria-label="영주실"
			className="relative flex-1 overflow-hidden flex flex-col"
		>
			{/* Background */}
			<TabBackground
				src={uiMobileArt.lordchamberBg}
				gradient="linear-gradient(180deg, #1a1208 0%, #2a1a10 100%)"
				overlayOpacity={0.25}
			/>

			{/* Content */}
			<div className="relative z-[1] flex-1 overflow-auto p-4 flex flex-col gap-4">
				<span className="font-pixel text-sm text-text">설정</span>

				<SettingsSection title="화면">
					<ToggleRow
						label="화면 흔들림"
						checked={screenShake}
						onChange={toggleScreenShake}
					/>
					<ToggleRow
						label="데미지 숫자"
						checked={showDamageNumbers}
						onChange={toggleDamageNumbers}
					/>
				</SettingsSection>

				<SettingsSection title="정보">
					<InfoRow label="버전" value="0.1.0-alpha" />
					<InfoRow label="빌드" value="2026.03.31" />
				</SettingsSection>
			</div>
		</div>
	);
}

function SettingsSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className="flex flex-col gap-px border border-border"
			style={{ background: 'rgba(42, 32, 16, 0.7)' }}
		>
			<div
				className="px-3 py-2"
				style={{ background: 'rgba(42, 32, 16, 0.9)' }}
			>
				<span className="font-pixel text-[11px] text-accent">{title}</span>
			</div>
			{children}
		</div>
	);
}

function ToggleRow({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: () => void;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={onChange}
			className="flex justify-between items-center px-3 py-2.5 border-none cursor-pointer touch-manipulation"
			style={{ background: 'rgba(26, 18, 8, 0.8)' }}
		>
			<span className="font-pixel text-xs text-text">{label}</span>
			<div
				className="relative w-9 h-[18px] transition-[background] duration-150"
				style={{ background: checked ? colors.success : colors.border }}
			>
				<div
					className="absolute top-0.5 w-3.5 h-3.5 bg-text transition-[left] duration-150"
					style={{ left: checked ? 20 : 2 }}
				/>
			</div>
		</button>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div
			className="flex justify-between items-center px-3 py-2.5"
			style={{ background: 'rgba(26, 18, 8, 0.8)' }}
		>
			<span className="font-pixel text-xs text-text">{label}</span>
			<span className="font-pixel text-[11px] text-text-secondary">
				{value}
			</span>
		</div>
	);
}
