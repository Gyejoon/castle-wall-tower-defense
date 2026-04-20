import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

type Mode = 'signin' | 'signup';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function AuthModal() {
	const open = useAuthStore((s) => s.authModalOpen);
	const signIn = useAuthStore((s) => s.signIn);
	const signUp = useAuthStore((s) => s.signUp);

	const [mode, setMode] = useState<Mode>('signin');
	const [email, setEmail] = useState('');
	const [pw, setPw] = useState('');
	const [err, setErr] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	if (!open) return null;

	const validate = (): string | null => {
		if (!EMAIL_RE.test(email)) return '이메일 형식이 올바르지 않습니다';
		if (pw.length < 8) return '비밀번호는 8자 이상이어야 합니다';
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
		const r =
			mode === 'signin' ? await signIn(email, pw) : await signUp(email, pw);
		setBusy(false);
		if (!r.ok) {
			setErr(r.error ?? '요청 실패');
			return;
		}
		useAuthStore.getState().openAuthModal(false);
		setEmail('');
		setPw('');
	};

	const close = () => {
		useAuthStore.getState().openAuthModal(false);
		setErr(null);
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="로그인"
			className="fixed inset-0 z-50 flex items-center justify-center px-4"
			style={{
				background: 'var(--color-bg-76)',
				animation: 'fadeIn 180ms ease-out',
			}}
		>
			<div className="w-full max-w-[340px] bg-panel border border-border p-6 flex flex-col gap-4">
				<div
					className="font-pixel text-[15px] text-accent"
					style={{ letterSpacing: '0.16em' }}
				>
					&gt;_ {mode === 'signin' ? '로그인' : '회원가입'}
				</div>
				<label className="font-pixel text-[11px] text-text flex flex-col gap-1">
					이메일
					<input
						type="email"
						autoComplete="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="bg-bg border border-border px-2 py-2 min-h-[44px] font-pixel text-[11px] text-text"
					/>
				</label>
				<label className="font-pixel text-[11px] text-text flex flex-col gap-1">
					비밀번호
					<input
						type="password"
						autoComplete={
							mode === 'signin' ? 'current-password' : 'new-password'
						}
						value={pw}
						onChange={(e) => setPw(e.target.value)}
						className="bg-bg border border-border px-2 py-2 min-h-[44px] font-pixel text-[11px] text-text"
					/>
				</label>
				{err && <div className="font-pixel text-[10px] text-danger">{err}</div>}
				<button
					type="button"
					disabled={busy}
					onClick={submit}
					className="min-h-[44px] bg-accent text-bg font-pixel text-[13px] disabled:opacity-50"
				>
					{busy
						? mode === 'signin'
							? '로그인 중…'
							: '가입 중…'
						: mode === 'signin'
							? '로그인'
							: '가입하기'}
				</button>
				<button
					type="button"
					onClick={() => {
						setMode(mode === 'signin' ? 'signup' : 'signin');
						setErr(null);
					}}
					className="font-pixel text-[10px] text-text-secondary min-h-[44px]"
				>
					{mode === 'signin'
						? '계정이 없나요? 가입하기'
						: '이미 계정이 있나요? 로그인'}
				</button>
				<button
					type="button"
					onClick={close}
					className="font-pixel text-[10px] text-text-secondary min-h-[44px]"
				>
					닫기
				</button>
			</div>
		</div>
	);
}
