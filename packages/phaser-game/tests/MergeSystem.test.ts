import { describe, expect, it } from 'vitest';
import { MergeSystem, type TowerLocator } from '../src/systems/MergeSystem';

const archer1 = (id: string): TowerLocator => ({
	instanceId: id,
	towerId: 'archer',
	family: 'archer',
	tier: 1,
	x: 0,
	y: 0,
});
const siege1 = (id: string): TowerLocator => ({
	instanceId: id,
	towerId: 'nova_cannon',
	family: 'siege',
	tier: 1,
	x: 0,
	y: 0,
});
const arcane4 = (id: string): TowerLocator => ({
	instanceId: id,
	towerId: 'arcane_spire',
	family: 'archer',
	tier: 4,
	x: 0,
	y: 0,
});
const celestial4 = (id: string): TowerLocator => ({
	instanceId: id,
	towerId: 'celestial',
	family: 'siege',
	tier: 4,
	x: 0,
	y: 0,
});
const worldtree4 = (id: string): TowerLocator => ({
	instanceId: id,
	towerId: 'world_tree',
	family: 'frost',
	tier: 4,
	x: 0,
	y: 0,
});
const throne4 = (id: string): TowerLocator => ({
	instanceId: id,
	towerId: 'divine_throne',
	family: 'stun',
	tier: 4,
	x: 0,
	y: 0,
});
const hybridAb = (id: string): TowerLocator => ({
	instanceId: id,
	towerId: 'hybrid_ab',
	family: 'hybrid',
	tier: 5,
	x: 0,
	y: 0,
});
const hybridCd = (id: string): TowerLocator => ({
	instanceId: id,
	towerId: 'hybrid_cd',
	family: 'hybrid',
	tier: 5,
	x: 0,
	y: 0,
});

describe('MergeSystem.tryMerge', () => {
	it('same-family same-tier 1 → tier 2 (archer+archer → wind_spire)', () => {
		const r = MergeSystem.tryMerge(archer1('a'), archer1('b'));
		expect(r.kind).toBe('success');
		if (r.kind === 'success') {
			expect(r.toTowerId).toBe('wind_spire');
			expect(r.toTier).toBe(2);
			expect(r.consumedA).toBe('a');
			expect(r.consumedB).toBe('b');
		}
	});

	it('different family tier 1 → incompatible', () => {
		const r = MergeSystem.tryMerge(archer1('a'), siege1('b'));
		expect(r.kind).toBe('failure');
		if (r.kind === 'failure') expect(r.reason).toBe('incompatible-pair');
	});

	it('hybrid_ab from arcane_spire + celestial', () => {
		const r = MergeSystem.tryMerge(arcane4('a'), celestial4('b'));
		expect(r.kind).toBe('success');
		if (r.kind === 'success') {
			expect(r.toTowerId).toBe('hybrid_ab');
			expect(r.toTier).toBe(5);
		}
	});

	it('hybrid_cd from world_tree + divine_throne', () => {
		const r = MergeSystem.tryMerge(worldtree4('a'), throne4('b'));
		expect(r.kind).toBe('success');
		if (r.kind === 'success') {
			expect(r.toTowerId).toBe('hybrid_cd');
			expect(r.toTier).toBe(5);
		}
	});

	it('ultimate from hybrid_ab + hybrid_cd', () => {
		const r = MergeSystem.tryMerge(hybridAb('a'), hybridCd('b'));
		expect(r.kind).toBe('success');
		if (r.kind === 'success') {
			expect(r.toTowerId).toBe('ultimate');
			expect(r.toTier).toBe(6);
		}
	});

	it('tier-4 archer + archer → incompatible (no same-tier 4 merge)', () => {
		const r = MergeSystem.tryMerge(arcane4('a'), arcane4('b'));
		expect(r.kind).toBe('failure');
		if (r.kind === 'failure') expect(r.reason).toBe('incompatible-pair');
	});

	it('ultimate + ultimate → max-tier', () => {
		const u = (id: string): TowerLocator => ({
			instanceId: id,
			towerId: 'ultimate',
			family: 'ultimate',
			tier: 6,
			x: 0,
			y: 0,
		});
		const r = MergeSystem.tryMerge(u('a'), u('b'));
		expect(r.kind).toBe('failure');
		if (r.kind === 'failure') expect(r.reason).toBe('max-tier');
	});

	it('rejects self-merge', () => {
		const a = archer1('same');
		const r = MergeSystem.tryMerge(a, a);
		expect(r.kind).toBe('failure');
		if (r.kind === 'failure') expect(r.reason).toBe('same-instance');
	});
});
