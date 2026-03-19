/** Asset mode selected via ?assets=b|c URL param. Default: b */
export type AssetMode = 'b' | 'c';

let _mode: AssetMode | null = null;

export function getAssetMode(): AssetMode {
  if (_mode) return _mode;
  const val = new URLSearchParams(window.location.search).get('assets');
  _mode = val === 'c' ? 'c' : 'b';
  return _mode;
}

/** Texture key for a given entity — same key name across modes, generated/loaded per mode */
export function textureKey(entity: 'player' | 'bullet' | 'gem' | 'slime' | 'runner' | 'tank' | 'swarm'): string {
  return `sprite_${entity}`;
}
