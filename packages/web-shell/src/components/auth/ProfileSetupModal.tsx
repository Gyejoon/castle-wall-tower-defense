import { useState } from 'react';
import { AVATAR_PRESETS, DEFAULT_AVATAR_KEY } from '../../data/avatarPresets';
import { useAuthStore } from '../../stores/authStore';

const NICK_RE = /^[\w가-힣ㄱ-ㅎㅏ-ㅣ]+$/u;

export function ProfileSetupModal() {
	const open = useAuthStore((s) => s.profileSetupOpen);
	const createProfile = useAuthStore((s) => s.createProfile);
	const [nick, setNick] = useState('');
	const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR_KEY);
	const [err, setErr] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	if (!open) return null;

	const validate = (): string | null => {
		if (nick.length < 2) return '닉네임은 2자 이상이어야 합니다';
		if (nick.length > 16) return '닉네임은 16자 이하여야 합니다';
		if (!NICK_RE.test(nick)) return '영문/한글/숫자/_만 가능합니다';
		return null;
	};

	const submit = async () => {
		const v = validate();
		if (v) {
			setErr(v);
			return;
		}
		setErr(null);
		setBusy(true);
		const result = await createProfile(nick, avatar);
		setBusy(false);
		if (!result.ok) setErr(result.error);
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center px-4"
			style={{
				background: 'var(--color-bg-76)',
				animation: 'fadeIn 180ms ease-out',
			}}
		>
			<div className="w-full max-w-[360px] bg-panel border border-border p-6 flex flex-col gap-4">
				<div
					className="font-pixel text-[15px] text-accent"
					style={{ letterSpacing: '0.16em' }}
				>
					&gt;_ 프로필 설정
				</div>
				<label className="font-pixel text-[11px] text-text flex flex-col gap-1">
					닉네임 (2-16자)
					<input
						value={nick}
						onChange={(e) => setNick(e.target.value)}
						maxLength={16}
						autoComplete="off"
						className="bg-bg border border-border px-2 py-2 min-h-[44px] font-pixel text-[11px] text-text"
					/>
				</label>
				<div className="flex flex-col gap-2">
					<span className="font-pixel text-[11px] text-text-secondary">
						아바타 선택
					</span>
					<div className="grid grid-cols-4 gap-2">
						{AVATAR_PRESETS.map((p) => {
							const selected = avatar === p.key;
							return (
								<button
									key={p.key}
									type="button"
									onClick={() => setAvatar(p.key)}
									aria-label={p.label}
									aria-pressed={selected}
									className={`min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center border-2 ${
										selected ? 'border-accent bg-bg' : 'border-border'
									}`}
								>
									<span className="font-pixel text-[8px] text-text-secondary text-center leading-none whitespace-normal px-0.5">
										{p.label}
									</span>
								</button>
							);
						})}
					</div>
				</div>
				{err && <div className="font-pixel text-[10px] text-danger">{err}</div>}
				<button
					type="button"
					disabled={busy}
					onClick={submit}
					className="min-h-[44px] bg-accent text-bg font-pixel text-[13px] disabled:opacity-50"
				>
					{busy ? '저장 중…' : '완료'}
				</button>
			</div>
		</div>
	);
}
