import { PALETTE, TILE_SIZE, type ManifestEntry } from './shared';

// === Output Paths ===
export const AI_OUTPUT_DIR = 'packages/web-shell/public/assets';
export const AI_TEMP_DIR = 'scripts/generate-assets/.ai-temp';
export const ASSET_PATH_PREFIX = 'packages/web-shell/public/';

// === Shared Constants ===
export const WALK_FRAME_COUNT = 4;

// === ComfyUI Configuration ===
export const COMFYUI_CONFIG = {
  url: process.env.COMFYUI_URL || 'http://localhost:8188',
  model: 'rd_pro__isometric.safetensors',
  steps: 20,
  cfgScale: 7,
  width: 512,
  height: 512,
  sampler: 'euler_ancestral',
} as const;

// === PixelLab Configuration ===
export const PIXELLAB_CONFIG = {
  apiKey: process.env.PIXELLAB_API_KEY || '',
  baseUrl: 'https://api.pixellab.ai',
  defaultSize: TILE_SIZE,
  directions: 4,
} as const;

// === Style Reference ===
export const STYLE_PROMPT_PREFIX =
  'pixel art, isometric view, 45 degree angle, medieval fantasy, ' +
  'grass and stone theme, warm natural colors, 2.5D depth shading, ' +
  'small shadow at base, top-down perspective with depth';

const NEGATIVE_PROMPT =
  'blurry, modern, sci-fi, neon, realistic, photorealistic, 3D render, ' +
  'high resolution, smooth gradients, anti-aliased';

// === Asset Prompt Config ===
export interface AssetPromptConfig {
  key: string;
  prompt: string;
  negativePrompt: string;
  outputPath: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  type: 'image' | 'spritesheet';
}

// === Tile Prompts ===
export const TILE_PROMPTS: AssetPromptConfig[] = [
  {
    key: 'grid-floor',
    prompt: `${STYLE_PROMPT_PREFIX}, grass floor tile, seamless tileable, dark green grass texture, subtle dirt patches`,
    negativePrompt: NEGATIVE_PROMPT,
    outputPath: `${AI_OUTPUT_DIR}/tiles/grid-floor.png`,
    frameCount: 1,
    frameWidth: TILE_SIZE,
    frameHeight: TILE_SIZE,
    type: 'image',
  },
  {
    key: 'path-tile',
    prompt: `${STYLE_PROMPT_PREFIX}, dirt path tile, seamless tileable, brown earthy road, worn stone edges`,
    negativePrompt: NEGATIVE_PROMPT,
    outputPath: `${AI_OUTPUT_DIR}/tiles/path-tile.png`,
    frameCount: 1,
    frameWidth: TILE_SIZE,
    frameHeight: TILE_SIZE,
    type: 'image',
  },
  {
    key: 'spawn-tile',
    prompt: `${STYLE_PROMPT_PREFIX}, magical spawn portal tile, dark purple swirl on stone, glowing runes`,
    negativePrompt: NEGATIVE_PROMPT,
    outputPath: `${AI_OUTPUT_DIR}/tiles/spawn-tile.png`,
    frameCount: 1,
    frameWidth: TILE_SIZE,
    frameHeight: TILE_SIZE,
    type: 'image',
  },
  {
    key: 'exit-tile',
    prompt: `${STYLE_PROMPT_PREFIX}, castle gate exit tile, stone archway, golden trim, defensive fortification`,
    negativePrompt: NEGATIVE_PROMPT,
    outputPath: `${AI_OUTPUT_DIR}/tiles/exit-tile.png`,
    frameCount: 1,
    frameWidth: TILE_SIZE,
    frameHeight: TILE_SIZE,
    type: 'image',
  },
];

// === Tower Prompts ===
const TOWERS = [
  { id: 'laser', description: 'wooden archer tower with bow, golden brown wood' },
  { id: 'plasma', description: 'stone catapult siege weapon, dark brown wood and gray stone' },
  { id: 'emp', description: 'ice blue crystal tower, frost magic, icy glow' },
  { id: 'shield', description: 'golden holy altar, glowing shield, warm yellow light' },
  { id: 'twin_laser', description: 'twin crossbow turret, reinforced wood and iron' },
  { id: 'disruptor', description: 'dark purple crystal tower, shadow magic, ominous glow' },
  { id: 'nova_cannon', description: 'large trebuchet, heavy stone base, siege weapon' },
  { id: 'fortress', description: 'miniature castle keep, stone walls, battlements, flag on top' },
  { id: 'stasis_field', description: 'frozen ice shrine, pale blue crystals, snowflake pattern' },
] as const;

export const TOWER_PROMPTS: AssetPromptConfig[] = TOWERS.flatMap((tower) => [
  {
    key: `tower-${tower.id}`,
    prompt: `${STYLE_PROMPT_PREFIX}, ${tower.description}, single tower on grass base, centered`,
    negativePrompt: NEGATIVE_PROMPT,
    outputPath: `${AI_OUTPUT_DIR}/towers/${tower.id}.png`,
    frameCount: 1,
    frameWidth: TILE_SIZE,
    frameHeight: TILE_SIZE,
    type: 'image' as const,
  },
  {
    key: `tower-${tower.id}-fire`,
    prompt: `${STYLE_PROMPT_PREFIX}, ${tower.description}, attacking animation, ${WALK_FRAME_COUNT} frame spritesheet horizontal, projectile launching, muzzle flash`,
    negativePrompt: NEGATIVE_PROMPT,
    outputPath: `${AI_OUTPUT_DIR}/towers/${tower.id}-fire.png`,
    frameCount: WALK_FRAME_COUNT,
    frameWidth: TILE_SIZE,
    frameHeight: TILE_SIZE,
    type: 'spritesheet' as const,
  },
]);

// === Unit Prompts (PixelLab) ===
export interface UnitPromptConfig {
  key: string;
  name: string;
  description: string;
  outputPath: string;
  directions: number;
}

export const UNIT_PROMPTS: UnitPromptConfig[] = [
  {
    key: 'unit-scout_drone',
    name: 'goblin scout',
    description: 'small green-skinned goblin, leather armor, sneaky pose, pointed ears',
    outputPath: `${AI_OUTPUT_DIR}/units/scout_drone.png`,
    directions: 4,
  },
  {
    key: 'unit-battle_robot',
    name: 'orc warrior',
    description: 'muscular gray-skinned orc, heavy iron armor, battle axe, tusks',
    outputPath: `${AI_OUTPUT_DIR}/units/battle_robot.png`,
    directions: 4,
  },
  {
    key: 'unit-heavy_walker',
    name: 'stone troll',
    description: 'large stone-skinned troll, rocky texture, slow and heavy, mossy patches',
    outputPath: `${AI_OUTPUT_DIR}/units/heavy_walker.png`,
    directions: 4,
  },
  {
    key: 'unit-stealth_drone',
    name: 'shadow assassin',
    description: 'dark purple cloaked figure, dual daggers, shadowy aura, mysterious',
    outputPath: `${AI_OUTPUT_DIR}/units/stealth_drone.png`,
    directions: 4,
  },
  {
    key: 'unit-titan',
    name: 'ancient dragon',
    description: 'fire-red dragon, wings folded, scales, breathing embers, imposing',
    outputPath: `${AI_OUTPUT_DIR}/units/titan.png`,
    directions: 4,
  },
];

export const UNIT_DEATH_CONFIG = {
  key: 'unit-death',
  outputPath: `${AI_OUTPUT_DIR}/units/unit-death.png`,
  frameCount: WALK_FRAME_COUNT,
  frameWidth: TILE_SIZE,
  frameHeight: TILE_SIZE,
};

// === Palette for Post-Processing ===
export const FULL_PALETTE: string[] = Object.values(PALETTE);

// === Manifest Helpers ===
export function toManifestEntry(config: AssetPromptConfig): ManifestEntry {
  const entry: ManifestEntry = {
    key: config.key,
    type: config.type,
    path: config.outputPath.replace(ASSET_PATH_PREFIX, ''),
  };
  if (config.type === 'spritesheet') {
    entry.frameWidth = config.frameWidth;
    entry.frameHeight = config.frameHeight;
    entry.frameCount = config.frameCount;
  }
  return entry;
}

export function toSpritesheetManifestEntry(
  key: string,
  outputPath: string,
  frameCount: number,
  frameSize: number = TILE_SIZE,
): ManifestEntry {
  return {
    key,
    type: 'spritesheet',
    path: outputPath.replace(ASSET_PATH_PREFIX, ''),
    frameWidth: frameSize,
    frameHeight: frameSize,
    frameCount,
  };
}
