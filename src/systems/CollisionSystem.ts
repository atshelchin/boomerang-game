/**
 * 碰撞系统
 * 处理玩家、回旋镖、道具、墙体之间的碰撞
 * 使用 Matter.js 进行精确碰撞检测
 */

import { System, InputSystem, MatterPhysicsSystem } from 'you-engine';
import type { GameEntity, PlayerData, BoomerangData, PowerupData, WallData, FireTrailData } from '../entities/types';
import { EntityTags } from '../entities/types';
import { POWERUP_CONFIG } from '../config/GameConfig';
import { createRing, spawnParticles, createFloatingText, createParticle } from '../entities/factories';
import { POWERUP_COLORS, PLAYER_SKINS, GameSettings } from '../config/GameConfig';
import { i18n } from '../config/i18n';
import { GameState, Stats } from '../config/GameState';
import { DynamicCameraSystem } from './DynamicCameraSystem';

export class CollisionSystem extends System {
  static priority = 30;

  private input!: InputSystem;
  private physics!: MatterPhysicsSystem;
  private dynamicCamera!: DynamicCameraSystem;

  onCreate(): void {
    this.input = this.engine.system(InputSystem);
    this.physics = this.engine.system(MatterPhysicsSystem);
    this.dynamicCamera = this.engine.system(DynamicCameraSystem);
  }

  // Canvas 变换已自动处理缩放，不需要手动缩放
  setScale(_scale: number): void {
    // 保留接口兼容性，但不再使用
  }

  onUpdate(_dt: number): void {
    if (GameState.state !== 'fight' && GameState.state !== 'tutorial' && GameState.state !== 'ko') return;
    if (GameState.hitstop > 0) return;

    const players = this.engine.world.entities.filter(
      (e): e is GameEntity & { player: PlayerData } =>
        !!(e.tags?.values.includes(EntityTags.PLAYER)) && e.player !== undefined
    );

    const boomerangs = this.engine.world.entities.filter(
      (e): e is GameEntity & { boomerang: BoomerangData } =>
        !!(e.tags?.values.includes(EntityTags.BOOMERANG)) && e.boomerang !== undefined
    );

    const powerups = this.engine.world.entities.filter(
      (e): e is GameEntity & { powerup: PowerupData } =>
        !!(e.tags?.values.includes(EntityTags.POWERUP)) && e.powerup !== undefined
    );

    const walls = this.engine.world.entities.filter(
      (e): e is GameEntity & { wall: WallData } =>
        !!(e.tags?.values.includes(EntityTags.WALL)) && e.wall !== undefined
    );

    // 磁铁效果
    this.handleMagnetEffect(players, boomerangs);

    // 玩家之间碰撞（格斗游戏风格）
    this.handlePlayerPlayerCollisions(players);

    // 回旋镖和玩家碰撞
    this.handleBoomerangPlayerCollisions(boomerangs, players);

    // 回旋镖和墙体碰撞
    this.handleBoomerangWallCollisions(boomerangs, walls);

    // 玩家和墙体碰撞
    this.handlePlayerWallCollisions(players, walls);

    // 玩家和道具碰撞
    this.handlePowerupCollisions(players, powerups);

    // 火焰轨迹
    const fireTrails = this.engine.world.entities.filter(
      (e): e is GameEntity & { fireTrail: FireTrailData } =>
        !!(e.tags?.values.includes(EntityTags.FIRE_TRAIL)) && e.fireTrail !== undefined
    );

    // 玩家和火焰轨迹碰撞
    this.handleFireTrailCollisions(players, fireTrails);
  }

  private handlePlayerPlayerCollisions(
    players: Array<GameEntity & { player: PlayerData }>
  ): void {
    // 两个玩家之间的碰撞
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const p1 = players[i];
        const p2 = players[j];

        if (!p1.player.alive || !p2.player.alive) continue;
        if (!p1.transform || !p2.transform || !p1.velocity || !p2.velocity) continue;
        if (!p1.collider || !p2.collider) continue;

        const r1 = p1.collider.radius ?? 28;
        const r2 = p2.collider.radius ?? 28;

        const dx = p2.transform.x - p1.transform.x;
        const dy = p2.transform.y - p1.transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = r1 + r2;

        if (dist < minDist && dist > 0) {
          // 计算碰撞法线
          const nx = dx / dist;
          const ny = dy / dist;

          // 分离两个玩家（防止重叠）
          const overlap = minDist - dist;
          const separateX = nx * overlap * 0.5;
          const separateY = ny * overlap * 0.5;

          p1.transform.x -= separateX;
          p1.transform.y -= separateY;
          p2.transform.x += separateX;
          p2.transform.y += separateY;

          // 计算相对速度
          const dvx = p1.velocity.x - p2.velocity.x;
          const dvy = p1.velocity.y - p2.velocity.y;

          // 沿碰撞法线的相对速度
          const dvn = dvx * nx + dvy * ny;

          // 只处理相向运动的情况
          if (dvn > 0) {
            // 弹性碰撞系数（0.8 = 损失20%能量）
            const restitution = 0.8;

            // 计算冲量（假设两个玩家质量相同）
            const impulse = dvn * restitution;

            // 根据速度差计算额外的撞飞效果
            const speed1 = Math.sqrt(p1.velocity.x * p1.velocity.x + p1.velocity.y * p1.velocity.y);
            const speed2 = Math.sqrt(p2.velocity.x * p2.velocity.x + p2.velocity.y * p2.velocity.y);
            const totalSpeed = speed1 + speed2;

            // 冲刺状态加成
            const dashBoost1 = p1.player.dashing ? 1.5 : 1;
            const dashBoost2 = p2.player.dashing ? 1.5 : 1;

            // 根据速度比例分配冲量
            const ratio1 = totalSpeed > 0 ? speed2 / totalSpeed : 0.5;
            const ratio2 = totalSpeed > 0 ? speed1 / totalSpeed : 0.5;

            // 应用冲量
            p1.velocity.x -= nx * impulse * ratio1 * dashBoost2;
            p1.velocity.y -= ny * impulse * ratio1 * dashBoost2;
            p2.velocity.x += nx * impulse * ratio2 * dashBoost1;
            p2.velocity.y += ny * impulse * ratio2 * dashBoost1;

            // 如果一方在冲刺，给对方额外的撞飞效果
            if (p1.player.dashing && !p2.player.dashing) {
              const knockback = 8;
              p2.velocity.x += nx * knockback;
              p2.velocity.y += ny * knockback;
            } else if (p2.player.dashing && !p1.player.dashing) {
              const knockback = 8;
              p1.velocity.x -= nx * knockback;
              p1.velocity.y -= ny * knockback;
            }

            // 碰撞效果
            const collisionX = (p1.transform.x + p2.transform.x) / 2;
            const collisionY = (p1.transform.y + p2.transform.y) / 2;
            const intensity = Math.min(totalSpeed / 30, 1);

            // 粒子效果
            this.spawnParticleEffect(collisionX, collisionY, {
              spread: Math.PI * 2,
              speedMin: 3 + intensity * 5,
              speedMax: 8 + intensity * 10,
              colors: ['#fff', '#aaa', '#666'],
              sizeMin: 2,
              sizeMax: 5 + intensity * 3,
              count: Math.floor(8 + intensity * 12)
            });

            // 震动反馈
            if (!p1.player.isAI) {
              this.input.vibrate(p1.player.playerId, {
                strong: 0.3 + intensity * 0.4,
                weak: 0.4 + intensity * 0.4,
                duration: 40 + intensity * 40
              });
            }
            if (!p2.player.isAI) {
              this.input.vibrate(p2.player.playerId, {
                strong: 0.3 + intensity * 0.4,
                weak: 0.4 + intensity * 0.4,
                duration: 40 + intensity * 40
              });
            }

            // 发送碰撞事件
            this.engine.emit('player:collide', {
              player1: p1.player.playerId,
              player2: p2.player.playerId,
              x: collisionX,
              y: collisionY,
              intensity
            });
          }
        }
      }
    }
  }

  private handleMagnetEffect(
    players: Array<GameEntity & { player: PlayerData }>,
    boomerangs: Array<GameEntity & { boomerang: BoomerangData }>
  ): void {
    for (const player of players) {
      if (this.hasPowerup(player.player, 'magnet') && player.player.alive && player.transform) {
        for (const boomerang of boomerangs) {
          if (boomerang.boomerang.ownerId === player.player.playerId &&
              !boomerang.boomerang.returning &&
              boomerang.transform && boomerang.velocity) {
            const dx = player.transform.x - boomerang.transform.x;
            const dy = player.transform.y - boomerang.transform.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              boomerang.velocity.x += (dx / dist) * 0.8;
              boomerang.velocity.y += (dy / dist) * 0.8;
            }
          }
        }
      }
    }
  }

  private handleBoomerangPlayerCollisions(
    boomerangs: Array<GameEntity & { boomerang: BoomerangData }>,
    players: Array<GameEntity & { player: PlayerData }>
  ): void {
    for (let bi = boomerangs.length - 1; bi >= 0; bi--) {
      const boomerang = boomerangs[bi];
      if (!boomerang.transform || !boomerang.collider) continue;

      const bRadius = boomerang.collider.radius ?? 18;

      for (const player of players) {
        if (!player.player.alive || !player.transform || !player.collider) continue;

        const pRadius = player.collider.radius ?? 28;
        const dx = boomerang.transform.x - player.transform.x;
        const dy = boomerang.transform.y - player.transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bRadius + pRadius) {
          if (boomerang.boomerang.ownerId === player.player.playerId &&
              boomerang.boomerang.returning &&
              player.player.catchCooldown <= 0) {
            // 接住回旋镖
            this.catchBoomerang(player, boomerang);
            this.engine.despawn(boomerang);
            break;
          } else if (boomerang.boomerang.ownerId !== player.player.playerId ||
                     boomerang.boomerang.lifetime > 20) {
            // 检测护盾
            if (this.hasPowerup(player.player, 'shield') && player.player.shieldHits > 0) {
              this.shieldBlock(player, boomerang);
            } else {
              // 冰冻效果：不杀死玩家，而是冻结他们
              if (boomerang.boomerang.hasFreeze && !player.player.frozen) {
                this.freezePlayer(player, boomerang.boomerang.ownerId);
              } else {
                this.killPlayer(player, boomerang.boomerang.ownerId);
              }
            }
          }
        }
      }
    }
  }

  private handleBoomerangWallCollisions(
    boomerangs: Array<GameEntity & { boomerang: BoomerangData }>,
    walls: Array<GameEntity & { wall: WallData }>
  ): void {
    for (const boomerang of boomerangs) {
      if (!boomerang.transform || !boomerang.velocity) continue;

      // 穿透效果：跳过墙体碰撞
      if (boomerang.boomerang.canPenetrate) continue;

      for (const wall of walls) {
        if (!wall.transform || !wall.wall) continue;

        // 使用 Matter.js 进行精确碰撞检测
        const collision = this.physics.checkCircleShapeCollision(
          boomerang.transform.x,
          boomerang.transform.y,
          boomerang.collider?.radius ?? 18,
          {
            type: wall.wall.shapeType || 'rect',
            x: wall.transform.x,
            y: wall.transform.y,
            width: wall.wall.width,
            height: wall.wall.height,
            radius: wall.wall.radius,
            vertices: wall.wall.vertices,
          }
        );

        if (collision) {
          boomerang.transform.x += collision.normal.x * collision.depth;
          boomerang.transform.y += collision.normal.y * collision.depth;

          // 根据碰撞法线反弹
          const dot = boomerang.velocity.x * collision.normal.x + boomerang.velocity.y * collision.normal.y;
          boomerang.velocity.x -= 2 * dot * collision.normal.x;
          boomerang.velocity.y -= 2 * dot * collision.normal.y;

          boomerang.boomerang.bounces++;
          if (boomerang.boomerang.bounces >= boomerang.boomerang.maxBounces &&
              !boomerang.boomerang.returning) {
            boomerang.boomerang.returning = true;
          }

          this.engine.emit('boomerang:bounce', { x: boomerang.transform.x, y: boomerang.transform.y });
        }
      }
    }
  }

  private handlePlayerWallCollisions(
    players: Array<GameEntity & { player: PlayerData }>,
    walls: Array<GameEntity & { wall: WallData }>
  ): void {
    for (const player of players) {
      if (!player.player.alive || !player.transform || !player.velocity) continue;

      for (const wall of walls) {
        if (!wall.transform || !wall.wall) continue;

        // 使用 Matter.js 进行精确碰撞检测
        const collision = this.physics.checkCircleShapeCollision(
          player.transform.x,
          player.transform.y,
          player.collider?.radius ?? 28,
          {
            type: wall.wall.shapeType || 'rect',
            x: wall.transform.x,
            y: wall.transform.y,
            width: wall.wall.width,
            height: wall.wall.height,
            radius: wall.wall.radius,
            vertices: wall.wall.vertices,
          }
        );

        if (collision) {
          player.transform.x += collision.normal.x * collision.depth;
          player.transform.y += collision.normal.y * collision.depth;
          // 碰撞后减速
          if (Math.abs(collision.normal.x) > 0.5) player.velocity.x *= -0.5;
          if (Math.abs(collision.normal.y) > 0.5) player.velocity.y *= -0.5;
        }
      }
    }
  }

  private handlePowerupCollisions(
    players: Array<GameEntity & { player: PlayerData }>,
    powerups: Array<GameEntity & { powerup: PowerupData }>
  ): void {
    for (let i = powerups.length - 1; i >= 0; i--) {
      const powerup = powerups[i];
      if (!powerup.transform || !powerup.collider) continue;

      const puRadius = powerup.collider.radius ?? 20;

      for (const player of players) {
        if (!player.player.alive || !player.transform || !player.collider) continue;

        const pRadius = player.collider.radius ?? 28;
        const dx = powerup.transform.x - player.transform.x;
        const dy = powerup.transform.y - player.transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < puRadius + pRadius) {
          this.collectPowerup(player, powerup);
          this.engine.despawn(powerup);
          break;
        }
      }
    }
  }

  // checkCircleRectCollision 已移除，使用 Matter.js physics.checkCircleShapeCollision 代替

  private hasPowerup(player: PlayerData, type: string): boolean {
    return player.powerups.some(p => p.type === type);
  }

  private catchBoomerang(
    player: GameEntity & { player: PlayerData },
    _boomerang: GameEntity & { boomerang: BoomerangData }
  ): void {
    player.player.hasBoomerang = true;

    // 粒子效果
    const skin = PLAYER_SKINS[player.player.playerId === 0 ? GameSettings.p1Skin : GameSettings.p2Skin];
    if (player.transform) {
      this.spawnParticleEffect(player.transform.x, player.transform.y, {
        spread: Math.PI * 2,
        speedMin: 2,
        speedMax: 6,
        colors: [skin.color1, skin.color2],
        sizeMin: 3,
        sizeMax: 6,
        count: 8
      });
    }

    if (!player.player.isAI) {
      this.input.vibrate(player.player.playerId, { strong: 0.3, weak: 0.4, duration: 30 });
    }

    this.engine.emit('player:catch', { playerId: player.player.playerId });
  }

  private shieldBlock(
    player: GameEntity & { player: PlayerData },
    boomerang: GameEntity & { boomerang: BoomerangData }
  ): void {
    player.player.shieldHits--;
    if (player.player.shieldHits <= 0) {
      const idx = player.player.powerups.findIndex(p => p.type === 'shield');
      if (idx >= 0) player.player.powerups.splice(idx, 1);
    }

    // 反弹回旋镖
    if (boomerang.velocity) {
      boomerang.velocity.x *= -1.2;
      boomerang.velocity.y *= -1.2;
    }
    boomerang.boomerang.returning = false;
    boomerang.boomerang.returnTimer = 0;

    // 粒子效果
    if (player.transform) {
      this.spawnParticleEffect(player.transform.x, player.transform.y, {
        spread: Math.PI * 2,
        speedMin: 3,
        speedMax: 8,
        colors: ['#0f0', '#fff'],
        sizeMin: 3,
        sizeMax: 6,
        count: 10
      });
    }

    this.engine.emit('boomerang:bounce', { x: player.transform?.x ?? 0, y: player.transform?.y ?? 0 });
  }

  private killPlayer(
    victim: GameEntity & { player: PlayerData },
    killerId: number
  ): void {
    victim.player.alive = false;

    // 记录击杀
    const isSelfKill = killerId === victim.player.playerId;
    const actualKillerId = isSelfKill ? -1 : killerId; // -1 表示自杀
    Stats.recordKill(isSelfKill ? -1 : killerId, victim.player.playerId);

    // 更新多人模式得分系统
    GameState.playerDied(victim.player.playerId, killerId);

    // 获取皮肤（使用多人模式配置）
    const killerSkinIndex = GameSettings.players?.[killerId]?.skinIndex ?? killerId % PLAYER_SKINS.length;
    const victimSkinIndex = victim.player.skinIndex ?? victim.player.playerId % PLAYER_SKINS.length;
    const killerSkin = PLAYER_SKINS[killerSkinIndex];
    const deathSkin = PLAYER_SKINS[victimSkinIndex];

    // 击杀环
    if (victim.transform) {
      const ring = createRing(victim.transform.x, victim.transform.y, killerSkin.color1, 200);
      this.engine.spawn(ring);

      // 死亡粒子
      this.spawnParticleEffect(victim.transform.x, victim.transform.y, {
        spread: Math.PI * 2,
        speedMin: 3,
        speedMax: 25,
        colors: [deathSkin.color1, deathSkin.color2, '#fff'],
        sizeMin: 3,
        sizeMax: 15,
        count: 80
      });

      // 碎片粒子
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const debris = createParticle(
          victim.transform.x,
          victim.transform.y,
          Math.cos(angle) * 12,
          Math.sin(angle) * 12,
          { size: 8, color: deathSkin.color1, life: 50, isDebris: true }
        );
        this.engine.spawn(debris);
      }
    }

    // 震动反馈
    if (!victim.player.isAI && victim.player.gamepadIndex >= 0) {
      this.input.vibrate(victim.player.gamepadIndex, { strong: 1, weak: 1, duration: 500 });
    }
    const killerPlayer = (this.engine.world.entities as GameEntity[]).find(
      (e): e is GameEntity & { player: PlayerData } =>
        !!(e.tags?.values.includes(EntityTags.PLAYER)) &&
        e.player !== undefined &&
        e.player.playerId === killerId
    );
    if (killerPlayer && !killerPlayer.player.isAI && killerPlayer.player.gamepadIndex >= 0) {
      this.input.vibrate(killerPlayer.player.gamepadIndex, { strong: 1, weak: 1, duration: 300 });
    }

    // 短暂慢动作表示击杀
    GameState.slowmo = 0.3;
    setTimeout(() => { GameState.slowmo = 1; }, 200);

    this.engine.emit('player:death', {
      victimId: victim.player.playerId,
      killerId: actualKillerId,
      x: victim.transform?.x ?? 0,
      y: victim.transform?.y ?? 0
    });

    // 触发摄像机击杀特写
    if (victim.transform) {
      this.dynamicCamera.triggerKillFocus(victim.transform.x, victim.transform.y);
    }

    // 检查回合是否结束（多人模式：只剩一人或一队）
    this.checkRoundEnd();
  }

  /** 检查回合是否结束 */
  private checkRoundEnd(): void {
    // 获取所有存活玩家
    const alivePlayers = (this.engine.world.entities as GameEntity[]).filter(
      (e): e is GameEntity & { player: PlayerData } =>
        !!(e.tags?.values.includes(EntityTags.PLAYER)) &&
        e.player !== undefined &&
        e.player.alive
    );

    if (alivePlayers.length <= 1) {
      // 只剩一个人或没人
      if (alivePlayers.length === 1) {
        const winner = alivePlayers[0];
        this.triggerRoundEnd(winner.player.playerId, winner);
      } else {
        // 所有人都死了（同时死亡），平局
        this.triggerRoundEnd(-1, null);
      }
      return;
    }

    // 检查队伍模式
    const players = GameSettings.players || [];
    const teamMode = players.some(p => p.teamIndex >= 0);

    if (teamMode) {
      // 收集存活队伍
      const aliveTeams = new Set<number>();
      let soloAlive = 0;

      for (const p of alivePlayers) {
        const config = players[p.player.playerId];
        if (config && config.teamIndex >= 0) {
          aliveTeams.add(config.teamIndex);
        } else {
          soloAlive++;
        }
      }

      // 计算存活阵营数（队伍 + Solo 玩家）
      const totalFactions = aliveTeams.size + soloAlive;

      if (totalFactions <= 1) {
        // 只剩一个阵营
        if (aliveTeams.size === 1) {
          // 某个队伍获胜
          const winningTeam = [...aliveTeams][0];
          const teamMember = alivePlayers.find(p => {
            const config = players[p.player.playerId];
            return config && config.teamIndex === winningTeam;
          });
          if (teamMember) {
            GameState.roundWinnerTeam = winningTeam;
            this.triggerRoundEnd(teamMember.player.playerId, teamMember);
          }
        } else if (soloAlive === 1) {
          // Solo 玩家获胜
          const winner = alivePlayers.find(p => {
            const config = players[p.player.playerId];
            return !config || config.teamIndex < 0;
          });
          if (winner) {
            this.triggerRoundEnd(winner.player.playerId, winner);
          }
        }
      }
    }
  }

  /** 触发回合结束 */
  private triggerRoundEnd(winnerId: number, winnerEntity: (GameEntity & { player: PlayerData }) | null): void {
    // 设置回合胜者
    if (winnerId >= 0) {
      GameState.endRound(winnerId);
    }

    GameState.state = 'ko';
    GameState.stateTimer = 120; // 2秒展示时间

    // 慢动作效果
    GameState.slowmo = 0.1;

    // 放大获胜者
    if (winnerEntity && winnerEntity.transform) {
      GameState.zoomTarget = 1.3;
      // 摄像机聚焦获胜者（可选）
    }

    // 逐渐恢复
    setTimeout(() => { GameState.slowmo = 0.3; }, 500);
    setTimeout(() => { GameState.slowmo = 0.5; }, 1000);
    setTimeout(() => {
      GameState.slowmo = 1;
      GameState.zoomTarget = 1;
      // 切换到回合结束展示
      GameState.state = 'roundEnd';
      GameState.stateTimer = 180; // 3秒展示得分
    }, 1500);
  }

  private collectPowerup(
    player: GameEntity & { player: PlayerData },
    powerup: GameEntity & { powerup: PowerupData }
  ): void {
    const type = powerup.powerup.type;
    player.player.powerups.push({ type, timer: 600 });
    if (type === 'shield') player.player.shieldHits = 3;
    Stats.recordPowerup(player.player.playerId);

    // 浮动文字
    if (powerup.transform) {
      const floatText = createFloatingText(
        powerup.transform.x,
        powerup.transform.y,
        i18n.t.powerups[type as keyof typeof i18n.t.powerups] || type,
        POWERUP_COLORS[type]
      );
      this.engine.spawn(floatText);

      // 粒子
      this.spawnParticleEffect(powerup.transform.x, powerup.transform.y, {
        spread: Math.PI * 2,
        speedMin: 5,
        speedMax: 15,
        colors: [POWERUP_COLORS[type], '#fff', '#fff'],
        sizeMin: 4,
        sizeMax: 12,
        count: 25
      });

      // 冲击环
      const ring = createRing(powerup.transform.x, powerup.transform.y, POWERUP_COLORS[type], 120);
      this.engine.spawn(ring);
    }

    // 震动
    if (!player.player.isAI) {
      this.input.vibrate(player.player.playerId, { strong: 0.6, weak: 0.8, duration: 80 });
    }

    this.engine.emit('powerup:collect', {
      playerId: player.player.playerId,
      type,
      x: powerup.transform?.x ?? 0,
      y: powerup.transform?.y ?? 0
    });
  }

  private spawnParticleEffect(x: number, y: number, config: {
    angle?: number;
    spread?: number;
    speedMin: number;
    speedMax: number;
    colors: string[];
    sizeMin: number;
    sizeMax: number;
    count: number;
  }): void {
    const particles = spawnParticles(x, y, config.count, {
      angle: config.angle,
      spread: config.spread,
      speedMin: config.speedMin,
      speedMax: config.speedMax,
      colors: config.colors,
      sizeMin: config.sizeMin,
      sizeMax: config.sizeMax
    });

    for (const p of particles) {
      this.engine.spawn(p);
    }
  }

  /** 冻结玩家 */
  private freezePlayer(
    victim: GameEntity & { player: PlayerData },
    freezerId: number
  ): void {
    victim.player.frozen = true;
    victim.player.frozenTimer = POWERUP_CONFIG.freezeDuration;

    // 停止移动
    if (victim.velocity) {
      victim.velocity.x = 0;
      victim.velocity.y = 0;
    }

    // 冰冻粒子效果
    if (victim.transform) {
      this.spawnParticleEffect(victim.transform.x, victim.transform.y, {
        spread: Math.PI * 2,
        speedMin: 2,
        speedMax: 8,
        colors: ['#88f', '#aaf', '#fff', '#ccf'],
        sizeMin: 3,
        sizeMax: 8,
        count: 20
      });

      // 冰冻环
      const ring = createRing(victim.transform.x, victim.transform.y, '#88f', 100);
      this.engine.spawn(ring);

      // 浮动文字
      const floatText = createFloatingText(
        victim.transform.x,
        victim.transform.y - 30,
        i18n.t.powerups.freeze,
        '#88f'
      );
      this.engine.spawn(floatText);
    }

    // 震动反馈
    if (!victim.player.isAI) {
      this.input.vibrate(victim.player.playerId, { strong: 0.5, weak: 0.6, duration: 100 });
    }

    this.engine.emit('player:freeze', {
      victimId: victim.player.playerId,
      freezerId,
      x: victim.transform?.x ?? 0,
      y: victim.transform?.y ?? 0
    });
  }

  /** 处理火焰轨迹碰撞 */
  private handleFireTrailCollisions(
    players: Array<GameEntity & { player: PlayerData }>,
    fireTrails: Array<GameEntity & { fireTrail: FireTrailData }>
  ): void {
    for (const fireTrail of fireTrails) {
      if (!fireTrail.transform || !fireTrail.collider || !fireTrail.fireTrail.damage) continue;

      const fRadius = fireTrail.collider.radius ?? 15;

      for (const player of players) {
        if (!player.player.alive || !player.transform || !player.collider) continue;
        // 火焰不伤害自己
        if (player.player.playerId === fireTrail.fireTrail.ownerId) continue;
        // 已经在燃烧的玩家不重复触发
        if (player.player.burning) continue;

        const pRadius = player.collider.radius ?? 28;
        const dx = fireTrail.transform.x - player.transform.x;
        const dy = fireTrail.transform.y - player.transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < fRadius + pRadius) {
          this.burnPlayer(player, fireTrail.fireTrail.ownerId);
        }
      }
    }
  }

  /** 燃烧玩家 */
  private burnPlayer(
    victim: GameEntity & { player: PlayerData },
    burnerId: number
  ): void {
    victim.player.burning = true;
    victim.player.burnTimer = POWERUP_CONFIG.burnDuration;

    // 燃烧粒子效果
    if (victim.transform) {
      this.spawnParticleEffect(victim.transform.x, victim.transform.y, {
        spread: Math.PI * 2,
        speedMin: 3,
        speedMax: 10,
        colors: ['#f44', '#f80', '#ff0', '#fff'],
        sizeMin: 3,
        sizeMax: 8,
        count: 15
      });

      // 浮动文字
      const floatText = createFloatingText(
        victim.transform.x,
        victim.transform.y - 30,
        i18n.t.powerups.fire,
        '#f44'
      );
      this.engine.spawn(floatText);
    }

    // 震动反馈
    if (!victim.player.isAI) {
      this.input.vibrate(victim.player.playerId, { strong: 0.4, weak: 0.5, duration: 80 });
    }

    this.engine.emit('player:burn', {
      victimId: victim.player.playerId,
      burnerId,
      x: victim.transform?.x ?? 0,
      y: victim.transform?.y ?? 0
    });
  }
}
