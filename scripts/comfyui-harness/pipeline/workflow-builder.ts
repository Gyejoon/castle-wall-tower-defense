/**
 * Workflow builder — selects and builds the correct ComfyUI workflow
 * based on asset configuration (workflow_override, animations, etc).
 */

import type { ComfyUIWorkflow, ResolvedAsset, BossAnimationState } from '../types';
import { buildMasterWorkflow } from '../workflows/master';
import { buildBossWorkflow } from '../workflows/boss';
import { buildTileableWorkflow } from '../workflows/tileable';

export interface WorkflowPlan {
  asset: ResolvedAsset;
  workflows: WorkflowEntry[];
}

export interface WorkflowEntry {
  label: string;
  state?: string; // boss animation state name
  workflow: ComfyUIWorkflow;
}

/**
 * Build all workflows needed for a resolved asset.
 * Boss assets produce one workflow per animation state.
 * Tileable assets produce a single static workflow.
 * Everything else uses the master AnimateDiff workflow.
 */
export function buildWorkflowPlan(asset: ResolvedAsset): WorkflowPlan {
  if (asset.workflowOverride === 'boss') {
    return buildBossPlan(asset);
  }

  if (asset.workflowOverride === 'tileable' || asset.tileable) {
    return {
      asset,
      workflows: [{
        label: `${asset.id} (tileable)`,
        workflow: buildTileableWorkflow(asset),
      }],
    };
  }

  return {
    asset,
    workflows: [{
      label: asset.id,
      workflow: buildMasterWorkflow(asset),
    }],
  };
}

function buildBossPlan(asset: ResolvedAsset): WorkflowPlan {
  const states: BossAnimationState[] = asset.animations.length > 0
    ? asset.animations
    : [{ state: 'idle', prompt_suffix: 'idle stance' }];

  return {
    asset,
    workflows: states.map((animState) => ({
      label: `${asset.id}/${animState.state}`,
      state: animState.state,
      workflow: buildBossWorkflow(asset, animState),
    })),
  };
}

/**
 * Serialize a workflow plan to JSON for dry-run output.
 */
export function serializeWorkflowPlan(plan: WorkflowPlan): string {
  return JSON.stringify({
    asset: plan.asset.id,
    category: plan.asset.category,
    workflowCount: plan.workflows.length,
    workflows: plan.workflows.map((w) => ({
      label: w.label,
      state: w.state,
      nodeCount: Object.keys(w.workflow).length,
      nodes: Object.entries(w.workflow).map(([id, node]) => ({
        id,
        class_type: node.class_type,
      })),
    })),
  }, null, 2);
}
