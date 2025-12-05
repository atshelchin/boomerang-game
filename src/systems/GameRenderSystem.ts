/**
 * 游戏渲染系统
 * 渲染所有游戏实体：玩家、回旋镖、道具、粒子、特效等
 */

import { System } from 'you-engine';
import {
  BOOMERANG_CONFIG,
  CHARACTER_COLORS,
  CHARACTER_SHAPES,
  GameSettings,
  PLAYER_CONFIG,
  PLAYER_SKINS,
  POWERUP_COLORS,
  TEAM_COLORS,
} from '../config/GameConfig';
import { GameState } from '../config/GameState';
import { i18n } from '../config/i18n';
import { TUTORIAL_STEPS, TutorialState } from '../config/TutorialState';
import type {
  BoomerangData,
  BoulderData,
  FireTrailData,
  FloatingTextData,
  GameEntity,
  IceTrailData,
  ParticleData,
  PlayerData,
  PoisonZoneData,
  PortalData,
  PowerupData,
  RingData,
  TerrainData,
  TrailData,
  WallData,
} from '../entities/types';
import { EntityTags } from '../entities/types';
import { CharacterRenderer } from '../utils/CharacterRenderer';

export class GameRenderSystem extends System {
  static priority = 100;

  // Canvas 变换已自动处理缩放，不需要手动缩放
  setScale(_scale: number): void {
    // 保留接口兼容性，但不再使用
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    // 角色选择场景由 CharacterSelectScene 自行渲染
    if (GameState.state === 'select') {
      return;
    }

    // 渲染顺序：
    // 0. 边界
    // 1. 毒圈（最底层）
    // 2. 地形（冰面、水面）
    // 3. 轨迹
    // 4. 墙体
    // 5. 火焰轨迹
    // 6. 冰冻轨迹
    // 7. 传送门
    // 8. 道具
    // 9. 滚石
    // 10. 粒子
    // 11. 回旋镖
    // 12. 玩家
    // 13. 环形效果
    // 14. 浮动文字
    // 15. UI元素

    this.renderBoundary(ctx);
    this.renderPoisonZones(ctx);
    this.renderTerrains(ctx);
    this.renderTrails(ctx);
    this.renderWalls(ctx);
    this.renderFireTrails(ctx);
    this.renderIceTrails(ctx);
    this.renderPortals(ctx);
    this.renderPowerups(ctx);
    this.renderBoulders(ctx);
    this.renderParticles(ctx);
    this.renderBoomerangs(ctx);
    this.renderPlayers(ctx);
    this.renderRings(ctx);
    this.renderFloatingTexts(ctx);
    this.renderGameUI(ctx);
  }

  private renderBoundary(ctx: CanvasRenderingContext2D): void {
    const W = this.engine.width;
    const H = this.engine.height;
    const margin = 60; // 与 PlayerSystem 中的边界 margin 一致
    const gridSize = 80;

    ctx.save();

    // 地板（深紫灰色）
    ctx.fillStyle = '#252540';
    ctx.fillRect(margin, margin, W - margin * 2, H - margin * 2);

    // 地板格子
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = margin; x <= W - margin; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, margin);
      ctx.lineTo(x, H - margin);
      ctx.stroke();
    }
    for (let y = margin; y <= H - margin; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(W - margin, y);
      ctx.stroke();
    }

    // 边界（紫灰色粗线）
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 6;
    ctx.strokeRect(margin, margin, W - margin * 2, H - margin * 2);

    ctx.restore();
  }

  private renderTrails(ctx: CanvasRenderingContext2D): void {
    const trails = this.engine.world.entities.filter(
      (e): e is GameEntity & { trail: TrailData } =>
        !!e.tags?.values.includes(EntityTags.TRAIL) && e.trail !== undefined
    );

    for (const trail of trails) {
      if (!trail.transform) continue;

      ctx.save();
      ctx.globalAlpha = trail.trail.alpha;
      ctx.fillStyle = trail.trail.color;
      ctx.beginPath();
      ctx.arc(trail.transform.x, trail.transform.y, trail.trail.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 衰减
      trail.trail.alpha -= 0.05;
      if (trail.trail.alpha <= 0) {
        this.engine.despawn(trail);
      }
    }
  }

  private renderWalls(ctx: CanvasRenderingContext2D): void {
    const walls = this.engine.world.entities.filter(
      (e): e is GameEntity & { wall: WallData } =>
        !!e.tags?.values.includes(EntityTags.WALL) && e.wall !== undefined
    );

    const shadowOff = 6;

    for (const wall of walls) {
      if (!wall.transform) continue;

      const { x, y, rotation } = wall.transform;
      const w = wall.wall;

      ctx.save();
      ctx.translate(x, y);
      if (rotation) ctx.rotate(rotation);

      // 根据形状类型渲染
      switch (w.shapeType) {
        case 'circle': {
          const r = w.radius || w.width / 2;
          // 阴影
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.arc(shadowOff, shadowOff, r, 0, Math.PI * 2);
          ctx.fill();
          // 主体渐变
          const circleGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
          circleGrad.addColorStop(0, '#5a5a7a');
          circleGrad.addColorStop(1, '#3a3a5a');
          ctx.fillStyle = circleGrad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          // 高光
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath();
          ctx.ellipse(-r * 0.3, -r * 0.3, r * 0.4, r * 0.25, -0.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'triangle':
          if (w.vertices && w.vertices.length >= 3) {
            // 阴影
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.moveTo(w.vertices[0].x + shadowOff, w.vertices[0].y + shadowOff);
            for (let i = 1; i < w.vertices.length; i++) {
              ctx.lineTo(w.vertices[i].x + shadowOff, w.vertices[i].y + shadowOff);
            }
            ctx.closePath();
            ctx.fill();
            // 主体
            const triGrad = ctx.createLinearGradient(0, -30, 0, 30);
            triGrad.addColorStop(0, '#5a5a7a');
            triGrad.addColorStop(1, '#3a3a5a');
            ctx.fillStyle = triGrad;
            ctx.beginPath();
            ctx.moveTo(w.vertices[0].x, w.vertices[0].y);
            for (let i = 1; i < w.vertices.length; i++) {
              ctx.lineTo(w.vertices[i].x, w.vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
            // 边缘高光
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(w.vertices[0].x, w.vertices[0].y);
            ctx.lineTo(w.vertices[1].x, w.vertices[1].y);
            ctx.stroke();
          }
          break;

        case 'polygon':
          if (w.vertices && w.vertices.length >= 3) {
            // 阴影
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.moveTo(w.vertices[0].x + shadowOff, w.vertices[0].y + shadowOff);
            for (let i = 1; i < w.vertices.length; i++) {
              ctx.lineTo(w.vertices[i].x + shadowOff, w.vertices[i].y + shadowOff);
            }
            ctx.closePath();
            ctx.fill();
            // 主体
            ctx.fillStyle = '#4a4a6a';
            ctx.beginPath();
            ctx.moveTo(w.vertices[0].x, w.vertices[0].y);
            for (let i = 1; i < w.vertices.length; i++) {
              ctx.lineTo(w.vertices[i].x, w.vertices[i].y);
            }
            ctx.closePath();
            ctx.fill();
          }
          break;
        default: {
          // 阴影
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(-w.width / 2 + shadowOff, -w.height / 2 + shadowOff, w.width, w.height);
          // 墙体渐变
          const rectGrad = ctx.createLinearGradient(0, -w.height / 2, 0, w.height / 2);
          rectGrad.addColorStop(0, '#3a3a5a');
          rectGrad.addColorStop(1, '#2a2a4a');
          ctx.fillStyle = rectGrad;
          ctx.fillRect(-w.width / 2, -w.height / 2, w.width, w.height);
          // 上边高光
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(-w.width / 2, -w.height / 2, w.width, 3);
          // 左边高光
          ctx.fillRect(-w.width / 2, -w.height / 2, 3, w.height);
          break;
        }
      }

      ctx.restore();
    }
  }

  private renderFireTrails(ctx: CanvasRenderingContext2D): void {
    const fireTrails = this.engine.world.entities.filter(
      (e): e is GameEntity & { fireTrail: FireTrailData } =>
        !!e.tags?.values.includes(EntityTags.FIRE_TRAIL) && e.fireTrail !== undefined
    );

    for (const fireTrail of fireTrails) {
      if (!fireTrail.transform) continue;

      const { fireTrail: ft, transform } = fireTrail;
      const lifeRatio = ft.life / ft.maxLife;
      const radius = 15 + (1 - lifeRatio) * 5; // 逐渐扩大

      ctx.save();
      ctx.translate(transform.x, transform.y);

      // 火焰发光效果
      ctx.shadowColor = '#f80';
      ctx.shadowBlur = 20 * lifeRatio;

      // 火焰渐变
      const fireGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      fireGrad.addColorStop(0, `rgba(255, 255, 100, ${lifeRatio * 0.9})`);
      fireGrad.addColorStop(0.4, `rgba(255, 150, 50, ${lifeRatio * 0.7})`);
      fireGrad.addColorStop(0.7, `rgba(255, 80, 20, ${lifeRatio * 0.5})`);
      fireGrad.addColorStop(1, `rgba(200, 50, 0, 0)`);

      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // 火焰闪烁效果
      const flicker = Math.sin(GameState.time * 0.5 + transform.x * 0.1) * 0.3 + 0.7;
      ctx.globalAlpha = lifeRatio * flicker;
      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderIceTrails(ctx: CanvasRenderingContext2D): void {
    const iceTrails = this.engine.world.entities.filter(
      (e): e is GameEntity & { iceTrail: IceTrailData } =>
        !!e.tags?.values.includes(EntityTags.ICE_TRAIL) && e.iceTrail !== undefined
    );

    for (const iceTrail of iceTrails) {
      if (!iceTrail.transform) continue;

      const { iceTrail: it, transform } = iceTrail;
      const lifeRatio = it.life / it.maxLife;
      const radius = 18 + (1 - lifeRatio) * 3; // 逐渐扩大

      ctx.save();
      ctx.translate(transform.x, transform.y);

      // 冰冻发光效果
      ctx.shadowColor = '#88f';
      ctx.shadowBlur = 15 * lifeRatio;

      // 冰冻渐变
      const iceGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      iceGrad.addColorStop(0, `rgba(200, 230, 255, ${lifeRatio * 0.8})`);
      iceGrad.addColorStop(0.4, `rgba(150, 200, 255, ${lifeRatio * 0.6})`);
      iceGrad.addColorStop(0.7, `rgba(100, 150, 255, ${lifeRatio * 0.4})`);
      iceGrad.addColorStop(1, `rgba(80, 120, 255, 0)`);

      ctx.fillStyle = iceGrad;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      // 冰晶纹理
      ctx.globalAlpha = lifeRatio * 0.6;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + GameState.time * 0.02;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * radius * 0.7, Math.sin(angle) * radius * 0.7);
        ctx.stroke();
      }

      // 中心亮点闪烁
      const shimmer = Math.sin(GameState.time * 0.3 + transform.x * 0.1) * 0.3 + 0.7;
      ctx.globalAlpha = lifeRatio * shimmer;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderPowerups(ctx: CanvasRenderingContext2D): void {
    const powerups = this.engine.world.entities.filter(
      (e): e is GameEntity & { powerup: PowerupData } =>
        !!e.tags?.values.includes(EntityTags.POWERUP) && e.powerup !== undefined
    );

    for (const powerup of powerups) {
      if (!powerup.transform) continue;

      powerup.powerup.lifetime++;
      const bob = Math.sin(powerup.powerup.bobOffset + powerup.powerup.lifetime * 0.08) * 5;
      const pulse = 1 + Math.sin(powerup.powerup.lifetime * 0.15) * 0.1;
      const rot = powerup.powerup.lifetime * 0.03;
      const radius = 20;
      const color = POWERUP_COLORS[powerup.powerup.type];

      ctx.save();
      ctx.translate(powerup.transform.x, powerup.transform.y + bob);

      // 外圈旋转光环
      ctx.save();
      ctx.rotate(rot);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 32, (i * Math.PI * 2) / 3, (i * Math.PI * 2) / 3 + Math.PI / 2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.scale(pulse, pulse);

      // 发光底圈
      ctx.fillStyle = `${color}40`;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();

      // 主体渐变
      const grad = ctx.createRadialGradient(-5, -5, 0, 0, 0, radius);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.4, color);
      grad.addColorStop(1, this.shadeColor(color, -40));
      ctx.shadowColor = color;
      ctx.shadowBlur = 25;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 图标
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.strokeStyle = '#000';
      const pu = powerup.powerup;
      if (pu.type === 'triple') {
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (pu.type === 'big') {
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pu.type === 'speed') {
        ctx.beginPath();
        ctx.moveTo(3, -10);
        ctx.lineTo(-5, 2);
        ctx.lineTo(0, 2);
        ctx.lineTo(-3, 10);
        ctx.lineTo(5, -2);
        ctx.lineTo(0, -2);
        ctx.closePath();
        ctx.fill();
      } else if (pu.type === 'shield') {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -2, 8, Math.PI, 0);
        ctx.lineTo(8, 6);
        ctx.lineTo(0, 10);
        ctx.lineTo(-8, 6);
        ctx.closePath();
        ctx.stroke();
      } else if (pu.type === 'magnet') {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 6, Math.PI, 0);
        ctx.moveTo(-6, 0);
        ctx.lineTo(-6, 8);
        ctx.moveTo(6, 0);
        ctx.lineTo(6, 8);
        ctx.stroke();
      } else if (pu.type === 'freeze') {
        // 雪花图标
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
          ctx.stroke();
          // 小分叉
          const branchAngle1 = angle + 0.4;
          const branchAngle2 = angle - 0.4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * 6, Math.sin(angle) * 6);
          ctx.lineTo(Math.cos(branchAngle1) * 9, Math.sin(branchAngle1) * 9);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * 6, Math.sin(angle) * 6);
          ctx.lineTo(Math.cos(branchAngle2) * 9, Math.sin(branchAngle2) * 9);
          ctx.stroke();
        }
      } else if (pu.type === 'fire') {
        // 火焰图标
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.quadraticCurveTo(6, -5, 5, 0);
        ctx.quadraticCurveTo(8, 5, 4, 10);
        ctx.quadraticCurveTo(0, 6, -4, 10);
        ctx.quadraticCurveTo(-8, 5, -5, 0);
        ctx.quadraticCurveTo(-6, -5, 0, -10);
        ctx.fill();
      } else if (pu.type === 'penetrate') {
        // 穿透图标 - 箭头穿过方块
        ctx.lineWidth = 2;
        // 方块
        ctx.strokeRect(-5, -5, 10, 10);
        // 箭头
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.moveTo(6, -4);
        ctx.lineTo(10, 0);
        ctx.lineTo(6, 4);
        ctx.stroke();
      } else if (pu.type === 'range') {
        // 延长图标 - 双箭头扩展
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        // 左箭头
        ctx.moveTo(-4, -4);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-4, 4);
        // 右箭头
        ctx.moveTo(4, -4);
        ctx.lineTo(8, 0);
        ctx.lineTo(4, 4);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    const particles = this.engine.world.entities.filter(
      (e): e is GameEntity & { particle: ParticleData } =>
        !!e.tags?.values.includes(EntityTags.PARTICLE) && e.particle !== undefined
    );

    for (const particle of particles) {
      if (!particle.transform || !particle.velocity) continue;

      const { particle: p, transform, velocity } = particle;

      // 更新
      p.life--;
      transform.x += velocity.x * GameState.slowmo;
      transform.y += velocity.y * GameState.slowmo;

      if (p.isDebris) {
        // 碎片粒子旋转
        velocity.x *= 0.96;
        velocity.y *= 0.96;
        velocity.y += 0.5;
      } else {
        velocity.x *= 0.98;
        velocity.y *= 0.98;
      }

      // 渲染
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.isDebris) {
        // 方形碎片
        ctx.translate(transform.x, transform.y);
        ctx.rotate(GameState.time * 0.2);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        // 圆形粒子 - 确保半径不为负
        const radius = Math.max(0.1, p.size * alpha);
        ctx.beginPath();
        ctx.arc(transform.x, transform.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // 移除
      if (p.life <= 0) {
        this.engine.despawn(particle);
      }
    }
  }

  private renderBoomerangs(ctx: CanvasRenderingContext2D): void {
    const boomerangs = this.engine.world.entities.filter(
      (e): e is GameEntity & { boomerang: BoomerangData } =>
        !!e.tags?.values.includes(EntityTags.BOOMERANG) && e.boomerang !== undefined
    );

    for (const boomerang of boomerangs) {
      if (!boomerang.transform) continue;

      const { boomerang: b, transform } = boomerang;
      // 使用玩家配置的 skinIndex（多人模式支持）
      const ownerSkinIndex =
        GameSettings.players?.[b.ownerId]?.skinIndex ?? b.ownerId % PLAYER_SKINS.length;
      const skin = PLAYER_SKINS[ownerSkinIndex];
      const radius = b.isBig ? BOOMERANG_CONFIG.bigRadius : BOOMERANG_CONFIG.radius;

      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.rotate(b.rotation);

      // 发光效果
      ctx.shadowColor = skin.color1;
      ctx.shadowBlur = 15;

      // V形回旋镖形状 - 金色外框
      ctx.fillStyle = '#ffd700';
      this.drawBoomerangShape(ctx, radius);

      // 内部颜色
      ctx.fillStyle = skin.color1;
      this.drawBoomerangShape(ctx, radius * 0.6);

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private renderPlayers(ctx: CanvasRenderingContext2D): void {
    const players = this.engine.world.entities.filter(
      (e): e is GameEntity & { player: PlayerData } =>
        !!e.tags?.values.includes(EntityTags.PLAYER) && e.player !== undefined
    );

    for (const player of players) {
      if (!player.player.alive || !player.transform) continue;

      const { player: p, transform } = player;

      // 获取玩家配置（颜色、形状、队伍）- 优先从玩家实体获取，再从 GameSettings 获取
      const playerConfig = GameSettings.players?.[p.playerId];
      const colorIndex =
        p.colorIndex ??
        playerConfig?.colorIndex ??
        p.skinIndex ??
        p.playerId % CHARACTER_COLORS.length;
      const shapeIndex =
        p.shapeIndex ?? playerConfig?.shapeIndex ?? p.playerId % CHARACTER_SHAPES.length;
      const teamIndex = p.teamIndex ?? playerConfig?.teamIndex ?? -1;

      const hasTeam = teamIndex >= 0;
      const teamColor = hasTeam ? TEAM_COLORS[teamIndex] : null;

      // 如果有队伍，使用队伍颜色；否则使用个人颜色
      const color = hasTeam
        ? { color1: teamColor!.color, color2: this.darkenColor(teamColor!.color, 0.3) }
        : CHARACTER_COLORS[colorIndex];
      const shape = CHARACTER_SHAPES[shapeIndex];

      const radius = PLAYER_CONFIG.radius;
      const bob = Math.sin(p.animTime * 0.15) * 2;

      ctx.save();
      ctx.translate(transform.x, transform.y + bob);

      // 队伍光环（在角色下方绘制）
      if (teamColor) {
        const pulseAlpha = 0.3 + Math.sin(GameState.time * 0.1) * 0.1;
        ctx.strokeStyle = teamColor.color;
        ctx.lineWidth = 4;
        ctx.globalAlpha = pulseAlpha;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 阴影
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 20, 25, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // 使用 CharacterRenderer 绘制角色形状
      CharacterRenderer.renderShape(
        ctx,
        shape.id,
        color.color1,
        color.color2,
        radius,
        p.angle,
        GameState.time
      );

      // 冰冻效果
      if (p.frozen) {
        // 冰块覆盖层
        ctx.save();
        ctx.globalAlpha = 0.6;

        // 冰晶渐变
        const iceGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius + 8);
        iceGrad.addColorStop(0, 'rgba(150, 200, 255, 0.3)');
        iceGrad.addColorStop(0.6, 'rgba(100, 150, 255, 0.5)');
        iceGrad.addColorStop(1, 'rgba(80, 120, 255, 0.7)');

        ctx.fillStyle = iceGrad;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
        ctx.fill();

        // 冰晶纹理
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.8)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * (radius + 3), Math.sin(angle) * (radius + 3));
          ctx.stroke();
        }

        // 冰冻光环
        ctx.strokeStyle = '#88f';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + Math.sin(GameState.time * 0.2) * 0.2;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // 燃烧效果
      if (p.burning) {
        ctx.save();

        // 火焰光环
        const fireAlpha = 0.5 + Math.sin(GameState.time * 0.3) * 0.2;
        ctx.globalAlpha = fireAlpha;
        ctx.strokeStyle = '#f80';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#f44';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
        ctx.stroke();

        // 外圈火焰
        ctx.strokeStyle = '#f44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 14 + Math.sin(GameState.time * 0.5) * 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // 队伍小标记（头顶）
      if (teamColor) {
        ctx.fillStyle = teamColor.color;
        ctx.beginPath();
        ctx.arc(0, -radius - 12, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 道具徽章 - 显示在头顶（支持多个）
      if (p.powerups.length > 0) {
        this.renderPowerupBadges(ctx, p, radius);
      }

      // 手持回旋镖指示
      if (p.hasBoomerang) {
        ctx.save();
        ctx.rotate(p.angle);
        ctx.translate(radius + 15, 0);

        // 小回旋镖
        ctx.rotate(GameState.time * 0.1);
        ctx.fillStyle = '#ffd700';
        this.drawBoomerangShape(ctx, 10);

        ctx.restore();
      } else {
        // 没有回旋镖时的指示
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();

      // 蓄力时的瞄准系统
      if (p.charging) {
        this.renderChargingAim(ctx, transform.x, transform.y, p, color, radius);
      }
    }
  }

  /**
   * 渲染道具徽章
   */
  private renderPowerupBadges(ctx: CanvasRenderingContext2D, p: PlayerData, radius: number): void {
    const flash = Math.sin(GameState.time * 0.2) * 0.2 + 0.8;
    const badgeSize = 14;
    const spacing = 32;
    const startX = (-(p.powerups.length - 1) * spacing) / 2;

    p.powerups.forEach((pu, idx) => {
      const puColor = POWERUP_COLORS[pu.type];
      const timerRatio = pu.timer / 600;
      const badgeX = startX + idx * spacing;
      const badgeY = -radius - 22;

      // 徽章背景圆
      ctx.fillStyle = '#222';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeSize + 3, 0, Math.PI * 2);
      ctx.fill();

      // 剩余时间环
      ctx.strokeStyle = puColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeSize + 3, -Math.PI / 2, -Math.PI / 2 + timerRatio * Math.PI * 2);
      ctx.stroke();

      // 徽章主体
      const grad = ctx.createRadialGradient(badgeX, badgeY - 2, 0, badgeX, badgeY, badgeSize);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.3, puColor);
      grad.addColorStop(1, this.shadeColor(puColor, -50));
      ctx.fillStyle = grad;
      ctx.globalAlpha = flash;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeSize, 0, Math.PI * 2);
      ctx.fill();

      // 徽章图标
      ctx.fillStyle = '#000';
      ctx.strokeStyle = '#000';
      ctx.globalAlpha = 0.8;
      ctx.save();
      ctx.translate(badgeX, badgeY);

      if (pu.type === 'triple') {
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 5, Math.sin(a) * 5, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (pu.type === 'big') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pu.type === 'speed') {
        ctx.beginPath();
        ctx.moveTo(1, -6);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-1, 0);
        ctx.lineTo(-1, 6);
        ctx.lineTo(3, 0);
        ctx.lineTo(1, 0);
        ctx.closePath();
        ctx.fill();
      } else if (pu.type === 'shield') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -1, 4, Math.PI, 0);
        ctx.lineTo(4, 3);
        ctx.lineTo(0, 6);
        ctx.lineTo(-4, 3);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.shieldHits.toString(), 0, 2);
      } else if (pu.type === 'magnet') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -1, 4, Math.PI, 0);
        ctx.moveTo(-4, -1);
        ctx.lineTo(-4, 4);
        ctx.moveTo(4, -1);
        ctx.lineTo(4, 4);
        ctx.stroke();
      } else if (pu.type === 'freeze') {
        // 雪花图标（小版）
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * 6, Math.sin(angle) * 6);
          ctx.stroke();
        }
      } else if (pu.type === 'fire') {
        // 火焰图标（小版）
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.quadraticCurveTo(3, -2, 3, 0);
        ctx.quadraticCurveTo(4, 3, 2, 5);
        ctx.quadraticCurveTo(0, 3, -2, 5);
        ctx.quadraticCurveTo(-4, 3, -3, 0);
        ctx.quadraticCurveTo(-3, -2, 0, -5);
        ctx.fill();
      } else if (pu.type === 'penetrate') {
        // 穿透图标（小版）
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.moveTo(3, -2);
        ctx.lineTo(5, 0);
        ctx.lineTo(3, 2);
        ctx.stroke();
      } else if (pu.type === 'range') {
        // 延长图标（小版）
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.moveTo(-3, -2);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-3, 2);
        ctx.moveTo(3, -2);
        ctx.lineTo(5, 0);
        ctx.lineTo(3, 2);
        ctx.stroke();
      }
      ctx.restore();
    });

    ctx.globalAlpha = 1;

    // 身体周围光效（用第一个道具颜色）
    const mainColor = POWERUP_COLORS[p.powerups[0].type];
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = flash * 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /**
   * 渲染蓄力瞄准系统
   */
  private renderChargingAim(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    p: PlayerData,
    skin: { color1: string; color2: string },
    radius: number
  ): void {
    const chargeRatio = Math.min(p.chargeTime / PLAYER_CONFIG.maxCharge, 1);
    const color = skin.color1;
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);

    ctx.save();
    ctx.translate(x, y);

    // 扇形瞄准范围
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 200 + chargeRatio * 150, p.angle - 0.15, p.angle + 0.15);
    ctx.closePath();
    ctx.fill();

    // 激光瞄准线 - 细长精准
    const lineLen = 300 + chargeRatio * 200;
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(cos * 40, sin * 40);
    ctx.lineTo(cos * lineLen, sin * lineLen);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 瞄准点 - 终点闪烁圆点
    const targetX = cos * lineLen;
    const targetY = sin * lineLen;
    const pulse = Math.sin(GameState.time * 0.4) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(targetX, targetY, 8 + chargeRatio * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 5 + chargeRatio * 2, 0, Math.PI * 2);
    ctx.fill();

    // 十字准心
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    const crossSize = 12;
    ctx.beginPath();
    ctx.moveTo(targetX - crossSize, targetY);
    ctx.lineTo(targetX - 4, targetY);
    ctx.moveTo(targetX + 4, targetY);
    ctx.lineTo(targetX + crossSize, targetY);
    ctx.moveTo(targetX, targetY - crossSize);
    ctx.lineTo(targetX, targetY - 4);
    ctx.moveTo(targetX, targetY + 4);
    ctx.lineTo(targetX, targetY + crossSize);
    ctx.stroke();

    // 角度刻度 - 显示微调
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const tickAngle = p.angle + i * 0.1;
      const tickLen = i % 2 === 0 ? 15 : 8;
      const startR = 50;
      ctx.beginPath();
      ctx.moveTo(Math.cos(tickAngle) * startR, Math.sin(tickAngle) * startR);
      ctx.lineTo(
        Math.cos(tickAngle) * (startR + tickLen),
        Math.sin(tickAngle) * (startR + tickLen)
      );
      ctx.stroke();
    }

    // 蓄力环 - 围绕角色
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, radius + 10, -Math.PI / 2, -Math.PI / 2 + chargeRatio * Math.PI * 2);
    ctx.stroke();

    // 满蓄力爆发特效
    if (chargeRatio >= 1) {
      const burstAlpha = Math.sin(GameState.time * 0.5) * 0.4 + 0.6;
      ctx.globalAlpha = burstAlpha;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 18 + Math.sin(GameState.time * 0.3) * 5, 0, Math.PI * 2);
      ctx.stroke();

      // 发光粒子
      for (let i = 0; i < 4; i++) {
        const sparkAngle = GameState.time * 0.1 + (i * Math.PI) / 2;
        const sparkR = radius + 15;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(Math.cos(sparkAngle) * sparkR, Math.sin(sparkAngle) * sparkR, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * 绘制V形回旋镖形状
   */
  private drawBoomerangShape(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    // V形回旋镖
    ctx.moveTo(size, 0);
    ctx.quadraticCurveTo(size * 0.3, -size * 0.2, 0, -size);
    ctx.quadraticCurveTo(-size * 0.2, -size * 0.3, -size * 0.3, 0);
    ctx.quadraticCurveTo(-size * 0.2, size * 0.3, 0, size);
    ctx.quadraticCurveTo(size * 0.3, size * 0.2, size, 0);
    ctx.fill();
  }

  /**
   * 颜色变暗/变亮
   */
  private shadeColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  private renderRings(ctx: CanvasRenderingContext2D): void {
    const rings = this.engine.world.entities.filter(
      (e): e is GameEntity & { ring: RingData } =>
        !!e.tags?.values.includes(EntityTags.RING) && e.ring !== undefined
    );

    for (const ring of rings) {
      if (!ring.transform) continue;

      const { ring: r, transform } = ring;

      // 扩张
      r.radius += (r.maxRadius - r.radius) * 0.15;
      r.alpha *= 0.9;

      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = r.alpha;
      ctx.beginPath();
      ctx.arc(transform.x, transform.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 移除
      if (r.alpha < 0.05) {
        this.engine.despawn(ring);
      }
    }
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D): void {
    const texts = this.engine.world.entities.filter(
      (e): e is GameEntity & { floatingText: FloatingTextData } =>
        !!e.tags?.values.includes(EntityTags.FLOATING_TEXT) && e.floatingText !== undefined
    );

    for (const text of texts) {
      if (!text.transform || !text.velocity) continue;

      const { floatingText: ft, transform, velocity } = text;

      // 更新
      ft.life--;
      transform.y += velocity.y;

      // 渲染
      const alpha = ft.life / 60;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `bold 20px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ft.text, transform.x, transform.y);
      ctx.restore();

      // 移除
      if (ft.life <= 0) {
        this.engine.despawn(text);
      }
    }
  }

  private renderGameUI(ctx: CanvasRenderingContext2D): void {
    // READY 倒计时
    if (GameState.state === 'ready') {
      const countdown = Math.ceil(GameState.stateTimer / 15);
      const pulseScale = 1 + ((GameState.stateTimer % 15) / 15) * 0.3;

      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${80 * pulseScale}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.8;
      ctx.fillText(countdown.toString(), this.engine.width / 2, this.engine.height / 2);
      ctx.restore();
    }

    // 回合信息（只显示 ROUND，不显示比分）
    if (GameState.state === 'fight' || GameState.state === 'ready') {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `16px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`ROUND ${GameState.roundNumber}`, this.engine.width / 2, 30);
      ctx.restore();
      // 注：比分在回合结束时显示，战斗中不显示顶部得分条
    }

    // 回合结束得分展示
    if (GameState.state === 'roundEnd' || GameState.state === 'ko') {
      this.renderRoundEndScreen(ctx);
    }

    // 游戏胜利画面 - 隆重展示
    if (GameState.state === 'win') {
      this.renderVictoryScreen(ctx);
    }

    // 教程界面
    if (GameState.state === 'tutorial') {
      this.renderTutorialUI(ctx);
    }
  }

  /**
   * 渲染教程界面
   */
  private renderTutorialUI(ctx: CanvasRenderingContext2D): void {
    if (!TutorialState.active) return;

    const W = this.engine.width;
    const H = this.engine.height;
    const step = TutorialState.getCurrentStep();
    const t = i18n.t.tutorial;

    ctx.save();

    // 顶部教程标题栏
    const headerHeight = 80;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, headerHeight);

    // 进度条背景
    const progressBarWidth = W * 0.6;
    const progressBarHeight = 8;
    const progressBarX = (W - progressBarWidth) / 2;
    const progressBarY = 60;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 4);
    ctx.fill();

    // 进度条填充
    const progress = (TutorialState.currentStepIndex + 1) / TUTORIAL_STEPS.length;
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.roundRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight, 4);
    ctx.fill();

    // 步骤标题
    const stepTitles: Record<string, string> = {
      intro: t.intro,
      move: t.move,
      throw: t.throw,
      catch: t.catch,
      charge: t.charge,
      dash: t.dash,
      powerup_triple: t.powerupTriple,
      powerup_big: t.powerupBig,
      powerup_speed: t.powerupSpeed,
      powerup_shield: t.powerupShield,
      powerup_magnet: t.powerupMagnet,
      kill: t.kill,
      complete: t.complete,
    };

    const stepDescs: Record<string, string> = {
      intro: t.introDesc,
      move: t.moveDesc,
      throw: t.throwDesc,
      catch: t.catchDesc,
      charge: t.chargeDesc,
      dash: t.dashDesc,
      powerup_triple: t.powerupTripleDesc,
      powerup_big: t.powerupBigDesc,
      powerup_speed: t.powerupSpeedDesc,
      powerup_shield: t.powerupShieldDesc,
      powerup_magnet: t.powerupMagnetDesc,
      kill: t.killDesc,
      complete: t.completeDesc,
    };

    const title = stepTitles[step.type] || step.type;
    const desc = stepDescs[step.type] || '';

    // 标题
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, W / 2, 30);

    // 底部提示框
    const hintBoxHeight = 100;
    const hintBoxY = H - hintBoxHeight;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, hintBoxY, W, hintBoxHeight);

    // 描述文字
    ctx.fillStyle = '#fff';
    ctx.font = '22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(desc, W / 2, hintBoxY + 35);

    // 步骤完成状态
    if (TutorialState.stepCompleted) {
      // 完成提示
      ctx.fillStyle = '#4caf50';
      ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`${t.stepComplete} ${t.pressAnyButton}`, W / 2, hintBoxY + 70);
    } else {
      // 跳过提示
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '16px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(t.skip, W / 2, hintBoxY + 70);
    }

    // 步骤指示点
    const dotSize = 10;
    const dotSpacing = 20;
    const totalDotsWidth = TUTORIAL_STEPS.length * dotSpacing;
    const dotsStartX = (W - totalDotsWidth) / 2;

    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      const dotX = dotsStartX + i * dotSpacing + dotSize / 2;
      const dotY = progressBarY - 20;

      ctx.beginPath();
      ctx.arc(dotX, dotY, dotSize / 2, 0, Math.PI * 2);

      if (i < TutorialState.currentStepIndex) {
        ctx.fillStyle = '#4caf50'; // 已完成 - 绿色
      } else if (i === TutorialState.currentStepIndex) {
        ctx.fillStyle = '#4fc3f7'; // 当前 - 蓝色
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // 未完成 - 灰色
      }
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * 渲染游戏胜利画面 - 隆重、震撼的效果
   */
  private renderVictoryScreen(ctx: CanvasRenderingContext2D): void {
    const W = this.engine.width;
    const H = this.engine.height;
    const players = GameState.playerScores;
    const animTime = GameState.stateTimer;

    ctx.save();

    // 渐变背景
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8);
    bgGrad.addColorStop(0, 'rgba(20, 10, 40, 0.95)');
    bgGrad.addColorStop(1, 'rgba(5, 5, 15, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 获取最终胜者信息
    const winner = players.find((p) => p.playerId === GameState.roundWinner);
    if (!winner) {
      ctx.restore();
      return;
    }

    const winnerConfig = GameSettings.players?.[winner.playerId];
    const winnerTeamIndex = winnerConfig?.teamIndex ?? -1;
    const winnerHasTeam = winnerTeamIndex >= 0;
    const winnerTeamColor = winnerHasTeam ? TEAM_COLORS[winnerTeamIndex] : null;
    const winnerColorIndex = winnerConfig?.colorIndex ?? winner.playerId % CHARACTER_COLORS.length;
    const winnerColor = winnerHasTeam
      ? { color1: winnerTeamColor!.color, color2: this.darkenColor(winnerTeamColor!.color, 0.3) }
      : CHARACTER_COLORS[winnerColorIndex];

    // 动画阶段
    const phase1 = Math.min(1, animTime / 30); // 0-30帧：入场
    const phase2 = Math.min(1, Math.max(0, animTime - 30) / 30); // 30-60帧：文字
    const phase3 = Math.min(1, Math.max(0, animTime - 60) / 30); // 60-90帧：角色展示

    // 背景光芒放射效果
    ctx.save();
    ctx.translate(W / 2, H / 3);
    const rayCount = 16;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + animTime * 0.01;
      const rayLength = 400 + Math.sin(animTime * 0.05 + i) * 100;
      const rayWidth = 30 + Math.sin(animTime * 0.08 + i * 2) * 10;

      ctx.save();
      ctx.rotate(angle);
      ctx.globalAlpha = 0.1 + Math.sin(animTime * 0.1 + i) * 0.05;

      const rayGrad = ctx.createLinearGradient(0, 0, rayLength, 0);
      rayGrad.addColorStop(0, winnerColor.color1);
      rayGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = rayGrad;

      ctx.beginPath();
      ctx.moveTo(0, -rayWidth / 2);
      ctx.lineTo(rayLength, -rayWidth / 4);
      ctx.lineTo(rayLength, rayWidth / 4);
      ctx.lineTo(0, rayWidth / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 飘落的粒子/星星效果
    ctx.save();
    for (let i = 0; i < 50; i++) {
      const seed = i * 137.5;
      const px = (seed * 7.3 + animTime * (0.3 + (i % 3) * 0.2)) % W;
      const py = (seed * 3.7 + animTime * (0.5 + (i % 5) * 0.3)) % H;
      const size = 2 + (i % 4);
      const alpha = 0.3 + Math.sin(animTime * 0.1 + seed) * 0.2;

      ctx.globalAlpha = alpha * phase1;
      ctx.fillStyle = i % 3 === 0 ? '#ffd700' : i % 3 === 1 ? winnerColor.color1 : '#fff';
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 主标题：VICTORY!
    const titleY = H * 0.18;
    const titleScale = 1 + Math.sin(animTime * 0.1) * 0.03;

    ctx.save();
    ctx.translate(W / 2, titleY);
    ctx.scale(titleScale * phase1, titleScale * phase1);

    // 文字阴影/发光
    ctx.shadowColor = winnerColor.color1;
    ctx.shadowBlur = 50 + Math.sin(animTime * 0.15) * 20;
    ctx.font = 'bold 100px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('VICTORY!', 0, 0);

    // 白色高光层
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.5 + Math.sin(animTime * 0.2) * 0.2;
    ctx.fillStyle = '#fff';
    ctx.fillText('VICTORY!', 0, -3);
    ctx.restore();

    // 胜者名称
    if (phase2 > 0) {
      const nameY = H * 0.32;
      ctx.save();
      ctx.globalAlpha = phase2;
      ctx.font = 'bold 48px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = winnerColor.color1;
      ctx.shadowColor = winnerColor.color1;
      ctx.shadowBlur = 30;

      if (winnerHasTeam) {
        ctx.fillText(TEAM_COLORS[winnerTeamIndex].name, W / 2, nameY);
      } else {
        ctx.fillText(`PLAYER ${winner.playerId + 1}`, W / 2, nameY);
      }
      ctx.restore();
    }

    // 获取所有队伍成员（如果是队伍胜利）
    const winningMembers = winnerHasTeam
      ? players.filter((p) => {
          const config = GameSettings.players?.[p.playerId];
          return config?.teamIndex === winnerTeamIndex;
        })
      : [winner];

    // 胜者角色大展示
    if (phase3 > 0) {
      const avatarY = H * 0.52;
      const bigRadius = 70;
      const avatarGap = 40;
      const totalWidth = winningMembers.length * (bigRadius * 2 + avatarGap) - avatarGap;
      const avatarStartX = (W - totalWidth) / 2 + bigRadius;

      for (let i = 0; i < winningMembers.length; i++) {
        const member = winningMembers[i];
        const memberConfig = GameSettings.players?.[member.playerId];
        const shapeIndex = memberConfig?.shapeIndex ?? member.playerId % CHARACTER_SHAPES.length;
        const shape = CHARACTER_SHAPES[shapeIndex];

        const avatarX = avatarStartX + i * (bigRadius * 2 + avatarGap);
        const bounce = Math.sin(animTime * 0.1 + i * 0.5) * 8;
        const entryOffset = (1 - phase3) * 100;

        ctx.save();
        ctx.globalAlpha = phase3;
        ctx.translate(avatarX, avatarY + bounce + entryOffset);

        // 角色下方光圈
        ctx.fillStyle = `${winnerColor.color1}40`;
        ctx.beginPath();
        ctx.ellipse(0, bigRadius + 10, bigRadius * 1.2, bigRadius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // 角色发光环
        ctx.strokeStyle = winnerColor.color1;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.5 + Math.sin(animTime * 0.15 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, bigRadius + 15 + Math.sin(animTime * 0.1) * 5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = phase3;

        // 渲染角色
        CharacterRenderer.renderShape(
          ctx,
          shape.id,
          winnerColor.color1,
          winnerColor.color2,
          bigRadius,
          0,
          GameState.time
        );

        // 玩家编号标签
        ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.8;
        ctx.fillText(`P${member.playerId + 1}`, 0, bigRadius + 35);

        ctx.restore();
      }

      // 皇冠（在中间角色上方）
      const crownX = avatarStartX + ((winningMembers.length - 1) * (bigRadius * 2 + avatarGap)) / 2;
      const crownY = avatarY - bigRadius - 30;
      const crownBob = Math.sin(animTime * 0.08) * 5;

      ctx.save();
      ctx.globalAlpha = phase3;
      ctx.font = '60px sans-serif';
      ctx.fillText('👑', crownX, crownY + crownBob);
      ctx.restore();
    }

    // 所有角色展示区域（小头像）
    if (phase3 > 0) {
      ctx.save();
      ctx.globalAlpha = phase3 * 0.9;

      ctx.font = '18px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText('ALL PLAYERS', W / 2, H * 0.73);

      const smallRadius = 28;
      const smallGap = 20;
      const allPlayersY = H * 0.82;
      const allTotalWidth = players.length * (smallRadius * 2 + smallGap) - smallGap;
      const allStartX = (W - allTotalWidth) / 2 + smallRadius;

      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const pConfig = GameSettings.players?.[p.playerId];
        const pTeamIndex = pConfig?.teamIndex ?? -1;
        const pHasTeam = pTeamIndex >= 0;
        const pColorIndex = pConfig?.colorIndex ?? p.playerId % CHARACTER_COLORS.length;
        const pShapeIndex = pConfig?.shapeIndex ?? p.playerId % CHARACTER_SHAPES.length;
        const pColor = pHasTeam
          ? {
              color1: TEAM_COLORS[pTeamIndex].color,
              color2: this.darkenColor(TEAM_COLORS[pTeamIndex].color, 0.3),
            }
          : CHARACTER_COLORS[pColorIndex];
        const pShape = CHARACTER_SHAPES[pShapeIndex];

        const isWinningMember = winningMembers.some((m) => m.playerId === p.playerId);
        const px = allStartX + i * (smallRadius * 2 + smallGap);

        ctx.save();
        ctx.translate(px, allPlayersY);

        // 胜者有光环
        if (isWinningMember) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, smallRadius + 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 渲染角色
        CharacterRenderer.renderShape(
          ctx,
          pShape.id,
          pColor.color1,
          pColor.color2,
          smallRadius,
          0,
          GameState.time
        );

        // 分数
        ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = isWinningMember ? '#ffd700' : '#888';
        ctx.fillText(`${p.score}`, 0, smallRadius + 18);

        ctx.restore();
      }

      ctx.restore();
    }

    // 最终比分
    ctx.save();
    ctx.globalAlpha = phase2;
    ctx.font = '24px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(`FINAL SCORE: ${winner.score}`, W / 2, H * 0.38);
    ctx.restore();

    // 底部提示
    if (animTime > 90) {
      const hintAlpha = 0.4 + Math.sin(animTime * 0.1) * 0.3;
      ctx.font = '16px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = `rgba(255,255,255,${hintAlpha})`;
      ctx.fillText('按任意键继续', W / 2, H - 40);
    }

    ctx.restore();
  }

  /**
   * 渲染回合结束画面 - 回放作为背景，计分板覆盖在上面
   */
  private renderRoundEndScreen(ctx: CanvasRenderingContext2D): void {
    const W = this.engine.width;
    const H = this.engine.height;
    const players = GameState.playerScores;
    const winScore = GameSettings.winScore;

    // 更新动画计时器
    GameState.roundEndAnimTime++;

    ctx.save();

    // 先渲染回放作为背景（全屏）
    this.renderReplayBackground(ctx, W, H);

    // 半透明遮罩（让回放变暗，突出UI）
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 获取胜者信息
    const winner = players.find((p) => p.playerId === GameState.roundWinner);
    const winnerConfig = winner ? GameSettings.players?.[winner.playerId] : null;
    const winnerTeamIndex = winnerConfig?.teamIndex ?? -1;
    const winnerHasTeam = winnerTeamIndex >= 0;
    const winnerTeamColor = winnerHasTeam ? TEAM_COLORS[winnerTeamIndex] : null;
    const winnerColorIndex =
      winnerConfig?.colorIndex ?? (winner?.playerId ?? 0) % CHARACTER_COLORS.length;
    const winnerColor = winnerHasTeam
      ? { color1: winnerTeamColor!.color, color2: this.darkenColor(winnerTeamColor!.color, 0.3) }
      : CHARACTER_COLORS[winnerColorIndex];

    // 标题：回合胜者
    if (winner) {
      ctx.font = 'bold 72px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = winnerColor.color1;
      ctx.shadowColor = winnerColor.color1;
      ctx.shadowBlur = 40;
      const winText = winnerHasTeam
        ? `${TEAM_COLORS[winnerTeamIndex].name} WINS!`
        : `P${winner.playerId + 1} WINS!`;
      ctx.fillText(winText, W / 2, 100);
      ctx.shadowBlur = 0;
    }

    // 回放标记（左上角）
    const replayIconPulse = Math.sin(GameState.time * 0.2) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,100,100,${replayIconPulse})`;
    ctx.beginPath();
    ctx.arc(50, 40, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ff6464';
    ctx.textAlign = 'left';
    ctx.fillText('REPLAY', 65, 43);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${GameState.replaySpeed}x`, 140, 43);

    // 回放进度条（底部）
    const progressY = H - 80;
    const progressW = W - 200;
    const progressX = 100;
    const progress =
      GameState.replayBuffer.length > 0
        ? GameState.replayPlaybackIndex / GameState.replayBuffer.length
        : 0;

    ctx.fillStyle = 'rgba(50,50,70,0.8)';
    ctx.beginPath();
    ctx.roundRect(progressX, progressY, progressW, 8, 4);
    ctx.fill();

    ctx.fillStyle = winnerColor.color1;
    ctx.beginPath();
    ctx.roundRect(progressX, progressY, progressW * progress, 8, 4);
    ctx.fill();

    // 计分板（居中下方）
    const teamGroups = this.groupPlayersByTeam(players);
    teamGroups.sort((a, b) => b.score - a.score);

    const rowHeight = 65;
    const scoreboardW = 500;
    const scoreboardH = teamGroups.length * rowHeight + 20;
    const scoreboardX = (W - scoreboardW) / 2;
    const scoreboardY = H - scoreboardH - 120;

    // 计分板背景
    ctx.fillStyle = 'rgba(20,20,40,0.85)';
    ctx.beginPath();
    ctx.roundRect(scoreboardX - 20, scoreboardY - 10, scoreboardW + 40, scoreboardH + 20, 12);
    ctx.fill();

    ctx.strokeStyle = `${winnerColor.color1}40`;
    ctx.lineWidth = 2;
    ctx.stroke();

    const startY = scoreboardY + 10;

    for (let rank = 0; rank < teamGroups.length; rank++) {
      const group = teamGroups[rank];
      const y = startY + rank * rowHeight;

      const isWinnerGroup = winnerHasTeam
        ? group.teamIndex === winnerTeamIndex
        : group.members.some((m) => m.playerId === GameState.roundWinner);

      // 行背景
      ctx.fillStyle = isWinnerGroup ? `${group.color.color1}30` : 'rgba(40,40,60,0.4)';
      ctx.beginPath();
      ctx.roundRect(scoreboardX, y, scoreboardW, rowHeight - 8, 8);
      ctx.fill();

      // 胜者边框发光
      if (isWinnerGroup) {
        ctx.strokeStyle = group.color.color1;
        ctx.lineWidth = 2;
        ctx.shadowColor = group.color.color1;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 队伍色左边条
      if (group.teamIndex >= 0) {
        ctx.fillStyle = group.color.color1;
        ctx.beginPath();
        ctx.roundRect(scoreboardX, y, 5, rowHeight - 8, [8, 0, 0, 8]);
        ctx.fill();
      }

      // 玩家头像
      const avatarRadius = 22;
      const avatarGap = 8;
      const avatarStartX = scoreboardX + 30;
      const avatarY = y + (rowHeight - 8) / 2;

      for (let i = 0; i < group.members.length; i++) {
        const member = group.members[i];
        const memberConfig = GameSettings.players?.[member.playerId];
        const shapeIndex = memberConfig?.shapeIndex ?? member.playerId % CHARACTER_SHAPES.length;
        const shape = CHARACTER_SHAPES[shapeIndex];
        const avatarX = avatarStartX + i * (avatarRadius * 2 + avatarGap);

        ctx.save();
        ctx.translate(avatarX, avatarY);
        CharacterRenderer.renderShape(
          ctx,
          shape.id,
          group.color.color1,
          group.color.color2,
          avatarRadius,
          0,
          GameState.time
        );
        ctx.restore();
      }

      // 胜者皇冠
      if (isWinnerGroup) {
        ctx.textAlign = 'center';
        ctx.font = '20px sans-serif';
        ctx.fillText('👑', avatarStartX, avatarY - avatarRadius - 10);
      }

      // 名称
      const nameX = avatarStartX + group.members.length * (avatarRadius * 2 + avatarGap) + 10;
      ctx.textAlign = 'left';
      ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';

      if (group.teamIndex >= 0) {
        ctx.fillStyle = group.color.color1;
        ctx.fillText(TEAM_COLORS[group.teamIndex].name, nameX, avatarY);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillText(`P${group.members[0].playerId + 1}`, nameX, avatarY);
      }

      // 分数圆圈
      const circlesStartX = scoreboardX + 250;
      const previousScore = group.previousScore;
      this.renderScoreCirclesHorizontal(
        ctx,
        circlesStartX,
        avatarY,
        group.score,
        previousScore,
        winScore,
        group.color.color1,
        isWinnerGroup
      );
    }

    // 回合数
    ctx.textAlign = 'center';
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(`ROUND ${GameState.roundNumber}`, W / 2, H - 45);

    // 提示：赢家确认
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    if (GameState.winnerConfirmed) {
      ctx.fillStyle = '#4ecdc4';
      ctx.fillText('准备进入下一回合...', W / 2, H - 20);
    } else {
      const hintAlpha = 0.6 + Math.sin(GameState.time * 0.15) * 0.4;
      ctx.fillStyle = `rgba(255,215,0,${hintAlpha})`;
      const winnerName = winner
        ? winnerHasTeam
          ? TEAM_COLORS[winnerTeamIndex].name
          : `P${winner.playerId + 1}`
        : '';
      ctx.fillText(`${winnerName} 按键确认继续`, W / 2, H - 20);
    }

    ctx.restore();
  }

  /**
   * 渲染回放作为背景（全屏）
   */
  private renderReplayBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    let frame = GameState.getReplayFrame();

    // 如果回放还没开始，尝试显示缓冲区的最后一帧（避免黑屏）
    if (!frame && GameState.replayBuffer.length > 0) {
      frame = GameState.replayBuffer[GameState.replayBuffer.length - 1];
    }

    // 背景色
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    if (!frame) {
      return;
    }

    // 直接在全屏渲染回放内容
    const margin = 60;
    const gameW = 1600;
    const gameH = 900;

    // 绘制游戏区域边界
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 3;
    ctx.strokeRect(margin, margin, gameW - margin * 2, gameH - margin * 2);

    // 地板格子（淡化）
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    const gridSize = 80;
    for (let x = margin; x <= gameW - margin; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, margin);
      ctx.lineTo(x, gameH - margin);
      ctx.stroke();
    }
    for (let y = margin; y <= gameH - margin; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(gameW - margin, y);
      ctx.stroke();
    }

    // 渲染地图障碍物（墙壁）
    this.renderWalls(ctx);

    // 绘制回放中的回旋镖
    for (const b of frame.boomerangs) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation);

      const ownerConfig = GameSettings.players?.[b.ownerId];
      const ownerTeamIndex = ownerConfig?.teamIndex ?? -1;
      const ownerHasTeam = ownerTeamIndex >= 0;
      const ownerColorIndex = ownerConfig?.colorIndex ?? b.ownerId % CHARACTER_COLORS.length;
      const boomerangColor = ownerHasTeam
        ? TEAM_COLORS[ownerTeamIndex].color
        : CHARACTER_COLORS[ownerColorIndex].color1;

      const radius = b.isBig ? BOOMERANG_CONFIG.bigRadius : BOOMERANG_CONFIG.radius;

      // 发光
      ctx.shadowColor = boomerangColor;
      ctx.shadowBlur = 20;

      ctx.fillStyle = '#ffd700';
      this.drawBoomerangShape(ctx, radius);

      ctx.fillStyle = boomerangColor;
      this.drawBoomerangShape(ctx, radius * 0.6);

      ctx.restore();
    }

    // 绘制回放中的玩家
    for (const p of frame.players) {
      const playerConfig = GameSettings.players?.[p.playerId];
      const teamIndex = playerConfig?.teamIndex ?? -1;
      const hasTeam = teamIndex >= 0;
      const colorIndex = playerConfig?.colorIndex ?? p.playerId % CHARACTER_COLORS.length;
      const shapeIndex = playerConfig?.shapeIndex ?? p.playerId % CHARACTER_SHAPES.length;

      const color = hasTeam
        ? {
            color1: TEAM_COLORS[teamIndex].color,
            color2: this.darkenColor(TEAM_COLORS[teamIndex].color, 0.3),
          }
        : CHARACTER_COLORS[colorIndex];
      const shape = CHARACTER_SHAPES[shapeIndex];

      ctx.save();
      ctx.translate(p.x, p.y);

      // 死亡玩家半透明
      if (!p.alive) {
        ctx.globalAlpha = 0.3;
      }

      // 绘制角色
      const radius = PLAYER_CONFIG.radius;
      CharacterRenderer.renderShape(
        ctx,
        shape.id,
        color.color1,
        color.color2,
        radius,
        p.angle,
        GameState.time
      );

      // 冲刺效果
      if (p.dashing) {
        ctx.strokeStyle = color.color1;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 蓄力效果
      if (p.charging) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 绘制回放中的环形效果
    if (frame.rings) {
      for (const r of frame.rings) {
        ctx.save();
        ctx.globalAlpha = r.alpha;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 绘制回放中的粒子效果
    if (frame.particles) {
      for (const p of frame.particles) {
        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /**
   * 将玩家按队伍分组
   */
  private groupPlayersByTeam(players: typeof GameState.playerScores): Array<{
    teamIndex: number;
    members: typeof GameState.playerScores;
    score: number;
    previousScore: number;
    color: { color1: string; color2: string };
  }> {
    const groups: Map<number, typeof GameState.playerScores> = new Map();

    for (const p of players) {
      const playerConfig = GameSettings.players?.[p.playerId];
      const teamIndex = playerConfig?.teamIndex ?? -1;

      // Solo 玩家用负数作为唯一key
      const key = teamIndex >= 0 ? teamIndex : -(p.playerId + 100);

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(p);
    }

    const result: Array<{
      teamIndex: number;
      members: typeof GameState.playerScores;
      score: number;
      previousScore: number;
      color: { color1: string; color2: string };
    }> = [];

    for (const [key, members] of groups) {
      const isTeam = key >= 0;
      const teamIndex = isTeam ? key : -1;

      // 队伍分数取第一个成员的分数（队伍内共享分数）
      // 实际上应该是队伍总分，但当前设计是个人分数
      // 这里我们使用队伍内最高分作为队伍分数
      const score = Math.max(...members.map((m) => m.score));
      const previousScore = Math.max(
        ...members.map((m) => GameState.previousScores[m.playerId] ?? 0)
      );

      let color: { color1: string; color2: string };
      if (isTeam) {
        const teamColor = TEAM_COLORS[teamIndex];
        color = { color1: teamColor.color, color2: this.darkenColor(teamColor.color, 0.3) };
      } else {
        const playerConfig = GameSettings.players?.[members[0].playerId];
        const colorIndex =
          playerConfig?.colorIndex ?? members[0].playerId % CHARACTER_COLORS.length;
        color = CHARACTER_COLORS[colorIndex];
      }

      result.push({ teamIndex, members, score, previousScore, color });
    }

    return result;
  }

  /**
   * 渲染分数圆圈（横向排列）
   * @param startX 起始X坐标
   * @param centerY 中心Y坐标
   * @param currentScore 当前分数
   * @param previousScore 动画开始前的分数
   * @param maxScore 满分
   * @param color 颜色
   * @param isWinner 是否是本回合胜者
   */
  private renderScoreCirclesHorizontal(
    ctx: CanvasRenderingContext2D,
    startX: number,
    centerY: number,
    currentScore: number,
    previousScore: number,
    maxScore: number,
    color: string,
    isWinner: boolean
  ): void {
    const circleRadius = 12;
    const circleGap = 8;

    // 动画进度 (0 到 1，用于新点亮的圆圈)
    const animProgress = Math.min(1, GameState.roundEndAnimTime / 30); // 30帧 = 0.5秒动画

    for (let i = 0; i < maxScore; i++) {
      const cx = startX + i * (circleRadius * 2 + circleGap) + circleRadius;
      const cy = centerY;

      const isLit = i < currentScore;
      const isNewlyLit = i >= previousScore && i < currentScore;

      ctx.save();

      if (isLit) {
        if (isNewlyLit) {
          // 新点亮的圆圈 - 带动画效果
          const scale = 1 + (1 - animProgress) * 0.8; // 从1.8缩小到1
          const glowIntensity = 20 + (1 - animProgress) * 30; // 发光从50减到20

          ctx.translate(cx, cy);
          ctx.scale(scale, scale);

          // 发光效果
          ctx.shadowColor = color;
          ctx.shadowBlur = glowIntensity;

          // 圆圈填充
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(0, 0, circleRadius, 0, Math.PI * 2);
          ctx.fill();

          // 边框
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // 内部小高光
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath();
          ctx.arc(-circleRadius * 0.3, -circleRadius * 0.3, circleRadius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 已点亮的圆圈
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // 内部小高光
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.arc(
            cx - circleRadius * 0.3,
            cy - circleRadius * 0.3,
            circleRadius * 0.25,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      } else {
        // 未点亮的圆圈 - 暗灰色空心
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 内部微弱填充
        ctx.fillStyle = 'rgba(50,50,70,0.4)';
        ctx.fill();
      }

      ctx.restore();
    }

    // 如果是胜者，给整组圆圈添加脉动效果
    if (isWinner && animProgress >= 1) {
      const pulseAlpha = 0.3 + Math.sin(GameState.time * 0.15) * 0.15;
      const pulseRadius = circleRadius + 4 + Math.sin(GameState.time * 0.15) * 2;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = pulseAlpha;

      // 给所有点亮的圆圈加脉动环
      for (let i = 0; i < currentScore && i < maxScore; i++) {
        const cx = startX + i * (circleRadius * 2 + circleGap) + circleRadius;

        ctx.beginPath();
        ctx.arc(cx, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /**
   * 将颜色变暗
   * @param hex 十六进制颜色
   * @param factor 变暗系数 (0-1)
   */
  private darkenColor(hex: string, factor: number): string {
    // 移除 # 前缀
    const color = hex.replace('#', '');

    // 解析 RGB
    let r = parseInt(color.substring(0, 2), 16);
    let g = parseInt(color.substring(2, 4), 16);
    let b = parseInt(color.substring(4, 6), 16);

    // 变暗
    r = Math.round(r * (1 - factor));
    g = Math.round(g * (1 - factor));
    b = Math.round(b * (1 - factor));

    // 转回十六进制
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * 渲染地形（冰面、水面）
   */
  private renderTerrains(ctx: CanvasRenderingContext2D): void {
    const terrains = this.engine.world.entities.filter(
      (e): e is GameEntity & { terrain: TerrainData } =>
        !!e.tags?.values.includes(EntityTags.TERRAIN) && e.terrain !== undefined
    );

    for (const terrain of terrains) {
      if (!terrain.transform || !terrain.terrain) continue;

      const { terrain: t, transform } = terrain;
      const halfW = t.width / 2;
      const halfH = t.height / 2;

      ctx.save();
      ctx.translate(transform.x, transform.y);

      if (t.type === 'ice') {
        // 冰面渲染 - 淡蓝色半透明
        const iceGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(halfW, halfH));
        iceGrad.addColorStop(0, 'rgba(180, 220, 255, 0.6)');
        iceGrad.addColorStop(0.7, 'rgba(150, 200, 255, 0.4)');
        iceGrad.addColorStop(1, 'rgba(120, 180, 255, 0.2)');

        ctx.fillStyle = iceGrad;
        ctx.fillRect(-halfW, -halfH, t.width, t.height);

        // 冰晶纹理
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = -halfW; x < halfW; x += gridSize) {
          for (let y = -halfH; y < halfH; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + gridSize * 0.7, y + gridSize * 0.3);
            ctx.stroke();
          }
        }

        // 边框
        ctx.strokeStyle = 'rgba(150, 200, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-halfW, -halfH, t.width, t.height);
      } else if (t.type === 'water') {
        // 水面渲染 - 深蓝色带波纹
        const waterGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(halfW, halfH));
        waterGrad.addColorStop(0, 'rgba(30, 80, 150, 0.9)');
        waterGrad.addColorStop(0.5, 'rgba(20, 60, 120, 0.85)');
        waterGrad.addColorStop(1, 'rgba(10, 40, 100, 0.8)');

        ctx.fillStyle = waterGrad;
        ctx.fillRect(-halfW, -halfH, t.width, t.height);

        // 波纹效果
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)';
        ctx.lineWidth = 2;
        const waveTime = GameState.time * 0.05;
        for (let i = 0; i < 3; i++) {
          const waveRadius = 30 + i * 40 + Math.sin(waveTime + i) * 10;
          ctx.globalAlpha = 0.3 - i * 0.08;
          ctx.beginPath();
          ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // 危险边框
        ctx.strokeStyle = '#f44';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(-halfW, -halfH, t.width, t.height);
        ctx.setLineDash([]);
      }

      ctx.restore();
    }
  }

  /**
   * 渲染传送门
   */
  private renderPortals(ctx: CanvasRenderingContext2D): void {
    const portals = this.engine.world.entities.filter(
      (e): e is GameEntity & { portal: PortalData } =>
        !!e.tags?.values.includes(EntityTags.PORTAL) && e.portal !== undefined
    );

    for (const portal of portals) {
      if (!portal.transform || !portal.portal) continue;

      const { portal: p, transform } = portal;

      ctx.save();
      ctx.translate(transform.x, transform.y);

      // 外圈发光
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 30;

      // 旋转的外环
      ctx.save();
      ctx.rotate(p.rotation);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 8, 0, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();

      // 内环（反向旋转）
      ctx.save();
      ctx.rotate(-p.rotation * 1.5);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius - 5, Math.PI * 0.3, Math.PI * 1.8);
      ctx.stroke();
      ctx.restore();

      // 中心漩涡
      const vortexGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
      vortexGrad.addColorStop(0, p.color);
      vortexGrad.addColorStop(0.5, `${p.color}80`);
      vortexGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = vortexGrad;
      ctx.globalAlpha = 0.5 + Math.sin(GameState.time * 0.1) * 0.2;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // 中心亮点
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.8 + Math.sin(GameState.time * 0.15) * 0.2;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  /**
   * 渲染滚石
   */
  private renderBoulders(ctx: CanvasRenderingContext2D): void {
    const boulders = this.engine.world.entities.filter(
      (e): e is GameEntity & { boulder: BoulderData } =>
        !!e.tags?.values.includes(EntityTags.BOULDER) && e.boulder !== undefined
    );

    for (const boulder of boulders) {
      if (!boulder.transform || !boulder.boulder) continue;

      const { boulder: b, transform } = boulder;

      ctx.save();
      ctx.translate(transform.x, transform.y);

      if (b.active) {
        // 活动滚石 - 滚动的大石头
        const rollAngle = GameState.time * 0.2;

        // 阴影
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(5, 8, b.radius * 0.9, b.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 石头主体
        ctx.save();
        ctx.rotate(rollAngle);

        const stoneGrad = ctx.createRadialGradient(
          -b.radius * 0.3,
          -b.radius * 0.3,
          0,
          0,
          0,
          b.radius
        );
        stoneGrad.addColorStop(0, '#8b7355');
        stoneGrad.addColorStop(0.5, '#6b5344');
        stoneGrad.addColorStop(1, '#4a3a2a');

        ctx.fillStyle = stoneGrad;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // 石头纹理
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-b.radius * 0.5, -b.radius * 0.3);
        ctx.lineTo(b.radius * 0.2, b.radius * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(b.radius * 0.3, -b.radius * 0.5);
        ctx.lineTo(-b.radius * 0.1, b.radius * 0.4);
        ctx.stroke();

        // 高光
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(
          -b.radius * 0.3,
          -b.radius * 0.3,
          b.radius * 0.3,
          b.radius * 0.2,
          -0.5,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.restore();

        // 滚动尘土效果
        ctx.fillStyle = 'rgba(139, 115, 85, 0.3)';
        for (let i = 0; i < 3; i++) {
          const dustX = -b.direction.x * (20 + i * 15);
          const dustY = -b.direction.y * (20 + i * 15) + Math.sin(GameState.time * 0.3 + i) * 5;
          const dustSize = 8 - i * 2;
          ctx.beginPath();
          ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // 发射器 - 显示为凹槽/洞口
        ctx.fillStyle = 'rgba(50, 40, 30, 0.8)';
        ctx.beginPath();
        ctx.ellipse(0, 0, b.radius * 0.8, b.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 发射指示（箭头）
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        const arrowLen = 30;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(b.direction.x * arrowLen, b.direction.y * arrowLen);
        ctx.stroke();

        // 倒计时指示
        const chargeRatio = 1 - b.spawnTimer / b.spawnInterval;
        if (chargeRatio > 0.5) {
          ctx.strokeStyle = `rgba(255, ${Math.floor(255 - chargeRatio * 200)}, 0, ${chargeRatio})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, b.radius * 0.6, -Math.PI / 2, -Math.PI / 2 + chargeRatio * Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }

  /**
   * 渲染毒圈
   */
  private renderPoisonZones(ctx: CanvasRenderingContext2D): void {
    const poisonZones = this.engine.world.entities.filter(
      (e): e is GameEntity & { poisonZone: PoisonZoneData } =>
        !!e.tags?.values.includes(EntityTags.POISON_ZONE) && e.poisonZone !== undefined
    );

    for (const zone of poisonZones) {
      if (!zone.poisonZone) continue;

      const pz = zone.poisonZone;

      ctx.save();

      // 毒圈外的区域（危险区）- 用填充整个画布然后切掉安全区的方式
      ctx.fillStyle = 'rgba(128, 0, 128, 0.3)';
      ctx.beginPath();
      ctx.rect(0, 0, this.engine.width, this.engine.height);
      ctx.arc(pz.centerX, pz.centerY, pz.currentRadius, 0, Math.PI * 2, true);
      ctx.fill();

      // 毒圈边界 - 脉动效果
      const pulseRadius = pz.currentRadius + Math.sin(GameState.time * 0.1) * 5;
      const pulseAlpha = 0.6 + Math.sin(GameState.time * 0.15) * 0.2;

      ctx.strokeStyle = `rgba(180, 0, 180, ${pulseAlpha})`;
      ctx.lineWidth = 6;
      ctx.shadowColor = '#a0f';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(pz.centerX, pz.centerY, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 内层边界
      ctx.strokeStyle = 'rgba(200, 100, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(pz.centerX, pz.centerY, pz.currentRadius - 5, 0, Math.PI * 2);
      ctx.stroke();

      // 目标圈（如果正在收缩）
      if (pz.currentRadius > pz.targetRadius + 10) {
        ctx.setLineDash([15, 10]);
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.5)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(pz.centerX, pz.centerY, pz.targetRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 毒气粒子效果（在边界上）
      ctx.fillStyle = 'rgba(180, 50, 255, 0.6)';
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2 + GameState.time * 0.02;
        const wobble = Math.sin(GameState.time * 0.1 + i * 0.5) * 15;
        const px = pz.centerX + Math.cos(angle) * (pz.currentRadius + wobble);
        const py = pz.centerY + Math.sin(angle) * (pz.currentRadius + wobble);
        const size = 4 + Math.sin(GameState.time * 0.2 + i) * 2;

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
