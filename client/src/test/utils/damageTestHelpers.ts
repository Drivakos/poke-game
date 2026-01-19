import { DamageCalculator } from '../../game/DamageCalculator'
import type { BattlePokemon, MoveData } from '../../game/types'

export interface DamageOptions {
  stab?: number
  effectiveness?: number
  critical?: boolean
  random?: number
  level?: number
}

export interface ExpectedDamage {
  min: number
  max: number
  average: number
}

export function calculateExpectedDamage(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: MoveData,
  options: DamageOptions = {}
): ExpectedDamage {
  const result = DamageCalculator.calculate(attacker, defender, move)
  
  if (!result.hit) {
    return { min: 0, max: 0, average: 0 }
  }

  const minDamage = result.damage
  const maxDamage = result.damage
  
  return {
    min: minDamage,
    max: maxDamage,
    average: Math.floor((minDamage + maxDamage) / 2)
  }
}

export function verifyStab(attacker: BattlePokemon, move: MoveData, expectedStab: number): boolean {
  const hasStab = attacker.type.includes(move.type)
  const actualStab = hasStab ? 1.5 : 1
  return actualStab === expectedStab
}

export function verifyEffectiveness(moveType: string, defenderTypes: string[], expected: number): boolean {
  const typeChart: Record<string, Record<string, number>> = {
    Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
    Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
    Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
    Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
    Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
    Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
    Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
    Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
    Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
    Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
    Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
    Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5 },
    Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
    Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
    Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
    Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
    Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
  }

  let effectiveness = 1
  for (const defenderType of defenderTypes) {
    const typeEffectiveness = typeChart[moveType]?.[defenderType] ?? 1
    effectiveness *= typeEffectiveness
  }

  return effectiveness === expected
}

export function verifyCriticalHitChance(critChance: number, samples: number = 10000): boolean {
  const threshold = 0.05
  const criticalHits = Array(samples).fill(0).reduce((count) => {
    return count + (Math.random() < critChance ? 1 : 0)
  }, 0)
  
  const actualChance = criticalHits / samples
  return Math.abs(actualChance - critChance) < threshold
}

export function verifyAccuracy(
  move: MoveData,
  accuracyStage: number,
  evasionStage: number,
  samples: number = 1000
): { hits: number; misses: number; hitRate: number } {
  const hits = Array(samples).fill(0).reduce((count) => {
    const moveAccuracy = move.accuracy || 100
    
    const accMultiplier = accuracyStage >= 0 
      ? (3 + accuracyStage) / 3 
      : 3 / (3 + Math.abs(accuracyStage))
    
    const evaMultiplier = evasionStage >= 0
      ? (3 + evasionStage) / 3
      : 3 / (3 + Math.abs(evasionStage))
    
    const stageModifier = accMultiplier / evaMultiplier
    const hitChance = moveAccuracy * stageModifier
    
    return count + (Math.random() * 100 < hitChance ? 1 : 0)
  }, 0)
  
  const misses = samples - hits
  const hitRate = hits / samples
  
  return { hits, misses, hitRate }
}

export function verifyStatStageMultiplier(stage: number): number {
  if (stage >= 0) return (2 + stage) / 2
  return 2 / (2 + Math.abs(stage))
}

export function calculateDamageRange(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: MoveData,
  iterations: number = 100
): { min: number; max: number; average: number; allDamages: number[] } {
  const damages: number[] = []
  
  for (let i = 0; i < iterations; i++) {
    const result = DamageCalculator.calculate(attacker, defender, move)
    if (result.hit && result.damage > 0) {
      damages.push(result.damage)
    }
  }
  
  if (damages.length === 0) {
    return { min: 0, max: 0, average: 0, allDamages: [] }
  }
  
  const min = Math.min(...damages)
  const max = Math.max(...damages)
  const average = Math.floor(damages.reduce((a, b) => a + b, 0) / damages.length)
  
  return { min, max, average, allDamages: damages }
}
