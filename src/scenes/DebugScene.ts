/**
 * 调试场景
 * 用于测试所有道具和地形
 */

import { CameraSystem, InputSystem, Scene } from 'you-engine';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  GameSettings,
  MAP_LAYOUTS,
  POWERUP_CONFIG,
} from '../config/GameConfig';
import { GameState } from '../config/GameState';
import {
  createBoulderSpawner,
  createIceTerrain,
  createPlayer,
  createPortal,
  createPowerup,
  createWall,
  createWaterTerrain,
} from '../entities/factories';
import type { GameEntity, PlayerData } from '../entities/types';
import { EntityTags } from '../entities/types';

declare global {
  interface Window {
    updateScoreUI: () => void;
    showMessage: (text: string, duration?: number) => void;
    playSound: (type: string) => void;
  }
}

export class DebugScene extends Scene {
  private input!: InputSystem;
  private camera!: CameraSystem;
  private currentMapIndex = 0;
  private powerupIndex = 0;
  private menuCooldown = 0;

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
    this.camera.zoom = 0.6; // 缩小以看到全图

    // 初始化状态
    GameState.state = 'fight';
    GameState.time = 0;
    GameState.paused = false;

    // 设置调试模式
    GameSettings.gameMode = 'tutorial';

    // 初始化场景
    this.setupDebugScene();

    // 显示帮助信息
    window.showMessage?.('调试模式: ↑↓切换道具 ←→切换地图 按 + 返回', 3000);
  }

  onExit(): void {
    GameState.state = 'title';
  }

  private setupDebugScene(): void {
    // 清除所有实体
    for (const entity of [...this.engine.world.entities]) {
      this.engine.despawn(entity);
    }

    // 创建单个玩家
    const player = createPlayer(0, DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
    player.player!.gamepadIndex = -99; // 键盘控制
    this.engine.spawn(player);

    // 生成当前地图
    this.spawnCurrentMap();

    // 生成所有道具展示
    this.spawnPowerupsDisplay();

    // 生成地形测试元素
    this.spawnTerrainElements();
  }

  private spawnTerrainElements(): void {
    // 冰面 - 左上角
    const ice = createIceTerrain(100, 100, 200, 150);
    this.engine.spawn(ice);

    // 水面 - 右上角
    const water = createWaterTerrain(DESIGN_WIDTH - 300, 100, 180, 120);
    this.engine.spawn(water);

    // 传送门对 - 左下和右下
    const portal1 = createPortal(200, DESIGN_HEIGHT - 200, 1, 2, '#a855f7');
    const portal2 = createPortal(DESIGN_WIDTH - 200, DESIGN_HEIGHT - 200, 2, 1, '#f97316');
    this.engine.spawn(portal1);
    this.engine.spawn(portal2);

    // 滚石发射器 - 从左边射向右边
    const boulderSpawner = createBoulderSpawner(80, DESIGN_HEIGHT / 2, 1, 0, 240);
    this.engine.spawn(boulderSpawner);

    // 毒圈 - 可选，注释掉因为会影响测试
    // const poison = createPoisonZone(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, 800, 200, 0.2);
    // this.engine.spawn(poison);
  }

  private spawnCurrentMap(): void {
    // 清除旧墙体
    const walls = this.engine.world.entities.filter((e) =>
      e.tags?.values.includes(EntityTags.WALL)
    );
    for (const wall of walls) {
      this.engine.despawn(wall);
    }

    // 生成新地图
    const layout = MAP_LAYOUTS[this.currentMapIndex];
    for (const block of layout) {
      const x = block.bx * DESIGN_WIDTH + block.ox;
      const y = block.by * DESIGN_HEIGHT + block.oy;
      const wall = createWall(x, y, block.bw, block.bh);
      this.engine.spawn(wall);
    }
  }

  private spawnPowerupsDisplay(): void {
    // 清除旧道具
    const powerups = this.engine.world.entities.filter((e) =>
      e.tags?.values.includes(EntityTags.POWERUP)
    );
    for (const p of powerups) {
      this.engine.despawn(p);
    }

    // 在场景底部排列所有道具类型
    const types = POWERUP_CONFIG.types;
    const spacing = DESIGN_WIDTH / (types.length + 1);
    const y = DESIGN_HEIGHT - 100;

    for (let i = 0; i < types.length; i++) {
      const x = spacing * (i + 1);
      const powerup = createPowerup(x, y, types[i]);
      this.engine.spawn(powerup);
    }
  }

  onUpdate(_dt: number): void {
    GameState.time++;

    if (this.menuCooldown > 0) {
      this.menuCooldown--;
    }

    // 检测返回主菜单
    if (this.input.isPressed('pause') || this.input.isPressed('back')) {
      this.engine.goto('menu');
      return;
    }

    // 处理调试控制
    this.handleDebugInput();

    // 更新屏幕震动
    this.updateShake();
  }

  private handleDebugInput(): void {
    if (this.menuCooldown > 0) return;

    const moveX = this.input.axisX() || this.input.axisX(0);
    const moveY = this.input.axisY() || this.input.axisY(0);

    // 左右切换地图
    if (Math.abs(moveX) > 0.5) {
      const delta = moveX > 0 ? 1 : -1;
      this.currentMapIndex =
        (this.currentMapIndex + delta + MAP_LAYOUTS.length) % MAP_LAYOUTS.length;
      this.spawnCurrentMap();
      window.showMessage?.(`地图 ${this.currentMapIndex + 1}/${MAP_LAYOUTS.length}`, 1000);
      this.menuCooldown = 15;
    }

    // 上下切换当前选中道具并给玩家添加
    if (Math.abs(moveY) > 0.5) {
      const delta = moveY > 0 ? 1 : -1;
      const types = POWERUP_CONFIG.types;
      this.powerupIndex = (this.powerupIndex + delta + types.length) % types.length;

      // 给玩家添加道具效果
      const players = this.engine.world.entities.filter(
        (e): e is GameEntity & { player: PlayerData } =>
          !!e.tags?.values.includes(EntityTags.PLAYER) && e.player !== undefined
      );

      if (players.length > 0) {
        const player = players[0];
        const type = types[this.powerupIndex];

        // 清除旧道具效果
        player.player.powerups = [];
        player.player.shieldHits = 0;

        // 添加新道具效果
        player.player.powerups.push({ type, timer: 9999 });
        if (type === 'shield') {
          player.player.shieldHits = 3;
        }

        window.showMessage?.(`道具: ${type}`, 1000);
      }
      this.menuCooldown = 15;
    }

    // 按 A/空格 生成道具到玩家位置
    if (this.input.isReleased('action')) {
      const players = this.engine.world.entities.filter(
        (e): e is GameEntity & { player: PlayerData } =>
          !!e.tags?.values.includes(EntityTags.PLAYER) && e.player !== undefined
      );

      if (players.length > 0 && players[0].transform) {
        const types = POWERUP_CONFIG.types;
        const type = types[this.powerupIndex];
        const powerup = createPowerup(players[0].transform.x, players[0].transform.y - 50, type);
        this.engine.spawn(powerup);
        window.showMessage?.(`生成道具: ${type}`, 500);
      }
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
}
