/**
 * 이미지 사전 로드. 실패한 항목은 무시(블로킹 금지).
 * 로비 진입 시 UI 이미지 pop-in 방지 용도.
 */
export function preloadImages(urls: string[]): Promise<undefined[]> {
	return Promise.all(
		urls.map(
			(url) =>
				new Promise<undefined>((resolve) => {
					const img = new Image();
					img.onload = () => resolve(undefined);
					img.onerror = () => resolve(undefined);
					img.src = url;
				}),
		),
	);
}
