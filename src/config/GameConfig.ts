/**
 * 游戏配置
 */

// 设计分辨率
export const DESIGN_WIDTH = 1600;
export const DESIGN_HEIGHT = 900;

// 玩家配置
export const PLAYER_CONFIG = {
  radius: 28,
  moveSpeed: 1.2,
  maxSpeed: 12,
  friction: 0.85,
  dashSpeed: 45,
  dashDuration: 6,
  dashCooldown: 12,
  catchCooldown: 15,
  maxCharge: 30,
  chargeSpeedMultiplier: 0.5
};

// 回旋镖配置
export const BOOMERANG_CONFIG = {
  radius: 18,
  bigRadius: 30,
  baseSpeed: 18,
  maxSpeedBonus: 10,
  returnSpeed: 18,
  maxReturnTime: 40,
  bigMaxReturnTime: 55,
  maxBounces: 5,
  bigMaxBounces: 7,
  maxLifetime: 300,
  slowdownRate: 0.985,
  turnRate: 0.15
};

// 道具配置
export const POWERUP_CONFIG = {
  radius: 20,
  duration: 600, // 10秒
  spawnDelay: 180, // 3秒后开始出道具
  types: ['triple', 'big', 'speed', 'shield', 'magnet', 'freeze', 'fire', 'penetrate', 'range'] as const,
  // 状态效果持续时间
  freezeDuration: 120, // 冰冻持续2秒
  burnDuration: 180,   // 燃烧持续3秒
  burnDamageInterval: 60, // 每1秒造成燃烧伤害
  fireTrailLife: 120   // 火焰轨迹持续2秒
};

// 道具颜色
export const POWERUP_COLORS: Record<string, string> = {
  triple: '#ff0',
  big: '#f0f',
  speed: '#0ff',
  shield: '#0f0',
  magnet: '#f80',
  freeze: '#88f',    // 冰冻 - 蓝紫色
  fire: '#f44',      // 火焰 - 红色
  penetrate: '#fff', // 穿透 - 白色
  range: '#8f8'      // 延长射程 - 浅绿色
};

// 道具名称
export const POWERUP_NAMES: Record<string, string> = {
  triple: '三连发',
  big: '巨大化',
  speed: '加速',
  shield: '护盾',
  magnet: '磁铁',
  freeze: '冰冻',
  fire: '火焰',
  penetrate: '穿透',
  range: '远程'
};

// 角色形状类型
export type CharacterShape =
  | 'circle'      // 圆形
  | 'star'        // 星星
  | 'heart'       // 爱心
  | 'cat'         // 猫咪
  | 'bunny'       // 兔子
  | 'ghost'       // 幽灵
  | 'slime'       // 史莱姆
  | 'flower'      // 花朵
  | 'cloud'       // 云朵
  | 'octopus';    // 章鱼

// 角色颜色（可独立选择）
export const CHARACTER_COLORS: Array<{
  name: string;
  color1: string;
  color2: string;
}> = [
  { name: '青', color1: '#4ecdc4', color2: '#3ab' },
  { name: '红', color1: '#ff6b6b', color2: '#d44' },
  { name: '紫', color1: '#a855f7', color2: '#7c3aed' },
  { name: '橙', color1: '#f97316', color2: '#c2410c' },
  { name: '粉', color1: '#ec4899', color2: '#be185d' },
  { name: '绿', color1: '#22c55e', color2: '#15803d' },
  { name: '蓝', color1: '#3b82f6', color2: '#1d4ed8' },
  { name: '黄', color1: '#eab308', color2: '#a16207' },
  { name: '玫红', color1: '#f472b6', color2: '#db2777' },
  { name: '翠绿', color1: '#34d399', color2: '#059669' }
];

// 角色形状（可独立选择）
export const CHARACTER_SHAPES: Array<{
  id: CharacterShape;
  name: string;
}> = [
  { id: 'circle', name: '圆球' },
  { id: 'cat', name: '猫咪' },
  { id: 'bunny', name: '兔子' },
  { id: 'star', name: '星星' },
  { id: 'heart', name: '爱心' },
  { id: 'ghost', name: '幽灵' },
  { id: 'slime', name: '史莱姆' },
  { id: 'flower', name: '花朵' },
  { id: 'cloud', name: '云朵' },
  { id: 'octopus', name: '章鱼' }
];

// 玩家皮肤（兼容旧代码，预设组合）
export const PLAYER_SKINS: Array<{
  name: string;
  color1: string;
  color2: string;
  shape: CharacterShape;
}> = [
  { name: '青猫', color1: '#4ecdc4', color2: '#3ab', shape: 'cat' },
  { name: '红心', color1: '#ff6b6b', color2: '#d44', shape: 'heart' },
  { name: '紫星', color1: '#a855f7', color2: '#7c3aed', shape: 'star' },
  { name: '橙兔', color1: '#f97316', color2: '#c2410c', shape: 'bunny' },
  { name: '粉花', color1: '#ec4899', color2: '#be185d', shape: 'flower' },
  { name: '绿球', color1: '#22c55e', color2: '#15803d', shape: 'circle' },
  { name: '蓝灵', color1: '#3b82f6', color2: '#1d4ed8', shape: 'ghost' },
  { name: '黄云', color1: '#eab308', color2: '#a16207', shape: 'cloud' },
  { name: '粉章', color1: '#f472b6', color2: '#db2777', shape: 'octopus' },
  { name: '青史', color1: '#34d399', color2: '#059669', shape: 'slime' }
];

// AI难度名称
export const AI_DIFFICULTY_NAMES = ['简单', '普通', '困难'];

// 队伍颜色配置
export const TEAM_COLORS = [
  { name: '红队', color: '#ff6b6b', bg: 'rgba(255,107,107,0.2)' },
  { name: '蓝队', color: '#4ecdc4', bg: 'rgba(78,205,196,0.2)' },
  { name: '黄队', color: '#ffd700', bg: 'rgba(255,215,0,0.2)' },
  { name: '紫队', color: '#a855f7', bg: 'rgba(168,85,247,0.2)' },
];

// 玩家配置接口
export interface PlayerConfig {
  gamepadIndex: number;  // 手柄索引，-99表示键盘，-2表示CPU
  skinIndex: number;     // 皮肤索引（兼容旧代码）
  colorIndex: number;    // 颜色索引
  shapeIndex: number;    // 形状索引
  name: string;          // 玩家名称
  teamIndex: number;     // 队伍索引，-1表示Solo
}

// 游戏设置（可变状态）
export const GameSettings: {
  winScore: number;
  aiDifficulty: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  gameMode: 'pvp' | 'pve' | 'tutorial';
  p1Skin: number;
  p2Skin: number;
  playerCount: number;
  players: PlayerConfig[];
} = {
  winScore: 5,
  aiDifficulty: 1,
  soundEnabled: true,
  vibrationEnabled: true,
  gameMode: 'pvp',
  p1Skin: 0,
  p2Skin: 1,
  // 多玩家支持
  playerCount: 2,
  players: []
};

// 地图布局
export const MAP_LAYOUTS = [
  // 中心十字
  [
    { bx: 0.5, by: 0.5, bw: 300, bh: 40, ox: -150, oy: -20 },
    { bx: 0.5, by: 0.5, bw: 40, bh: 240, ox: -20, oy: -120 }
  ],
  // 四角方块
  [
    { bx: 0.16, by: 0.22, bw: 100, bh: 100, ox: 0, oy: 0 },
    { bx: 0.84, by: 0.22, bw: 100, bh: 100, ox: -100, oy: 0 },
    { bx: 0.16, by: 0.78, bw: 100, bh: 100, ox: 0, oy: -100 },
    { bx: 0.84, by: 0.78, bw: 100, bh: 100, ox: -100, oy: -100 }
  ],
  // 三条横杠
  [
    { bx: 0.15, by: 0.33, bw: 250, bh: 35, ox: 0, oy: 0 },
    { bx: 0.5, by: 0.5, bw: 250, bh: 35, ox: -125, oy: 0 },
    { bx: 0.85, by: 0.67, bw: 250, bh: 35, ox: -250, oy: 0 }
  ],
  // 回字形
  [
    { bx: 0.5, by: 0.3, bw: 350, bh: 30, ox: -175, oy: 0 },
    { bx: 0.5, by: 0.7, bw: 350, bh: 30, ox: -175, oy: 0 },
    { bx: 0.3, by: 0.5, bw: 30, bh: 200, ox: 0, oy: -100 },
    { bx: 0.7, by: 0.5, bw: 30, bh: 200, ox: 0, oy: -100 }
  ],
  // 斜对角
  [
    { bx: 0.25, by: 0.3, bw: 180, bh: 35, ox: -90, oy: 0 },
    { bx: 0.75, by: 0.7, bw: 180, bh: 35, ox: -90, oy: 0 },
    { bx: 0.5, by: 0.5, bw: 80, bh: 80, ox: -40, oy: -40 }
  ],
  // 迷宫
  [
    { bx: 0.35, by: 0.25, bw: 30, bh: 200, ox: 0, oy: 0 },
    { bx: 0.65, by: 0.75, bw: 30, bh: 200, ox: 0, oy: -200 },
    { bx: 0.5, by: 0.5, bw: 200, bh: 30, ox: -100, oy: -15 }
  ],
  // 两堵墙
  [
    { bx: 0.33, by: 0.5, bw: 40, bh: 300, ox: -20, oy: -150 },
    { bx: 0.67, by: 0.5, bw: 40, bh: 300, ox: -20, oy: -150 }
  ],
  // 蜂窝
  [
    { bx: 0.5, by: 0.35, bw: 120, bh: 50, ox: -60, oy: -25 },
    { bx: 0.5, by: 0.65, bw: 120, bh: 50, ox: -60, oy: -25 },
    { bx: 0.3, by: 0.5, bw: 80, bh: 80, ox: -40, oy: -40 },
    { bx: 0.7, by: 0.5, bw: 80, bh: 80, ox: -40, oy: -40 }
  ]
];

// 碰撞层
export const COLLISION_LAYERS = {
  PLAYER: 1,
  BOOMERANG: 2,
  WALL: 4,
  POWERUP: 8
};
