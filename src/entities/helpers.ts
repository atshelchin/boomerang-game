/**
 * 实体辅助函数
 */

import type { GameEntity } from './types';

/**
 * 检查实体是否有指定的标签
 */
export function hasTag(entity: GameEntity, tag: string): boolean {
  return entity.tags?.values.includes(tag) ?? false;
}

/**
 * 创建标签数组
 */
export function createTags(...tags: string[]): { values: string[] } {
  return { values: [...tags] };
}
