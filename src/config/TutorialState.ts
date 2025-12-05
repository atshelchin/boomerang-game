/**
 * 教程状态管理
 */

export type TutorialStepType =
  | 'intro' // 介绍
  | 'move' // 移动
  | 'throw' // 投掷
  | 'catch' // 接住
  | 'charge' // 蓄力
  | 'dash' // 冲刺
  | 'powerup_triple' // 三连发道具
  | 'powerup_big' // 巨型回旋镖
  | 'powerup_speed' // 加速道具
  | 'powerup_shield' // 护盾道具
  | 'powerup_magnet' // 磁铁道具
  | 'kill' // 击杀敌人
  | 'complete'; // 完成

export interface TutorialStep {
  type: TutorialStepType;
  requiresCompletion: boolean; // 是否需要用户完成操作才能继续
  spawnPowerup?: string; // 本步骤需要生成的道具类型
  aiActive?: boolean; // AI是否主动移动
  aiAggressive?: boolean; // AI是否有攻击性
}

// 教程步骤定义
export const TUTORIAL_STEPS: TutorialStep[] = [
  { type: 'intro', requiresCompletion: false },
  { type: 'move', requiresCompletion: true, aiActive: false },
  { type: 'throw', requiresCompletion: true, aiActive: false },
  { type: 'catch', requiresCompletion: true, aiActive: false },
  { type: 'charge', requiresCompletion: true, aiActive: false },
  { type: 'dash', requiresCompletion: true, aiActive: true, aiAggressive: false },
  {
    type: 'powerup_triple',
    requiresCompletion: true,
    spawnPowerup: 'triple',
    aiActive: true,
    aiAggressive: false,
  },
  {
    type: 'powerup_big',
    requiresCompletion: true,
    spawnPowerup: 'big',
    aiActive: true,
    aiAggressive: false,
  },
  {
    type: 'powerup_speed',
    requiresCompletion: true,
    spawnPowerup: 'speed',
    aiActive: true,
    aiAggressive: false,
  },
  {
    type: 'powerup_shield',
    requiresCompletion: true,
    spawnPowerup: 'shield',
    aiActive: true,
    aiAggressive: true,
  },
  {
    type: 'powerup_magnet',
    requiresCompletion: true,
    spawnPowerup: 'magnet',
    aiActive: true,
    aiAggressive: true,
  },
  { type: 'kill', requiresCompletion: true, aiActive: true, aiAggressive: true },
  { type: 'complete', requiresCompletion: false },
];

// 教程运行时状态
export const TutorialState = {
  active: false,
  currentStepIndex: 0,
  stepCompleted: false,
  stepTimer: 0,

  // 步骤完成条件追踪
  playerMoved: false,
  playerThrew: false,
  playerCaught: false,
  playerCharged: false,
  playerDashed: false,
  powerupCollected: false,
  powerupUsed: false,
  enemyKilled: false,

  // 提示显示
  showingHint: true,
  hintTimer: 0,

  // 获取当前步骤
  getCurrentStep(): TutorialStep {
    return TUTORIAL_STEPS[this.currentStepIndex] || TUTORIAL_STEPS[0];
  },

  // 开始教程
  start() {
    this.active = true;
    this.currentStepIndex = 0;
    this.stepCompleted = false;
    this.stepTimer = 0;
    this.resetStepTracking();
    this.showingHint = true;
    this.hintTimer = 0;
  },

  // 重置步骤追踪
  resetStepTracking() {
    this.playerMoved = false;
    this.playerThrew = false;
    this.playerCaught = false;
    this.playerCharged = false;
    this.playerDashed = false;
    this.powerupCollected = false;
    this.powerupUsed = false;
    this.enemyKilled = false;
  },

  // 检查当前步骤是否完成
  checkStepCompletion(): boolean {
    const step = this.getCurrentStep();

    switch (step.type) {
      case 'intro':
        return this.stepTimer > 180; // 3秒后自动继续
      case 'move':
        return this.playerMoved;
      case 'throw':
        return this.playerThrew;
      case 'catch':
        return this.playerCaught;
      case 'charge':
        return this.playerCharged;
      case 'dash':
        return this.playerDashed;
      case 'powerup_triple':
      case 'powerup_big':
      case 'powerup_speed':
      case 'powerup_shield':
      case 'powerup_magnet':
        return this.powerupUsed;
      case 'kill':
        return this.enemyKilled;
      case 'complete':
        return false; // 最后一步不自动完成
      default:
        return false;
    }
  },

  // 进入下一步
  nextStep(): boolean {
    if (this.currentStepIndex < TUTORIAL_STEPS.length - 1) {
      this.currentStepIndex++;
      this.stepCompleted = false;
      this.stepTimer = 0;
      this.resetStepTracking();
      this.showingHint = true;
      this.hintTimer = 0;
      return true;
    }
    return false;
  },

  // 结束教程
  end() {
    this.active = false;
    this.currentStepIndex = 0;
    this.stepCompleted = false;
  },

  // 记录玩家动作
  recordMove() {
    this.playerMoved = true;
  },

  recordThrow() {
    this.playerThrew = true;
  },

  recordCatch() {
    this.playerCaught = true;
  },

  recordCharge() {
    this.playerCharged = true;
  },

  recordDash() {
    this.playerDashed = true;
  },

  recordPowerupCollect() {
    this.powerupCollected = true;
  },

  recordPowerupUse() {
    this.powerupUsed = true;
  },

  recordKill() {
    this.enemyKilled = true;
  },

  // 更新计时器
  update() {
    if (this.active) {
      this.stepTimer++;
      this.hintTimer++;
    }
  },
};
