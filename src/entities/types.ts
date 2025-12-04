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
  FLOATING_TEXT: 'floatingText'
} as const;
