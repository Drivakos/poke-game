import type { BattlePokemon, MoveData, StatStages } from '../../game/types'

export interface TestBattleConfig {
  playerPokemon?: BattlePokemon
  enemyPokemon?: BattlePokemon
  playerMoves?: MoveData[]
  enemyMoves?: MoveData[]
}

export function setupTestBattle(config?: TestBattleConfig) {
  const defaultPlayer: BattlePokemon = {
    id: 1,
    name: 'Charizard',
    level: 50,
    currentHp: 150,
    maxHp: 150,
    moves: config?.playerMoves || [],
    stats: {
      HP: 150,
      Attack: 100,
      Defense: 78,
      'Sp. Attack': 110,
      'Sp. Defense': 85,
      Speed: 100
    },
    type: ['Fire', 'Flying'],
    stages: {
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0,
      acc: 0,
      eva: 0
    },
    status: null,
    statusCounter: 0,
    volatile: {}
  }

  const defaultEnemy: BattlePokemon = {
    id: 2,
    name: 'Blastoise',
    level: 50,
    currentHp: 160,
    maxHp: 160,
    moves: config?.enemyMoves || [],
    stats: {
      HP: 160,
      Attack: 83,
      Defense: 100,
      'Sp. Attack': 85,
      'Sp. Defense': 105,
      Speed: 78
    },
    type: ['Water'],
    stages: {
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0,
      acc: 0,
      eva: 0
    },
    status: null,
    statusCounter: 0,
    volatile: {}
  }

  return {
    player: { ...defaultPlayer, ...config?.playerPokemon },
    enemy: { ...defaultEnemy, ...config?.enemyPokemon }
  }
}

export function applyDamage(pokemon: BattlePokemon, damage: number): BattlePokemon {
  const newHp = Math.max(0, pokemon.currentHp - damage)
  return {
    ...pokemon,
    currentHp: newHp
  }
}

export function healPokemon(pokemon: BattlePokemon, heal: number): BattlePokemon {
  const newHp = Math.min(pokemon.maxHp, pokemon.currentHp + heal)
  return {
    ...pokemon,
    currentHp: newHp
  }
}

export function setStatus(
  pokemon: BattlePokemon,
  status: 'BRN' | 'PAR' | 'PSN' | 'SLP' | 'FRZ' | 'SEED' | 'WRAP' | null
): BattlePokemon {
  return {
    ...pokemon,
    status,
    statusCounter: 0
  }
}

export function applyBoosts(pokemon: BattlePokemon, boosts: Partial<StatStages>): BattlePokemon {
  const newStages = { ...pokemon.stages }
  Object.entries(boosts).forEach(([stat, val]) => {
    const currentVal = newStages[stat as keyof StatStages]
    const change = val as number
    newStages[stat as keyof StatStages] = Math.max(-6, Math.min(6, currentVal + change))
  })
  return {
    ...pokemon,
    stages: newStages
  }
}

export function setVolatile(
  pokemon: BattlePokemon,
  volatile: Partial<BattlePokemon['volatile']>
): BattlePokemon {
  return {
    ...pokemon,
    volatile: { ...pokemon.volatile, ...volatile }
  }
}

export function advanceTurn(pokemon: BattlePokemon): BattlePokemon {
  return {
    ...pokemon,
    statusCounter: pokemon.statusCounter + 1
  }
}

export function isFainted(pokemon: BattlePokemon): boolean {
  return pokemon.currentHp <= 0
}

export function canMove(pokemon: BattlePokemon): boolean {
  if (isFainted(pokemon)) return false
  if (pokemon.status === 'SLP') return false
  if (pokemon.status === 'FRZ') return false
  if (pokemon.status === 'PAR') {
    return Math.random() >= 0.25
  }
  if (pokemon.volatile.confusion) {
    return Math.random() >= 0.5
  }
  return true
}
