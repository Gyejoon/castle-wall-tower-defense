import { describe, it, expect } from 'bun:test';
import { loadConfig, resolveAssets } from '../pipeline/config-loader';
import { buildWorkflowPlan, serializeWorkflowPlan } from '../pipeline/workflow-builder';
import { resolve } from 'path';

const FOREST_CONFIG = resolve(__dirname, '../configs/maps/forest_gate.yaml');

describe('workflow-builder', () => {
  const config = loadConfig(FOREST_CONFIG);

  it('builds tileable workflow for grass-floor (7 nodes, no AnimateDiff)', () => {
    const [asset] = resolveAssets(config, 'grass-floor');
    const plan = buildWorkflowPlan(asset);

    expect(plan.workflows.length).toBe(1);
    expect(plan.workflows[0].label).toContain('tileable');

    const workflow = plan.workflows[0].workflow;
    const nodeTypes = Object.values(workflow).map((n) => n.class_type);
    expect(nodeTypes).toContain('CheckpointLoaderSimple');
    expect(nodeTypes).toContain('KSampler');
    expect(nodeTypes).not.toContain('ADE_AnimateDiffLoaderWithContext');
  });

  it('builds master workflow for water-shallow (9 nodes, with AnimateDiff)', () => {
    const [asset] = resolveAssets(config, 'water-shallow');
    const plan = buildWorkflowPlan(asset);

    expect(plan.workflows.length).toBe(1);

    const nodeTypes = Object.values(plan.workflows[0].workflow).map((n) => n.class_type);
    expect(nodeTypes).toContain('ADE_AnimateDiffLoaderWithContext');
    expect(nodeTypes).toContain('ADE_StandardStaticContextOptions');
  });

  it('uses asset size override for oak-tree-large', () => {
    const [asset] = resolveAssets(config, 'oak-tree-large');
    expect(asset.outputSize).toBe(256);
  });

  it('serializes workflow plan to valid JSON', () => {
    const [asset] = resolveAssets(config, 'dirt-path');
    const plan = buildWorkflowPlan(asset);
    const json = serializeWorkflowPlan(plan);
    const parsed = JSON.parse(json);

    expect(parsed.asset).toBe('dirt-path');
    expect(parsed.workflowCount).toBe(1);
    expect(parsed.workflows[0].nodeCount).toBeGreaterThan(0);
  });

  it('uses correct seed from config', () => {
    const [asset] = resolveAssets(config, 'grass-floor');
    const plan = buildWorkflowPlan(asset);
    const workflow = plan.workflows[0].workflow;
    const sampler = Object.values(workflow).find((n) => n.class_type === 'KSampler');
    expect(sampler?.inputs.seed).toBe(42);
  });
});
