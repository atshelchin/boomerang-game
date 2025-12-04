/**
 * 角色形状渲染工具
 * 提供各种可爱形状的绘制方法
 */

import type { CharacterShape } from '../config/GameConfig';

/**
 * 角色渲染器
 */
export class CharacterRenderer {
  /**
   * 根据形状绘制角色身体
   */
  static renderShape(
    ctx: CanvasRenderingContext2D,
    shape: CharacterShape,
    color1: string,
    color2: string,
    radius: number,
    angle: number,
    time = 0
  ): void {
    // 身体渐变
    const bodyGrad = ctx.createRadialGradient(-5, -5, 0, 0, 0, radius);
    bodyGrad.addColorStop(0, color1);
    bodyGrad.addColorStop(1, color2);

    switch (shape) {
      case 'circle':
        this.drawCircle(ctx, bodyGrad, radius, angle);
        break;
      case 'star':
        this.drawStar(ctx, bodyGrad, radius, angle);
        break;
      case 'heart':
        this.drawHeart(ctx, bodyGrad, radius, angle);
        break;
      case 'cat':
        this.drawCat(ctx, bodyGrad, radius, angle);
        break;
      case 'bunny':
        this.drawBunny(ctx, bodyGrad, radius, angle);
        break;
      case 'ghost':
        this.drawGhost(ctx, bodyGrad, radius, angle);
        break;
      case 'slime':
        this.drawSlime(ctx, bodyGrad, radius, angle);
        break;
      case 'flower':
        this.drawFlower(ctx, bodyGrad, radius, angle);
        break;
      case 'cloud':
        this.drawCloud(ctx, bodyGrad, radius, angle);
        break;
      case 'octopus':
        this.drawOctopus(ctx, bodyGrad, radius, angle, time);
        break;
      default:
        this.drawCircle(ctx, bodyGrad, radius, angle);
    }
  }

  // =============== 各形状绘制方法 ===============

  /** 圆形角色（默认） */
  private static drawCircle(ctx: CanvasRenderingContext2D, grad: CanvasGradient, r: number, angle: number): void {
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.36, r * 0.28, r * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();

    this.drawEyes(ctx, angle, r);
  }

  /** 星星角色 */
  private static drawStar(ctx: CanvasRenderingContext2D, grad: CanvasGradient, r: number, angle: number): void {
    ctx.fillStyle = grad;
    ctx.beginPath();
    const spikes = 5;
    const outerRadius = r * 1.1;
    const innerRadius = r * 0.5;
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
      else ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    ctx.closePath();
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.18, -r * 0.28, r * 0.21, r * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fill();

    this.drawEyes(ctx, angle, r * 0.8);
  }

  /** 爱心角色 */
  private static drawHeart(ctx: CanvasRenderingContext2D, grad: CanvasGradient, r: number, angle: number): void {
    ctx.fillStyle = grad;
    ctx.save();
    ctx.scale(r / 28, r / 28);
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-30, -15, -30, -35, 0, -20);
    ctx.bezierCurveTo(30, -35, 30, -15, 0, 10);
    ctx.fill();
    ctx.restore();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.36, -r * 0.43, r * 0.21, r * 0.18, -0.3, 0, Math.PI * 2);
    ctx.fill();

    this.drawEyes(ctx, angle, r * 0.75, -r * 0.18);
  }

  /** 猫咪角色 */
  private static drawCat(ctx: CanvasRenderingContext2D, grad: CanvasGradient, r: number, angle: number): void {
    // 耳朵
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.3);
    ctx.lineTo(-r * 0.5, -r * 1.2);
    ctx.lineTo(-r * 0.1, -r * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.3);
    ctx.lineTo(r * 0.5, -r * 1.2);
    ctx.lineTo(r * 0.1, -r * 0.5);
    ctx.closePath();
    ctx.fill();

    // 身体
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 内耳
    ctx.fillStyle = 'rgba(255,200,200,0.5)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.4);
    ctx.lineTo(-r * 0.5, -r * 0.95);
    ctx.lineTo(-r * 0.25, -r * 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(r * 0.6, -r * 0.4);
    ctx.lineTo(r * 0.5, -r * 0.95);
    ctx.lineTo(r * 0.25, -r * 0.55);
    ctx.closePath();
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.28, r * 0.28, r * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // 猫眼
    this.drawCatEyes(ctx, angle, r);
  }

  /** 兔子角色 */
  private static drawBunny(ctx: CanvasRenderingContext2D, grad: CanvasGradient, r: number, angle: number): void {
    // 长耳朵
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 1.1, r * 0.22, r * 0.7, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.35, -r * 1.1, r * 0.22, r * 0.7, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 内耳
    ctx.fillStyle = 'rgba(255,200,200,0.5)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 1.1, r * 0.12, r * 0.5, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 0.35, -r * 1.1, r * 0.12, r * 0.5, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 身体
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.28, r * 0.28, r * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();

    this.drawEyes(ctx, angle, r);
  }

  /** 幽灵角色 */
  private static drawGhost(ctx: CanvasRenderingContext2D, grad: CanvasGradient, r: number, angle: number): void {
    ctx.fillStyle = grad;
    ctx.beginPath();
    // 头部
    ctx.arc(0, -r * 0.2, r, Math.PI, 0, false);
    // 波浪底部
    const waveCount = 4;
    const waveHeight = r * 0.3;
    for (let i = 0; i <= waveCount; i++) {
      const x = r - (2 * r / waveCount) * i;
      const y = r * 0.8 + (i % 2 === 0 ? 0 : waveHeight);
      if (i === 0) ctx.lineTo(r, r * 0.8);
      else ctx.quadraticCurveTo(
        x + r / waveCount,
        i % 2 === 0 ? r * 0.8 + waveHeight : r * 0.8,
        x, y
      );
    }
    ctx.closePath();
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.43, r * 0.28, r * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // 幽灵眼睛（空洞感）
    this.drawGhostEyes(ctx, angle, r);
  }

  /** 史莱姆角色 */
  private static drawSlime(ctx: CanvasRenderingContext2D, grad: CanvasGradient, r: number, angle: number): void {
    ctx.fillStyle = grad;
    ctx.beginPath();
    // 水滴形状
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 1.2, -r * 0.5, r * 1.2, r * 0.8, 0, r);
    ctx.bezierCurveTo(-r * 1.2, r * 0.8, -r * 1.2, -r * 0.5, 0, -r);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.21, -r * 0.36, r * 0.36, r * 0.21, -0.3, 0, Math.PI * 2);
    ctx.fill();

    this.drawEyes(ctx, angle, r * 0.9, r * 0.07);
  }

  /** 花朵角色 */
  private static drawFlower(ctx: CanvasRenderingContext2D, grad: CanvasGradient, r: number, angle: number): void {
    // 花瓣
    ctx.fillStyle = grad;
    const petalCount = 6;
    for (let i = 0; i < petalCount; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 / petalCount) * i);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.7, r * 0.45, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 花心
    const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.55);
    centerGrad.addColorStop(0, '#fff5a0');
    centerGrad.addColorStop(1, '#f0c000');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.18, -r * 0.21, r * 0.21, r * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fill();

    this.drawEyes(ctx, angle, r * 0.65);
  }

  /** 云朵角色 */
  private static drawCloud(ctx: CanvasRenderingContext2D, grad: CanvasGradient, r: number, angle: number): void {
    ctx.fillStyle = grad;
    // 主体云朵形状 - 多个圆组成
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 0.6, r * 0.1, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.6, r * 0.1, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.5, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.5, r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.43, r * 0.36, r * 0.21, -0.3, 0, Math.PI * 2);
    ctx.fill();

    this.drawEyes(ctx, angle, r * 0.8);
  }

  /** 章鱼角色 */
  private static drawOctopus(ctx: CanvasRenderingContext2D, grad: CanvasGradient, r: number, angle: number, time: number): void {
    // 触手
    ctx.fillStyle = grad;
    const tentacleCount = 6;
    const wiggle = Math.sin(time * 0.15) * 0.2;
    for (let i = 0; i < tentacleCount; i++) {
      ctx.save();
      const baseAngle = (Math.PI / (tentacleCount - 1)) * i;
      ctx.rotate(baseAngle + wiggle * (i % 2 === 0 ? 1 : -1));
      ctx.beginPath();
      ctx.ellipse(0, r * 0.9, r * 0.18, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 头部
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.1, r, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.5, r * 0.36, r * 0.21, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 章鱼大眼睛
    this.drawOctopusEyes(ctx, angle, r);
  }

  // =============== 眼睛绘制方法 ===============

  /** 默认眼睛 */
  private static drawEyes(ctx: CanvasRenderingContext2D, angle: number, r: number, offsetY = 0): void {
    const scale = r / 28;
    ctx.save();
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    // 眼白
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(12, -6 + offsetY / scale, 7, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(12, 6 + offsetY / scale, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 瞳孔
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(14, -6 + offsetY / scale, 4, 0, Math.PI * 2);
    ctx.arc(14, 6 + offsetY / scale, 4, 0, Math.PI * 2);
    ctx.fill();
    // 高光
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(16, -8 + offsetY / scale, 2, 0, Math.PI * 2);
    ctx.arc(16, 4 + offsetY / scale, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 猫眼（竖瞳） */
  private static drawCatEyes(ctx: CanvasRenderingContext2D, angle: number, r: number): void {
    const scale = r / 28;
    ctx.save();
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(10, -6, 6, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(10, 6, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // 竖瞳
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(12, -6, 2, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(12, 6, 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(13, -8, 1.5, 0, Math.PI * 2);
    ctx.arc(13, 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 幽灵眼睛（空洞感） */
  private static drawGhostEyes(ctx: CanvasRenderingContext2D, angle: number, r: number): void {
    const scale = r / 28;
    ctx.save();
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(8, -8, 5, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(8, 6, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(10, -10, 2, 0, Math.PI * 2);
    ctx.arc(10, 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** 章鱼大眼睛 */
  private static drawOctopusEyes(ctx: CanvasRenderingContext2D, angle: number, r: number): void {
    const scale = r / 28;
    ctx.save();
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(8, -6, 8, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(8, 8, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(10, -6, 4, 0, Math.PI * 2);
    ctx.arc(10, 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(12, -8, 2, 0, Math.PI * 2);
    ctx.arc(12, 6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
