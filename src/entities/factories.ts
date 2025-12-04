/**
 * 实体工厂函数
 */

import { createTransform, createVelocity, createSprite, createCollider } from 'you-engine';
import type { GameEntity } from './types';
import { EntityTags } from './types';
import {
  PLAYER_CONFIG,
  BOOMERANG_CONFIG,
  POWERUP_CONFIG,
  POWERUP_COLORS,
  PLAYER_SKINS,
  GameSettings
} from '../config/GameConfig';

/**
 * 创建玩家实体
 */
export function createPlayer(id: number, x: number, y: number): Partial<GameEntity> {
  // 获取皮肤：优先使用多人配置，否则使用旧配置
  const playerConfig = GameSettings.players?.[id];
  const skinIndex = playerConfig?.skinIndex ?? (id === 0 ? GameSettings.p1Skin : GameSettings.p2Skin);
  const skin = PLAYER_SKINS[skinIndex % PLAYER_SKINS.length];

  // 根据玩家数量计算初始角度
  const playerCount = GameSettings.playerCount || 2;
  const baseAngles = playerCount === 2 ? [0, Math.PI] :
                     playerCount === 3 ? [0, Math.PI * 2 / 3, Math.PI * 4 / 3] :
                     [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4];

  return {
    id: `player-${id}`,
    transform: createTransform(x, y),
    velocity: createVelocity(),
    sprite: createSprite({
      width: PLAYER_CONFIG.radius * 2,
      height: PLAYER_CONFIG.radius * 2,
      color: skin.color1
    }),
    collider: createCollider('circle', { radius: PLAYER_CONFIG.radius }),
    tags: { values: [EntityTags.PLAYER] },
    player: {
      playerId: id,
      alive: true,
      hasBoomerang: true,
      catchCooldown: 0,
      animTime: Math.random() * 100,
      dashing: false,
      dashTimer: 0,
      dashCooldown: 0,
      charging: false,
      chargeTime: 0,
      powerups: [],
      shieldHits: 0,
      isAI: false,
      angle: baseAngles[id % baseAngles.length],
      skinIndex: skinIndex,
      gamepadIndex: playerConfig?.gamepadIndex ?? id,
      // 状态效果
      frozen: false,
      frozenTimer: 0,
      burning: false,
      burnTimer: 0,
    }
  };
}

/**
 * 创建回旋镖实体
 */
export function createBoomerang(
  ownerId: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  isBig: boolean = false
): Partial<GameEntity> {
  // 获取玩家配置，支持多人模式
  const playerConfig = GameSettings.players?.[ownerId];
  const colorIndex = playerConfig?.colorIndex ?? playerConfig?.skinIndex ?? ownerId % PLAYER_SKINS.length;
  const skin = PLAYER_SKINS[colorIndex];
  const radius = isBig ? BOOMERANG_CONFIG.bigRadius : BOOMERANG_CONFIG.radius;

  return {
    transform: createTransform(x, y),
    velocity: { x: vx, y: vy },
    sprite: createSprite({
      width: radius * 2,
      height: radius * 2,
      color: skin.color1
    }),
    collider: createCollider('circle', { radius }),
    tags: { values: [EntityTags.BOOMERANG] },
    boomerang: {
      ownerId,
      returning: false,
      returnTimer: 0,
      maxReturnTime: isBig ? BOOMERANG_CONFIG.bigMaxReturnTime : BOOMERANG_CONFIG.maxReturnTime,
      lifetime: 0,
      bounces: 0,
      maxBounces: isBig ? BOOMERANG_CONFIG.bigMaxBounces : BOOMERANG_CONFIG.maxBounces,
      isBig,
      rotation: 0,
      trailTimer: 0,
      // 新道具效果
      hasFreeze: false,
      hasFire: false,
      canPenetrate: false,
      extendedRange: false,
    }
  };
}

/**
 * 创建道具实体
 */
export function createPowerup(x: number, y: number, type: string): Partial<GameEntity> {
  return {
    transform: createTransform(x, y),
    sprite: createSprite({
      width: POWERUP_CONFIG.radius * 2,
      height: POWERUP_CONFIG.radius * 2,
      color: POWERUP_COLORS[type]
    }),
    collider: createCollider('circle', { radius: POWERUP_CONFIG.radius }),
    tags: { values: [EntityTags.POWERUP] },
    powerup: {
      type,
      bobOffset: Math.random() * Math.PI * 2,
      lifetime: 0
    }
  };
}

/**
 * 创建矩形墙体实体
 */
export function createWall(x: number, y: number, width: number, height: number): Partial<GameEntity> {
  return {
    transform: createTransform(x + width / 2, y + height / 2),
    sprite: createSprite({
      width,
      height,
      color: '#333'
    }),
    collider: createCollider('rect', { width, height }),
    tags: { values: [EntityTags.WALL] },
    wall: { width, height, shapeType: 'rect' }
  };
}

/**
 * 创建圆形障碍物
 */
export function createCircleObstacle(x: number, y: number, radius: number): Partial<GameEntity> {
  return {
    transform: createTransform(x, y),
    sprite: createSprite({
      width: radius * 2,
      height: radius * 2,
      color: '#444'
    }),
    collider: createCollider('circle', { radius }),
    tags: { values: [EntityTags.WALL] },
    wall: { width: radius * 2, height: radius * 2, shapeType: 'circle', radius }
  };
}

/**
 * 创建三角形障碍物
 */
export function createTriangleObstacle(x: number, y: number, size: number): Partial<GameEntity> {
  // 等边三角形顶点
  const h = size * Math.sqrt(3) / 2;
  const vertices = [
    { x: 0, y: -h * 2 / 3 },
    { x: -size / 2, y: h / 3 },
    { x: size / 2, y: h / 3 }
  ];

  return {
    transform: createTransform(x, y),
    sprite: createSprite({
      width: size,
      height: h,
      color: '#555'
    }),
    collider: createCollider('rect', { width: size, height: h }), // 简单碰撞盒
    tags: { values: [EntityTags.WALL] },
    wall: { width: size, height: h, shapeType: 'triangle', vertices }
  };
}

/**
 * 创建多边形障碍物
 */
export function createPolygonObstacle(
  x: number,
  y: number,
  vertices: Array<{ x: number; y: number }>
): Partial<GameEntity> {
  // 计算包围盒
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    transform: createTransform(x, y),
    sprite: createSprite({
      width,
      height,
      color: '#666'
    }),
    collider: createCollider('rect', { width, height }),
    tags: { values: [EntityTags.WALL] },
    wall: { width, height, shapeType: 'polygon', vertices }
  };
}

/**
 * 创建粒子实体
 */
export function createParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  config: {
    life?: number;
    size?: number;
    color?: string;
    isDebris?: boolean;
  } = {}
): Partial<GameEntity> {
  const life = config.life ?? 35;
  return {
    transform: createTransform(x, y),
    velocity: { x: vx, y: vy },
    tags: { values: [EntityTags.PARTICLE] },
    particle: {
      life,
      maxLife: life,
      size: config.size ?? 5,
      color: config.color ?? '#fff',
      isDebris: config.isDebris ?? false
    }
  };
}

/**
 * 创建轨迹实体
 */
export function createTrail(
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number = 0.5
): Partial<GameEntity> {
  return {
    transform: createTransform(x, y),
    tags: { values: [EntityTags.TRAIL] },
    trail: { alpha, radius, color }
  };
}

/**
 * 创建环形效果实体
 */
export function createRing(
  x: number,
  y: number,
  color: string,
  maxRadius: number = 120
): Partial<GameEntity> {
  return {
    transform: createTransform(x, y),
    tags: { values: [EntityTags.RING] },
    ring: {
      radius: 20,
      maxRadius,
      color,
      alpha: 1
    }
  };
}

/**
 * 创建浮动文字实体
 */
export function createFloatingText(
  x: number,
  y: number,
  text: string,
  color: string
): Partial<GameEntity> {
  return {
    transform: createTransform(x, y),
    velocity: { x: 0, y: -2 },
    tags: { values: [EntityTags.FLOATING_TEXT] },
    floatingText: {
      text,
      color,
      life: 60
    }
  };
}

/**
 * 创建火焰轨迹实体
 */
export function createFireTrail(
  x: number,
  y: number,
  ownerId: number
): Partial<GameEntity> {
  return {
    transform: createTransform(x, y),
    tags: { values: [EntityTags.FIRE_TRAIL] },
    collider: createCollider('circle', { radius: 15 }),
    fireTrail: {
      life: 120,      // 2秒
      maxLife: 120,
      ownerId,
      damage: true,
    }
  };
}

/**
 * 创建冰冻轨迹实体
 */
export function createIceTrail(
  x: number,
  y: number,
  ownerId: number
): Partial<GameEntity> {
  return {
    transform: createTransform(x, y),
    tags: { values: [EntityTags.ICE_TRAIL] },
    collider: createCollider('circle', { radius: 18 }),
    iceTrail: {
      life: 180,      // 3秒（比火焰更长）
      maxLife: 180,
      ownerId,
    }
  };
}

/**
 * 批量创建粒子
 */
export function spawnParticles(
  x: number,
  y: number,
  count: number,
  config: {
    angle?: number;
    spread?: number;
    speedMin: number;
    speedMax: number;
    colors: string[];
    sizeMin: number;
    sizeMax: number;
  }
): Partial<GameEntity>[] {
  const particles: Partial<GameEntity>[] = [];

  for (let i = 0; i < count; i++) {
    const angle = config.angle !== undefined
      ? config.angle + (Math.random() - 0.5) * (config.spread ?? Math.PI)
      : Math.random() * Math.PI * 2;
    const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
    const color = config.colors[Math.floor(Math.random() * config.colors.length)];

    particles.push(createParticle(
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      { size, color, life: 25 + Math.random() * 20 }
    ));
  }

  return particles;
}
