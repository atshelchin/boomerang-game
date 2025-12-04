/**
 * 游戏状态管理
 */

export type GameStateType = 'title' | 'select' | 'ready' | 'fight' | 'ko' | 'roundEnd' | 'win' | 'pause' | 'tutorial';

/** 玩家得分数据 */
export interface PlayerScore {
  playerId: number;
  score: number;
  kills: number;
  deaths: number;
  isAlive: boolean;
}

/** 回放帧数据 - 存储单帧的游戏状态 */
export interface ReplayFrame {
  time: number;
  players: Array<{
    playerId: number;
    x: number;
    y: number;
    angle: number;
    alive: boolean;
    hasBoomerang: boolean;
    charging: boolean;
    dashing: boolean;
    skinIndex: number;
  }>;
  boomerangs: Array<{
    ownerId: number;
    x: number;
    y: number;
    rotation: number;
    isBig: boolean;
  }>;
  // 粒子效果
  particles?: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
    maxLife: number;
  }>;
  // 环形效果
  rings?: Array<{
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    color: string;
    alpha: number;
  }>;
}

// 游戏运行时状态
export const GameState = {
  state: 'title' as GameStateType,

  // 多人得分系统 (最多4人)
  playerScores: [] as PlayerScore[],

  // 兼容旧代码
  scores: [0, 0] as [number, number],

  // 回合信息
  roundWinner: -1,        // 回合胜者 ID (-1 表示未决定)
  roundWinnerTeam: -1,    // 回合胜者队伍 (-1 表示 Solo 或未决定)
  roundNumber: 1,         // 当前回合数
  alivePlayers: [] as number[],  // 存活玩家 ID 列表

  // 回合结束动画
  roundEndAnimTime: 0,    // 回合结束动画计时器
  previousScores: [] as number[],  // 动画开始前的分数（用于点亮新圆圈）

  // 回放系统
  replayBuffer: [] as ReplayFrame[],  // 回放缓冲区（存储最后几秒）
  replayMaxFrames: 480,   // 最多保存480帧（约8秒，60fps）
  replayPlaybackIndex: 0, // 当前回放位置
  replayPlaying: false,   // 是否正在回放
  replaySpeed: 1.2,       // 回放速度（1.2倍速）
  replayFrameAccum: 0,    // 帧累积器（用于慢放）
  winnerConfirmed: false, // 赢家是否已确认

  stateTimer: 0,
  time: 0,
  hitstop: 0,
  slowmo: 1,
  paused: false,
  pauseMenuIndex: 0,
  winMenuIndex: 0,
  menuIndex: 0,
  inSettings: false,
  settingIndex: 0,
  menuCooldown: 0,
  powerupSpawnTimer: 0,

  // 视觉效果
  shake: { x: 0, y: 0, intensity: 0 },
  zoom: 1,
  zoomTarget: 1,

  // 初始化多人得分
  initPlayerScores(playerCount: number) {
    this.playerScores = [];
    for (let i = 0; i < playerCount; i++) {
      this.playerScores.push({
        playerId: i,
        score: 0,
        kills: 0,
        deaths: 0,
        isAlive: true
      });
    }
    this.alivePlayers = this.playerScores.map(p => p.playerId);
    this.roundNumber = 1;
  },

  // 玩家死亡
  playerDied(playerId: number, killerId: number) {
    const victim = this.playerScores.find(p => p.playerId === playerId);
    const killer = this.playerScores.find(p => p.playerId === killerId);

    if (victim) {
      victim.isAlive = false;
      victim.deaths++;
    }
    if (killer && killer.playerId !== playerId) {
      killer.kills++;
    }

    // 更新存活列表
    this.alivePlayers = this.playerScores.filter(p => p.isAlive).map(p => p.playerId);
  },

  // 回合结束，给获胜者加分
  endRound(winnerId: number) {
    // 保存动画开始前的分数
    this.previousScores = this.playerScores.map(p => p.score);
    this.roundEndAnimTime = 0;  // 重置动画计时器

    const winner = this.playerScores.find(p => p.playerId === winnerId);
    if (winner) {
      winner.score++;
    }
    this.roundWinner = winnerId;

    // 兼容旧代码
    if (winnerId < 2) {
      this.scores[winnerId]++;
    }
  },

  // 重置回合状态
  resetRound() {
    this.roundWinner = -1;
    this.roundWinnerTeam = -1;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.slowmo = 1;
    this.shake = { x: 0, y: 0, intensity: 0 };

    // 重置所有玩家存活状态
    for (const p of this.playerScores) {
      p.isAlive = true;
    }
    this.alivePlayers = this.playerScores.map(p => p.playerId);
    this.roundNumber++;

    // 重置回放系统
    this.replayBuffer = [];
    this.replayPlaybackIndex = 0;
    this.replayPlaying = false;
    this.replayFrameAccum = 0;
    this.winnerConfirmed = false;
  },

  // 记录一帧回放数据
  recordReplayFrame(frame: ReplayFrame) {
    this.replayBuffer.push(frame);
    // 保持缓冲区大小
    if (this.replayBuffer.length > this.replayMaxFrames) {
      this.replayBuffer.shift();
    }
  },

  // 开始回放
  startReplay() {
    this.replayPlaying = true;
    // 从最后几秒开始回放（约3秒前，180帧），而不是从头开始
    // 这样可以直接看到击杀瞬间，而不是等待很长时间
    const startOffset = Math.min(180, Math.floor(this.replayBuffer.length * 0.6));
    this.replayPlaybackIndex = Math.max(0, this.replayBuffer.length - startOffset);
    this.replayFrameAccum = 0;
  },

  // 获取当前回放帧
  getReplayFrame(): ReplayFrame | null {
    if (!this.replayPlaying || this.replayBuffer.length === 0) {
      return null;
    }
    return this.replayBuffer[this.replayPlaybackIndex] || null;
  },

  // 推进回放（支持慢放）
  advanceReplay(): boolean {
    if (!this.replayPlaying) return false;

    // 使用帧累积器实现慢放
    this.replayFrameAccum += this.replaySpeed;

    if (this.replayFrameAccum >= 1) {
      this.replayFrameAccum -= 1;
      this.replayPlaybackIndex++;

      if (this.replayPlaybackIndex >= this.replayBuffer.length) {
        // 循环回放
        this.replayPlaybackIndex = 0;
      }
    }
    return true;
  },

  // 重置比赛状态
  resetMatch() {
    this.scores = [0, 0];
    this.playerScores = [];
    this.roundNumber = 1;
    this.roundWinner = -1;
    this.roundWinnerTeam = -1;
    this.roundEndAnimTime = 0;
    this.previousScores = [];
    this.zoom = 1;
    this.zoomTarget = 1;
    this.slowmo = 1;
    this.shake = { x: 0, y: 0, intensity: 0 };
  },

  // 检查是否有最终胜者（个人或队伍）
  checkGameWinner(winScore: number): number {
    // 首先检查个人得分（Solo 模式或没有队伍的玩家）
    for (const p of this.playerScores) {
      if (p.score >= winScore) {
        return p.playerId;
      }
    }
    return -1;
  },

  // 检查队伍总分
  getTeamScores(): Map<number, number> {
    const teamScores = new Map<number, number>();
    // 需要从 GameSettings 获取玩家队伍信息
    return teamScores;
  }
};

// 统计系统
export const Stats = {
  current: {
    p1: { kills: 0, deaths: 0, throws: 0, dashes: 0, powerups: 0 },
    p2: { kills: 0, deaths: 0, throws: 0, dashes: 0, powerups: 0 }
  },
  total: {
    gamesPlayed: 0,
    p1Wins: 0,
    p2Wins: 0,
    totalKills: 0,
    totalThrows: 0,
    totalDashes: 0,
    totalPowerups: 0,
    longestWinStreak: 0,
    currentStreak: { player: -1, count: 0 }
  },

  reset() {
    this.current.p1 = { kills: 0, deaths: 0, throws: 0, dashes: 0, powerups: 0 };
    this.current.p2 = { kills: 0, deaths: 0, throws: 0, dashes: 0, powerups: 0 };
  },

  recordKill(killerId: number, victimId: number) {
    const killer = killerId === 0 ? this.current.p1 : this.current.p2;
    const victim = victimId === 0 ? this.current.p1 : this.current.p2;
    killer.kills++;
    victim.deaths++;
    this.total.totalKills++;
  },

  recordThrow(playerId: number) {
    const p = playerId === 0 ? this.current.p1 : this.current.p2;
    p.throws++;
    this.total.totalThrows++;
  },

  recordDash(playerId: number) {
    const p = playerId === 0 ? this.current.p1 : this.current.p2;
    p.dashes++;
    this.total.totalDashes++;
  },

  recordPowerup(playerId: number) {
    const p = playerId === 0 ? this.current.p1 : this.current.p2;
    p.powerups++;
    this.total.totalPowerups++;
  },

  recordGameEnd(winnerId: number) {
    this.total.gamesPlayed++;
    if (winnerId === 0) this.total.p1Wins++;
    else this.total.p2Wins++;

    if (this.total.currentStreak.player === winnerId) {
      this.total.currentStreak.count++;
    } else {
      this.total.currentStreak.player = winnerId;
      this.total.currentStreak.count = 1;
    }
    if (this.total.currentStreak.count > this.total.longestWinStreak) {
      this.total.longestWinStreak = this.total.currentStreak.count;
    }

    this.save();
  },

  save() {
    try {
      localStorage.setItem('boomerangStats', JSON.stringify(this.total));
    } catch (e) {
      // ignore
    }
  },

  load() {
    try {
      const saved = localStorage.getItem('boomerangStats');
      if (saved) this.total = { ...this.total, ...JSON.parse(saved) };
    } catch (e) {
      // ignore
    }
  }
};

// 初始化加载统计
Stats.load();
