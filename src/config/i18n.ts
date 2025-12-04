/**
 * 国际化配置
 */

export type Language = 'zh' | 'en' | 'ja';

export interface Translations {
  // 游戏标题
  title: string;
  subtitle: string;

  // 菜单
  menu: {
    start: string;
    pvp: string;
    pve: string;
    tutorial: string;
    debug: string;
    settings: string;
  };

  // 角色选择
  characterSelect?: {
    title: string;
    subtitle: string;
    pressToJoin: string;
    selectHint: string;
    ready: string;
    gamepadsConnected: string;
    playersJoined: string;
    backHint: string;
    starting: string;
  };

  // 设置
  settings: {
    title: string;
    winRounds: string;
    aiDifficulty: string;
    sound: string;
    vibration: string;
    language: string;
    back: string;
    on: string;
    off: string;
  };

  // AI 难度
  aiDifficulty: {
    easy: string;
    normal: string;
    hard: string;
  };

  // 游戏内
  game: {
    ready: string;
    fight: string;
    ko: string;
    pause: string;
    resume: string;
    restart: string;
    mainMenu: string;
  };

  // 胜利画面
  win: {
    player: string;
    victory: string;
    rematch: string;
    mainMenu: string;
  };

  // 统计
  stats: {
    kills: string;
    throws: string;
    dashes: string;
    powerups: string;
  };

  // 道具
  powerups: {
    triple: string;
    big: string;
    speed: string;
    shield: string;
    magnet: string;
    freeze: string;
    fire: string;
    penetrate: string;
    range: string;
  };

  // 提示
  tips: {
    oneHitKill: string;
    useStick: string;
    pressButton: string;
  };

  // 教程
  tutorial: {
    title: string;
    intro: string;
    introDesc: string;
    move: string;
    moveDesc: string;
    throw: string;
    throwDesc: string;
    catch: string;
    catchDesc: string;
    charge: string;
    chargeDesc: string;
    dash: string;
    dashDesc: string;
    powerupTriple: string;
    powerupTripleDesc: string;
    powerupBig: string;
    powerupBigDesc: string;
    powerupSpeed: string;
    powerupSpeedDesc: string;
    powerupShield: string;
    powerupShieldDesc: string;
    powerupMagnet: string;
    powerupMagnetDesc: string;
    kill: string;
    killDesc: string;
    complete: string;
    completeDesc: string;
    pressAnyButton: string;
    stepComplete: string;
    skip: string;
  };
}

const zh: Translations = {
  title: '回旋斩',
  subtitle: 'BOOMERANG',

  menu: {
    start: '开始游戏',
    pvp: '双人对战',
    pve: '单人模式',
    tutorial: '教程',
    debug: '调试模式',
    settings: '设置',
  },

  characterSelect: {
    title: '选择角色',
    subtitle: '按任意按钮加入 · 可组队或Solo',
    pressToJoin: '按任意按钮加入',
    selectHint: '← → 选择  A确认  B退出',
    ready: 'READY!',
    gamepadsConnected: '已连接手柄',
    playersJoined: '已加入玩家',
    backHint: '按 + 键返回菜单  ·  键盘: 空格加入 / 方向键选择 / 回车确认',
    starting: '游戏即将开始...',
  },

  settings: {
    title: '游戏设置',
    winRounds: '胜利回合',
    aiDifficulty: 'AI难度',
    sound: '音效',
    vibration: '震动',
    language: '语言',
    back: '返回',
    on: '开',
    off: '关',
  },

  aiDifficulty: {
    easy: '简单',
    normal: '普通',
    hard: '困难',
  },

  game: {
    ready: '准备',
    fight: '战斗!',
    ko: 'K.O.!',
    pause: '暂停',
    resume: '继续游戏',
    restart: '重新开始',
    mainMenu: '返回主菜单',
  },

  win: {
    player: '玩家',
    victory: '胜利!',
    rematch: '再来一局',
    mainMenu: '返回主菜单',
  },

  stats: {
    kills: '击杀',
    throws: '投掷',
    dashes: '冲刺',
    powerups: '道具',
  },

  powerups: {
    triple: '三连发',
    big: '巨型回旋镖',
    speed: '加速',
    shield: '护盾',
    magnet: '磁铁',
    freeze: '冰冻',
    fire: '火焰',
    penetrate: '穿透',
    range: '远程',
  },

  tips: {
    oneHitKill: '一击必杀 · 回旋镖也能伤到自己！',
    useStick: '用摇杆选择，按任意按钮确认',
    pressButton: '摇杆选择 · 按钮确认',
  },

  tutorial: {
    title: '教程',
    intro: '欢迎来到回旋斩！',
    introDesc: '让我们学习基本操作',
    move: '移动',
    moveDesc: '用摇杆或方向键移动角色',
    throw: '投掷回旋镖',
    throwDesc: '按 A 键或 J 键投掷回旋镖',
    catch: '接住回旋镖',
    catchDesc: '回旋镖返回时会自动接住',
    charge: '蓄力投掷',
    chargeDesc: '长按投掷键蓄力，松开发射更强的回旋镖',
    dash: '冲刺',
    dashDesc: '按 B 键或 K 键快速冲刺躲避攻击',
    powerupTriple: '三连发',
    powerupTripleDesc: '拾取后一次投掷三个回旋镖',
    powerupBig: '巨型回旋镖',
    powerupBigDesc: '拾取后回旋镖变大，范围更广',
    powerupSpeed: '加速',
    powerupSpeedDesc: '拾取后移动速度大幅提升',
    powerupShield: '护盾',
    powerupShieldDesc: '拾取后获得一次免死保护',
    powerupMagnet: '磁铁',
    powerupMagnetDesc: '拾取后回旋镖会自动追踪敌人',
    kill: '击杀敌人',
    killDesc: '用回旋镖击中敌人！',
    complete: '教程完成！',
    completeDesc: '你已掌握所有基本操作，准备战斗吧！',
    pressAnyButton: '按任意键继续',
    stepComplete: '完成！',
    skip: '按 + 键跳过教程',
  },
};

const en: Translations = {
  title: 'BOOMERANG',
  subtitle: 'SLASH',

  menu: {
    start: 'Start Game',
    pvp: '2P Battle',
    pve: 'Single Player',
    tutorial: 'Tutorial',
    debug: 'Debug Mode',
    settings: 'Settings',
  },

  characterSelect: {
    title: 'SELECT CHARACTER',
    subtitle: 'Press any button to join · Team up or Solo',
    pressToJoin: 'Press any button to join',
    selectHint: '← → Select  A Confirm  B Exit',
    ready: 'READY!',
    gamepadsConnected: 'Gamepads connected',
    playersJoined: 'Players joined',
    backHint: 'Press + to return · Keyboard: Space to join / Arrows to select / Enter to confirm',
    starting: 'Game starting...',
  },

  settings: {
    title: 'Settings',
    winRounds: 'Win Rounds',
    aiDifficulty: 'AI Difficulty',
    sound: 'Sound',
    vibration: 'Vibration',
    language: 'Language',
    back: 'Back',
    on: 'ON',
    off: 'OFF',
  },

  aiDifficulty: {
    easy: 'Easy',
    normal: 'Normal',
    hard: 'Hard',
  },

  game: {
    ready: 'READY',
    fight: 'FIGHT!',
    ko: 'K.O.!',
    pause: 'PAUSED',
    resume: 'Resume',
    restart: 'Restart',
    mainMenu: 'Main Menu',
  },

  win: {
    player: 'PLAYER',
    victory: 'VICTORY!',
    rematch: 'Rematch',
    mainMenu: 'Main Menu',
  },

  stats: {
    kills: 'Kills',
    throws: 'Throws',
    dashes: 'Dashes',
    powerups: 'Powerups',
  },

  powerups: {
    triple: 'Triple Shot',
    big: 'Big Boomerang',
    speed: 'Speed Up',
    shield: 'Shield',
    magnet: 'Magnet',
    freeze: 'Freeze',
    fire: 'Fire',
    penetrate: 'Penetrate',
    range: 'Extended Range',
  },

  tips: {
    oneHitKill: 'One hit kill · Your boomerang can hurt you too!',
    useStick: 'Use stick to select, press any button to confirm',
    pressButton: 'Stick to select · Button to confirm',
  },

  tutorial: {
    title: 'Tutorial',
    intro: 'Welcome to Boomerang Slash!',
    introDesc: "Let's learn the basics",
    move: 'Move',
    moveDesc: 'Use the stick or arrow keys to move',
    throw: 'Throw Boomerang',
    throwDesc: 'Press A or J to throw your boomerang',
    catch: 'Catch Boomerang',
    catchDesc: 'The boomerang returns automatically',
    charge: 'Charge Throw',
    chargeDesc: 'Hold throw button to charge, release for power shot',
    dash: 'Dash',
    dashDesc: 'Press B or K to dash and dodge attacks',
    powerupTriple: 'Triple Shot',
    powerupTripleDesc: 'Throws three boomerangs at once',
    powerupBig: 'Big Boomerang',
    powerupBigDesc: 'Makes your boomerang larger with wider range',
    powerupSpeed: 'Speed Up',
    powerupSpeedDesc: 'Greatly increases movement speed',
    powerupShield: 'Shield',
    powerupShieldDesc: 'Protects from one fatal hit',
    powerupMagnet: 'Magnet',
    powerupMagnetDesc: 'Boomerang tracks enemies automatically',
    kill: 'Defeat Enemy',
    killDesc: 'Hit the enemy with your boomerang!',
    complete: 'Tutorial Complete!',
    completeDesc: "You've mastered the basics. Ready to fight!",
    pressAnyButton: 'Press any button to continue',
    stepComplete: 'Complete!',
    skip: 'Press + to skip tutorial',
  },
};

const ja: Translations = {
  title: 'ブーメラン',
  subtitle: 'スラッシュ',

  menu: {
    start: 'ゲーム開始',
    pvp: '2Pバトル',
    pve: 'シングルプレイ',
    tutorial: 'チュートリアル',
    debug: 'デバッグモード',
    settings: '設定',
  },

  characterSelect: {
    title: 'キャラクター選択',
    subtitle: 'ボタンを押して参加 · チームまたはソロ',
    pressToJoin: 'ボタンを押して参加',
    selectHint: '← → 選択  A決定  B戻る',
    ready: 'READY!',
    gamepadsConnected: '接続中のコントローラー',
    playersJoined: '参加プレイヤー',
    backHint: '+でメニューに戻る · キーボード: スペースで参加 / 矢印で選択 / Enterで決定',
    starting: 'ゲーム開始...',
  },

  settings: {
    title: '設定',
    winRounds: '勝利ラウンド',
    aiDifficulty: 'AI難易度',
    sound: 'サウンド',
    vibration: '振動',
    language: '言語',
    back: '戻る',
    on: 'オン',
    off: 'オフ',
  },

  aiDifficulty: {
    easy: '簡単',
    normal: '普通',
    hard: '難しい',
  },

  game: {
    ready: '準備',
    fight: 'ファイト!',
    ko: 'K.O.!',
    pause: 'ポーズ',
    resume: '続ける',
    restart: 'リスタート',
    mainMenu: 'メインメニュー',
  },

  win: {
    player: 'プレイヤー',
    victory: '勝利!',
    rematch: '再戦',
    mainMenu: 'メインメニュー',
  },

  stats: {
    kills: 'キル',
    throws: '投げ',
    dashes: 'ダッシュ',
    powerups: 'アイテム',
  },

  powerups: {
    triple: 'トリプルショット',
    big: 'ビッグブーメラン',
    speed: 'スピードアップ',
    shield: 'シールド',
    magnet: 'マグネット',
    freeze: 'フリーズ',
    fire: 'ファイア',
    penetrate: '貫通',
    range: '射程延長',
  },

  tips: {
    oneHitKill: '一撃必殺・ブーメランは自分も傷つけます！',
    useStick: 'スティックで選択、ボタンで決定',
    pressButton: 'スティック選択・ボタン決定',
  },

  tutorial: {
    title: 'チュートリアル',
    intro: 'ブーメランスラッシュへようこそ！',
    introDesc: '基本操作を学びましょう',
    move: '移動',
    moveDesc: 'スティックまたは矢印キーで移動',
    throw: 'ブーメランを投げる',
    throwDesc: 'AまたはJキーでブーメランを投げる',
    catch: 'ブーメランをキャッチ',
    catchDesc: 'ブーメランは自動で戻ってきます',
    charge: 'チャージ投げ',
    chargeDesc: '投げボタン長押しでチャージ、離すとパワーショット',
    dash: 'ダッシュ',
    dashDesc: 'BまたはKキーでダッシュして攻撃を回避',
    powerupTriple: 'トリプルショット',
    powerupTripleDesc: '一度に3つのブーメランを投げる',
    powerupBig: 'ビッグブーメラン',
    powerupBigDesc: 'ブーメランが大きくなり、範囲が広がる',
    powerupSpeed: 'スピードアップ',
    powerupSpeedDesc: '移動速度が大幅にアップ',
    powerupShield: 'シールド',
    powerupShieldDesc: '一度だけ致命的な攻撃を防ぐ',
    powerupMagnet: 'マグネット',
    powerupMagnetDesc: 'ブーメランが敵を自動追尾',
    kill: '敵を倒す',
    killDesc: 'ブーメランで敵を倒そう！',
    complete: 'チュートリアル完了！',
    completeDesc: '基本をマスターしました。さあ、戦いましょう！',
    pressAnyButton: 'ボタンを押して続ける',
    stepComplete: '完了！',
    skip: '+を押してスキップ',
  },
};

// 翻译数据
const translations: Record<Language, Translations> = { zh, en, ja };

// 语言名称（用于显示）
export const LANGUAGE_NAMES: Record<Language, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
};

// 支持的语言列表
export const LANGUAGES: Language[] = ['zh', 'en', 'ja'];

/**
 * i18n 管理器
 */
class I18n {
  private _language: Language = 'zh';
  private _translations: Translations = zh;

  get language(): Language {
    return this._language;
  }

  get t(): Translations {
    return this._translations;
  }

  constructor() {
    // 尝试从 localStorage 读取语言设置
    const saved = localStorage.getItem('game_language') as Language | null;
    if (saved && translations[saved]) {
      this._language = saved;
      this._translations = translations[saved];
    } else {
      // 根据浏览器语言自动选择
      this.detectLanguage();
    }
  }

  private detectLanguage(): void {
    const browserLang = navigator.language.toLowerCase();

    if (browserLang.startsWith('zh')) {
      this.setLanguage('zh');
    } else if (browserLang.startsWith('ja')) {
      this.setLanguage('ja');
    } else {
      this.setLanguage('en');
    }
  }

  setLanguage(lang: Language): void {
    if (!translations[lang]) return;

    this._language = lang;
    this._translations = translations[lang];
    localStorage.setItem('game_language', lang);

    // 触发 UI 更新事件
    window.dispatchEvent(new CustomEvent('language-change', { detail: lang }));
  }

  nextLanguage(): void {
    const currentIndex = LANGUAGES.indexOf(this._language);
    const nextIndex = (currentIndex + 1) % LANGUAGES.length;
    this.setLanguage(LANGUAGES[nextIndex]);
  }

  prevLanguage(): void {
    const currentIndex = LANGUAGES.indexOf(this._language);
    const prevIndex = (currentIndex - 1 + LANGUAGES.length) % LANGUAGES.length;
    this.setLanguage(LANGUAGES[prevIndex]);
  }

  getLanguageName(): string {
    return LANGUAGE_NAMES[this._language];
  }
}

// 单例导出
export const i18n = new I18n();

// 便捷函数
export const t = () => i18n.t;
