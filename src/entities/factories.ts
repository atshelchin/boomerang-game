/**
 * 实体工厂函数
 */

import type { Collider, Sprite, Transform, Velocity } from 'you-engine';

// 简化的组件创建
function transform(x = 0, y = 0): Transform {
  return { x, y, rotation: 0, scaleX: 1, scaleY: 1 };
}

function velocity(x = 0, y = 0): Velocity {
  return { x, y };
}

function sprite(opts: Partial<Sprite> = {}): Sprite {
  return {
    width: opts.width ?? 32,
    height: opts.height ?? 32,
    color: opts.color,
    alpha: 1,
    visible: true,
  };
}

function collider(type: 'circle' | 'rect', opts: Partial<Collider> = {}): Collider {
  return { type, ...opts };
}
import {
  BOOMERANG_CONFIG,
  GameSettings,
  PLAYER_CONFIG,
  PLAYER_SKINS,
  POWERUP_COLORS,
  POWERUP_CONFIG,
} from '../config/GameConfig';
import type { GameEntity } from './types';
import { EntityTags } from './types';

/**
 * 创建玩家实体
 */
export function createPlayer(id: number, x: number, y: number): Partial<GameEntity> {
  // 获取皮肤：优先使用多人配置，否则使用旧配置
  const playerConfig = GameSettings.players?.[id];
  const skinIndex =
    playerConfig?.skinIndex ?? (id === 0 ? GameSettings.p1Skin : GameSettings.p2Skin);
  const skin = PLAYER_SKINS[skinIndex % PLAYER_SKINS.length];

  // 根据玩家数量计算初始角度
  const playerCount = GameSettings.playerCount || 2;
  const baseAngles =
    playerCount === 2
      ? [0, Math.PI]
      : playerCount === 3
        ? [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]
        : [Math.PI / 4, (Math.PI * 3) / 4, (Math.PI * 5) / 4, (Math.PI * 7) / 4];

  return {
    id: `player-${id}`,
    transform: transform(x, y),
    velocity: velocity(),
    sprite: sprite({
      width: PLAYER_CONFIG.radius * 2,
      height: PLAYER_CONFIG.radius * 2,
      color: skin.color1,
    }),
    collider: collider('circle', { radius: PLAYER_CONFIG.radius }),
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
    },
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
  const colorIndex =
    playerConfig?.colorIndex ?? playerConfig?.skinIndex ?? ownerId % PLAYER_SKINS.length;
  const skin = PLAYER_SKINS[colorIndex];
  const radius = isBig ? BOOMERANG_CONFIG.bigRadius : BOOMERANG_CONFIG.radius;

  return {
    transform: transform(x, y),
    velocity: { x: vx, y: vy },
    sprite: sprite({
      width: radius * 2,
      height: radius * 2,
      color: skin.color1,
    }),
    collider: collider('circle', { radius }),
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
    },
  };
}

/**
 * 创建道具实体
 */
export function createPowerup(x: number, y: number, type: string): Partial<GameEntity> {
  return {
    transform: transform(x, y),
    sprite: sprite({
      width: POWERUP_CONFIG.radius * 2,
      height: POWERUP_CONFIG.radius * 2,
      color: POWERUP_COLORS[type],
    }),
    collider: collider('circle', { radius: POWERUP_CONFIG.radius }),
    tags: { values: [EntityTags.POWERUP] },
    powerup: {
      type,
      bobOffset: Math.random() * Math.PI * 2,
      lifetime: 0,
    },
  };
}

/**
 * 创建矩形墙体实体
 */
export function createWall(
  x: number,
  y: number,
  width: number,
  height: number
): Partial<GameEntity> {
  return {
    transform: transform(x + width / 2, y + height / 2),
    sprite: sprite({
      width,
      height,
      color: '#333',
    }),
    collider: collider('rect', { width, height }),
    tags: { values: [EntityTags.WALL] },
    wall: { width, height, shapeType: 'rect' },
  };
}

/**
 * 创建圆形障碍物
 */
export function createCircleObstacle(x: number, y: number, radius: number): Partial<GameEntity> {
  return {
    transform: transform(x, y),
    sprite: sprite({
      width: radius * 2,
      height: radius * 2,
      color: '#444',
    }),
    collider: collider('circle', { radius }),
    tags: { values: [EntityTags.WALL] },
    wall: { width: radius * 2, height: radius * 2, shapeType: 'circle', radius },
  };
}

/**
 * 创建三角形障碍物
 */
export function createTriangleObstacle(x: number, y: number, size: number): Partial<GameEntity> {
  // 等边三角形顶点
  const h = (size * Math.sqrt(3)) / 2;
  const vertices = [
    { x: 0, y: (-h * 2) / 3 },
    { x: -size / 2, y: h / 3 },
    { x: size / 2, y: h / 3 },
  ];

  return {
    transform: transform(x, y),
    sprite: sprite({
      width: size,
      height: h,
      color: '#555',
    }),
    collider: collider('rect', { width: size, height: h }), // 简单碰撞盒
    tags: { values: [EntityTags.WALL] },
    wall: { width: size, height: h, shapeType: 'triangle', vertices },
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
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    transform: transform(x, y),
    sprite: sprite({
      width,
      height,
      color: '#666',
    }),
    collider: collider('rect', { width, height }),
    tags: { values: [EntityTags.WALL] },
    wall: { width, height, shapeType: 'polygon', vertices },
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
    transform: transform(x, y),
    velocity: { x: vx, y: vy },
    tags: { values: [EntityTags.PARTICLE] },
    particle: {
      life,
      maxLife: life,
      size: config.size ?? 5,
      color: config.color ?? '#fff',
      isDebris: config.isDebris ?? false,
    },
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
    transform: transform(x, y),
    tags: { values: [EntityTags.TRAIL] },
    trail: { alpha, radius, color },
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
    transform: transform(x, y),
    tags: { values: [EntityTags.RING] },
    ring: {
      radius: 20,
      maxRadius,
      color,
      alpha: 1,
    },
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
    transform: transform(x, y),
    velocity: { x: 0, y: -2 },
    tags: { values: [EntityTags.FLOATING_TEXT] },
    floatingText: {
      text,
      color,
      life: 60,
    },
  };
}

/**
 * 创建火焰轨迹实体
 */
export function createFireTrail(x: number, y: number, ownerId: number): Partial<GameEntity> {
  return {
    transform: transform(x, y),
    tags: { values: [EntityTags.FIRE_TRAIL] },
    collider: collider('circle', { radius: 15 }),
    fireTrail: {
      life: 120, // 2秒
      maxLife: 120,
      ownerId,
      damage: true,
    },
  };
}

/**
 * 创建冰冻轨迹实体
 */
export function createIceTrail(x: number, y: number, ownerId: number): Partial<GameEntity> {
  return {
    transform: transform(x, y),
    tags: { values: [EntityTags.ICE_TRAIL] },
    collider: collider('circle', { radius: 18 }),
    iceTrail: {
      life: 180, // 3秒（比火焰更长）
      maxLife: 180,
      ownerId,
    },
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
    const angle =
      config.angle !== undefined
        ? config.angle + (Math.random() - 0.5) * (config.spread ?? Math.PI)
        : Math.random() * Math.PI * 2;
    const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
    const color = config.colors[Math.floor(Math.random() * config.colors.length)];

    particles.push(
      createParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, {
        size,
        color,
        life: 25 + Math.random() * 20,
      })
    );
  }

  return particles;
}

/**
 * 创建冰面地形
 */
export function createIceTerrain(
  x: number,
  y: number,
  width: number,
  height: number
): Partial<GameEntity> {
  return {
    transform: transform(x + width / 2, y + height / 2),
    tags: { values: [EntityTags.TERRAIN] },
    terrain: {
      type: 'ice',
      width,
      height,
      friction: 0.02, // 极低摩擦
    },
  };
}

/**
 * 创建水面地形（致死）
 */
export function createWaterTerrain(
  x: number,
  y: number,
  width: number,
  height: number
): Partial<GameEntity> {
  return {
    transform: transform(x + width / 2, y + height / 2),
    tags: { values: [EntityTags.TERRAIN] },
    terrain: {
      type: 'water',
      width,
      height,
    },
  };
}

/**
 * 创建传送门
 */
export function createPortal(
  x: number,
  y: number,
  id: number,
  linkedPortalId: number,
  color: string = '#a855f7'
): Partial<GameEntity> {
  return {
    transform: transform(x, y),
    tags: { values: [EntityTags.PORTAL] },
    collider: collider('circle', { radius: 35 }),
    portal: {
      id,
      linkedPortalId,
      radius: 35,
      color,
      cooldown: 0,
      rotation: 0,
    },
  };
}

/**
 * 创建滚石发射器
 */
export function createBoulderSpawner(
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  interval: number = 180
): Partial<GameEntity> {
  // 标准化方向
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  return {
    transform: transform(x, y),
    tags: { values: [EntityTags.BOULDER] },
    boulder: {
      direction: { x: dirX / len, y: dirY / len },
      speed: 8,
      radius: 40,
      active: false,
      spawnTimer: interval / 2, // 初始延迟
      spawnInterval: interval,
    },
  };
}

/**
 * 创建滚动的石头（由发射器生成）
 */
export function createRollingBoulder(
  x: number,
  y: number,
  vx: number,
  vy: number,
  radius: number = 40
): Partial<GameEntity> {
  return {
    transform: transform(x, y),
    velocity: { x: vx, y: vy },
    tags: { values: [EntityTags.BOULDER] },
    collider: collider('circle', { radius }),
    boulder: {
      direction: { x: vx, y: vy },
      speed: Math.sqrt(vx * vx + vy * vy),
      radius,
      active: true,
      spawnTimer: 0,
      spawnInterval: 0,
    },
  };
}

/**
 * 创建毒圈
 */
export function createPoisonZone(
  centerX: number,
  centerY: number,
  initialRadius: number,
  targetRadius: number = 100,
  shrinkSpeed: number = 0.3
): Partial<GameEntity> {
  return {
    transform: transform(centerX, centerY),
    tags: { values: [EntityTags.POISON_ZONE] },
    poisonZone: {
      currentRadius: initialRadius,
      targetRadius,
      shrinkSpeed,
      damage: 1,
      damageInterval: 30, // 每0.5秒
      centerX,
      centerY,
    },
  };
}
