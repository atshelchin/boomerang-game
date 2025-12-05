/**
 * 地形系统
 * 处理冰面、水面、传送门、滚石、毒圈等地形机关
 */

import { System } from 'you-engine';
import { DESIGN_HEIGHT, DESIGN_WIDTH, PLAYER_CONFIG } from '../config/GameConfig';
import { GameState } from '../config/GameState';
import { createRollingBoulder, spawnParticles } from '../entities/factories';
import type {
  BoulderData,
  GameEntity,
  PlayerData,
  PoisonZoneData,
  PortalData,
  TerrainData,
} from '../entities/types';
import { EntityTags } from '../entities/types';

export class TerrainSystem extends System {
  static priority = 15;

  // 玩家在冰面上的状态
  private playerOnIce: Map<number, boolean> = new Map();
  // 传送门冷却
  private portalCooldowns: Map<number, number> = new Map();
  // 毒圈伤害计时器
  private poisonDamageTimers: Map<number, number> = new Map();

  onUpdate(_dt: number): void {
    if (GameState.state !== 'fight' && GameState.state !== 'tutorial') return;
    if (GameState.hitstop > 0) return;

    const players = this.engine.world.entities.filter(
      (e): e is GameEntity & { player: PlayerData } =>
        !!e.tags?.values.includes(EntityTags.PLAYER) && e.player !== undefined
    );

    const terrains = this.engine.world.entities.filter(
      (e): e is GameEntity & { terrain: TerrainData } =>
        !!e.tags?.values.includes(EntityTags.TERRAIN) && e.terrain !== undefined
    );

    const portals = this.engine.world.entities.filter(
      (e): e is GameEntity & { portal: PortalData } =>
        !!e.tags?.values.includes(EntityTags.PORTAL) && e.portal !== undefined
    );

    const boulders = this.engine.world.entities.filter(
      (e): e is GameEntity & { boulder: BoulderData } =>
        !!e.tags?.values.includes(EntityTags.BOULDER) && e.boulder !== undefined
    );

    const poisonZones = this.engine.world.entities.filter(
      (e): e is GameEntity & { poisonZone: PoisonZoneData } =>
        !!e.tags?.values.includes(EntityTags.POISON_ZONE) && e.poisonZone !== undefined
    );

    // 处理地形效果
    this.handleTerrainEffects(players, terrains);

    // 处理传送门
    this.handlePortals(players, portals);

    // 更新传送门动画
    this.updatePortalAnimations(portals);

    // 处理滚石
    this.handleBoulders(players, boulders);

    // 处理毒圈
    this.handlePoisonZones(players, poisonZones);
  }

  private handleTerrainEffects(
    players: Array<GameEntity & { player: PlayerData }>,
    terrains: Array<GameEntity & { terrain: TerrainData }>
  ): void {
    for (const player of players) {
      if (!player.player.alive || !player.transform) continue;

      let onIce = false;
      let inWater = false;

      for (const terrain of terrains) {
        if (!terrain.transform || !terrain.terrain) continue;

        const t = terrain.terrain;
        const halfW = t.width / 2;
        const halfH = t.height / 2;
        const tx = terrain.transform.x;
        const ty = terrain.transform.y;

        // 检查玩家是否在地形区域内
        if (
          player.transform.x > tx - halfW &&
          player.transform.x < tx + halfW &&
          player.transform.y > ty - halfH &&
          player.transform.y < ty + halfH
        ) {
          if (t.type === 'ice') {
            onIce = true;
          } else if (t.type === 'water') {
            inWater = true;
          }
        }
      }

      // 冰面效果：降低摩擦力
      this.playerOnIce.set(player.player.playerId, onIce);

      // 水面效果：死亡
      if (inWater && player.player.alive) {
        this.killPlayerInWater(player);
      }
    }
  }

  /** 检查玩家是否在冰面上（供 PlayerSystem 调用） */
  isPlayerOnIce(playerId: number): boolean {
    return this.playerOnIce.get(playerId) ?? false;
  }

  private killPlayerInWater(player: GameEntity & { player: PlayerData }): void {
    if (!player.transform) return;

    player.player.alive = false;

    // 水花粒子效果
    const particles = spawnParticles(player.transform.x, player.transform.y, 20, {
      spread: Math.PI * 2,
      speedMin: 3,
      speedMax: 8,
      colors: ['#4fc3f7', '#29b6f6', '#03a9f4', '#fff'],
      sizeMin: 4,
      sizeMax: 8,
    });
    for (const p of particles) {
      this.engine.spawn(p);
    }

    this.engine.emit('player:death', {
      victimId: player.player.playerId,
      killerId: -1, // 环境击杀
      x: player.transform.x,
      y: player.transform.y,
    });
  }

  private handlePortals(
    players: Array<GameEntity & { player: PlayerData }>,
    portals: Array<GameEntity & { portal: PortalData }>
  ): void {
    // 更新冷却
    for (const [playerId, cooldown] of this.portalCooldowns) {
      if (cooldown > 0) {
        this.portalCooldowns.set(playerId, cooldown - 1);
      }
    }

    for (const player of players) {
      if (!player.player.alive || !player.transform) continue;

      // 检查冷却
      const cooldown = this.portalCooldowns.get(player.player.playerId) ?? 0;
      if (cooldown > 0) continue;

      for (const portal of portals) {
        if (!portal.transform || !portal.portal) continue;

        const dx = player.transform.x - portal.transform.x;
        const dy = player.transform.y - portal.transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < portal.portal.radius + PLAYER_CONFIG.radius * 0.5) {
          // 找到链接的传送门
          const linkedPortal = portals.find((p) => p.portal?.id === portal.portal.linkedPortalId);
          if (linkedPortal?.transform) {
            // 传送玩家
            player.transform.x = linkedPortal.transform.x;
            player.transform.y = linkedPortal.transform.y;

            // 设置冷却防止连续传送
            this.portalCooldowns.set(player.player.playerId, 60);

            // 传送特效
            this.spawnPortalEffect(portal.transform.x, portal.transform.y, portal.portal.color);
            this.spawnPortalEffect(
              linkedPortal.transform.x,
              linkedPortal.transform.y,
              linkedPortal.portal?.color ?? '#a855f7'
            );

            this.engine.emit('portal:teleport', {
              playerId: player.player.playerId,
              fromX: portal.transform.x,
              fromY: portal.transform.y,
              toX: linkedPortal.transform.x,
              toY: linkedPortal.transform.y,
            });

            break;
          }
        }
      }
    }
  }

  private updatePortalAnimations(portals: Array<GameEntity & { portal: PortalData }>): void {
    for (const portal of portals) {
      if (portal.portal) {
        portal.portal.rotation += 0.05;
      }
    }
  }

  private spawnPortalEffect(x: number, y: number, color: string): void {
    const particles = spawnParticles(x, y, 15, {
      spread: Math.PI * 2,
      speedMin: 2,
      speedMax: 6,
      colors: [color, '#fff', color],
      sizeMin: 3,
      sizeMax: 6,
    });
    for (const p of particles) {
      this.engine.spawn(p);
    }
  }

  private handleBoulders(
    players: Array<GameEntity & { player: PlayerData }>,
    boulders: Array<GameEntity & { boulder: BoulderData }>
  ): void {
    for (const boulder of boulders) {
      if (!boulder.boulder || !boulder.transform) continue;

      if (boulder.boulder.active) {
        // 活动的滚石：移动并检查碰撞
        if (boulder.velocity) {
          boulder.transform.x += boulder.velocity.x;
          boulder.transform.y += boulder.velocity.y;
        }

        // 检查与玩家碰撞
        for (const player of players) {
          if (!player.player.alive || !player.transform) continue;

          const dx = player.transform.x - boulder.transform.x;
          const dy = player.transform.y - boulder.transform.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < boulder.boulder.radius + PLAYER_CONFIG.radius) {
            this.killPlayerByBoulder(player, boulder);
          }
        }

        // 检查是否超出边界
        const margin = 100;
        if (
          boulder.transform.x < -margin ||
          boulder.transform.x > DESIGN_WIDTH + margin ||
          boulder.transform.y < -margin ||
          boulder.transform.y > DESIGN_HEIGHT + margin
        ) {
          this.engine.despawn(boulder);
        }
      } else {
        // 发射器：定时生成滚石
        boulder.boulder.spawnTimer--;
        if (boulder.boulder.spawnTimer <= 0) {
          boulder.boulder.spawnTimer = boulder.boulder.spawnInterval;

          const newBoulder = createRollingBoulder(
            boulder.transform.x,
            boulder.transform.y,
            boulder.boulder.direction.x * boulder.boulder.speed,
            boulder.boulder.direction.y * boulder.boulder.speed,
            boulder.boulder.radius
          );
          this.engine.spawn(newBoulder);

          // 发射特效
          this.spawnBoulderSpawnEffect(boulder.transform.x, boulder.transform.y);
        }
      }
    }
  }

  private killPlayerByBoulder(
    player: GameEntity & { player: PlayerData },
    _boulder: GameEntity & { boulder: BoulderData }
  ): void {
    if (!player.transform) return;

    player.player.alive = false;

    // 碎石粒子效果
    const particles = spawnParticles(player.transform.x, player.transform.y, 25, {
      spread: Math.PI * 2,
      speedMin: 4,
      speedMax: 10,
      colors: ['#8b7355', '#a0926c', '#6b5344', '#fff'],
      sizeMin: 5,
      sizeMax: 10,
    });
    for (const p of particles) {
      this.engine.spawn(p);
    }

    this.engine.emit('player:death', {
      victimId: player.player.playerId,
      killerId: -2, // 滚石击杀
      x: player.transform.x,
      y: player.transform.y,
    });

    // 滚石继续滚动，不消失
  }

  private spawnBoulderSpawnEffect(x: number, y: number): void {
    const particles = spawnParticles(x, y, 8, {
      spread: Math.PI * 2,
      speedMin: 1,
      speedMax: 3,
      colors: ['#8b7355', '#a0926c'],
      sizeMin: 3,
      sizeMax: 5,
    });
    for (const p of particles) {
      this.engine.spawn(p);
    }
  }

  private handlePoisonZones(
    players: Array<GameEntity & { player: PlayerData }>,
    poisonZones: Array<GameEntity & { poisonZone: PoisonZoneData }>
  ): void {
    for (const zone of poisonZones) {
      if (!zone.poisonZone) continue;

      // 缩圈
      if (zone.poisonZone.currentRadius > zone.poisonZone.targetRadius) {
        zone.poisonZone.currentRadius -= zone.poisonZone.shrinkSpeed;
        if (zone.poisonZone.currentRadius < zone.poisonZone.targetRadius) {
          zone.poisonZone.currentRadius = zone.poisonZone.targetRadius;
        }
      }

      // 检查玩家是否在毒圈外
      for (const player of players) {
        if (!player.player.alive || !player.transform) continue;

        const dx = player.transform.x - zone.poisonZone.centerX;
        const dy = player.transform.y - zone.poisonZone.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > zone.poisonZone.currentRadius) {
          // 玩家在毒圈外，造成伤害
          const timer = this.poisonDamageTimers.get(player.player.playerId) ?? 0;
          if (timer <= 0) {
            this.damagePlayerByPoison(player);
            this.poisonDamageTimers.set(player.player.playerId, zone.poisonZone.damageInterval);
          } else {
            this.poisonDamageTimers.set(player.player.playerId, timer - 1);
          }
        }
      }
    }
  }

  private damagePlayerByPoison(player: GameEntity & { player: PlayerData }): void {
    if (!player.transform) return;

    // 毒气伤害 - 直接死亡（一击必杀游戏）
    player.player.alive = false;

    // 毒气粒子效果
    const particles = spawnParticles(player.transform.x, player.transform.y, 20, {
      spread: Math.PI * 2,
      speedMin: 2,
      speedMax: 5,
      colors: ['#9c27b0', '#7b1fa2', '#4a148c', '#ce93d8'],
      sizeMin: 4,
      sizeMax: 8,
    });
    for (const p of particles) {
      this.engine.spawn(p);
    }

    this.engine.emit('player:death', {
      victimId: player.player.playerId,
      killerId: -3, // 毒圈击杀
      x: player.transform.x,
      y: player.transform.y,
    });
  }
}
