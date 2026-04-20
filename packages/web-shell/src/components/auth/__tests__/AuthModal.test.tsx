import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
	signInMock: vi.fn(),
	signUpMock: vi.fn(),
	openAuthModalMock: vi.fn(),
}));

vi.mock('../../../stores/authStore', () => {
	const state = {
		authModalOpen: true,
		signIn: hoisted.signInMock,
		signUp: hoisted.signUpMock,
		openAuthModal: hoisted.openAuthModalMock,
	};
	const useAuthStore = <T,>(sel: (s: typeof state) => T) => sel(state);
	(useAuthStore as unknown as { getState: () => typeof state }).getState = () =>
		state;
	return { useAuthStore };
});

import { AuthModal } from '../AuthModal';

const { signInMock } = hoisted;

beforeEach(() => {
	vi.clearAllMocks();
});

describe('AuthModal', () => {
	it('shows email/password fields when open', () => {
		render(<AuthModal />);
		expect(screen.getByLabelText(/이메일/)).toBeInTheDocument();
		expect(screen.getByLabelText(/비밀번호/)).toBeInTheDocument();
	});

	it('rejects invalid email', () => {
		render(<AuthModal />);
		fireEvent.change(screen.getByLabelText(/이메일/), {
			target: { value: 'not-email' },
		});
		fireEvent.change(screen.getByLabelText(/비밀번호/), {
			target: { value: 'abcd1234' },
		});
		fireEvent.click(screen.getByRole('button', { name: /^로그인$/ }));
		expect(screen.getByText(/이메일 형식/)).toBeInTheDocument();
		expect(signInMock).not.toHaveBeenCalled();
	});

	it('rejects short password', () => {
		render(<AuthModal />);
		fireEvent.change(screen.getByLabelText(/이메일/), {
			target: { value: 'a@b.co' },
		});
		fireEvent.change(screen.getByLabelText(/비밀번호/), {
			target: { value: 'short' },
		});
		fireEvent.click(screen.getByRole('button', { name: /^로그인$/ }));
		expect(screen.getByText(/8자 이상/)).toBeInTheDocument();
	});

	it('calls signIn with valid credentials', async () => {
		signInMock.mockResolvedValue({ ok: true });
		render(<AuthModal />);
		fireEvent.change(screen.getByLabelText(/이메일/), {
			target: { value: 'a@b.co' },
		});
		fireEvent.change(screen.getByLabelText(/비밀번호/), {
			target: { value: 'abcd1234' },
		});
		fireEvent.click(screen.getByRole('button', { name: /^로그인$/ }));
		await vi.waitFor(() =>
			expect(signInMock).toHaveBeenCalledWith('a@b.co', 'abcd1234'),
		);
	});
});
