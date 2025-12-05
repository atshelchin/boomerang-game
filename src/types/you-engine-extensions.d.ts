/**
 * You Engine 类型扩展
 * 通过模块扩展为 GameEntity 添加游戏特定的组件
 */

import type {
  PlayerData,
  BoomerangData,
  PowerupData,
  WallData,
  ParticleData,
  TrailData,
  RingData,
  FloatingTextData,
  FireTrailData,
  IceTrailData,
  TerrainData,
  PortalData,
  BoulderData,
  PoisonZoneData,
} from '../entities/types';

declare module 'you-engine' {
  interface GameEntity {
    // 游戏特定的组件
    player?: PlayerData;
    boomerang?: BoomerangData;
    powerup?: PowerupData;
    wall?: WallData;
    particle?: ParticleData;
    trail?: TrailData;
    ring?: RingData;
    floatingText?: FloatingTextData;
    fireTrail?: FireTrailData;
    iceTrail?: IceTrailData;
    terrain?: TerrainData;
    portal?: PortalData;
    boulder?: BoulderData;
    poisonZone?: PoisonZoneData;
  }
}
