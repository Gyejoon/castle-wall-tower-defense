import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
	createProfileMock: vi.fn(),
}));

vi.mock('../../../stores/authStore', () => {
	const state = {
		profileSetupOpen: true,
		createProfile: hoisted.createProfileMock,
	};
	const useAuthStore = <T,>(sel: (s: typeof state) => T) => sel(state);
	(useAuthStore as unknown as { getState: () => typeof state }).getState = () =>
		state;
	return { useAuthStore };
});

import { ProfileSetupModal } from '../ProfileSetupModal';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('ProfileSetupModal', () => {
	it('validates nickname length', () => {
		render(<ProfileSetupModal />);
		fireEvent.change(screen.getByLabelText(/닉네임/), {
			target: { value: 'a' },
		});
		fireEvent.click(screen.getByRole('button', { name: /완료/ }));
		expect(screen.getByText(/2자 이상/)).toBeInTheDocument();
		expect(hoisted.createProfileMock).not.toHaveBeenCalled();
	});

	it('rejects nickname with invalid chars', () => {
		render(<ProfileSetupModal />);
		fireEvent.change(screen.getByLabelText(/닉네임/), {
			target: { value: 'foo bar' },
		});
		fireEvent.click(screen.getByRole('button', { name: /완료/ }));
		expect(screen.getByText(/영문\/한글/)).toBeInTheDocument();
	});

	it('calls createProfile with nickname + default avatar on valid submit', async () => {
		hoisted.createProfileMock.mockResolvedValue({ ok: true });
		render(<ProfileSetupModal />);
		fireEvent.change(screen.getByLabelText(/닉네임/), {
			target: { value: '용사' },
		});
		fireEvent.click(screen.getByRole('button', { name: /완료/ }));
		await vi.waitFor(() =>
			expect(hoisted.createProfileMock).toHaveBeenCalledWith(
				'용사',
				'tower/archer',
			),
		);
	});

	it('surfaces store error on nickname collision', async () => {
		hoisted.createProfileMock.mockResolvedValue({
			ok: false,
			error: '이미 사용 중인 닉네임입니다',
			code: 'nickname_taken',
		});
		render(<ProfileSetupModal />);
		fireEvent.change(screen.getByLabelText(/닉네임/), {
			target: { value: 'alice' },
		});
		fireEvent.click(screen.getByRole('button', { name: /완료/ }));
		await vi.waitFor(() =>
			expect(screen.getByText(/이미 사용 중/)).toBeInTheDocument(),
		);
	});
});
