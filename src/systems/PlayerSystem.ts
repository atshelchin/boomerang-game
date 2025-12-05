/**
 * 玩家系统
 * 处理玩家移动、冲刺、投掷等逻辑
 */

import { InputSystem, System } from 'you-engine';
import {
  BOOMERANG_CONFIG,
  GameSettings,
  PLAYER_CONFIG,
  PLAYER_SKINS,
  POWERUP_CONFIG,
} from '../config/GameConfig';
import { GameState, Stats } from '../config/GameState';
import {
  createBoomerang,
  createParticle,
  createTrail,
  spawnParticles,
} from '../entities/factories';
import type { GameEntity, PlayerData } from '../entities/types';
import { EntityTags } from '../entities/types';
import { TerrainSystem } from './TerrainSystem';

export class PlayerSystem extends System {
  static priority = 10;

  private input!: InputSystem;

  onCreate(): void {
    this.input = this.engine.system(InputSystem);
  }

  // Canvas 变换已自动处理缩放，不需要手动缩放
  setScale(_scale: number): void {
    // 保留接口兼容性，但不再使用
  }

  onUpdate(dt: number): void {
    if (GameState.state !== 'fight' && GameState.state !== 'tutorial') return;
    if (GameState.hitstop > 0) return;

    const players = this.engine.world.entities.filter(
      (e): e is GameEntity & { player: PlayerData } =>
        !!e.tags?.values.includes(EntityTags.PLAYER) && e.player !== undefined
    );

    for (const player of players) {
      this.updatePlayer(player, dt);
    }
  }

  private updatePlayer(entity: GameEntity & { player: PlayerData }, _dt: number): void {
    const { player, transform, velocity } = entity;
    if (!player.alive || !transform || !velocity) return;

    player.animTime++;
    if (player.catchCooldown > 0) player.catchCooldown--;
    if (player.dashCooldown > 0) player.dashCooldown--;

    // 更新道具计时器
    for (let i = player.powerups.length - 1; i >= 0; i--) {
      player.powerups[i].timer--;
      if (player.powerups[i].timer <= 0) {
        player.powerups.splice(i, 1);
      }
    }

    // 更新冰冻状态
    if (player.frozen) {
      player.frozenTimer--;
      if (player.frozenTimer <= 0) {
        player.frozen = false;
        this.engine.emit('player:unfreeze', { playerId: player.playerId });
      } else {
        // 冰冻时完全无法移动，只更新冰冻粒子效果
        if (GameState.time % 10 === 0) {
          const particle = createParticle(
            transform.x + (Math.random() - 0.5) * 40,
            transform.y + (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 2,
            -Math.random() * 3,
            { size: 4, color: '#88f', life: 30 }
          );
          this.engine.spawn(particle);
        }
        // 冰冻时不能做任何动作
        velocity.x *= 0.9;
        velocity.y *= 0.9;
        return;
      }
    }

    // 更新燃烧状态
    if (player.burning) {
      player.burnTimer--;
      if (player.burnTimer <= 0) {
        player.burning = false;
        this.engine.emit('player:burnEnd', { playerId: player.playerId });
      } else {
        // 燃烧粒子效果
        if (GameState.time % 5 === 0) {
          const particle = createParticle(
            transform.x + (Math.random() - 0.5) * 30,
            transform.y + (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 3,
            -Math.random() * 5 - 2,
            { size: 5, color: Math.random() > 0.5 ? '#f44' : '#f80', life: 25 }
          );
          this.engine.spawn(particle);
        }
        // 燃烧伤害：每隔一段时间造成伤害（杀死玩家）
        if (player.burnTimer % POWERUP_CONFIG.burnDamageInterval === 0) {
          // 燃烧致死 - ownerId为-1表示环境伤害
          this.engine.emit('player:burnDamage', {
            playerId: player.playerId,
            x: transform.x,
            y: transform.y,
          });
        }
      }
    }

    // 获取输入
    const inp = player.isAI ? this.getAIInput(entity) : this.getPlayerInput(player.playerId);

    // 冲刺
    if (inp.dash && player.dashCooldown <= 0 && !player.dashing && !player.charging) {
      this.startDash(entity, inp);
    }

    if (player.dashing) {
      player.dashTimer--;
      if (player.dashTimer <= 0) {
        player.dashing = false;
        velocity.x *= 0.1;
        velocity.y *= 0.1;
      }

      // 冲刺残影 - 使用玩家自身的 skinIndex
      const skin = PLAYER_SKINS[player.skinIndex ?? player.playerId % PLAYER_SKINS.length];
      this.spawnTrail(transform.x, transform.y, PLAYER_CONFIG.radius, skin.color1, 0.8);
    }

    // 移动
    const speedBoost = this.hasPowerup(player, 'speed') ? 1.6 : 1;
    const moveSpeed = player.dashing
      ? 0
      : player.charging
        ? PLAYER_CONFIG.chargeSpeedMultiplier
        : PLAYER_CONFIG.moveSpeed * speedBoost;

    if ((inp.x !== 0 || inp.y !== 0) && !player.dashing) {
      velocity.x += inp.x * moveSpeed;
      velocity.y += inp.y * moveSpeed;
      if (!player.charging) {
        player.angle = Math.atan2(inp.y, inp.x);
      }
    }

    // 蓄力投掷
    if (player.hasBoomerang && !player.dashing) {
      if (inp.actionHeld) {
        if (!player.charging) {
          player.charging = true;
          player.chargeTime = 0;
        }
        player.chargeTime++;

        // 蓄力时震动反馈
        if (player.chargeTime % 8 === 0 && !player.isAI) {
          const intensity = Math.min(player.chargeTime / PLAYER_CONFIG.maxCharge, 1);
          this.input.vibrate(player.playerId, {
            strong: intensity * 0.3,
            weak: intensity * 0.5,
            duration: 30,
          });
        }

        // 蓄力时瞄准 - 蓄力越满，转向越慢（更精确）
        if (inp.x !== 0 || inp.y !== 0) {
          const targetAngle = Math.atan2(inp.y, inp.x);
          let diff = targetAngle - player.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const stickMag = Math.sqrt(inp.x * inp.x + inp.y * inp.y);
          // 蓄力程度：0-1
          const chargeRatio = Math.min(player.chargeTime / PLAYER_CONFIG.maxCharge, 1);
          // 基础转速随蓄力程度降低：满蓄力时只有30%的转速
          const chargeSlowdown = 1 - chargeRatio * 0.7;
          const turnSpeed = (0.08 + stickMag * 0.12) * chargeSlowdown;
          player.angle += diff * turnSpeed;
        }
      }

      if (inp.actionReleased && player.charging) {
        this.throwBoomerang(entity);
        player.charging = false;
        player.chargeTime = 0;
      }
    } else {
      player.charging = false;
      player.chargeTime = 0;
    }

    // 物理 - 检查是否在冰面上
    const terrainSystem = this.engine.system(TerrainSystem);
    const onIce = terrainSystem?.isPlayerOnIce(player.playerId) ?? false;
    const friction = player.dashing ? 0.98 : onIce ? 0.98 : 0.85; // 冰面上摩擦力更低
    velocity.x *= friction;
    velocity.y *= friction;

    const maxSpeed = PLAYER_CONFIG.maxSpeed;
    const spd = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (spd > maxSpeed) {
      velocity.x = (velocity.x / spd) * maxSpeed;
      velocity.y = (velocity.y / spd) * maxSpeed;
    }

    // 移动轨迹
    if (spd > 3 && GameState.time % 3 === 0) {
      const skin = PLAYER_SKINS[player.playerId === 0 ? GameSettings.p1Skin : GameSettings.p2Skin];
      this.spawnTrail(transform.x, transform.y, PLAYER_CONFIG.radius * 0.8, skin.color1, 0.3);
    }

    // 移动
    transform.x += velocity.x * GameState.slowmo;
    transform.y += velocity.y * GameState.slowmo;

    // 边界碰撞 - 根据速度计算反弹力度
    const margin = 60;
    const W = this.engine.width;
    const H = this.engine.height;

    // 反弹系数：速度越快反弹越强
    const bounceBase = 0.3; // 基础反弹
    const bounceScale = 0.4; // 速度影响系数
    const maxBounce = 0.8; // 最大反弹系数

    let hitBoundary = false;
    let hitX = 0,
      hitY = 0;

    if (transform.x < margin) {
      transform.x = margin;
      const bounceForce = Math.min(
        bounceBase + (Math.abs(velocity.x) * bounceScale) / PLAYER_CONFIG.maxSpeed,
        maxBounce
      );
      velocity.x = Math.abs(velocity.x) * bounceForce;
      hitBoundary = true;
      hitX = margin;
      hitY = transform.y;
    }
    if (transform.x > W - margin) {
      transform.x = W - margin;
      const bounceForce = Math.min(
        bounceBase + (Math.abs(velocity.x) * bounceScale) / PLAYER_CONFIG.maxSpeed,
        maxBounce
      );
      velocity.x = -Math.abs(velocity.x) * bounceForce;
      hitBoundary = true;
      hitX = W - margin;
      hitY = transform.y;
    }
    if (transform.y < margin) {
      transform.y = margin;
      const bounceForce = Math.min(
        bounceBase + (Math.abs(velocity.y) * bounceScale) / PLAYER_CONFIG.maxSpeed,
        maxBounce
      );
      velocity.y = Math.abs(velocity.y) * bounceForce;
      hitBoundary = true;
      hitX = transform.x;
      hitY = margin;
    }
    if (transform.y > H - margin) {
      transform.y = H - margin;
      const bounceForce = Math.min(
        bounceBase + (Math.abs(velocity.y) * bounceScale) / PLAYER_CONFIG.maxSpeed,
        maxBounce
      );
      velocity.y = -Math.abs(velocity.y) * bounceForce;
      hitBoundary = true;
      hitX = transform.x;
      hitY = H - margin;
    }

    // 撞墙粒子效果和震动
    if (hitBoundary && spd > 5) {
      const intensity = Math.min(spd / PLAYER_CONFIG.maxSpeed, 1);
      const skin = PLAYER_SKINS[player.playerId === 0 ? GameSettings.p1Skin : GameSettings.p2Skin];

      // 粒子效果
      this.spawnParticleEffect(hitX, hitY, {
        angle: Math.atan2(transform.y - hitY, transform.x - hitX),
        spread: 1.5,
        speedMin: 2 + intensity * 3,
        speedMax: 5 + intensity * 8,
        colors: [skin.color1, '#fff', '#aaa'],
        sizeMin: 2,
        sizeMax: 4 + intensity * 4,
        count: Math.floor(5 + intensity * 10),
      });

      // 震动反馈
      if (!player.isAI) {
        this.input.vibrate(player.playerId, {
          strong: intensity * 0.5,
          weak: intensity * 0.7,
          duration: 30 + intensity * 50,
        });
      }

      this.engine.emit('player:wallHit', {
        playerId: player.playerId,
        x: hitX,
        y: hitY,
        intensity,
      });
    }

    // 障碍物碰撞 (handled by collision system)
  }

  private getPlayerInput(playerId: number) {
    return {
      x: playerId === 0 ? this.input.axisX() : this.input.axisX(1),
      y: playerId === 0 ? this.input.axisY() : this.input.axisY(1),
      actionHeld: this.input.isHeld('action', playerId),
      actionReleased: this.input.isReleased('action', playerId),
      dash: this.input.isPressed('dash', playerId),
    };
  }

  /** AI 状态存储 */
  private aiStates: Map<
    number,
    {
      targetX: number;
      targetY: number;
      attackTimer: number;
      chargeStarted: boolean;
      dodgeTimer: number;
    }
  > = new Map();

  private getAIInput(entity: GameEntity): {
    x: number;
    y: number;
    actionHeld: boolean;
    actionReleased: boolean;
    dash: boolean;
  } {
    const player = entity.player;
    const transform = entity.transform;
    if (!player || !transform) {
      return { x: 0, y: 0, actionHeld: false, actionReleased: false, dash: false };
    }

    // 初始化 AI 状态
    if (!this.aiStates.has(player.playerId)) {
      this.aiStates.set(player.playerId, {
        targetX: transform.x,
        targetY: transform.y,
        attackTimer: Math.random() * 60 + 30,
        chargeStarted: false,
        dodgeTimer: 0,
      });
    }
    const aiState = this.aiStates.get(player.playerId)!;

    // AI 难度影响
    const difficultyMultiplier = 0.5 + GameSettings.aiDifficulty * 0.3; // 0.5, 0.8, 1.1
    const reactionSpeed = 0.02 + GameSettings.aiDifficulty * 0.02;

    // 寻找最近的敌人
    const enemies = (this.engine.world.entities as GameEntity[]).filter(
      (e): e is GameEntity & { player: PlayerData } =>
        !!e.tags?.values.includes(EntityTags.PLAYER) &&
        e.player !== undefined &&
        e.player.playerId !== player.playerId &&
        e.player.alive
    );

    // 寻找飞来的回旋镖（危险检测）
    const boomerangs = (this.engine.world.entities as GameEntity[]).filter(
      (e) =>
        e.tags?.values.includes(EntityTags.BOOMERANG) &&
        e.boomerang !== undefined &&
        e.boomerang.ownerId !== player.playerId
    );

    let moveX = 0;
    let moveY = 0;
    let actionHeld = false;
    let actionReleased = false;
    let dash = false;

    // 危险检测 - 躲避飞来的回旋镖
    let inDanger = false;
    for (const boom of boomerangs) {
      if (!boom.transform || !boom.velocity) continue;
      const dx = boom.transform.x - transform.x;
      const dy = boom.transform.y - transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 检查回旋镖是否朝我飞来
      if (dist < 200) {
        const toMe = { x: transform.x - boom.transform.x, y: transform.y - boom.transform.y };
        const dot = toMe.x * boom.velocity.x + toMe.y * boom.velocity.y;
        if (dot > 0) {
          // 回旋镖朝我飞来，躲避
          inDanger = true;
          // 垂直于回旋镖方向躲避
          const perpX = -boom.velocity.y;
          const perpY = boom.velocity.x;
          const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
          if (perpLen > 0) {
            moveX = (perpX / perpLen) * difficultyMultiplier;
            moveY = (perpY / perpLen) * difficultyMultiplier;
          }

          // 紧急情况使用冲刺
          if (dist < 100 && player.dashCooldown <= 0 && aiState.dodgeTimer <= 0) {
            dash = true;
            aiState.dodgeTimer = 60;
          }
        }
      }
    }
    aiState.dodgeTimer = Math.max(0, aiState.dodgeTimer - 1);

    // 没有危险时的行为
    if (!inDanger && enemies.length > 0) {
      // 找最近的敌人
      let nearestEnemy = enemies[0];
      let nearestDist = Infinity;
      for (const enemy of enemies) {
        if (!enemy.transform) continue;
        const dx = enemy.transform.x - transform.x;
        const dy = enemy.transform.y - transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemy;
        }
      }

      if (nearestEnemy.transform) {
        const dx = nearestEnemy.transform.x - transform.x;
        const dy = nearestEnemy.transform.y - transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 保持适当距离
        const idealDist = 250 + Math.random() * 100;

        if (dist > idealDist + 50) {
          // 太远，靠近
          moveX = (dx / dist) * reactionSpeed * 10;
          moveY = (dy / dist) * reactionSpeed * 10;
        } else if (dist < idealDist - 50) {
          // 太近，后退
          moveX = (-dx / dist) * reactionSpeed * 8;
          moveY = (-dy / dist) * reactionSpeed * 8;
        } else {
          // 适当距离，环绕移动
          moveX = (-dy / dist) * reactionSpeed * 5;
          moveY = (dx / dist) * reactionSpeed * 5;
        }

        // 攻击逻辑
        if (player.hasBoomerang) {
          aiState.attackTimer--;

          if (aiState.attackTimer <= 0) {
            // 开始蓄力
            if (!aiState.chargeStarted) {
              aiState.chargeStarted = true;
              actionHeld = true;
            } else if (player.chargeTime > 15 + Math.random() * 30 * difficultyMultiplier) {
              // 蓄力完成，释放
              actionReleased = true;
              aiState.chargeStarted = false;
              aiState.attackTimer = 60 + (Math.random() * 120) / difficultyMultiplier;
            } else {
              actionHeld = true;
              // 蓄力时瞄准敌人
              moveX = dx / dist;
              moveY = dy / dist;
            }
          }
        } else {
          // 没有回旋镖，等待回来
          aiState.chargeStarted = false;
        }
      }
    }

    // 限制移动范围
    const margin = 100;
    const W = 1920; // DESIGN_WIDTH
    const H = 1080; // DESIGN_HEIGHT
    if (transform.x < margin) moveX = Math.max(moveX, 0.5);
    if (transform.x > W - margin) moveX = Math.min(moveX, -0.5);
    if (transform.y < margin) moveY = Math.max(moveY, 0.5);
    if (transform.y > H - margin) moveY = Math.min(moveY, -0.5);

    // 归一化移动向量
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 1) {
      moveX /= len;
      moveY /= len;
    }

    return { x: moveX, y: moveY, actionHeld, actionReleased, dash };
  }

  private hasPowerup(player: PlayerData, type: string): boolean {
    return player.powerups.some((p) => p.type === type);
  }

  private startDash(
    entity: GameEntity & { player: PlayerData },
    inp: { x: number; y: number }
  ): void {
    const { player, transform, velocity } = entity;
    if (!transform || !velocity) return;

    player.dashing = true;
    player.dashTimer = PLAYER_CONFIG.dashDuration;
    player.dashCooldown = PLAYER_CONFIG.dashCooldown;
    Stats.recordDash(player.playerId);

    let dx = inp.x,
      dy = inp.y;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(player.angle);
      dy = Math.sin(player.angle);
    }
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    velocity.x = (dx / len) * PLAYER_CONFIG.dashSpeed;
    velocity.y = (dy / len) * PLAYER_CONFIG.dashSpeed;
    player.angle = Math.atan2(dy, dx);

    // 震动
    if (!player.isAI) {
      this.input.vibrate(player.playerId, { strong: 0.8, weak: 1, duration: 40 });
    }

    // 起点粒子
    const skin = PLAYER_SKINS[player.playerId === 0 ? GameSettings.p1Skin : GameSettings.p2Skin];
    this.spawnParticleEffect(transform.x, transform.y, {
      angle: Math.atan2(-dy, -dx),
      spread: 1.2,
      speedMin: 5,
      speedMax: 15,
      colors: [skin.color1, '#fff'],
      sizeMin: 4,
      sizeMax: 10,
      count: 12,
    });

    this.engine.emit('player:dash', { playerId: player.playerId, x: transform.x, y: transform.y });
  }

  private throwBoomerang(entity: GameEntity & { player: PlayerData }): void {
    const { player, transform } = entity;
    if (!player.hasBoomerang || !transform) return;

    player.hasBoomerang = false;
    player.catchCooldown = PLAYER_CONFIG.catchCooldown;
    Stats.recordThrow(player.playerId);

    const chargeRatio = Math.min(player.chargeTime / PLAYER_CONFIG.maxCharge, 1);
    const baseSpeed = BOOMERANG_CONFIG.baseSpeed;
    const maxSpeedBonus = BOOMERANG_CONFIG.maxSpeedBonus;
    const speed = baseSpeed + chargeRatio * maxSpeedBonus;

    const isTriple = this.hasPowerup(player, 'triple');
    const isBig = this.hasPowerup(player, 'big');
    const hasFreeze = this.hasPowerup(player, 'freeze');
    const hasFire = this.hasPowerup(player, 'fire');
    const canPenetrate = this.hasPowerup(player, 'penetrate');
    const extendedRange = this.hasPowerup(player, 'range');

    const throwDist = 40;

    // 辅助函数：应用道具效果到回旋镖
    const applyPowerupEffects = (boomerang: Partial<GameEntity>) => {
      if (boomerang.boomerang) {
        boomerang.boomerang.hasFreeze = hasFreeze;
        boomerang.boomerang.hasFire = hasFire;
        boomerang.boomerang.canPenetrate = canPenetrate;
        boomerang.boomerang.extendedRange = extendedRange;
      }
    };

    if (isTriple) {
      [-0.3, 0, 0.3].forEach((offset) => {
        const angle = player.angle + offset;
        const boomerang = createBoomerang(
          player.playerId,
          transform.x + Math.cos(angle) * throwDist,
          transform.y + Math.sin(angle) * throwDist,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          isBig // 三连发也可以变大
        );
        applyPowerupEffects(boomerang);
        this.engine.spawn(boomerang);
      });
    } else {
      const boomerang = createBoomerang(
        player.playerId,
        transform.x + Math.cos(player.angle) * throwDist,
        transform.y + Math.sin(player.angle) * throwDist,
        Math.cos(player.angle) * speed,
        Math.sin(player.angle) * speed,
        isBig
      );
      applyPowerupEffects(boomerang);
      this.engine.spawn(boomerang);
    }

    // 震动
    if (!player.isAI) {
      this.input.vibrate(player.playerId, {
        strong: 0.6 + chargeRatio * 0.4,
        weak: 0.8,
        duration: 80,
      });
    }

    this.engine.emit('player:throw', {
      playerId: player.playerId,
      x: transform.x,
      y: transform.y,
      chargeRatio,
    });
  }

  private spawnTrail(x: number, y: number, radius: number, color: string, alpha: number): void {
    const trail = createTrail(x, y, radius, color, alpha);
    this.engine.spawn(trail);
  }

  private spawnParticleEffect(
    x: number,
    y: number,
    config: {
      angle?: number;
      spread?: number;
      speedMin: number;
      speedMax: number;
      colors: string[];
      sizeMin: number;
      sizeMax: number;
      count: number;
    }
  ): void {
    const particles = spawnParticles(x, y, config.count, {
      angle: config.angle,
      spread: config.spread,
      speedMin: config.speedMin,
      speedMax: config.speedMax,
      colors: config.colors,
      sizeMin: config.sizeMin,
      sizeMax: config.sizeMax,
    });

    for (const p of particles) {
      this.engine.spawn(p);
    }
  }
}
