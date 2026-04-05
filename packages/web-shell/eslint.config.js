import tailwindcss from 'eslint-plugin-tailwindcss';

export default [
	...tailwindcss.configs['flat/recommended'],
	{
		settings: {
			tailwindcss: {
				callees: ['cn'],
			},
		},
		rules: {
			// Tailwind 클래스 정렬
			'tailwindcss/classnames-order': 'warn',
			// 존재하지 않는 클래스 감지 (arbitrary values 허용)
			'tailwindcss/no-custom-classname': 'off',
			// 중복 클래스 감지
			'tailwindcss/no-contradicting-classname': 'error',
		},
	},
];
