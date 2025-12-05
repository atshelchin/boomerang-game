/**
 * 游戏场景
 */

import { CameraSystem, InputSystem, Scene } from 'you-engine';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  GameSettings,
  MAP_LAYOUTS,
  POWERUP_CONFIG,
} from '../config/GameConfig';
import type { ReplayFrame } from '../config/GameState';
import { GameState, Stats } from '../config/GameState';
import {
  createCircleObstacle,
  createPlayer,
  createPowerup,
  createTriangleObstacle,
  createWall,
} from '../entities/factories';
import type {
  BoomerangData,
  GameEntity,
  ParticleData,
  PlayerData,
  RingData,
  WallData,
} from '../entities/types';
import { EntityTags } from '../entities/types';

declare global {
  interface Window {
    updateScoreUI: () => void;
    showMessage: (text: string, duration?: number) => void;
    playSound: (type: string) => void;
  }
}

export class GameScene extends Scene {
  private input!: InputSystem;
  private camera!: CameraSystem;
  private pauseMenuIndex = 0;
  private winMenuIndex = 0;
  private menuCooldown = 0;
  private stateBeforePause: string = 'fight'; // 暂停前的状态

  onCreate(): void {
    this.input = this.engine.system(InputSystem);
    this.camera = this.engine.system(CameraSystem);
  }

  onEnter(): void {
    // 隐藏菜单
    document.getElementById('startScreen')?.classList.add('hidden');
    document.getElementById('winScreen')?.classList.add('hidden');
    document.getElementById('pauseScreen')?.classList.add('hidden');

    // 配置摄像机：将世界中心放在屏幕中心
    this.camera.setPosition(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);

    // 重置状态
    GameState.resetMatch();
    Stats.reset();
    window.updateScoreUI();

    // 开始比赛
    this.startRound();
  }

  onUpdate(dt: number): void {
    // 更新游戏时间
    GameState.time++;

    // 处理暂停 - 支持更多状态（fight, ko, roundEnd, ready, tutorial）
    const pausableStates = ['fight', 'ko', 'roundEnd', 'ready', 'tutorial'];
    if (this.input.isPressed('pause') && pausableStates.includes(GameState.state)) {
      this.togglePause();
    }

    // 处理屏幕震动
    this.updateShake();

    switch (GameState.state) {
      case 'ready':
        this.updateReady();
        break;
      case 'fight':
        this.updateFight(dt);
        break;
      case 'ko':
        this.updateKO();
        break;
      case 'roundEnd':
        this.updateRoundEnd();
        break;
      case 'pause':
        this.updatePause();
        break;
      case 'win':
        this.updateWin();
        break;
      case 'tutorial':
        this.updateTutorial(dt);
        break;
    }
  }

  private updateShake(): void {
    if (GameState.shake.intensity > 0) {
      GameState.shake.x = (Math.random() - 0.5) * GameState.shake.intensity;
      GameState.shake.y = (Math.random() - 0.5) * GameState.shake.intensity;
      GameState.shake.intensity *= 0.9;
      if (GameState.shake.intensity < 0.5) {
        GameState.shake.intensity = 0;
        GameState.shake.x = 0;
        GameState.shake.y = 0;
      }
    }
  }

  private updateReady(): void {
    GameState.stateTimer--;
    if (GameState.stateTimer <= 0) {
      GameState.state = 'fight';
      window.showMessage('FIGHT!', 500);
      window.playSound('fight');
    }
  }

  private updateFight(_dt: number): void {
    // 道具生成
    GameState.powerupSpawnTimer--;
    if (GameState.powerupSpawnTimer <= 0) {
      this.spawnPowerup();
      GameState.powerupSpawnTimer = 300 + Math.random() * 300; // 5-10秒
    }

    // Hitstop 处理
    if (GameState.hitstop > 0) {
      GameState.hitstop--;
    }

    // 记录回放帧
    this.recordReplayFrame();
  }

  /** 记录当前帧用于回放 */
  private recordReplayFrame(): void {
    const players = this.engine.world.entities.filter(
      (e): e is GameEntity & { player: PlayerData } =>
        !!e.tags?.values.includes(EntityTags.PLAYER) && e.player !== undefined
    );

    const boomerangs = this.engine.world.entities.filter(
      (e): e is GameEntity & { boomerang: BoomerangData } =>
        !!e.tags?.values.includes(EntityTags.BOOMERANG) && e.boomerang !== undefined
    );

    // 收集粒子效果
    const particles = this.engine.world.entities.filter(
      (e): e is GameEntity & { particle: ParticleData } =>
        !!e.tags?.values.includes(EntityTags.PARTICLE) && e.particle !== undefined
    );

    // 收集环形效果
    const rings = this.engine.world.entities.filter(
      (e): e is GameEntity & { ring: RingData } =>
        !!e.tags?.values.includes(EntityTags.RING) && e.ring !== undefined
    );

    const frame: ReplayFrame = {
      time: GameState.time,
      players: players.map((p) => ({
        playerId: p.player.playerId,
        x: p.transform?.x ?? 0,
        y: p.transform?.y ?? 0,
        angle: p.player.angle,
        alive: p.player.alive,
        hasBoomerang: p.player.hasBoomerang,
        charging: p.player.charging,
        dashing: p.player.dashTimer > 0,
        skinIndex: p.player.skinIndex,
      })),
      boomerangs: boomerangs.map((b) => ({
        ownerId: b.boomerang.ownerId,
        x: b.transform?.x ?? 0,
        y: b.transform?.y ?? 0,
        rotation: b.boomerang.rotation,
        isBig: b.boomerang.isBig,
      })),
      particles: particles.map((p) => ({
        x: p.transform?.x ?? 0,
        y: p.transform?.y ?? 0,
        vx: p.velocity?.x ?? 0,
        vy: p.velocity?.y ?? 0,
        size: p.particle.size,
        color: p.particle.color,
        life: p.particle.life,
        maxLife: p.particle.maxLife,
      })),
      rings: rings.map((r) => ({
        x: r.transform?.x ?? 0,
        y: r.transform?.y ?? 0,
        radius: r.ring.radius,
        maxRadius: r.ring.maxRadius,
        color: r.ring.color,
        alpha: r.ring.alpha,
      })),
    };

    GameState.recordReplayFrame(frame);
  }

  private updateKO(): void {
    // KO 状态现在由 CollisionSystem.triggerRoundEnd 控制
    // 它会在适当时机切换到 roundEnd 状态
    // 这里只处理计时器（作为备用）
    GameState.stateTimer--;

    // 继续录制回放帧以捕捉击杀后的粒子效果
    this.recordReplayFrame();

    if (GameState.stateTimer <= 0 && GameState.state === 'ko') {
      // 如果还没切换，强制切换
      GameState.state = 'roundEnd';
      GameState.stateTimer = 180;
    }
  }

  private updateRoundEnd(): void {
    GameState.stateTimer--;

    // 开始回放（仅在刚进入 roundEnd 时启动）
    if (!GameState.replayPlaying && GameState.replayBuffer.length > 0) {
      GameState.startReplay();
    }

    // 推进回放，并检测是否播放完一遍
    let replayFinished = false;
    if (GameState.replayPlaying) {
      const prevIndex = GameState.replayPlaybackIndex;
      GameState.advanceReplay();
      // 如果回放索引回到0，说明播放完一遍
      if (GameState.replayPlaybackIndex < prevIndex) {
        replayFinished = true;
      }
    }

    // 只有赢家才能确认进入下一回合
    let winnerConfirm = false;
    const winnerId = GameState.roundWinner;

    // 检查赢家是否是 AI（gamepadIndex === -2 表示 CPU）
    let winnerIsAI = false;
    if (winnerId >= 0) {
      const winnerConfig = GameSettings.players?.[winnerId];
      const winnerGpIndex = winnerConfig?.gamepadIndex ?? winnerId;
      winnerIsAI = winnerGpIndex === -2;

      // 检测赢家的输入
      if (winnerGpIndex === -99) {
        // 键盘玩家
        if (this.input.isPressed('action')) {
          winnerConfirm = true;
        }
      } else if (winnerGpIndex >= 0) {
        // 手柄玩家
        if (this.input.isButtonPressed(0, winnerGpIndex)) {
          winnerConfirm = true;
        }
      }
    }

    // 如果赢家是 AI 且回放播放完一遍，自动确认
    if (winnerIsAI && replayFinished && !GameState.winnerConfirmed) {
      GameState.winnerConfirmed = true;
      GameState.stateTimer = Math.min(GameState.stateTimer, 30); // AI赢时快速切换
    }

    // 赢家确认后标记
    if (winnerConfirm && !GameState.winnerConfirmed) {
      GameState.winnerConfirmed = true;
      GameState.stateTimer = Math.min(GameState.stateTimer, 60); // 确认后最多等1秒
    }

    // 只有赢家确认且计时器到期才进入下一回合
    if (GameState.stateTimer <= 0 && GameState.winnerConfirmed) {
      // 检查是否有最终获胜者
      const gameWinner = GameState.checkGameWinner(GameSettings.winScore);
      if (gameWinner >= 0) {
        this.endMatch();
      } else {
        // 开始新回合
        GameState.resetRound();
        this.startRound();
      }
    }
  }

  private updatePause(): void {
    if (this.menuCooldown > 0) {
      this.menuCooldown--;
      return;
    }

    const moveY = this.input.axisY() || this.input.axisY(1);
    const confirm = this.input.isReleased('action') || this.input.isReleased('action', 1);

    if (Math.abs(moveY) > 0.5) {
      this.pauseMenuIndex = (this.pauseMenuIndex + (moveY > 0 ? 1 : -1) + 5) % 5;
      this.updatePauseMenuUI();
      this.menuCooldown = 12;
    }

    if (confirm || this.input.isPressed('pause')) {
      const actions = ['resume', 'fullscreen', 'screenshot', 'restart', 'mainmenu'];
      this.handlePauseAction(actions[this.pauseMenuIndex]);
      this.menuCooldown = 15;
    }
  }

  private updateWin(): void {
    if (this.menuCooldown > 0) {
      this.menuCooldown--;
      return;
    }

    const moveY = this.input.axisY() || this.input.axisY(1);
    const confirm = this.input.isReleased('action') || this.input.isReleased('action', 1);

    if (Math.abs(moveY) > 0.5) {
      this.winMenuIndex = (this.winMenuIndex + (moveY > 0 ? 1 : -1) + 2) % 2;
      this.updateWinMenuUI();
      this.menuCooldown = 12;
    }

    if (confirm) {
      const actions = ['rematch', 'mainmenu'];
      this.handleWinAction(actions[this.winMenuIndex]);
      this.menuCooldown = 15;
    }
  }

  private updateTutorial(_dt: number): void {
    // 教程逻辑 (简化版本)
    // 完整实现需要教程步骤检测
  }

  private startRound(): void {
    // 清理所有实体
    this.clearEntities();

    // 生成地图
    this.generateMap();

    // 获取玩家数量和配置
    const playerCount = GameSettings.playerCount || 2;
    const players = GameSettings.players || [];

    // 计算玩家出生位置（根据玩家数量均匀分布）
    const spawnPositions = this.getSpawnPositions(playerCount);

    // 创建所有玩家
    for (let i = 0; i < playerCount; i++) {
      const playerConfig = players[i] || {
        gamepadIndex: i,
        skinIndex: i,
        name: `P${i + 1}`,
        teamIndex: -1,
      };
      const pos = spawnPositions[i];
      const player = createPlayer(i, pos.x, pos.y);

      // 设置玩家配置
      const pData = player.player as PlayerData;
      pData.skinIndex = playerConfig.skinIndex ?? playerConfig.colorIndex ?? i;
      pData.colorIndex = playerConfig.colorIndex ?? playerConfig.skinIndex ?? i;
      pData.shapeIndex = playerConfig.shapeIndex ?? i;
      pData.teamIndex = playerConfig.teamIndex ?? -1;
      pData.gamepadIndex = playerConfig.gamepadIndex;

      // CPU 玩家 (gamepadIndex === -2 表示 CPU)
      if (playerConfig.gamepadIndex === -2) {
        pData.isAI = true;
      }

      this.spawn(player);
    }

    // 兼容旧的 PVE 模式
    if (GameSettings.gameMode === 'pve' || GameSettings.gameMode === 'tutorial') {
      const playerEntities = this.engine.world.entities.filter((e) =>
        e.tags?.values?.includes(EntityTags.PLAYER)
      );
      if (playerEntities.length >= 2) {
        const p2 = playerEntities[1];
        (p2.player as PlayerData).isAI = true;
      }
    }

    // 只在第一回合初始化多人得分系统（避免重置分数）
    if (GameState.roundNumber === 1 || GameState.playerScores.length !== playerCount) {
      GameState.initPlayerScores(playerCount);
    }

    // 重置状态
    GameState.state = 'ready';
    GameState.stateTimer = 45;
    GameState.powerupSpawnTimer = POWERUP_CONFIG.spawnDelay;

    window.showMessage('READY', 650);
    window.playSound('ready');
  }

  /** 获取玩家出生位置 */
  private getSpawnPositions(count: number): Array<{ x: number; y: number }> {
    const W = DESIGN_WIDTH;
    const H = DESIGN_HEIGHT;
    const margin = 200;

    if (count === 2) {
      // 2人模式：左右对称
      return [
        { x: margin, y: H / 2 },
        { x: W - margin, y: H / 2 },
      ];
    } else if (count === 3) {
      // 3人模式：三角形分布
      return [
        { x: margin, y: H / 2 },
        { x: W - margin, y: margin + 100 },
        { x: W - margin, y: H - margin - 100 },
      ];
    } else if (count === 4) {
      // 4人模式：四角分布
      return [
        { x: margin, y: margin + 100 },
        { x: W - margin, y: margin + 100 },
        { x: margin, y: H - margin - 100 },
        { x: W - margin, y: H - margin - 100 },
      ];
    }

    // 默认
    return [
      { x: margin, y: H / 2 },
      { x: W - margin, y: H / 2 },
    ];
  }

  private clearEntities(): void {
    const gameEntityTags = [
      EntityTags.PLAYER,
      EntityTags.BOOMERANG,
      EntityTags.POWERUP,
      EntityTags.WALL,
      EntityTags.PARTICLE,
      EntityTags.TRAIL,
      EntityTags.RING,
      EntityTags.FLOATING_TEXT,
    ];

    const toRemove = this.engine.world.entities.filter((e) => {
      if (!e.tags?.values) return false;
      for (const tag of gameEntityTags) {
        if (e.tags.values.includes(tag)) return true;
      }
      return false;
    });

    for (const entity of toRemove) {
      this.engine.despawn(entity);
    }
  }

  private generateMap(): void {
    // 使用设计坐标系（Canvas 变换会自动缩放）
    const W = DESIGN_WIDTH;
    const H = DESIGN_HEIGHT;

    const layout = MAP_LAYOUTS[Math.floor(Math.random() * MAP_LAYOUTS.length)];

    // 生成预定义的矩形墙体
    for (const w of layout) {
      const wall = createWall(W * w.bx + w.ox, H * w.by + w.oy, w.bw, w.bh);
      this.spawn(wall);
    }

    // 随机添加一些不同形状的障碍物增加趣味性
    const shapeCount = Math.floor(Math.random() * 3) + 1; // 1-3 个额外形状
    const margin = 200;

    for (let i = 0; i < shapeCount; i++) {
      const shapeType = Math.random();
      const x = margin + Math.random() * (W - margin * 2);
      const y = margin + Math.random() * (H - margin * 2);

      if (shapeType < 0.5) {
        // 圆形障碍物
        const radius = 30 + Math.random() * 40;
        this.spawn(createCircleObstacle(x, y, radius));
      } else {
        // 三角形障碍物
        const size = 60 + Math.random() * 60;
        this.spawn(createTriangleObstacle(x, y, size));
      }
    }
  }

  private spawnPowerup(): void {
    // 使用设计坐标系
    const W = DESIGN_WIDTH;
    const H = DESIGN_HEIGHT;
    const margin = 150;
    const padding = 30;

    const walls = this.engine.world.entities.filter(
      (e): e is GameEntity & { wall: WallData } =>
        !!e.tags?.values.includes(EntityTags.WALL) && e.wall !== undefined
    );

    let x: number, y: number, valid: boolean;

    for (let i = 0; i < 20; i++) {
      x = margin + Math.random() * (W - margin * 2);
      y = margin + Math.random() * (H - margin * 2);
      valid = true;

      for (const wall of walls) {
        if (!wall.transform) continue;
        const wx = wall.transform.x - wall.wall.width / 2;
        const wy = wall.transform.y - wall.wall.height / 2;

        if (
          x > wx - padding &&
          x < wx + wall.wall.width + padding &&
          y > wy - padding &&
          y < wy + wall.wall.height + padding
        ) {
          valid = false;
          break;
        }
      }

      if (valid) break;
    }

    const type = POWERUP_CONFIG.types[Math.floor(Math.random() * POWERUP_CONFIG.types.length)];
    const powerup = createPowerup(x!, y!, type);
    this.spawn(powerup);
  }

  private endMatch(): void {
    GameState.state = 'win';
    this.winMenuIndex = 0;
    this.menuCooldown = 30;

    // 多人模式：找到最终获胜者
    const winner = GameState.checkGameWinner(GameSettings.winScore);
    if (winner >= 0) {
      Stats.recordGameEnd(winner);
    }

    // 更新胜利画面
    const winText = document.getElementById('winnerText');
    if (winText) {
      if (GameState.roundWinnerTeam >= 0) {
        // 队伍获胜
        winText.textContent = `TEAM ${GameState.roundWinnerTeam + 1}`;
        winText.className = `p${(GameState.roundWinnerTeam % 2) + 1}`;
      } else if (winner >= 0) {
        winText.textContent = `PLAYER ${winner + 1}`;
        winText.className = `p${(winner % 2) + 1}`;
      }
    }

    // 更新最终得分显示（多人模式）
    const finalScore = document.getElementById('finalScore');
    if (finalScore) {
      if (GameSettings.playerCount > 2) {
        // 多人模式显示所有得分
        const scores = GameState.playerScores.map((p) => p.score).join(' : ');
        finalScore.textContent = scores;
      } else {
        finalScore.textContent = `${GameState.scores[0]} : ${GameState.scores[1]}`;
      }
    }

    // 更新统计
    this.updateMatchStats();

    document.getElementById('winScreen')?.classList.remove('hidden');
    this.updateWinMenuUI();

    window.playSound('win');
  }

  private updateMatchStats(): void {
    const p1Stats = Stats.current.p1;
    const p2Stats = Stats.current.p2;

    const statRows = document.querySelectorAll('#matchStats .stat-row');
    const statsData = [
      [p1Stats.kills, p2Stats.kills],
      [p1Stats.throws, p2Stats.throws],
      [p1Stats.dashes, p2Stats.dashes],
      [p1Stats.powerups, p2Stats.powerups],
    ];

    statRows.forEach((row, i) => {
      const spans = row.querySelectorAll('span');
      if (spans[0]) spans[0].textContent = String(statsData[i][0]);
      if (spans[2]) spans[2].textContent = String(statsData[i][1]);
    });
  }

  private togglePause(): void {
    if (GameState.state !== 'pause') {
      // 进入暂停状态，保存之前的状态
      this.stateBeforePause = GameState.state;
      GameState.state = 'pause';
      GameState.paused = true;
      this.pauseMenuIndex = 0;
      document.getElementById('pauseScreen')?.classList.remove('hidden');
      this.updatePauseMenuUI();
      // 更新全屏按钮文字
      const fullscreenBtn = document.getElementById('fullscreenBtn');
      if (fullscreenBtn) {
        fullscreenBtn.textContent = document.fullscreenElement ? '退出全屏' : '全屏模式';
      }
    } else {
      // 从暂停恢复到之前的状态
      GameState.state = this.stateBeforePause as typeof GameState.state;
      GameState.paused = false;
      document.getElementById('pauseScreen')?.classList.add('hidden');
    }
  }

  private handlePauseAction(action: string): void {
    switch (action) {
      case 'resume':
        this.togglePause();
        break;
      case 'fullscreen':
        this.toggleFullscreen();
        break;
      case 'screenshot':
        this.takeScreenshot();
        break;
      case 'restart':
        document.getElementById('pauseScreen')?.classList.add('hidden');
        GameState.paused = false;
        GameState.resetMatch();
        Stats.reset();
        window.updateScoreUI();
        this.startRound();
        break;
      case 'mainmenu':
        document.getElementById('pauseScreen')?.classList.add('hidden');
        GameState.paused = false;
        this.engine.goto('menu');
        break;
    }
  }

  private toggleFullscreen(): void {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          if (fullscreenBtn) fullscreenBtn.textContent = '退出全屏';
        })
        .catch(() => {
          // Fullscreen request failed
        });
    } else {
      document
        .exitFullscreen()
        .then(() => {
          if (fullscreenBtn) fullscreenBtn.textContent = '全屏模式';
        })
        .catch(() => {
          // Exit fullscreen failed
        });
    }
  }

  private takeScreenshot(): void {
    // 获取游戏画布
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      window.showMessage?.('截图失败');
      return;
    }

    // 先隐藏暂停菜单
    const pauseScreen = document.getElementById('pauseScreen');
    pauseScreen?.classList.add('hidden');

    // 等待一帧让画面更新
    requestAnimationFrame(() => {
      try {
        // 获取画布数据
        const dataUrl = canvas.toDataURL('image/png');

        // 创建下载链接
        const link = document.createElement('a');
        link.download = `boomerang-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();

        window.showMessage?.('截图已保存');
      } catch (_e) {
        window.showMessage?.('截图失败');
      }

      // 恢复暂停菜单
      pauseScreen?.classList.remove('hidden');
    });
  }

  private handleWinAction(action: string): void {
    switch (action) {
      case 'rematch':
        document.getElementById('winScreen')?.classList.add('hidden');
        GameState.resetMatch();
        Stats.reset();
        window.updateScoreUI();
        this.startRound();
        break;
      case 'mainmenu':
        document.getElementById('winScreen')?.classList.add('hidden');
        this.engine.goto('menu');
        break;
    }
  }

  private updatePauseMenuUI(): void {
    const buttons = document.querySelectorAll('#pauseMenu .menu-btn');
    buttons.forEach((btn, i) => {
      btn.classList.toggle('selected', i === this.pauseMenuIndex);
    });
  }

  private updateWinMenuUI(): void {
    const buttons = document.querySelectorAll('#winMenu .menu-btn');
    buttons.forEach((btn, i) => {
      btn.classList.toggle('selected', i === this.winMenuIndex);
    });
  }
}
