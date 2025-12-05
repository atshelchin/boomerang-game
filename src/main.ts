/**
 * 回旋斩 - BOOMERANG
 * 使用 You Engine 重构
 */

import { CameraSystem, Engine, InputSystem, MatterPhysicsSystem } from 'you-engine';
import { DESIGN_HEIGHT, DESIGN_WIDTH, GameSettings } from './config/GameConfig';
import { GameState } from './config/GameState';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { DebugScene } from './scenes/DebugScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { TutorialScene } from './scenes/TutorialScene';
import { BoomerangSystem } from './systems/BoomerangSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { DynamicCameraSystem } from './systems/DynamicCameraSystem';
import { GameRenderSystem } from './systems/GameRenderSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { TerrainSystem } from './systems/TerrainSystem';

// 创建引擎
const engine = new Engine({
  canvas: '#gameCanvas',
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  backgroundColor: '#1a1a2e',
  autoScale: true,
  targetFPS: 60,
});

// 输入映射配置
function setupInputMappings() {
  const input = engine.system(InputSystem);

  // 玩家1动作
  input.setMapping('action', {
    keyboard: ['Space', 'KeyJ'],
    gamepadButton: [0, 1, 2, 3], // 所有面按钮
  });

  // 冲刺
  input.setMapping('dash', {
    keyboard: ['ShiftLeft', 'KeyK'],
    gamepadButton: [4, 5, 6, 7], // 肩键和扳机
  });

  // 暂停
  input.setMapping('pause', {
    keyboard: ['Escape'],
    gamepadButton: [9], // +键
  });

  // 返回
  input.setMapping('back', {
    keyboard: ['Backspace'],
    gamepadButton: [8], // -键
  });
}

// 注册系统
engine
  .use(InputSystem)
  .use(CameraSystem)
  .use(MatterPhysicsSystem)
  .use(PlayerSystem)
  .use(BoomerangSystem)
  .use(CollisionSystem)
  .use(TerrainSystem)
  .use(DynamicCameraSystem)
  .use(GameRenderSystem);

// 设置输入映射
setupInputMappings();

// 设置缩放系数
function updateScale(): void {
  const scale = engine.scale;
  engine.system(PlayerSystem).setScale(scale);
  engine.system(BoomerangSystem).setScale(scale);
  engine.system(CollisionSystem).setScale(scale);
  engine.system(GameRenderSystem).setScale(scale);
}

// 监听窗口大小变化
window.addEventListener('resize', updateScale);

// 注册场景
engine.addScene('menu', MenuScene);
engine.addScene('select', CharacterSelectScene);
engine.addScene('game', GameScene);
engine.addScene('tutorial', TutorialScene);
engine.addScene('debug', DebugScene);

// 事件监听
engine.on('player:throw', () => {
  playSound('throw');
  shakeScreen(8);
});

engine.on('player:dash', () => {
  playSound('whoosh');
  shakeScreen(5);
});

engine.on('player:catch', () => {
  playSound('catch');
});

engine.on('player:death', () => {
  playSound('kill');
  shakeScreen(30);
  flashScreen(0.8, 150);
});

engine.on('boomerang:bounce', () => {
  playSound('wallHit');
  shakeScreen(2);
});

engine.on('player:wallHit', (data) => {
  const { intensity } = data as { intensity: number };
  playSound('playerWallHit');
  shakeScreen(3 + intensity * 5);
});

engine.on('player:collide', (data) => {
  const { intensity } = data as { intensity: number };
  playSound('playerCollide');
  shakeScreen(4 + intensity * 8);
});

engine.on('powerup:collect', (data) => {
  const { type } = data as { type: string };
  playSound(`powerup_${type}`);
  shakeScreen(6);
  flashScreen(0.3, 100);
});

engine.on('player:freeze', () => {
  playSound('freeze');
  shakeScreen(10);
  flashScreen(0.4, 150);
});

engine.on('player:burn', () => {
  playSound('burn');
  shakeScreen(8);
});

engine.on('player:burnDamage', () => {
  playSound('burnTick');
  shakeScreen(3);
});

engine.on('portal:teleport', () => {
  playSound('teleport');
  shakeScreen(8);
  flashScreen(0.5, 100);
});

// 音频系统
const AudioCtx = {
  ctx: null as AudioContext | null,
  masterGain: null as GainNode | null,

  init() {
    if (this.ctx) return;
    this.ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    this.masterGain.connect(this.ctx.destination);
  },
};

function playSound(type: string): void {
  if (!AudioCtx.ctx || !GameSettings.soundEnabled) return;
  AudioCtx.init();

  const ctx = AudioCtx.ctx!;
  const master = AudioCtx.masterGain!;
  const now = ctx.currentTime;

  const sounds: Record<string, () => void> = {
    throw: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    },
    catch: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    },
    kill: () => {
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
      }
      noise.buffer = buffer;
      const ng = ctx.createGain();
      noise.connect(ng);
      ng.connect(master);
      ng.gain.value = 1.2;
      noise.start(now);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    },
    whoosh: () => {
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3 * Math.exp(-i / (ctx.sampleRate * 0.05));
      }
      noise.buffer = buffer;
      const ng = ctx.createGain();
      noise.connect(ng);
      ng.connect(master);
      ng.gain.value = 0.3;
      noise.start(now);
    },
    wallHit: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'square';
      osc.frequency.value = 150;
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    },
    playerWallHit: () => {
      // 玩家撞墙音效 - 更厚重的撞击声
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    },
    playerCollide: () => {
      // 玩家碰撞音效 - 弹性碰撞声
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    },
    ready: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    },
    fight: () => {
      [523, 659, 784].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(master);
        osc.type = 'square';
        osc.frequency.value = f;
        const t = now + i * 0.05;
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.12);
      });
    },
    win: () => {
      [523, 659, 784, 1047].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(master);
        osc.type = 'sine';
        osc.frequency.value = f;
        const t = now + i * 0.1;
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    },
    powerup_triple: () => {
      [880, 1100, 1320].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(master);
        osc.type = 'sine';
        osc.frequency.value = f;
        const t = now + i * 0.04;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
      });
    },
    powerup_big: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    },
    powerup_speed: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    },
    powerup_shield: () => {
      [660, 880].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(master);
        osc.type = 'triangle';
        osc.frequency.value = f;
        const t = now + i * 0.08;
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    },
    powerup_magnet: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.setValueAtTime(500, now + 0.05);
      osc.frequency.setValueAtTime(300, now + 0.1);
      osc.frequency.setValueAtTime(500, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    },
    powerup_freeze: () => {
      // 冰冻道具 - 冰晶碎裂声
      [1200, 1400, 1000].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(master);
        osc.type = 'sine';
        osc.frequency.value = f;
        const t = now + i * 0.03;
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.08);
      });
    },
    powerup_fire: () => {
      // 火焰道具 - 火焰点燃声
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.4 * Math.exp(-i / (ctx.sampleRate * 0.08));
      }
      noise.buffer = buffer;
      const ng = ctx.createGain();
      noise.connect(ng);
      ng.connect(master);
      ng.gain.value = 0.35;
      noise.start(now);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    },
    powerup_penetrate: () => {
      // 穿透道具 - 穿透音
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    },
    powerup_range: () => {
      // 远程道具 - 延伸音
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    },
    freeze: () => {
      // 冰冻效果 - 冰封声
      [1500, 1200, 900, 600].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(master);
        osc.type = 'sine';
        osc.frequency.value = f;
        const t = now + i * 0.04;
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
      });
    },
    burn: () => {
      // 燃烧效果 - 火焰点燃声
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5 * Math.exp(-i / (ctx.sampleRate * 0.1));
      }
      noise.buffer = buffer;
      const ng = ctx.createGain();
      noise.connect(ng);
      ng.connect(master);
      ng.gain.value = 0.4;
      noise.start(now);
    },
    burnTick: () => {
      // 燃烧伤害 - 滋滋声
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
      }
      noise.buffer = buffer;
      const ng = ctx.createGain();
      noise.connect(ng);
      ng.connect(master);
      ng.gain.value = 0.2;
      noise.start(now);
    },
    teleport: () => {
      // 传送门音效 - 空间扭曲声
      [200, 400, 800, 1600].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(master);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.02);
        osc.frequency.exponentialRampToValueAtTime(f * 2, now + i * 0.02 + 0.1);
        gain.gain.setValueAtTime(0.2, now + i * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.02 + 0.15);
        osc.start(now + i * 0.02);
        osc.stop(now + i * 0.02 + 0.15);
      });
    },
    water: () => {
      // 落水音效 - 水花声
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5 * Math.exp(-i / (ctx.sampleRate * 0.1));
      }
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      const ng = ctx.createGain();
      noise.connect(filter);
      filter.connect(ng);
      ng.connect(master);
      ng.gain.value = 0.5;
      noise.start(now);
    },
    boulder: () => {
      // 滚石音效 - 轰隆声
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    },
    poison: () => {
      // 毒气音效 - 嘶嘶声
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
      }
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      const ng = ctx.createGain();
      noise.connect(filter);
      filter.connect(ng);
      ng.connect(master);
      ng.gain.value = 0.3;
      noise.start(now);
    },
  };

  if (sounds[type]) sounds[type]();
}

// 屏幕效果
function shakeScreen(intensity: number): void {
  GameState.shake.intensity = Math.max(GameState.shake.intensity, intensity * engine.scale);
}

function flashScreen(opacity: number, duration: number): void {
  const flash = document.getElementById('flash');
  if (flash) {
    flash.style.opacity = String(opacity);
    flash.style.transition = 'none';
    requestAnimationFrame(() => {
      flash.style.transition = `opacity ${duration}ms ease-out`;
      flash.style.opacity = '0';
    });
  }
}

// UI 更新函数
function updateScoreUI(): void {
  const score1 = document.getElementById('score1');
  const score2 = document.getElementById('score2');
  if (score1) score1.textContent = String(GameState.scores[0]);
  if (score2) score2.textContent = String(GameState.scores[1]);
}

function showMessage(text: string, duration = 700): void {
  const messageEl = document.getElementById('message');
  if (messageEl) {
    messageEl.textContent = text;
    messageEl.classList.add('show');
    setTimeout(() => messageEl.classList.remove('show'), duration);
  }
}

// 导出给场景使用
(
  window as unknown as {
    updateScoreUI: typeof updateScoreUI;
    showMessage: typeof showMessage;
    playSound: typeof playSound;
    flashScreen: typeof flashScreen;
    shakeScreen: typeof shakeScreen;
    initAudio: typeof AudioCtx.init;
  }
).updateScoreUI = updateScoreUI;
(window as unknown as { showMessage: typeof showMessage }).showMessage = showMessage;
(window as unknown as { playSound: typeof playSound }).playSound = playSound;
(window as unknown as { flashScreen: typeof flashScreen }).flashScreen = flashScreen;
(window as unknown as { shakeScreen: typeof shakeScreen }).shakeScreen = shakeScreen;
(window as unknown as { initAudio: () => void }).initAudio = () => AudioCtx.init();

// 全屏功能
function toggleFullscreen(): void {
  const container = document.getElementById('gameContainer');
  if (!container) return;

  if (!document.fullscreenElement) {
    container
      .requestFullscreen()
      .then(() => {
        document.body.classList.add('fullscreen');
      })
      .catch((err) => {
        console.warn('全屏请求失败:', err);
      });
  } else {
    document.exitFullscreen();
    document.body.classList.remove('fullscreen');
  }
}

// 全屏按钮事件
document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
  AudioCtx.init();
  toggleFullscreen();
});

// 点击画布全屏并初始化音频
document.getElementById('gameCanvas')?.addEventListener('click', () => {
  AudioCtx.init();
});

// 监听全屏变化
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove('fullscreen');
  }
  updateScale();
});

// 键盘 F 键切换全屏
document.addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F') {
    AudioCtx.init();
    toggleFullscreen();
  }
});

// 首次交互时初始化音频
document.addEventListener('click', () => AudioCtx.init(), { once: true });
document.addEventListener('keydown', () => AudioCtx.init(), { once: true });
document.addEventListener('touchstart', () => AudioCtx.init(), { once: true });

// 启动游戏
updateScale();

// 监听场景切换，在进入第一个场景后配置物理（此时系统已初始化完成）
engine.once('scene:change', () => {
  const physics = engine.system(MatterPhysicsSystem);
  physics.gravity = { x: 0, y: 0 }; // 无重力，俯视角游戏
});

engine.start('menu');

console.log('🎮 回旋斩 - Powered by You Engine');
console.log('按 F 键切换全屏');
