/**
 * 菜单场景
 */

import { InputSystem, Scene } from 'you-engine';
import { GameSettings, PLAYER_SKINS } from '../config/GameConfig';
import { GameState } from '../config/GameState';
import { i18n } from '../config/i18n';

declare global {
  interface Window {
    initAudio: () => void;
  }
}

export class MenuScene extends Scene {
  private input!: InputSystem;
  private menuItems!: NodeListOf<Element>;
  private menuCooldown = 0;
  private inSettings = false;
  private settingIndex = 0;

  onCreate(): void {
    this.input = this.engine.system(InputSystem);
    this.menuItems = document.querySelectorAll('#mainMenu .menu-btn');

    // 初始化菜单UI事件
    this.setupMenuEvents();
  }

  onEnter(): void {
    GameState.state = 'title';
    GameState.menuIndex = 0;
    this.inSettings = false;
    this.settingIndex = 0;

    // 显示开始画面
    document.getElementById('startScreen')?.classList.remove('hidden');
    document.getElementById('pauseScreen')?.classList.add('hidden');
    document.getElementById('winScreen')?.classList.add('hidden');

    // 初始化所有 UI 文本
    this.updateAllUIText();
    this.updateMenuUI();
  }

  onUpdate(_dt: number): void {
    if (this.menuCooldown > 0) {
      this.menuCooldown--;
      return;
    }

    const moveY = this.input.axisY() || this.input.axisY(1);
    const moveX = this.input.axisX() || this.input.axisX(1);
    const confirm = this.input.isReleased('action') || this.input.isReleased('action', 1);
    const back = this.input.isPressed('dash') || this.input.isPressed('dash', 1);

    if (this.inSettings) {
      this.handleSettingsInput(moveY, moveX, confirm, back);
    } else {
      this.handleMenuInput(moveY, confirm);
    }
  }

  private handleMenuInput(moveY: number, confirm: boolean): void {
    const menuCount = 4; // 开始、教程、设置、全屏
    if (Math.abs(moveY) > 0.5) {
      GameState.menuIndex = (GameState.menuIndex + (moveY > 0 ? 1 : -1) + menuCount) % menuCount;
      this.updateMenuUI();
      this.menuCooldown = 12;
    }

    if (confirm) {
      window.initAudio();
      const btn = this.menuItems[GameState.menuIndex];
      const mode = btn?.getAttribute('data-mode');
      const isFullscreen = btn?.id === 'fullscreenBtn';

      if (isFullscreen) {
        // 全屏切换
        this.toggleFullscreen();
      } else {
        switch (mode) {
          case 'settings':
            this.inSettings = true;
            this.settingIndex = 0;
            document.getElementById('mainMenu')!.style.display = 'none';
            document.getElementById('settingsPanel')?.classList.remove('hidden');
            break;
          case 'debug':
            GameSettings.gameMode = 'tutorial'; // 复用 tutorial 模式的状态
            this.engine.goto('debug');
            break;
          default:
            // 进入角色选择界面
            this.engine.goto('select');
            break;
        }
      }
      this.menuCooldown = 15;
    }
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  private handleSettingsInput(moveY: number, moveX: number, confirm: boolean, back: boolean): void {
    const settingsCount = 6; // 回合、AI难度、音效、震动、语言、返回

    if (Math.abs(moveY) > 0.5) {
      this.settingIndex =
        (this.settingIndex + (moveY > 0 ? 1 : -1) + settingsCount) % settingsCount;
      this.updateSettingRowSelection();
      this.menuCooldown = 12;
    }

    if (Math.abs(moveX) > 0.5) {
      const delta = moveX > 0 ? 1 : -1;
      const skinCount = PLAYER_SKINS.length;

      switch (this.settingIndex) {
        case 0: // 胜利回合
          GameSettings.winScore = Math.max(1, Math.min(15, GameSettings.winScore + delta));
          break;
        case 1: // AI难度
          GameSettings.aiDifficulty = Math.max(0, Math.min(2, GameSettings.aiDifficulty + delta));
          break;
        case 2: // 音效
          GameSettings.soundEnabled = !GameSettings.soundEnabled;
          break;
        case 3: // 震动
          GameSettings.vibrationEnabled = !GameSettings.vibrationEnabled;
          break;
        case 4: // 语言
          if (delta > 0) {
            i18n.nextLanguage();
          } else {
            i18n.prevLanguage();
          }
          this.updateAllUIText();
          break;
        case 5: // P1皮肤（移到后面，或者留作返回用）
          GameSettings.p1Skin = (GameSettings.p1Skin + delta + skinCount) % skinCount;
          break;
      }

      this.updateSettingsUI();
      this.menuCooldown = 12;
    }

    if ((confirm && this.settingIndex === settingsCount - 1) || back) {
      this.inSettings = false;
      document.getElementById('settingsPanel')?.classList.add('hidden');
      document.getElementById('mainMenu')!.style.display = 'flex';
      this.menuCooldown = 15;
    }
  }

  private setupMenuEvents(): void {
    // 设置按钮点击事件
    document.querySelectorAll('.setting-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const setting = btn.getAttribute('data-setting');
        const delta = parseInt(btn.getAttribute('data-delta') || '0', 10);
        const skinCount = PLAYER_SKINS.length;

        switch (setting) {
          case 'rounds':
            GameSettings.winScore = Math.max(1, Math.min(15, GameSettings.winScore + delta));
            break;
          case 'ai':
            GameSettings.aiDifficulty = Math.max(0, Math.min(2, GameSettings.aiDifficulty + delta));
            break;
          case 'p1skin':
            GameSettings.p1Skin = (GameSettings.p1Skin + delta + skinCount) % skinCount;
            break;
          case 'p2skin':
            GameSettings.p2Skin = (GameSettings.p2Skin + delta + skinCount) % skinCount;
            break;
          case 'language':
            if (delta > 0) {
              i18n.nextLanguage();
            } else {
              i18n.prevLanguage();
            }
            this.updateAllUIText();
            break;
        }

        this.updateSettingsUI();
      });
    });

    // Toggle 按钮
    document.getElementById('soundToggle')?.addEventListener('click', () => {
      GameSettings.soundEnabled = !GameSettings.soundEnabled;
      this.updateSettingsUI();
    });

    document.getElementById('vibrationToggle')?.addEventListener('click', () => {
      GameSettings.vibrationEnabled = !GameSettings.vibrationEnabled;
      this.updateSettingsUI();
    });

    // 返回按钮
    document.getElementById('backToMenu')?.addEventListener('click', () => {
      this.inSettings = false;
      document.getElementById('settingsPanel')?.classList.add('hidden');
      document.getElementById('mainMenu')!.style.display = 'flex';
    });

    // 菜单按钮
    this.menuItems.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        GameState.menuIndex = index;
        this.updateMenuUI();

        const mode = btn.getAttribute('data-mode');
        if (mode === 'settings') {
          this.inSettings = true;
          document.getElementById('mainMenu')!.style.display = 'none';
          document.getElementById('settingsPanel')?.classList.remove('hidden');
        } else if (mode === 'debug') {
          window.initAudio();
          GameSettings.gameMode = 'tutorial';
          this.engine.goto('debug');
        } else if (mode === 'start') {
          window.initAudio();
          this.engine.goto('select');
        }
      });
    });
  }

  private updateMenuUI(): void {
    this.menuItems.forEach((btn, i) => {
      btn.classList.toggle('selected', i === GameState.menuIndex);
    });
    this.updateSettingsUI();
  }

  private updateSettingsUI(): void {
    const roundsValue = document.getElementById('roundsValue');
    const aiValue = document.getElementById('aiValue');
    const soundToggle = document.getElementById('soundToggle');
    const vibrationToggle = document.getElementById('vibrationToggle');
    const languageValue = document.getElementById('languageValue');

    if (roundsValue) roundsValue.textContent = String(GameSettings.winScore);

    // AI 难度使用 i18n
    const aiNames = [
      i18n.t.aiDifficulty.easy,
      i18n.t.aiDifficulty.normal,
      i18n.t.aiDifficulty.hard,
    ];
    if (aiValue) aiValue.textContent = aiNames[GameSettings.aiDifficulty];

    if (soundToggle) {
      soundToggle.textContent = GameSettings.soundEnabled
        ? i18n.t.settings.on
        : i18n.t.settings.off;
      soundToggle.classList.toggle('active', GameSettings.soundEnabled);
    }

    if (vibrationToggle) {
      vibrationToggle.textContent = GameSettings.vibrationEnabled
        ? i18n.t.settings.on
        : i18n.t.settings.off;
      vibrationToggle.classList.toggle('active', GameSettings.vibrationEnabled);
    }

    // 语言显示
    if (languageValue) {
      languageValue.textContent = i18n.getLanguageName();
    }

    // 皮肤UI
    const p1Skin = PLAYER_SKINS[GameSettings.p1Skin];
    const p2Skin = PLAYER_SKINS[GameSettings.p2Skin];
    const p1El = document.getElementById('p1SkinValue');
    const p2El = document.getElementById('p2SkinValue');

    if (p1El) {
      p1El.textContent = p1Skin.name;
      p1El.style.color = p1Skin.color1;
    }
    if (p2El) {
      p2El.textContent = p2Skin.name;
      p2El.style.color = p2Skin.color1;
    }

    // 更新设置项选中状态
    this.updateSettingRowSelection();
  }

  private updateSettingRowSelection(): void {
    const settingsPanel = document.getElementById('settingsPanel');
    if (!settingsPanel) return;

    const rows = settingsPanel.querySelectorAll('.setting-row');
    const backBtn = document.getElementById('backToMenu');

    // 移除所有选中状态
    rows.forEach((row, index) => {
      row.classList.toggle('selected', this.inSettings && index === this.settingIndex);
    });

    // 返回按钮特殊处理
    if (backBtn) {
      backBtn.classList.toggle('selected', this.inSettings && this.settingIndex === rows.length);
    }
  }

  private updateAllUIText(): void {
    const t = i18n.t;

    // 标题
    const titleEl = document.querySelector('#startScreen h1');
    const subtitleEl = document.querySelector('#startScreen .subtitle');
    if (titleEl) titleEl.textContent = t.title;
    if (subtitleEl) subtitleEl.textContent = t.subtitle;

    // 主菜单按钮 (全屏按钮保持不变)
    const menuBtns = document.querySelectorAll('#mainMenu .menu-btn:not(#fullscreenBtn)');
    const menuTexts = [t.menu.start, t.menu.debug || '调试模式', t.menu.settings];
    menuBtns.forEach((btn, i) => {
      if (menuTexts[i]) btn.textContent = menuTexts[i];
    });

    // 设置面板标题
    const settingsTitle = document.querySelector('#settingsPanel h3');
    if (settingsTitle) settingsTitle.textContent = t.settings.title;

    // 设置项标签
    const settingLabels = document.querySelectorAll(
      '#settingsPanel .setting-row > span:first-child'
    );
    const labelTexts = [
      t.settings.winRounds,
      t.settings.aiDifficulty,
      t.settings.sound,
      t.settings.vibration,
      t.settings.language,
    ];
    settingLabels.forEach((label, i) => {
      if (labelTexts[i]) label.textContent = labelTexts[i];
    });

    // 返回按钮
    const backBtn = document.getElementById('backToMenu');
    if (backBtn) backBtn.textContent = t.settings.back;

    // 提示文字
    const tipBox = document.querySelector('.tip-box p');
    if (tipBox) tipBox.textContent = t.tips.oneHitKill;

    const startHint = document.querySelector('#startScreen .start-hint');
    if (startHint) startHint.textContent = t.tips.useStick;

    // 暂停菜单
    const pauseTitle = document.querySelector('#pauseScreen h1');
    if (pauseTitle) pauseTitle.textContent = t.game.pause;

    const pauseBtns = document.querySelectorAll('#pauseMenu .menu-btn');
    const pauseTexts = [t.game.resume, t.game.restart, t.game.mainMenu];
    pauseBtns.forEach((btn, i) => {
      if (pauseTexts[i]) btn.textContent = pauseTexts[i];
    });

    // 胜利画面
    const victorySubtitle = document.querySelector('.victory-subtitle');
    if (victorySubtitle) victorySubtitle.textContent = t.win.victory;

    const winBtns = document.querySelectorAll('#winMenu .menu-btn');
    const winTexts = [t.win.rematch, t.win.mainMenu];
    winBtns.forEach((btn, i) => {
      if (winTexts[i]) btn.textContent = winTexts[i];
    });

    // 统计标签
    const statLabels = document.querySelectorAll('.stat-label');
    const statTexts = [t.stats.kills, t.stats.throws, t.stats.dashes, t.stats.powerups];
    statLabels.forEach((label, i) => {
      if (statTexts[i]) label.textContent = statTexts[i];
    });

    // 更新设置值显示
    this.updateSettingsUI();
  }
}
