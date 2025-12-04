/**
 * 回旋镖系统
 * 处理回旋镖移动、返回、反弹逻辑
 */

import { System } from 'you-engine';
import type { GameEntity, BoomerangData, PlayerData, FireTrailData, IceTrailData } from '../entities/types';
import { EntityTags } from '../entities/types';
import { createTrail, spawnParticles, createFireTrail, createIceTrail } from '../entities/factories';
import { BOOMERANG_CONFIG, PLAYER_SKINS, GameSettings } from '../config/GameConfig';
import { GameState } from '../config/GameState';

export class BoomerangSystem extends System {
  static priority = 20;

  // Canvas 变换已自动处理缩放，不需要手动缩放
  setScale(_scale: number): void {
    // 保留接口兼容性，但不再使用
  }

  onUpdate(_dt: number): void {
    if (GameState.state !== 'fight' && GameState.state !== 'tutorial' && GameState.state !== 'ko') return;
    if (GameState.hitstop > 0) return;

    const boomerangs = this.engine.world.entities.filter(
      (e): e is GameEntity & { boomerang: BoomerangData } =>
        !!(e.tags?.values.includes(EntityTags.BOOMERANG)) && e.boomerang !== undefined
    );

    const players = this.engine.world.entities.filter(
      (e): e is GameEntity & { player: PlayerData } =>
        !!(e.tags?.values.includes(EntityTags.PLAYER)) && e.player !== undefined
    );

    const fireTrails = this.engine.world.entities.filter(
      (e): e is GameEntity & { fireTrail: FireTrailData } =>
        !!(e.tags?.values.includes(EntityTags.FIRE_TRAIL)) && e.fireTrail !== undefined
    );

    const iceTrails = this.engine.world.entities.filter(
      (e): e is GameEntity & { iceTrail: IceTrailData } =>
        !!(e.tags?.values.includes(EntityTags.ICE_TRAIL)) && e.iceTrail !== undefined
    );

    for (const boomerang of boomerangs) {
      this.updateBoomerang(boomerang, players);
    }

    // 更新火焰轨迹
    this.updateFireTrails(fireTrails);

    // 更新冰冻轨迹
    this.updateIceTrails(iceTrails);

    // 清理超时的回旋镖
    this.cleanupBoomerangs(boomerangs, players);
  }

  private updateBoomerang(
    entity: GameEntity & { boomerang: BoomerangData },
    players: Array<GameEntity & { player: PlayerData }>
  ): void {
    const { boomerang, transform, velocity } = entity;
    if (!transform || !velocity) return;

    boomerang.lifetime++;
    boomerang.rotation += 0.4;
    boomerang.trailTimer++;

    // 回旋镖物理
    if (!boomerang.returning) {
      // 飞出去时减速（延长射程时减速更慢）
      const slowdownRate = boomerang.extendedRange ? 0.995 : BOOMERANG_CONFIG.slowdownRate;
      velocity.x *= slowdownRate;
      velocity.y *= slowdownRate;

      boomerang.returnTimer++;
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

      // 速度太慢或时间到了就返回（延长射程时返回时间更长）
      const maxReturnTime = boomerang.extendedRange ? boomerang.maxReturnTime * 1.8 : boomerang.maxReturnTime;
      const minSpeed = boomerang.extendedRange ? 5 : 8;
      if (speed < minSpeed || boomerang.returnTimer > maxReturnTime) {
        boomerang.returning = true;
      }
    } else {
      // 返回时追踪主人
      const owner = players.find(p => p.player.playerId === boomerang.ownerId);
      if (owner && owner.player.alive && owner.transform) {
        const dx = owner.transform.x - transform.x;
        const dy = owner.transform.y - transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const returnSpeed = BOOMERANG_CONFIG.returnSpeed;

        if (dist > 0) {
          const targetVx = (dx / dist) * returnSpeed;
          const targetVy = (dy / dist) * returnSpeed;
          velocity.x += (targetVx - velocity.x) * BOOMERANG_CONFIG.turnRate;
          velocity.y += (targetVy - velocity.y) * BOOMERANG_CONFIG.turnRate;
        }
      }
    }

    // 移动
    transform.x += velocity.x * GameState.slowmo;
    transform.y += velocity.y * GameState.slowmo;

    // 留轨迹
    if (boomerang.trailTimer % 2 === 0) {
      const skin = PLAYER_SKINS[boomerang.ownerId === 0 ? GameSettings.p1Skin : GameSettings.p2Skin];
      const radius = boomerang.isBig ? BOOMERANG_CONFIG.bigRadius : BOOMERANG_CONFIG.radius;

      // 火焰道具：留下火焰轨迹
      if (boomerang.hasFire) {
        this.spawnTrail(transform.x, transform.y, radius * 0.7, '#f44', 0.7);
        // 每隔一段距离留下火焰区域
        if (boomerang.trailTimer % 8 === 0) {
          const fireTrail = createFireTrail(transform.x, transform.y, boomerang.ownerId);
          this.engine.spawn(fireTrail);
        }
      } else if (boomerang.hasFreeze) {
        // 冰冻道具：留下冰冻轨迹
        this.spawnTrail(transform.x, transform.y, radius * 0.7, '#88f', 0.7);
        // 每隔一段距离留下冰冻区域
        if (boomerang.trailTimer % 8 === 0) {
          const iceTrail = createIceTrail(transform.x, transform.y, boomerang.ownerId);
          this.engine.spawn(iceTrail);
        }
      } else {
        this.spawnTrail(transform.x, transform.y, radius * 0.7, skin.color1, 0.5);
      }
    }

    // 边界反弹（与玩家边界 margin=60 保持一致）
    const margin = 60;
    const W = this.engine.width;
    const H = this.engine.height;

    if (transform.x < margin) { transform.x = margin; velocity.x = Math.abs(velocity.x); this.bounce(entity); }
    if (transform.x > W - margin) { transform.x = W - margin; velocity.x = -Math.abs(velocity.x); this.bounce(entity); }
    if (transform.y < margin) { transform.y = margin; velocity.y = Math.abs(velocity.y); this.bounce(entity); }
    if (transform.y > H - margin) { transform.y = H - margin; velocity.y = -Math.abs(velocity.y); this.bounce(entity); }

    // 障碍物碰撞 (handled by collision system)
  }

  private bounce(entity: GameEntity & { boomerang: BoomerangData }): void {
    const { boomerang, transform } = entity;
    if (!transform) return;

    boomerang.bounces++;

    // 粒子
    this.spawnParticleEffect(transform.x, transform.y, {
      spread: Math.PI * 2,
      speedMin: 2,
      speedMax: 5,
      colors: ['#fff', '#aaa'],
      sizeMin: 2,
      sizeMax: 4,
      count: 5
    });

    // 反弹太多次就强制返回
    if (boomerang.bounces >= boomerang.maxBounces && !boomerang.returning) {
      boomerang.returning = true;
    }

    this.engine.emit('boomerang:bounce', { x: transform.x, y: transform.y });
  }

  private updateFireTrails(
    fireTrails: Array<GameEntity & { fireTrail: FireTrailData }>
  ): void {
    for (const trail of fireTrails) {
      trail.fireTrail.life--;

      // 生命周期结束时移除
      if (trail.fireTrail.life <= 0) {
        this.engine.despawn(trail);
        continue;
      }

      // 火焰粒子效果
      if (trail.fireTrail.life % 10 === 0 && trail.transform) {
        const particles = spawnParticles(trail.transform.x, trail.transform.y, 2, {
          spread: Math.PI * 2,
          speedMin: 0.5,
          speedMax: 2,
          colors: ['#f44', '#f80', '#ff0'],
          sizeMin: 2,
          sizeMax: 5,
        });
        for (const p of particles) {
          this.engine.spawn(p);
        }
      }
    }
  }

  private updateIceTrails(
    iceTrails: Array<GameEntity & { iceTrail: IceTrailData }>
  ): void {
    for (const trail of iceTrails) {
      trail.iceTrail.life--;

      // 生命周期结束时移除
      if (trail.iceTrail.life <= 0) {
        this.engine.despawn(trail);
        continue;
      }

      // 冰冻粒子效果
      if (trail.iceTrail.life % 15 === 0 && trail.transform) {
        const particles = spawnParticles(trail.transform.x, trail.transform.y, 1, {
          spread: Math.PI * 2,
          speedMin: 0.3,
          speedMax: 1.5,
          colors: ['#88f', '#aaf', '#fff'],
          sizeMin: 2,
          sizeMax: 4,
        });
        for (const p of particles) {
          this.engine.spawn(p);
        }
      }
    }
  }

  private cleanupBoomerangs(
    boomerangs: Array<GameEntity & { boomerang: BoomerangData }>,
    players: Array<GameEntity & { player: PlayerData }>
  ): void {
    for (const entity of boomerangs) {
      if (entity.boomerang.lifetime > BOOMERANG_CONFIG.maxLifetime) {
        // 超时返还给主人
        const owner = players.find(p => p.player.playerId === entity.boomerang.ownerId);
        if (owner && owner.player.alive && !owner.player.hasBoomerang) {
          owner.player.hasBoomerang = true;
        }
        this.engine.despawn(entity);
      }
    }
  }

  private spawnTrail(x: number, y: number, radius: number, color: string, alpha: number): void {
    const trail = createTrail(x, y, radius, color, alpha);
    this.engine.spawn(trail);
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
}
