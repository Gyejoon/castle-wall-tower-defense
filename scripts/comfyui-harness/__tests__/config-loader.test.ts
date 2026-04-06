import { describe, it, expect } from 'bun:test';
import { loadConfig, resolveAssets } from '../pipeline/config-loader';
import { resolve } from 'path';

const FOREST_CONFIG = resolve(__dirname, '../configs/maps/forest_gate.yaml');

describe('config-loader', () => {
  describe('loadConfig', () => {
    it('parses forest_gate.yaml without errors', () => {
      const config = loadConfig(FOREST_CONFIG);
      expect(config.meta.id).toBe('forest_gate');
      expect(config.meta.name).toBe('숲의 관문');
    });

    it('fills generation defaults', () => {
      const config = loadConfig(FOREST_CONFIG);
      expect(config.generation.checkpoint).toBe('dreamshaper_8.safetensors');
      expect(config.generation.steps).toBe(25);
      expect(config.generation.width).toBe(512);
      expect(config.generation.height).toBe(512);
    });

    it('parses all asset categories', () => {
      const config = loadConfig(FOREST_CONFIG);
      expect(Object.keys(config.assets)).toEqual(['terrain', 'structures', 'decorations']);
      expect(config.assets.terrain.length).toBe(4);
      expect(config.assets.structures.length).toBe(6);
      expect(config.assets.decorations.length).toBe(6);
    });

    it('parses tileable and workflow_override', () => {
      const config = loadConfig(FOREST_CONFIG);
      const grassFloor = config.assets.terrain[0];
      expect(grassFloor.id).toBe('grass-floor');
      expect(grassFloor.tileable).toBe(true);
      expect(grassFloor.workflow_override).toBe('tileable');
    });

    it('parses palette from style', () => {
      const config = loadConfig(FOREST_CONFIG);
      expect(config.style.palette).toBeDefined();
      expect(config.style.palette!.primary.length).toBeGreaterThan(0);
      expect(config.style.palette!.accent.length).toBeGreaterThan(0);
    });

    it('throws on non-existent file', () => {
      expect(() => loadConfig('/nonexistent.yaml')).toThrow();
    });
  });

  describe('resolveAssets', () => {
    it('resolves all 16 assets', () => {
      const config = loadConfig(FOREST_CONFIG);
      const assets = resolveAssets(config);
      expect(assets.length).toBe(16);
    });

    it('filters by --only', () => {
      const config = loadConfig(FOREST_CONFIG);
      const assets = resolveAssets(config, 'oak-tree-large');
      expect(assets.length).toBe(1);
      expect(assets[0].id).toBe('oak-tree-large');
      expect(assets[0].category).toBe('structures');
      expect(assets[0].outputSize).toBe(256);
    });

    it('throws on unknown --only', () => {
      const config = loadConfig(FOREST_CONFIG);
      expect(() => resolveAssets(config, 'nonexistent')).toThrow('not found');
    });

    it('applies tileable flag correctly', () => {
      const config = loadConfig(FOREST_CONFIG);
      const assets = resolveAssets(config, 'grass-floor');
      expect(assets[0].tileable).toBe(true);
      expect(assets[0].workflowOverride).toBe('tileable');
    });

    it('inherits frames from animation config when not overridden', () => {
      const config = loadConfig(FOREST_CONFIG);
      const assets = resolveAssets(config, 'lantern-post');
      expect(assets[0].frames).toBe(8);
    });

    it('uses per-asset frame count when overridden', () => {
      const config = loadConfig(FOREST_CONFIG);
      const assets = resolveAssets(config, 'mushroom-cluster');
      expect(assets[0].frames).toBe(4);
    });
  });
});
