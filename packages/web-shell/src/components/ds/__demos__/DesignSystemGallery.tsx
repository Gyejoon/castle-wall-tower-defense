/**
 * Design-system gallery — dev-only preview of every ds/ primitive.
 *
 * Gated by `?ds=1` query string. Never linked from app navigation.
 */

import { core } from '@gld/shared';
import { type ReactNode, useState } from 'react';
import { CoinIcon, DiamondIcon } from '../../ui/CurrencyIcon';
import {
	Badge,
	type BadgeIntent,
	Button,
	Card,
	Overlay,
	Panel,
	Sheet,
} from '../index';

export function DesignSystemGallery() {
	const [showOverlay, setShowOverlay] = useState<
		null | 'pause' | 'result' | 'choice'
	>(null);
	const [showSheet, setShowSheet] = useState(false);

	return (
		<div
			className="w-full h-full overflow-auto p-lg"
			style={{ backgroundColor: core.bg, color: core.text }}
		>
			<h1 className="text-h1 font-pixel font-bold mb-lg">
				Design System Gallery
			</h1>
			<p className="text-body14 font-pixel text-textSecondary mb-xl">
				모든 프리미티브 variant·intent·state를 한 화면에 나열합니다. 개발 전용.
			</p>

			<Section title="Button">
				<Row label="variant">
					<Button variant="primary">Primary</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="gold">Gold</Button>
					<Button variant="danger">Danger</Button>
				</Row>
				<Row label="size">
					<Button size="sm">Small</Button>
					<Button size="md">Medium</Button>
					<Button size="lg">Large</Button>
				</Row>
				<Row label="state">
					<Button>Default</Button>
					<Button disabled>Disabled</Button>
					<Button loading>Loading</Button>
				</Row>
				<Row label="block">
					<Button block>Block 전체 너비</Button>
				</Row>
			</Section>

			<Section title="Card">
				<Row label="variant">
					<Card variant="panel">panel variant</Card>
					<Card variant="framed">framed variant</Card>
					<Card variant="keyart">keyart variant</Card>
				</Row>
				<Row label="framed × intent">
					<Card variant="framed" intent="default">
						default
					</Card>
					<Card variant="framed" intent="accent">
						accent
					</Card>
					<Card variant="framed" intent="danger">
						danger
					</Card>
				</Row>
				<Row label="intent">
					<Card variant="panel" intent="default">
						default
					</Card>
					<Card variant="panel" intent="accent" highlight>
						accent highlight
					</Card>
					<Card variant="panel" intent="danger" highlight>
						danger highlight
					</Card>
				</Row>
			</Section>

			<Section title="Badge">
				<Row label="variant">
					<Badge variant="pill">pill</Badge>
					<Badge variant="tag">tag</Badge>
					<Badge variant="counter" icon={<CoinIcon size={10} />}>
						120
					</Badge>
				</Row>
				<Row label="intent (pill)">
					{(
						[
							'default',
							'accent',
							'gold',
							'info',
							'success',
							'danger',
							'warning',
						] as BadgeIntent[]
					).map((i) => (
						<Badge key={i} intent={i}>
							{i}
						</Badge>
					))}
				</Row>
				<Row label="tier">
					{[1, 2, 3, 4, 5, 6].map((t) => (
						<Badge key={t} variant="tag" intent={`tier-${t}` as BadgeIntent}>
							T{t}
						</Badge>
					))}
				</Row>
				<Row label="element">
					{(['fire', 'water', 'lightning', 'earth', 'neutral'] as const).map(
						(e) => (
							<Badge key={e} variant="tag" intent={`element-${e}`}>
								{e}
							</Badge>
						),
					)}
				</Row>
				<Row label="with icon">
					<Badge variant="counter" icon={<DiamondIcon size={12} />}>
						48
					</Badge>
					<Badge variant="counter" icon={<CoinIcon size={12} />}>
						2.4k
					</Badge>
				</Row>
			</Section>

			<Section title="Panel (title + actions)">
				<Panel
					title="에너지 부족"
					actions={
						<>
							<Button variant="secondary" size="sm">
								취소
							</Button>
							<Button variant="gold" size="sm">
								보상 광고 시청
							</Button>
						</>
					}
				>
					<p className="font-pixel text-body14">
						추가 에너지를 받으려면 짧은 광고를 시청하세요.
					</p>
				</Panel>
			</Section>

			<Section title="Overlay / Sheet triggers">
				<Row>
					<Button onClick={() => setShowOverlay('pause')}>pause overlay</Button>
					<Button onClick={() => setShowOverlay('result')}>
						result overlay
					</Button>
					<Button onClick={() => setShowOverlay('choice')}>
						choice overlay
					</Button>
					<Button onClick={() => setShowSheet(true)}>bottom sheet</Button>
				</Row>
			</Section>

			{showOverlay === 'pause' && (
				<Overlay
					intent="pause"
					dismissOnBackdrop
					onDismiss={() => setShowOverlay(null)}
				>
					<Panel
						title="일시정지"
						actions={
							<>
								<Button
									variant="secondary"
									onClick={() => setShowOverlay(null)}
								>
									재개
								</Button>
								<Button variant="danger" onClick={() => setShowOverlay(null)}>
									포기
								</Button>
							</>
						}
					>
						<p className="font-pixel text-body14">게임이 일시정지되었습니다.</p>
					</Panel>
				</Overlay>
			)}

			{showOverlay === 'result' && (
				<Overlay
					intent="result"
					dismissOnBackdrop
					onDismiss={() => setShowOverlay(null)}
				>
					<div className="text-display32 font-display text-gold mb-md">
						VICTORY
					</div>
					<Panel
						title="보상"
						actions={
							<Button variant="gold" onClick={() => setShowOverlay(null)}>
								로비로
							</Button>
						}
					>
						<div className="flex gap-lg items-center justify-center">
							<Badge variant="counter" icon={<CoinIcon size={12} />}>
								+250
							</Badge>
							<Badge variant="counter" icon={<DiamondIcon size={12} />}>
								+5
							</Badge>
						</div>
					</Panel>
				</Overlay>
			)}

			{showOverlay === 'choice' && (
				<Overlay
					intent="choice"
					dismissOnBackdrop
					onDismiss={() => setShowOverlay(null)}
				>
					<h2 className="text-h1 font-pixel font-bold">업그레이드 선택</h2>
					<div className="grid grid-cols-3 gap-md w-full max-w-[600px]">
						{['dmg_up', 'energy_regen', 'crit_dmg'].map((id) => (
							<Card key={id} variant="framed" intent="accent">
								<div className="font-pixel font-bold text-h2 mb-sm">{id}</div>
								<p className="font-pixel text-body14 text-textSecondary">
									설명이 여기에 들어갑니다.
								</p>
							</Card>
						))}
					</div>
					<Button variant="gold" onClick={() => setShowOverlay(null)}>
						재뽑기
					</Button>
				</Overlay>
			)}

			{showSheet && (
				<Sheet
					anchor="bottom"
					backdrop
					onDismiss={() => setShowSheet(false)}
					panel={{
						title: '타워 액션',
						actions: (
							<Button
								variant="secondary"
								size="sm"
								onClick={() => setShowSheet(false)}
							>
								닫기
							</Button>
						),
					}}
				>
					<div className="flex gap-sm">
						<Button variant="primary">합성</Button>
						<Button variant="secondary">이동</Button>
						<Button variant="danger">판매</Button>
					</div>
				</Sheet>
			)}
		</div>
	);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="mb-xl">
			<h2
				className="font-pixel font-bold text-h2 mb-md"
				style={{ color: core.gold }}
			>
				{title}
			</h2>
			<div className="flex flex-col gap-md">{children}</div>
		</section>
	);
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
	return (
		<div className="flex items-center gap-sm flex-wrap">
			{label && (
				<span
					className="font-pixel text-[11px] uppercase tracking-wider min-w-[72px]"
					style={{ color: core.textSecondary }}
				>
					{label}
				</span>
			)}
			{children}
		</div>
	);
}
