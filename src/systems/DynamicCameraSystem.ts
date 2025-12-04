/**
 * 动态摄像机系统
 * 自动跟随多玩家，保持所有玩家在视野内
 */

import { System, CameraSystem } from 'you-engine';
import type { GameEntity, PlayerData } from '../entities/types';
import { EntityTags } from '../entities/types';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../config/GameConfig';
import { GameState } from '../config/GameState';

// 摄像机配置
export const CAMERA_CONFIG = {
  // 最小和最大缩放
  minZoom: 0.6,
  maxZoom: 1.2,
  defaultZoom: 1.0,

  // 玩家边距（屏幕边缘到玩家的最小距离）
  playerPadding: 180,

  // 平滑参数
  positionLerp: 0.08,  // 位置平滑系数
  zoomLerp: 0.05,       // 缩放平滑系数

  // 击杀时的特写效果
  killZoom: 1.4,
  killZoomDuration: 30,

  // 震动效果（额外的摄像机震动）
  shakeDecay: 0.92,
};

export class DynamicCameraSystem extends System {
  private camera!: CameraSystem;

  // 当前摄像机状态
  private currentX = DESIGN_WIDTH / 2;
  private currentY = DESIGN_HEIGHT / 2;
  private currentZoom = 1.0;

  // 目标状态
  private targetX = DESIGN_WIDTH / 2;
  private targetY = DESIGN_HEIGHT / 2;
  private targetZoom = 1.0;

  // 特写效果
  private killFocusTimer = 0;
  private killFocusX = 0;
  private killFocusY = 0;

  // 是否启用动态摄像机（使用不同名称避免与基类冲突）
  private dynamicEnabled = true;

  onCreate(): void {
    this.camera = this.system(CameraSystem);
  }

  onUpdate(_dt: number): void {
    if (!this.dynamicEnabled) return;

    // 获取所有存活玩家
    const players = this.getAlivePlayers();

    if (players.length === 0) {
      // 没有玩家时，返回默认位置
      this.targetX = DESIGN_WIDTH / 2;
      this.targetY = DESIGN_HEIGHT / 2;
      this.targetZoom = CAMERA_CONFIG.defaultZoom;
    } else if (this.killFocusTimer > 0) {
      // 击杀特写效果
      this.updateKillFocus();
    } else {
      // 正常跟随
      this.updateFollowPlayers(players);
    }

    // 平滑插值
    this.currentX += (this.targetX - this.currentX) * CAMERA_CONFIG.positionLerp;
    this.currentY += (this.targetY - this.currentY) * CAMERA_CONFIG.positionLerp;
    this.currentZoom += (this.targetZoom - this.currentZoom) * CAMERA_CONFIG.zoomLerp;

    // 限制缩放范围
    this.currentZoom = Math.max(CAMERA_CONFIG.minZoom, Math.min(CAMERA_CONFIG.maxZoom, this.currentZoom));

    // 限制摄像机位置（不要超出地图边界太多）
    const halfW = (DESIGN_WIDTH / 2) / this.currentZoom;
    const halfH = (DESIGN_HEIGHT / 2) / this.currentZoom;
    const margin = 100;

    this.currentX = Math.max(halfW - margin, Math.min(DESIGN_WIDTH - halfW + margin, this.currentX));
    this.currentY = Math.max(halfH - margin, Math.min(DESIGN_HEIGHT - halfH + margin, this.currentY));

    // 应用震动效果
    const shakeX = GameState.shake.x;
    const shakeY = GameState.shake.y;

    // 更新摄像机（直接设置值避免双重平滑）
    this.camera.x = this.currentX + shakeX;
    this.camera.y = this.currentY + shakeY;
    this.camera.targetX = this.currentX + shakeX;
    this.camera.targetY = this.currentY + shakeY;
    this.camera.zoom = this.currentZoom;
    this.camera.targetZoom = this.currentZoom;
  }

  /** 获取所有存活玩家 */
  private getAlivePlayers(): Array<GameEntity & { player: PlayerData }> {
    return this.engine.world.entities.filter(
      (e): e is GameEntity & { player: PlayerData } =>
        !!(e.tags?.values.includes(EntityTags.PLAYER)) &&
        e.player !== undefined &&
        (e.player as PlayerData).alive
    );
  }

  /** 更新跟随玩家 */
  private updateFollowPlayers(players: Array<GameEntity & { player: PlayerData }>): void {
    if (players.length === 0) return;

    // 计算玩家包围盒
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let sumX = 0, sumY = 0;

    for (const player of players) {
      if (!player.transform) continue;
      const x = player.transform.x;
      const y = player.transform.y;

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      sumX += x;
      sumY += y;
    }

    // 中心点
    this.targetX = sumX / players.length;
    this.targetY = sumY / players.length;

    // 计算需要的缩放以容纳所有玩家
    const padding = CAMERA_CONFIG.playerPadding;
    const rangeX = maxX - minX + padding * 2;
    const rangeY = maxY - minY + padding * 2;

    // 计算需要的缩放比例
    const zoomX = DESIGN_WIDTH / rangeX;
    const zoomY = DESIGN_HEIGHT / rangeY;

    // 使用较小的缩放值（确保所有玩家都在视野内）
    this.targetZoom = Math.min(zoomX, zoomY);

    // 如果只有一个玩家或玩家很近，使用默认缩放
    if (players.length === 1 || (rangeX < 400 && rangeY < 300)) {
      this.targetZoom = CAMERA_CONFIG.defaultZoom;
    }
  }

  /** 更新击杀特写 */
  private updateKillFocus(): void {
    this.killFocusTimer--;

    // 特写位置
    this.targetX = this.killFocusX;
    this.targetY = this.killFocusY;

    // 根据时间调整缩放
    const progress = this.killFocusTimer / CAMERA_CONFIG.killZoomDuration;
    if (progress > 0.5) {
      // 前半段：放大
      this.targetZoom = CAMERA_CONFIG.defaultZoom + (CAMERA_CONFIG.killZoom - CAMERA_CONFIG.defaultZoom) * (1 - progress) * 2;
    } else {
      // 后半段：恢复
      this.targetZoom = CAMERA_CONFIG.killZoom - (CAMERA_CONFIG.killZoom - CAMERA_CONFIG.defaultZoom) * (1 - progress * 2);
    }
  }

  /** 触发击杀特写效果 */
  triggerKillFocus(x: number, y: number): void {
    this.killFocusTimer = CAMERA_CONFIG.killZoomDuration;
    this.killFocusX = x;
    this.killFocusY = y;
  }

  /** 启用/禁用动态摄像机 */
  setEnabled(enabled: boolean): void {
    this.dynamicEnabled = enabled;
    if (!this.dynamicEnabled) {
      // 禁用时重置到默认
      this.camera.setPosition(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
      this.camera.zoom = 1.0;
      this.camera.targetZoom = 1.0;
    }
  }

  /** 立即设置摄像机位置（无平滑） */
  setPositionImmediate(x: number, y: number): void {
    this.currentX = x;
    this.currentY = y;
    this.targetX = x;
    this.targetY = y;
    this.camera.setPosition(x, y);
  }

  /** 立即设置缩放（无平滑） */
  setZoomImmediate(zoom: number): void {
    this.currentZoom = zoom;
    this.targetZoom = zoom;
    this.camera.zoom = zoom;
    this.camera.targetZoom = zoom;
  }

  /** 获取当前缩放值 */
  getZoom(): number {
    return this.currentZoom;
  }

  /** 获取当前位置 */
  getPosition(): { x: number; y: number } {
    return { x: this.currentX, y: this.currentY };
  }
}
