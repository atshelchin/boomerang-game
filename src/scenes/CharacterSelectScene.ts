/**
 * 角色选择场景
 * 类似大乱斗的角色选择界面
 * 支持组队或 Solo 模式
 */

import { Scene, InputSystem } from 'you-engine';
import { PLAYER_SKINS, GameSettings, DESIGN_WIDTH, DESIGN_HEIGHT, CHARACTER_COLORS, CHARACTER_SHAPES } from '../config/GameConfig';
import { GameState } from '../config/GameState';
import { i18n } from '../config/i18n';
import { CharacterRenderer } from '../utils/CharacterRenderer';

/** 玩家类型 */
type PlayerType = 'none' | 'human' | 'cpu';

/** 玩家槽位状态 */
interface PlayerSlot {
  /** 玩家类型 */
  type: PlayerType;
  /** 手柄索引 (-1 表示未分配, -2 表示 CPU) */
  gamepadIndex: number;
  /** 选择的皮肤索引（兼容旧代码） */
  skinIndex: number;
  /** 选择的颜色索引 */
  colorIndex: number;
  /** 选择的形状索引 */
  shapeIndex: number;
  /** 是否已确认 (ready) */
  ready: boolean;
  /** 自定义名字 */
  name: string;
  /** 动画计时器 */
  animTimer: number;
  /** 队伍索引 (-1 表示 Solo) */
  teamIndex: number;
  /** 当前选择的设置项: 0=颜色, 1=形状, 2=队伍 */
  settingIndex: number;
}

/** 手柄光标状态 */
interface GamepadCursor {
  /** 当前选中的槽位索引 */
  slotIndex: number;
  /** 是否已加入到某个槽位 */
  joinedSlotIndex: number; // -1 表示未加入
  /** 光标颜色 */
  color: string;
  /** 动画计时 */
  animTimer: number;
}

/** 主控管理光标（主控加入后用于管理其他槽位） */
interface MasterManageCursor {
  slotIndex: number;
  animTimer: number;
  active: boolean; // 是否激活管理模式
}

/** 最大玩家数 */
const MAX_PLAYERS = 4;

/** 最小开始玩家数 */
const MIN_PLAYERS = 2;

/** 光标颜色 */
const CURSOR_COLORS = ['#4ecdc4', '#ff6b6b', '#ffd700', '#a855f7'];

export class CharacterSelectScene extends Scene {
  private input!: InputSystem;
  private ctx!: CanvasRenderingContext2D;

  /** 玩家槽位 */
  private slots: PlayerSlot[] = [];

  /** 每个手柄的光标状态 */
  private cursors: Map<number, GamepadCursor> = new Map();

  /** 动画时间 */
  private time = 0;

  /** 倒计时 (所有玩家准备后开始) */
  private countdown = -1;

  /** 提示闪烁 */
  private hintFlash = 0;

  /** 已连接的手柄 */
  private connectedGamepads: Set<number> = new Set();

  /** 主控手柄索引 (第一个连接的手柄，用于添加 CPU) */
  private masterGamepadIndex = -1;

  /** 主控管理光标（主控加入后用于管理其他槽位） */
  private masterManageCursor: MasterManageCursor = {
    slotIndex: 0,
    animTimer: 0,
    active: false,
  };

  /** 长按开始计时器 */
  private startHoldTimer = 0;

  /** 需要长按的帧数 (约1.5秒) */
  private readonly START_HOLD_FRAMES = 90;

  onCreate(): void {
    this.input = this.engine.system(InputSystem);

    // 初始化 4 个槽位（每个槽位默认不同的颜色和形状）
    for (let i = 0; i < MAX_PLAYERS; i++) {
      this.slots.push({
        type: 'none',
        gamepadIndex: -1,
        skinIndex: i % PLAYER_SKINS.length,
        colorIndex: i % CHARACTER_COLORS.length,
        shapeIndex: i % CHARACTER_SHAPES.length,
        ready: false,
        name: `P${i + 1}`,
        animTimer: 0,
        teamIndex: -1, // 默认 Solo
        settingIndex: 0,
      });
    }

    // 监听手柄连接事件
    this.engine.on('gamepad:connected', this.onGamepadConnected as (data: unknown) => void);
    this.engine.on('gamepad:disconnected', this.onGamepadDisconnected as (data: unknown) => void);
  }

  onEnter(): void {
    GameState.state = 'select';
    this.time = 0;
    this.countdown = -1;
    this.hintFlash = 0;

    // 重置所有槽位
    for (let i = 0; i < MAX_PLAYERS; i++) {
      this.slots[i].type = 'none';
      this.slots[i].gamepadIndex = -1;
      this.slots[i].skinIndex = i % PLAYER_SKINS.length;
      this.slots[i].ready = false;
      this.slots[i].name = `P${i + 1}`;
      this.slots[i].animTimer = 0;
      this.slots[i].teamIndex = -1;
      this.slots[i].settingIndex = 0;
    }

    // 重置光标和主控
    this.cursors.clear();
    this.masterGamepadIndex = -1;
    this.startHoldTimer = 0;
    this.masterManageCursor = { slotIndex: 0, animTimer: 0, active: false };

    // 检查当前已连接的手柄，为每个手柄创建光标
    this.connectedGamepads.clear();
    const gamepads = this.input.getConnectedGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      this.connectedGamepads.add(gp.index);
      // 为每个手柄创建光标，初始位置错开
      this.cursors.set(gp.index, {
        slotIndex: i % MAX_PLAYERS,
        joinedSlotIndex: -1,
        color: CURSOR_COLORS[i % CURSOR_COLORS.length],
        animTimer: 0,
      });
      // 第一个连接的手柄成为主控
      if (this.masterGamepadIndex === -1) {
        this.masterGamepadIndex = gp.index;
      }
    }

    // 隐藏所有 HTML overlay，Canvas 自己渲染
    document.getElementById('startScreen')?.classList.add('hidden');
    document.getElementById('pauseScreen')?.classList.add('hidden');
    document.getElementById('winScreen')?.classList.add('hidden');
    document.getElementById('scoreUI')?.classList.add('hidden');
    document.getElementById('characterSelectScreen')?.classList.add('hidden');
  }

  onExit(): void {
    document.getElementById('characterSelectScreen')?.classList.add('hidden');
    // 不再显示旧的 scoreUI，由 Canvas 渲染新的多人得分
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx;

    // 重置变换矩阵，确保坐标从左上角开始（保留引擎的缩放）
    ctx.save();
    const scale = this.engine.scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    this.renderBackground();
    this.renderTitle();
    this.renderPlayerSlots();
    this.renderGamepadStatus();
    this.renderHints();
    if (this.countdown > 0) {
      this.renderCountdown();
    }

    ctx.restore();
  }

  onUpdate(_dt: number): void {
    this.time++;
    this.hintFlash = Math.sin(this.time * 0.1) * 0.5 + 0.5;

    // 更新每个槽位的动画
    for (const slot of this.slots) {
      slot.animTimer++;
    }

    // 处理输入（包含长按开始检查）
    this.handleInput();

    // 倒计时（不再使用，保留以备后用）
    if (this.countdown > 0) {
      this.countdown--;
      if (this.countdown === 0) {
        this.startGame();
      }
    }
  }

  private onGamepadConnected = (data: { index: number; type: string; name: string }): void => {
    this.connectedGamepads.add(data.index);

    // 为新手柄创建光标
    const cursorCount = this.cursors.size;
    this.cursors.set(data.index, {
      slotIndex: cursorCount % MAX_PLAYERS,
      joinedSlotIndex: -1,
      color: CURSOR_COLORS[cursorCount % CURSOR_COLORS.length],
      animTimer: 0,
    });

    // 如果没有主控，第一个连接的手柄成为主控
    if (this.masterGamepadIndex === -1) {
      this.masterGamepadIndex = data.index;
    }
    // 震动反馈
    this.input.vibrate(data.index, { strong: 0.3, weak: 0.5, duration: 100 });
  };

  private onGamepadDisconnected = (data: { index: number }): void => {
    this.connectedGamepads.delete(data.index);

    // 获取该手柄的光标信息
    const cursor = this.cursors.get(data.index);
    if (cursor && cursor.joinedSlotIndex >= 0) {
      // 如果该手柄已加入，移除对应槽位
      const slot = this.slots[cursor.joinedSlotIndex];
      if (slot && slot.gamepadIndex === data.index) {
        slot.type = 'none';
        slot.gamepadIndex = -1;
        slot.ready = false;
      }
    }
    // 删除光标
    this.cursors.delete(data.index);

    // 如果主控手柄断开，选择下一个连接的手柄作为主控
    if (this.masterGamepadIndex === data.index) {
      this.masterGamepadIndex = -1;
      // 找到第一个仍然连接的手柄
      for (const gpIndex of this.connectedGamepads) {
        this.masterGamepadIndex = gpIndex;
        break;
      }
    }
  };

  private handleInput(): void {
    // 处理每个手柄的光标输入
    for (const gpIndex of this.connectedGamepads) {
      this.handleGamepadInput(gpIndex);
    }

    // 处理长按开始（任何已加入的玩家都可以触发）
    this.handleStartHoldCheck();

    // 返回菜单
    if (this.input.isPressed('pause')) {
      this.engine.goto('menu');
    }
  }

  /** 处理单个手柄的输入 */
  private handleGamepadInput(gpIndex: number): void {
    const cursor = this.cursors.get(gpIndex);
    if (!cursor) return;

    cursor.animTimer++;

    const hasJoined = cursor.joinedSlotIndex >= 0;

    if (!hasJoined) {
      // 未加入状态：可以移动光标、加入槽位、或添加 CPU（仅主控）
      this.handleCursorMovement(gpIndex, cursor);
      this.handleJoinSlot(gpIndex, cursor);

      // 主控可以添加/移除 CPU
      if (gpIndex === this.masterGamepadIndex) {
        this.handleCPUManagement(gpIndex, cursor);
      }
    } else {
      // 已加入状态：可以调整设置、准备、退出
      const slot = this.slots[cursor.joinedSlotIndex];
      if (slot && slot.type === 'human' && slot.gamepadIndex === gpIndex) {
        this.handleJoinedPlayerInput(gpIndex, cursor, slot);
      }

      // 主控即使加入后，也可以用 LB/RB 管理其他槽位的 CPU
      if (gpIndex === this.masterGamepadIndex) {
        this.handleMasterManageMode(gpIndex);
      }
    }
  }

  /** 主控管理模式：加入后仍然可以管理 CPU */
  private handleMasterManageMode(gpIndex: number): void {
    this.masterManageCursor.animTimer++;

    // L(4)/R(5) 或 ZL(6)/ZR(7) 左右移动管理光标
    const moveLeft = this.input.isButtonPressed(4, gpIndex) || this.input.isButtonPressed(6, gpIndex);
    const moveRight = this.input.isButtonPressed(5, gpIndex) || this.input.isButtonPressed(7, gpIndex);

    if (moveLeft || moveRight) {
      const delta = moveRight ? 1 : -1;
      this.masterManageCursor.slotIndex =
        (this.masterManageCursor.slotIndex + delta + MAX_PLAYERS) % MAX_PLAYERS;
      this.masterManageCursor.animTimer = 0;
      this.masterManageCursor.active = true;
      this.input.vibrate(gpIndex, { weak: 0.2, duration: 30 });
    }

    // 按 Y(3) 添加/移除 CPU（在管理光标位置）
    if (this.input.isButtonPressed(3, gpIndex) && this.masterManageCursor.active) {
      const slot = this.slots[this.masterManageCursor.slotIndex];

      // 不能操作已被人类占用的槽位
      if (slot.type === 'human') {
        this.input.vibrate(gpIndex, { weak: 0.5, duration: 100 }); // 错误震动
        return;
      }

      if (slot.type === 'none') {
        // 空槽位，添加 CPU
        slot.type = 'cpu';
        slot.gamepadIndex = -2;
        slot.name = `CPU${this.masterManageCursor.slotIndex + 1}`;
        slot.ready = true;

        // 确保皮肤不重复
        const usedSkins = this.slots
          .filter(s => s.type !== 'none' && s !== slot)
          .map(s => s.skinIndex);
        while (usedSkins.includes(slot.skinIndex)) {
          slot.skinIndex = (slot.skinIndex + 1) % PLAYER_SKINS.length;
        }

        this.input.vibrate(gpIndex, { strong: 0.3, duration: 100 });
      } else if (slot.type === 'cpu') {
        // CPU 槽位，移除
        slot.type = 'none';
        slot.gamepadIndex = -1;
        slot.ready = false;
        this.input.vibrate(gpIndex, { weak: 0.3, duration: 50 });
      }
    }

    // 调整 CPU 设置（仅当管理光标激活且目标是 CPU 时）
    if (this.masterManageCursor.active) {
      const slot = this.slots[this.masterManageCursor.slotIndex];
      if (slot.type === 'cpu') {
        const dpadUp = this.input.isButtonPressed(12, gpIndex);
        const dpadDown = this.input.isButtonPressed(13, gpIndex);
        const dpadLeft = this.input.isButtonPressed(14, gpIndex);
        const dpadRight = this.input.isButtonPressed(15, gpIndex);

        // 上下切换设置项（颜色/形状/队伍）
        if (dpadUp || dpadDown) {
          const delta = dpadDown ? 1 : -1;
          slot.settingIndex = (slot.settingIndex + delta + 2) % 2;
          this.input.vibrate(gpIndex, { weak: 0.2, duration: 30 });
        }

        // 左右调整当前设置项的值
        if (dpadLeft || dpadRight) {
          const delta = dpadRight ? 1 : -1;
          switch (slot.settingIndex) {
            case 0: // 颜色
              slot.colorIndex = (slot.colorIndex + delta + CHARACTER_COLORS.length) % CHARACTER_COLORS.length;
              slot.skinIndex = slot.colorIndex; // 保持兼容
              break;
            case 1: // 形状
              slot.shapeIndex = (slot.shapeIndex + delta + CHARACTER_SHAPES.length) % CHARACTER_SHAPES.length;
              break;
          }
          this.input.vibrate(gpIndex, { weak: 0.2, duration: 30 });
        }
      }
    }
  }

  /** 处理光标移动 */
  private handleCursorMovement(gpIndex: number, cursor: GamepadCursor): void {
    // D-Pad 或摇杆左右移动光标
    const dpadLeft = this.input.isButtonPressed(14, gpIndex);
    const dpadRight = this.input.isButtonPressed(15, gpIndex);
    const axisX = this.input.axisX(gpIndex);

    // 摇杆阈值和冷却时间（减少灵敏度）
    const stickThreshold = 0.8;
    const cooldownFrames = 18;

    let moved = false;
    if (dpadLeft || (axisX < -stickThreshold && cursor.animTimer > cooldownFrames)) {
      cursor.slotIndex = (cursor.slotIndex - 1 + MAX_PLAYERS) % MAX_PLAYERS;
      moved = true;
    } else if (dpadRight || (axisX > stickThreshold && cursor.animTimer > cooldownFrames)) {
      cursor.slotIndex = (cursor.slotIndex + 1) % MAX_PLAYERS;
      moved = true;
    }

    if (moved) {
      cursor.animTimer = 0;
      this.input.vibrate(gpIndex, { weak: 0.2, duration: 30 });
    }
  }

  /** 处理加入槽位 */
  private handleJoinSlot(gpIndex: number, cursor: GamepadCursor): void {
    // 按 A 键加入当前光标所在的槽位
    if (this.input.isButtonPressed(0, gpIndex)) {
      const slot = this.slots[cursor.slotIndex];

      if (slot.type === 'none') {
        // 空槽位，加入为人类玩家
        slot.type = 'human';
        slot.gamepadIndex = gpIndex;
        slot.ready = false;
        slot.animTimer = 0;
        cursor.joinedSlotIndex = cursor.slotIndex;

        // 确保皮肤不重复
        const usedSkins = this.slots
          .filter(s => s.type !== 'none' && s !== slot)
          .map(s => s.skinIndex);
        while (usedSkins.includes(slot.skinIndex)) {
          slot.skinIndex = (slot.skinIndex + 1) % PLAYER_SKINS.length;
        }

        this.input.vibrate(gpIndex, { strong: 0.5, weak: 0.8, duration: 200 });
      } else if (slot.type === 'cpu') {
        // CPU 槽位，替换为人类玩家
        slot.type = 'human';
        slot.gamepadIndex = gpIndex;
        slot.ready = false;
        slot.animTimer = 0;
        cursor.joinedSlotIndex = cursor.slotIndex;

        this.input.vibrate(gpIndex, { strong: 0.5, weak: 0.8, duration: 200 });
      }
      // 如果是其他玩家的槽位，不做任何事
    }
  }

  /** 处理 CPU 管理（仅主控，未加入时） */
  private handleCPUManagement(gpIndex: number, cursor: GamepadCursor): void {
    const slot = this.slots[cursor.slotIndex];

    // 按 Y 键添加/移除 CPU
    if (this.input.isButtonPressed(3, gpIndex)) {
      if (slot.type === 'none') {
        // 空槽位，添加 CPU
        slot.type = 'cpu';
        slot.gamepadIndex = -2;
        slot.name = `CPU${cursor.slotIndex + 1}`;
        slot.ready = true;

        // 确保形状不重复
        while (this.isShapeTaken(slot.shapeIndex, slot)) {
          slot.shapeIndex = (slot.shapeIndex + 1) % CHARACTER_SHAPES.length;
        }

        this.input.vibrate(gpIndex, { strong: 0.3, duration: 100 });
      } else if (slot.type === 'cpu') {
        // CPU 槽位，移除
        slot.type = 'none';
        slot.gamepadIndex = -1;
        slot.ready = false;
        this.input.vibrate(gpIndex, { weak: 0.3, duration: 50 });
      }
    }

    // D-Pad 控制 CPU 设置（颜色/形状/队伍）
    if (slot.type === 'cpu') {
      const dpadUp = this.input.isButtonPressed(12, gpIndex);
      const dpadDown = this.input.isButtonPressed(13, gpIndex);
      const dpadLeft = this.input.isButtonPressed(14, gpIndex);
      const dpadRight = this.input.isButtonPressed(15, gpIndex);

      // 上下切换设置项（颜色/形状/队伍）
      if (dpadUp || dpadDown) {
        const delta = dpadDown ? 1 : -1;
        slot.settingIndex = (slot.settingIndex + delta + 2) % 2;
        this.input.vibrate(gpIndex, { weak: 0.2, duration: 30 });
      }

      // 左右调整当前设置项的值
      if (dpadLeft || dpadRight) {
        const delta = dpadRight ? 1 : -1;
        switch (slot.settingIndex) {
          case 0: // 颜色
            slot.colorIndex = (slot.colorIndex + delta + CHARACTER_COLORS.length) % CHARACTER_COLORS.length;
            slot.skinIndex = slot.colorIndex; // 保持兼容
            break;
          case 1: // 形状（跳过已被占用的）
            this.cycleShapeWithConflictCheck(slot, delta);
            break;
        }
        this.input.vibrate(gpIndex, { weak: 0.2, duration: 30 });
      }
    }
  }

  /** 处理已加入玩家的输入 */
  private handleJoinedPlayerInput(gpIndex: number, cursor: GamepadCursor, slot: PlayerSlot): void {
    if (!slot.ready) {
      // 未准备状态：可以调整设置
      this.handleSlotSettings(slot, gpIndex);

      // 按 A(0) 准备
      if (this.input.isButtonPressed(0, gpIndex)) {
        slot.ready = true;
        this.input.vibrate(gpIndex, { strong: 0.5, weak: 0.8, duration: 150 });
      }

      // 按 B(1) 退出槽位（不使用 'dash' 以避免和 L/R 冲突）
      if (this.input.isButtonPressed(1, gpIndex)) {
        slot.type = 'none';
        slot.gamepadIndex = -1;
        slot.ready = false;
        cursor.joinedSlotIndex = -1;
        this.input.vibrate(gpIndex, { weak: 0.3, duration: 50 });
      }
    } else {
      // 已准备状态：按 B 取消准备
      if (this.input.isButtonPressed(1, gpIndex)) {
        slot.ready = false;
        this.countdown = -1;
        this.input.vibrate(gpIndex, { weak: 0.3, duration: 50 });
      }
    }
  }

  /** 检查长按开始 */
  private handleStartHoldCheck(): void {
    const joinedPlayers = this.slots.filter(s => s.type !== 'none');
    const allReady = joinedPlayers.every(s => s.ready);
    const isValidSetup = joinedPlayers.length >= MIN_PLAYERS && allReady && this.validateTeamSetup(joinedPlayers);

    // 检查任意已加入玩家是否长按 A
    let holdingStart = false;
    let holdingGpIndex = -1;

    for (const [gpIndex, cursor] of this.cursors) {
      if (cursor.joinedSlotIndex >= 0 && this.input.isButtonHeld(0, gpIndex)) {
        holdingStart = true;
        holdingGpIndex = gpIndex;
        break;
      }
    }

    if (holdingStart && isValidSetup && holdingGpIndex >= 0) {
      this.startHoldTimer++;
      // 每 30 帧震动一次表示进度
      if (this.startHoldTimer % 30 === 0) {
        const progress = this.startHoldTimer / this.START_HOLD_FRAMES;
        this.input.vibrate(holdingGpIndex, { weak: 0.2 + progress * 0.5, duration: 50 });
      }
      if (this.startHoldTimer >= this.START_HOLD_FRAMES) {
        this.startGame();
      }
    } else {
      this.startHoldTimer = 0;
    }
  }


  /** 处理槽位设置 (颜色/形状/队伍) */
  private handleSlotSettings(slot: PlayerSlot, gpIndex: number): void {
    const moveX = this.input.axisX(gpIndex);
    const moveY = this.input.axisY(gpIndex);

    // 摇杆阈值和冷却时间（减少灵敏度）
    const stickThreshold = 0.8;
    const cooldownFrames = 18;

    // 上下切换设置项 (颜色/形状/队伍)
    // 摇杆向上(moveY < 0)应该向上移动选项(settingIndex减少)
    // 摇杆向下(moveY > 0)应该向下移动选项(settingIndex增加)
    if (Math.abs(moveY) > stickThreshold && slot.animTimer > cooldownFrames) {
      const maxSetting = 2; // 0=颜色, 1=形状, 2=队伍
      if (moveY > 0) {
        // 向下
        slot.settingIndex = (slot.settingIndex + 1) % (maxSetting + 1);
      } else {
        // 向上
        slot.settingIndex = (slot.settingIndex - 1 + maxSetting + 1) % (maxSetting + 1);
      }
      slot.animTimer = 0;
      this.input.vibrate(gpIndex, { weak: 0.2, duration: 30 });
    }

    // 左右切换选项
    if (Math.abs(moveX) > stickThreshold && slot.animTimer > cooldownFrames) {
      const delta = moveX > 0 ? 1 : -1;

      if (slot.settingIndex === 0) {
        // 切换颜色（跳过已被占用的颜色+形状组合）
        this.cycleColorWithConflictCheck(slot, delta);
      } else if (slot.settingIndex === 1) {
        // 切换形状（跳过已被占用的颜色+形状组合）
        this.cycleShapeWithConflictCheck(slot, delta);
      }

      // 同步更新 skinIndex（兼容旧代码）
      slot.skinIndex = slot.colorIndex;

      slot.animTimer = 0;
      this.input.vibrate(gpIndex, { weak: 0.3, duration: 50 });
    }
  }

  /** 检查形状是否已被其他玩家使用（每个形状只能被一个玩家选择） */
  private isShapeTaken(shapeIndex: number, excludeSlot?: PlayerSlot): boolean {
    for (const s of this.slots) {
      if (s === excludeSlot) continue;
      if (s.type !== 'none' && s.shapeIndex === shapeIndex) {
        return true;
      }
    }
    return false;
  }

  /** 切换颜色（颜色不再检查冲突，因为队伍内可以用相同颜色） */
  private cycleColorWithConflictCheck(slot: PlayerSlot, delta: number): void {
    const maxColors = CHARACTER_COLORS.length;
    slot.colorIndex = (slot.colorIndex + delta + maxColors) % maxColors;
  }

  /** 切换形状，跳过已被使用的形状 */
  private cycleShapeWithConflictCheck(slot: PlayerSlot, delta: number): void {
    const maxShapes = CHARACTER_SHAPES.length;
    let newShapeIndex = slot.shapeIndex;
    let attempts = 0;

    do {
      newShapeIndex = (newShapeIndex + delta + maxShapes) % maxShapes;
      attempts++;
      // 如果这个形状没被占用，或者已经尝试了所有形状
      if (!this.isShapeTaken(newShapeIndex, slot) || attempts >= maxShapes) {
        break;
      }
    } while (attempts < maxShapes);

    slot.shapeIndex = newShapeIndex;
  }


  private validateTeamSetup(_joinedPlayers: PlayerSlot[]): boolean {
    // 团队模式已移除，始终返回 true
    return true;
  }

  private startGame(): void {
    // 设置游戏配置
    const joinedSlots = this.slots.filter(s => s.type !== 'none');

    // 保存玩家配置到 GameSettings
    GameSettings.playerCount = joinedSlots.length;
    GameSettings.players = joinedSlots.map((slot) => ({
      gamepadIndex: slot.gamepadIndex,
      skinIndex: slot.skinIndex,
      colorIndex: slot.colorIndex,
      shapeIndex: slot.shapeIndex,
      name: slot.name,
      teamIndex: slot.teamIndex,
    }));

    // 兼容旧配置
    if (joinedSlots.length >= 1) {
      GameSettings.p1Skin = joinedSlots[0].colorIndex;
    }
    if (joinedSlots.length >= 2) {
      GameSettings.p2Skin = joinedSlots[1].colorIndex;
    }

    GameSettings.gameMode = 'pvp';

    // 进入游戏
    this.engine.goto('game');
  }

  // ============ 渲染方法 ============

  private renderBackground(): void {
    const ctx = this.ctx;
    const W = DESIGN_WIDTH;
    const H = DESIGN_HEIGHT;

    // 渐变背景 (更亮的紫色调)
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2d2d4a');
    grad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 动态粒子背景 (更明显)
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137 + this.time * 0.5) % W;
      const y = (i * 97 + this.time * 0.3) % H;
      const size = 2 + Math.sin(i + this.time * 0.02) * 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderTitle(): void {
    const ctx = this.ctx;
    const W = DESIGN_WIDTH;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 标题
    ctx.font = 'bold 48px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#4ecdc4';
    ctx.shadowBlur = 20;
    ctx.fillText(i18n.t.characterSelect?.title || '选择角色', W / 2, 60);
    ctx.shadowBlur = 0;

    // 副标题
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(i18n.t.characterSelect?.subtitle || '按任意按钮加入 · 可组队或Solo', W / 2, 100);

    ctx.restore();
  }

  private renderPlayerSlots(): void {
    const ctx = this.ctx;
    const W = DESIGN_WIDTH;

    const slotWidth = 320;
    const slotHeight = 500;
    const gap = 40;
    const totalWidth = MAX_PLAYERS * slotWidth + (MAX_PLAYERS - 1) * gap;
    const startX = (W - totalWidth) / 2;
    const startY = 140;

    // 渲染所有槽位
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const slot = this.slots[i];
      const x = startX + i * (slotWidth + gap);
      const y = startY;

      this.renderSlot(ctx, slot, x, y, slotWidth, slotHeight, i);
    }

    // 渲染所有光标（在槽位上方）
    this.renderCursors(ctx, startX, startY, slotWidth, slotHeight, gap);
  }

  /** 渲染所有手柄的光标 */
  private renderCursors(
    ctx: CanvasRenderingContext2D,
    startX: number, startY: number,
    slotWidth: number, slotHeight: number,
    gap: number
  ): void {
    // 收集每个槽位上的光标
    const cursorsBySlot: Map<number, Array<{ gpIndex: number; cursor: GamepadCursor }>> = new Map();

    for (const [gpIndex, cursor] of this.cursors) {
      // 只渲染未加入的光标（已加入的玩家光标不显示）
      if (cursor.joinedSlotIndex < 0) {
        const slotIdx = cursor.slotIndex;
        if (!cursorsBySlot.has(slotIdx)) {
          cursorsBySlot.set(slotIdx, []);
        }
        cursorsBySlot.get(slotIdx)!.push({ gpIndex, cursor });
      }
    }

    ctx.save();

    // 渲染每个槽位上的光标
    for (const [slotIdx, cursorsOnSlot] of cursorsBySlot) {
      const slotX = startX + slotIdx * (slotWidth + gap);
      const slotY = startY;

      // 如果多个光标在同一槽位，水平排列
      const cursorSize = 40;
      const cursorGap = 10;
      const totalCursorWidth = cursorsOnSlot.length * cursorSize + (cursorsOnSlot.length - 1) * cursorGap;
      const cursorStartX = slotX + (slotWidth - totalCursorWidth) / 2;
      const cursorY = slotY - 50;

      for (let i = 0; i < cursorsOnSlot.length; i++) {
        const { gpIndex, cursor } = cursorsOnSlot[i];
        const cx = cursorStartX + i * (cursorSize + cursorGap) + cursorSize / 2;
        const cy = cursorY;

        // 光标动画（上下浮动）
        const bob = Math.sin(cursor.animTimer * 0.15) * 5;

        // 判断是否是主控
        const isMaster = gpIndex === this.masterGamepadIndex;

        // 绘制光标箭头
        ctx.save();
        ctx.translate(cx, cy + bob);

        // 光标发光
        ctx.shadowColor = cursor.color;
        ctx.shadowBlur = 15;

        // 箭头形状（向下指）
        ctx.fillStyle = cursor.color;
        ctx.beginPath();
        ctx.moveTo(0, 20);
        ctx.lineTo(-15, -5);
        ctx.lineTo(-5, -5);
        ctx.lineTo(-5, -20);
        ctx.lineTo(5, -20);
        ctx.lineTo(5, -5);
        ctx.lineTo(15, -5);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // 手柄编号
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P${gpIndex + 1}`, 0, -5);

        // 主控标记
        if (isMaster) {
          ctx.fillStyle = '#ffd700';
          ctx.font = '12px sans-serif';
          ctx.fillText('★', 0, -32);
        }

        ctx.restore();
      }
    }

    // 渲染主控管理光标（如果已激活）
    if (this.masterManageCursor.active && this.masterGamepadIndex >= 0) {
      const masterCursor = this.cursors.get(this.masterGamepadIndex);
      // 只在主控已加入后显示管理光标
      if (masterCursor && masterCursor.joinedSlotIndex >= 0) {
        const manageSlotX = startX + this.masterManageCursor.slotIndex * (slotWidth + gap);
        const manageSlotY = startY + slotHeight + 20; // 在槽位下方

        const bob = Math.sin(this.masterManageCursor.animTimer * 0.2) * 3;

        ctx.save();
        ctx.translate(manageSlotX + slotWidth / 2, manageSlotY + bob);

        // 管理光标发光
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12;

        // 向上箭头形状（从下方指向槽位）
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-12, 5);
        ctx.lineTo(-4, 5);
        ctx.lineTo(-4, 15);
        ctx.lineTo(4, 15);
        ctx.lineTo(4, 5);
        ctx.lineTo(12, 5);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // 标签
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('LB/RB', 0, 28);

        ctx.restore();
      }
    }

    ctx.restore();
  }

  private renderSlot(
    ctx: CanvasRenderingContext2D,
    slot: PlayerSlot,
    x: number, y: number,
    w: number, h: number,
    index: number
  ): void {
    ctx.save();

    // 槽位背景
    const isHovered = slot.type === 'none' && this.connectedGamepads.size > this.slots.filter(s => s.type !== 'none').length;

    if (slot.type !== 'none') {
      // 已加入 - 彩色边框
      const slotColor = CHARACTER_COLORS[slot.colorIndex];
      const borderColor = slot.ready ? '#4ecdc4' : slotColor.color1;

      // 背景
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y, w, h);

      // 边框
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = slot.ready ? 4 : 2;
      ctx.strokeRect(x, y, w, h);

      // 准备状态闪烁边框
      if (slot.ready) {
        ctx.strokeStyle = `rgba(78, 205, 196, ${this.hintFlash})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
      }

      // 渲染角色预览
      this.renderCharacterPreview(ctx, slot, x + w / 2, y + 140, index);

      const color = CHARACTER_COLORS[slot.colorIndex];
      const shape = CHARACTER_SHAPES[slot.shapeIndex];

      // 判断是否可以编辑设置
      // 1. 未ready的人类玩家可以编辑
      // 2. 被主控管理光标指向的CPU可以编辑（主控已加入后用L/R移动）
      // 3. 主控未加入时，光标指向的CPU也可以编辑
      const masterCursor = this.cursors.get(this.masterGamepadIndex);
      const isCPUBeingManagedByJoinedMaster = slot.type === 'cpu' &&
        this.masterManageCursor.active &&
        this.masterManageCursor.slotIndex === index;
      const isCPUBeingManagedByUnJoinedMaster = slot.type === 'cpu' &&
        masterCursor &&
        masterCursor.joinedSlotIndex < 0 &&
        masterCursor.slotIndex === index;
      const isCPUBeingManaged = isCPUBeingManagedByJoinedMaster || isCPUBeingManagedByUnJoinedMaster;
      const canEditSettings = !slot.ready || isCPUBeingManaged;

      // ===== 颜色选择行 =====
      const colorRowY = y + 280;
      const isColorSelected = slot.settingIndex === 0 && canEditSettings;

      // 高亮背景
      if (isColorSelected) {
        ctx.fillStyle = isCPUBeingManaged ? 'rgba(255, 149, 0, 0.3)' : 'rgba(78, 205, 196, 0.2)';
        ctx.fillRect(x + 10, colorRowY - 18, w - 20, 40);
      }

      // 颜色标签
      ctx.textAlign = 'center';
      ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText('颜色', x + w / 2, colorRowY - 22);

      // 颜色名称
      ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = color.color1;
      ctx.fillText(color.name, x + w / 2, colorRowY + 5);

      // 左右箭头
      if (canEditSettings) {
        ctx.fillStyle = isColorSelected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)';
        ctx.font = '24px sans-serif';
        ctx.fillText('◀', x + 30, colorRowY + 5);
        ctx.fillText('▶', x + w - 30, colorRowY + 5);
      }

      // ===== 形状选择行 =====
      const shapeRowY = y + 330;
      const isShapeSelected = slot.settingIndex === 1 && canEditSettings;

      // 高亮背景
      if (isShapeSelected) {
        ctx.fillStyle = isCPUBeingManaged ? 'rgba(255, 149, 0, 0.3)' : 'rgba(78, 205, 196, 0.2)';
        ctx.fillRect(x + 10, shapeRowY - 18, w - 20, 40);
      }

      // 形状标签
      ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText('形状', x + w / 2, shapeRowY - 22);

      // 形状名称
      ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(shape.name, x + w / 2, shapeRowY + 5);

      // 左右箭头
      if (canEditSettings) {
        ctx.fillStyle = isShapeSelected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)';
        ctx.font = '24px sans-serif';
        ctx.fillText('◀', x + 30, shapeRowY + 5);
        ctx.fillText('▶', x + w - 30, shapeRowY + 5);
      }

      // 玩家名字 (CPU 显示不同颜色)
      ctx.font = '16px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = slot.type === 'cpu' ? '#ff9500' : '#fff';
      ctx.fillText(slot.name, x + w / 2, y + 425);

      // CPU 标签
      if (slot.type === 'cpu') {
        ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = '#ff9500';
        ctx.fillText('🤖 CPU', x + w / 2, y + 435);
      }

      // 状态提示
      ctx.font = '14px "Segoe UI", system-ui, sans-serif';
      if (slot.ready) {
        ctx.fillStyle = '#4ecdc4';
        ctx.fillText(i18n.t.characterSelect?.ready || 'READY!', x + w / 2, y + h - 35);
      } else if (slot.type === 'human') {
        // 获取该玩家手柄的按钮名称
        const gpIdx = slot.gamepadIndex;
        const confirmBtn = gpIdx >= 0 ? this.input.getButtonName(0, gpIdx) : 'A';
        const cancelBtn = gpIdx >= 0 ? this.input.getButtonName(1, gpIdx) : 'B';

        ctx.fillStyle = '#666';
        ctx.fillText('↑↓ 切换  ← → 选择', x + w / 2, y + h - 50);
        ctx.fillText(`${confirmBtn} 确认  ${cancelBtn} 退出`, x + w / 2, y + h - 30);
      }

    } else {
      // 未加入 - 灰色虚线框
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = isHovered ? 'rgba(78, 205, 196, 0.5)' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      // 加入提示
      ctx.textAlign = 'center';
      ctx.font = '20px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = isHovered ? `rgba(78, 205, 196, ${0.5 + this.hintFlash * 0.5})` : 'rgba(255,255,255,0.3)';
      ctx.fillText(i18n.t.characterSelect?.pressToJoin || '按任意按钮加入', x + w / 2, y + h / 2);

      // 玩家编号
      ctx.font = 'bold 64px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillText(`P${index + 1}`, x + w / 2, y + h / 2 - 80);
    }

    ctx.restore();
  }

  private renderCharacterPreview(
    ctx: CanvasRenderingContext2D,
    slot: PlayerSlot,
    x: number, y: number,
    _index: number
  ): void {
    const color = CHARACTER_COLORS[slot.colorIndex];
    const shape = CHARACTER_SHAPES[slot.shapeIndex];
    const radius = 55;
    const bob = Math.sin(slot.animTimer * 0.08) * 5;

    ctx.save();
    ctx.translate(x, y + bob);

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 45, 45, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 发光效果
    if (slot.ready) {
      ctx.shadowColor = '#4ecdc4';
      ctx.shadowBlur = 30;
    }

    // 使用 CharacterRenderer 绘制角色形状
    CharacterRenderer.renderShape(
      ctx,
      shape.id,
      color.color1,
      color.color2,
      radius,
      0, // 正面朝向
      slot.animTimer
    );

    ctx.shadowBlur = 0;

    // 手持回旋镖
    ctx.save();
    ctx.translate(radius + 22, 0);
    ctx.rotate(slot.animTimer * 0.1);
    ctx.fillStyle = '#ffd700';
    this.drawBoomerangShape(ctx, 16);
    ctx.restore();

    ctx.restore();
  }

  private drawBoomerangShape(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.quadraticCurveTo(size * 0.3, -size * 0.2, 0, -size);
    ctx.quadraticCurveTo(-size * 0.2, -size * 0.3, -size * 0.3, 0);
    ctx.quadraticCurveTo(-size * 0.2, size * 0.3, 0, size);
    ctx.quadraticCurveTo(size * 0.3, size * 0.2, size, 0);
    ctx.fill();
  }

  private renderGamepadStatus(): void {
    const ctx = this.ctx;
    const H = DESIGN_HEIGHT;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';

    // 已连接手柄数量 - 放在左下角
    const connectedCount = this.connectedGamepads.size;
    const joinedCount = this.slots.filter(s => s.type !== 'none').length;
    const readyCount = this.slots.filter(s => s.ready).length;

    ctx.fillStyle = '#666';
    ctx.fillText(
      `手柄: ${connectedCount}  玩家: ${joinedCount}/${MAX_PLAYERS}  准备: ${readyCount}/${joinedCount || 1}`,
      20,
      H - 15
    );

    ctx.restore();
  }

  private renderHints(): void {
    const ctx = this.ctx;
    const W = DESIGN_WIDTH;
    const H = DESIGN_HEIGHT;

    // 获取第一个手柄的按钮名称作为示例
    const gpIndex = this.masterGamepadIndex >= 0 ? this.masterGamepadIndex : 0;
    const confirmBtn = this.input.getButtonName(0, gpIndex) || 'A';
    const addCpuBtn = this.input.getButtonName(3, gpIndex) || 'Y';

    // 检查是否所有加入的玩家都准备好了
    const joinedSlots = this.slots.filter(s => s.type !== 'none');
    const joinedCount = joinedSlots.length;
    const allReady = joinedSlots.every(s => s.ready);

    // 检查是否有未加入的光标
    let hasUnJoinedCursor = false;
    for (const [, cursor] of this.cursors) {
      if (cursor.joinedSlotIndex < 0) {
        hasUnJoinedCursor = true;
        break;
      }
    }

    ctx.save();
    ctx.textAlign = 'center';

    // 底部提示区 - 固定位置，避免重叠
    const hintY1 = H - 75; // 第一行提示（操作说明）
    const hintY2 = H - 50; // 第二行提示（状态/开始提示）

    ctx.font = '14px "Segoe UI", system-ui, sans-serif';

    if (this.connectedGamepads.size === 0) {
      // 没有手柄连接
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText('请连接手柄', W / 2, hintY2);
    } else if (hasUnJoinedCursor) {
      // 有未加入的光标，显示加入提示
      ctx.fillStyle = `rgba(255,255,255,${0.5 + this.hintFlash * 0.3})`;
      ctx.fillText(`← → 移动光标  ${confirmBtn} 加入槽位  ${addCpuBtn} 添加/移除CPU（主控）  + 返回`, W / 2, hintY1);
      ctx.fillStyle = `rgba(78,205,196,${0.5 + this.hintFlash * 0.5})`;
      ctx.fillText('选择槽位后按 ' + confirmBtn + ' 加入', W / 2, hintY2);
    } else {
      // 所有玩家都已加入
      ctx.fillStyle = `rgba(255,255,255,${0.5 + this.hintFlash * 0.3})`;
      // 主控提示包含 L/R 管理 CPU
      const masterHint = this.masterGamepadIndex >= 0 ? '  L/R+Y 管理CPU' : '';
      ctx.fillText(`↑↓ 切换选项  ← → 调整${masterHint}  + 返回`, W / 2, hintY1);

      // 状态提示
      if (joinedCount < MIN_PLAYERS) {
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText(`需要至少 ${MIN_PLAYERS} 名玩家`, W / 2, hintY2);
      } else if (!allReady) {
        ctx.fillStyle = '#ffa500';
        ctx.fillText('等待所有玩家准备...', W / 2, hintY2);
      } else if (this.startHoldTimer > 0) {
        // 长按开始进度条
        const progress = this.startHoldTimer / this.START_HOLD_FRAMES;
        const barWidth = 200;
        const barHeight = 8;
        const barX = (W - barWidth) / 2;
        const barY = hintY2 - 4;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = '#fff';
        ctx.fillText(`长按 ${confirmBtn} 开始游戏...`, W / 2, barY - 8);
      } else {
        ctx.fillStyle = `rgba(78,205,196,${0.5 + this.hintFlash * 0.5})`;
        ctx.fillText(`长按 ${confirmBtn} 开始游戏`, W / 2, hintY2);
      }
    }

    ctx.restore();
  }

  private renderCountdown(): void {
    const ctx = this.ctx;
    const W = DESIGN_WIDTH;
    const H = DESIGN_HEIGHT;

    const seconds = Math.ceil(this.countdown / 60);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 半透明背景
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    // 倒计时数字
    ctx.font = 'bold 200px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#4ecdc4';
    ctx.shadowColor = '#4ecdc4';
    ctx.shadowBlur = 50;
    ctx.fillText(String(seconds), W / 2, H / 2);

    // 文字
    ctx.font = '32px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.fillText(
      i18n.t.characterSelect?.starting || '游戏即将开始...',
      W / 2,
      H / 2 + 120
    );

    ctx.restore();
  }
}
