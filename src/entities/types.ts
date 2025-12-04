/**
 * 游戏实体类型定义
 */

import type { GameEntity as BaseEntity } from 'you-engine';

// 玩家特有组件
export interface PlayerData {
  playerId: number;
  alive: boolean;
  hasBoomerang: boolean;
  catchCooldown: number;
  animTime: number;
  // 冲刺
  dashing: boolean;
  dashTimer: number;
  dashCooldown: number;
  // 蓄力
  charging: boolean;
  chargeTime: number;
  // 道具
  powerups: Array<{ type: string; timer: number }>;
  shieldHits: number;
  // AI
  isAI: boolean;
  // 角度
  angle: number;
  // 多人支持
  skinIndex: number;
  colorIndex?: number;   // 颜色索引
  shapeIndex?: number;   // 形状索引
  teamIndex?: number;    // 队伍索引 (-1 = Solo)
  gamepadIndex: number;  // -1 表示未分配, -2 表示 CPU
  // 状态效果
  frozen: boolean;       // 是否被冰冻
  frozenTimer: number;   // 冰冻剩余时间
  burning: boolean;      // 是否在燃烧
  burnTimer: number;     // 燃烧剩余时间
}

// 回旋镖特有组件
export interface BoomerangData {
  ownerId: number;
  returning: boolean;
  returnTimer: number;
  maxReturnTime: number;
  lifetime: number;
  bounces: number;
  maxBounces: number;
  isBig: boolean;
  rotation: number;
  trailTimer: number;
  // 新道具效果
  hasFreeze: boolean;    // 冰冻效果
  hasFire: boolean;      // 火焰效果（留下火焰轨迹）
  canPenetrate: boolean; // 穿透墙壁
  extendedRange: boolean; // 延长射程
}

// 道具特有组件
export interface PowerupData {
  type: string;
  bobOffset: number;
  lifetime: number;
}

// 墙体/障碍物组件
export interface WallData {
  width: number;
  height: number;
  /** 形状类型 */
  shapeType?: 'rect' | 'circle' | 'polygon' | 'triangle';
  /** 多边形顶点（相对于中心） */
  vertices?: Array<{ x: number; y: number }>;
  /** 圆形半径 */
  radius?: number;
}

// 粒子组件
export interface ParticleData {
  life: number;
  maxLife: number;
  size: number;
  color: string;
  isDebris?: boolean;
}

// 轨迹组件
export interface TrailData {
  alpha: number;
  radius: number;
  color: string;
}

// 环形效果组件
export interface RingData {
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

// 浮动文字组件
export interface FloatingTextData {
  text: string;
  color: string;
  life: number;
}

// 火焰轨迹组件
export interface FireTrailData {
  life: number;
  maxLife: number;
  ownerId: number;  // 谁放的火
  damage: boolean;  // 是否可以造成伤害
}

// 冰冻轨迹组件
export interface IceTrailData {
  life: number;
  maxLife: number;
  ownerId: number;  // 谁放的冰
}

// 地形区域组件
export interface TerrainData {
  type: 'ice' | 'water' | 'poison';
  width: number;
  height: number;
  // 冰面特有
  friction?: number;
  // 毒圈特有
  damage?: number;
  damageInterval?: number;
  damageTimer?: number;
}

// 传送门组件
export interface PortalData {
  id: number;           // 传送门ID
  linkedPortalId: number;  // 链接的另一个传送门ID
  radius: number;
  color: string;
  cooldown: number;     // 传送冷却
  rotation: number;     // 旋转动画
}

// 滚石陷阱组件
export interface BoulderData {
  direction: { x: number; y: number };
  speed: number;
  radius: number;
  active: boolean;
  spawnTimer: number;
  spawnInterval: number;
}

// 毒圈组件
export interface PoisonZoneData {
  currentRadius: number;
  targetRadius: number;
  shrinkSpeed: number;
  damage: number;
  damageInterval: number;
  centerX: number;
  centerY: number;
}

// 扩展的游戏实体
export interface GameEntity extends BaseEntity {
  // 自定义组件
  player?: PlayerData;
  boomerang?: BoomerangData;
  powerup?: PowerupData;
  wall?: WallData;
  particle?: ParticleData;
  trail?: TrailData;
  ring?: RingData;
  floatingText?: FloatingTextData;
  fireTrail?: FireTrailData;
  iceTrail?: IceTrailData;
  terrain?: TerrainData;
  portal?: PortalData;
  boulder?: BoulderData;
  poisonZone?: PoisonZoneData;
}

// 实体类型常量
export const EntityTags = {
  PLAYER: 'player',
  BOOMERANG: 'boomerang',
  POWERUP: 'powerup',
  WALL: 'wall',
  PARTICLE: 'particle',
  TRAIL: 'trail',
  RING: 'ring',
  FLOATING_TEXT: 'floatingText',
  FIRE_TRAIL: 'fireTrail',
  ICE_TRAIL: 'iceTrail',
  TERRAIN: 'terrain',
  PORTAL: 'portal',
  BOULDER: 'boulder',
  POISON_ZONE: 'poisonZone'
} as const;
