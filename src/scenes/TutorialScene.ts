/**
 * 教程场景
 * 步骤式教学，AI会移动，玩家需要完成每个操作才能进入下一步
 */

import { CameraSystem, InputSystem, Scene } from 'you-engine';
import { DESIGN_HEIGHT, DESIGN_WIDTH, GameSettings } from '../config/GameConfig';
import { GameState } from '../config/GameState';
import { i18n } from '../config/i18n';
import { TutorialState, type TutorialStepType } from '../config/TutorialState';
import { createPlayer, createPowerup, createWall } from '../entities/factories';
import type { GameEntity, PlayerData } from '../entities/types';
import { EntityTags } from '../entities/types';

declare global {
  interface Window {
    updateScoreUI: () => void;
    showMessage: (text: string, duration?: number) => void;
    playSound: (type: string) => void;
  }
}

export class TutorialScene extends Scene {
  private input!: InputSystem;
  private camera!: CameraSystem;
  private lastPlayerPos = { x: 0, y: 0 };
  private totalMoveDistance = 0;
  private stepConfirmCooldown = 0;
  private currentPowerupType: string | null = null;

  onCreate(): void {
    this.input = this.engine.system(InputSystem);
    this.camera = this.engine.system(CameraSystem);
  }

  onEnter(): void {
    // 隐藏菜单
    document.getElementById('startScreen')?.classList.add('hidden');
    document.getElementById('winScreen')?.classList.add('hidden');
    document.getElementById('pauseScreen')?.classList.add('hidden');

    // 配置摄像机
    this.camera.setPosition(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);

    // 初始化教程状态
    TutorialState.start();
    GameState.state = 'tutorial';
    GameState.time = 0;

    // 设置教程模式
    GameSettings.gameMode = 'tutorial';

    // 开始教程
    this.setupTutorialRound();
  }

  onExit(): void {
    TutorialState.end();
    GameState.state = 'title';
  }

  onUpdate(dt: number): void {
    GameState.time++;
    TutorialState.update();

    // 检测跳过教程
    if (this.input.isPressed('pause')) {
      this.skipTutorial();
      return;
    }

    // 更新教程逻辑
    this.updateTutorial(dt);

    // 更新屏幕震动
    this.updateShake();
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

  private setupTutorialRound(): void {
    // 清理所有实体
    this.clearEntities();

    // 生成简单地图（少量墙）
    this.generateSimpleMap();

    // 创建玩家（键盘控制）
    const player = createPlayer(0, 400, DESIGN_HEIGHT / 2);
    const pData = player.player as PlayerData;
    pData.skinIndex = GameSettings.players?.[0]?.skinIndex ?? 0;
    pData.colorIndex = pData.skinIndex;
    pData.shapeIndex = 0;
    pData.gamepadIndex = -99; // 键盘
    pData.isAI = false;
    this.spawn(player);

    // 创建 AI 对手
    const ai = createPlayer(1, DESIGN_WIDTH - 400, DESIGN_HEIGHT / 2);
    const aiData = ai.player as PlayerData;
    aiData.skinIndex = 1;
    aiData.colorIndex = 1;
    aiData.shapeIndex = 1;
    aiData.gamepadIndex = -2; // CPU
    aiData.isAI = true;
    this.spawn(ai);

    // 初始化玩家分数系统
    GameState.initPlayerScores(2);

    // 记录玩家初始位置
    const playerEntity = this.getPlayer();
    if (playerEntity?.transform) {
      this.lastPlayerPos = { x: playerEntity.transform.x, y: playerEntity.transform.y };
    }
    this.totalMoveDistance = 0;

    window.showMessage(i18n.t.tutorial.intro, 2000);
    window.playSound('ready');
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

  private generateSimpleMap(): void {
    // 简化的地图：只有中间一个小障碍
    const W = DESIGN_WIDTH;
    const H = DESIGN_HEIGHT;

    // 中间的墙
    const wall = createWall(W / 2, H / 2, 80, 200);
    this.spawn(wall);
  }

  private getPlayer(): (GameEntity & { player: PlayerData }) | undefined {
    return this.engine.world.entities.find(
      (e): e is GameEntity & { player: PlayerData } =>
        !!e.tags?.values.includes(EntityTags.PLAYER) &&
        e.player !== undefined &&
        (e.player as PlayerData).playerId === 0
    );
  }

  private getAI(): (GameEntity & { player: PlayerData }) | undefined {
    return this.engine.world.entities.find(
      (e): e is GameEntity & { player: PlayerData } =>
        !!e.tags?.values.includes(EntityTags.PLAYER) &&
        e.player !== undefined &&
        (e.player as PlayerData).playerId === 1
    );
  }

  private updateTutorial(_dt: number): void {
    if (this.stepConfirmCooldown > 0) {
      this.stepConfirmCooldown--;
    }

    const step = TutorialState.getCurrentStep();
    const t = i18n.t.tutorial;

    // 检测步骤完成
    this.checkStepActions(step.type);

    // 步骤完成后的处理
    if (TutorialState.checkStepCompletion()) {
      // 步骤完成，等待确认
      if (!TutorialState.stepCompleted) {
        TutorialState.stepCompleted = true;
        window.showMessage(t.stepComplete, 1000);
        window.playSound('ready');
        this.stepConfirmCooldown = 30;
      }

      // 按任意键进入下一步
      if (this.stepConfirmCooldown <= 0 && this.anyButtonPressed()) {
        this.advanceToNextStep();
      }
    } else {
      // 显示当前步骤提示
      this.showStepHint(step.type);
    }

    // 确保当前步骤有道具（如果需要）
    if (step.spawnPowerup && !this.currentPowerupType) {
      this.spawnTutorialPowerup(step.spawnPowerup);
    }

    // 控制 AI 行为
    this.controlTutorialAI(step);
  }

  private checkStepActions(stepType: TutorialStepType): void {
    const player = this.getPlayer();
    if (!player?.transform) return;

    switch (stepType) {
      case 'move': {
        // 检测移动距离
        const dx = player.transform.x - this.lastPlayerPos.x;
        const dy = player.transform.y - this.lastPlayerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.totalMoveDistance += dist;
        this.lastPlayerPos = { x: player.transform.x, y: player.transform.y };

        if (this.totalMoveDistance > 300) {
          TutorialState.recordMove();
        }
        break;
      }

      case 'throw': {
        // 检测是否投掷（玩家没有回旋镖了）
        if (!player.player.hasBoomerang) {
          TutorialState.recordThrow();
        }
        break;
      }

      case 'catch': {
        // 检测是否接住（投掷后又有回旋镖了）
        if (TutorialState.playerThrew && player.player.hasBoomerang) {
          TutorialState.recordCatch();
        }
        // 如果还没投掷，先记录投掷
        if (!player.player.hasBoomerang) {
          TutorialState.playerThrew = true;
        }
        break;
      }

      case 'charge': {
        // 检测蓄力（chargeTime 超过一定值后释放）
        if (player.player.chargeTime > 30) {
          TutorialState.playerCharged = true;
        }
        if (TutorialState.playerCharged && !player.player.charging && !player.player.hasBoomerang) {
          TutorialState.recordCharge();
        }
        break;
      }

      case 'dash': {
        // 检测冲刺
        if (player.player.dashing) {
          TutorialState.recordDash();
        }
        break;
      }

      case 'powerup_triple':
      case 'powerup_big':
      case 'powerup_speed':
      case 'powerup_shield':
      case 'powerup_magnet': {
        // 检测拾取并使用道具
        const targetType = stepType.replace('powerup_', '');
        const hasPowerup = player.player.powerups.some((p) => p.type === targetType);

        if (hasPowerup && !TutorialState.powerupCollected) {
          TutorialState.recordPowerupCollect();
          this.currentPowerupType = null;
        }

        // 对于 triple/big/magnet，需要投掷才算使用
        // 对于 speed/shield，拾取即使用
        if (targetType === 'speed' || targetType === 'shield') {
          if (TutorialState.powerupCollected) {
            TutorialState.recordPowerupUse();
          }
        } else {
          if (TutorialState.powerupCollected && !player.player.hasBoomerang) {
            TutorialState.recordPowerupUse();
          }
        }
        break;
      }

      case 'kill': {
        // 检测击杀 AI
        const ai = this.getAI();
        if (ai && !ai.player.alive) {
          TutorialState.recordKill();
        }
        break;
      }
    }
  }

  private showStepHint(stepType: TutorialStepType): void {
    // 每120帧显示一次提示
    if (TutorialState.hintTimer % 120 !== 0) return;

    const t = i18n.t.tutorial;

    const hints: Record<TutorialStepType, { title: string; desc: string }> = {
      intro: { title: t.intro, desc: t.introDesc },
      move: { title: t.move, desc: t.moveDesc },
      throw: { title: t.throw, desc: t.throwDesc },
      catch: { title: t.catch, desc: t.catchDesc },
      charge: { title: t.charge, desc: t.chargeDesc },
      dash: { title: t.dash, desc: t.dashDesc },
      powerup_triple: { title: t.powerupTriple, desc: t.powerupTripleDesc },
      powerup_big: { title: t.powerupBig, desc: t.powerupBigDesc },
      powerup_speed: { title: t.powerupSpeed, desc: t.powerupSpeedDesc },
      powerup_shield: { title: t.powerupShield, desc: t.powerupShieldDesc },
      powerup_magnet: { title: t.powerupMagnet, desc: t.powerupMagnetDesc },
      kill: { title: t.kill, desc: t.killDesc },
      complete: { title: t.complete, desc: t.completeDesc },
    };

    const hint = hints[stepType];
    if (hint && TutorialState.hintTimer === 0) {
      window.showMessage(`${hint.title}\n${hint.desc}`, 3000);
    }
  }

  private spawnTutorialPowerup(type: string): void {
    // 在玩家附近生成道具
    const player = this.getPlayer();
    if (!player?.transform) return;

    const W = DESIGN_WIDTH;
    const H = DESIGN_HEIGHT;

    // 在场地中央偏向玩家的位置生成
    const x = W / 2 + (Math.random() - 0.5) * 200;
    const y = H / 2 + (Math.random() - 0.5) * 200;

    const powerup = createPowerup(x, y, type);
    this.engine.spawn(powerup);
    this.currentPowerupType = type;

    window.playSound('powerup');
  }

  private controlTutorialAI(step: { aiActive?: boolean; aiAggressive?: boolean }): void {
    const ai = this.getAI();
    if (!ai) return;

    // 如果 AI 死了，重生
    if (!ai.player.alive) {
      // 只在 kill 步骤之外重生 AI
      if (TutorialState.getCurrentStep().type !== 'kill' || !TutorialState.checkStepCompletion()) {
        ai.player.alive = true;
        ai.player.hasBoomerang = true;
        if (ai.transform) {
          ai.transform.x = DESIGN_WIDTH - 400;
          ai.transform.y = DESIGN_HEIGHT / 2;
        }
        if (ai.velocity) {
          ai.velocity.x = 0;
          ai.velocity.y = 0;
        }
      }
    }

    // 根据步骤控制 AI 行为
    if (!step.aiActive) {
      // AI 不主动移动，但会面向玩家
      const player = this.getPlayer();
      if (player?.transform && ai.transform) {
        const dx = player.transform.x - ai.transform.x;
        const dy = player.transform.y - ai.transform.y;
        ai.player.angle = Math.atan2(dy, dx);
      }
      // 禁止 AI 攻击
      ai.player.hasBoomerang = false;
    } else {
      // AI 可以移动
      ai.player.isAI = true;

      if (!step.aiAggressive) {
        // AI 只移动不攻击
        ai.player.hasBoomerang = false;
      }
    }
  }

  private anyButtonPressed(): boolean {
    // 检测任意键/按钮
    return (
      this.input.isPressed('action') ||
      this.input.isPressed('dash') ||
      this.input.isButtonPressed(0, 0) ||
      this.input.isButtonPressed(1, 0)
    );
  }

  private advanceToNextStep(): void {
    const hasNext = TutorialState.nextStep();

    if (!hasNext) {
      // 教程完成
      this.completeTutorial();
      return;
    }

    // 重置道具追踪
    this.currentPowerupType = null;

    // 清理场上的道具
    const powerups = this.engine.world.entities.filter((e) =>
      e.tags?.values.includes(EntityTags.POWERUP)
    );
    for (const p of powerups) {
      this.engine.despawn(p);
    }

    // 清理回旋镖
    const boomerangs = this.engine.world.entities.filter((e) =>
      e.tags?.values.includes(EntityTags.BOOMERANG)
    );
    for (const b of boomerangs) {
      this.engine.despawn(b);
    }

    // 确保玩家有回旋镖
    const player = this.getPlayer();
    if (player) {
      player.player.hasBoomerang = true;
      player.player.powerups = [];
    }

    // 显示新步骤提示
    const step = TutorialState.getCurrentStep();
    this.showStepHint(step.type);

    window.playSound('fight');
  }

  private completeTutorial(): void {
    window.showMessage(`${i18n.t.tutorial.complete}\n${i18n.t.tutorial.completeDesc}`, 3000);
    window.playSound('win');

    // 2秒后返回主菜单
    setTimeout(() => {
      this.engine.goto('menu');
    }, 2000);
  }

  private skipTutorial(): void {
    TutorialState.end();
    this.engine.goto('menu');
  }
}
