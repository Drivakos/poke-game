import type { BattlePokemon, MoveData, ItemData } from '../../game/types'

export function createMockPokemon(overrides?: Partial<BattlePokemon>): BattlePokemon {
  return {
    id: 1,
    name: 'Bulbasaur',
    level: 50,
    currentHp: 100,
    maxHp: 100,
    moves: [createMockMove()],
    stats: {
      HP: 100,
      Attack: 70,
      Defense: 65,
      'Sp. Attack': 80,
      'Sp. Defense': 80,
      Speed: 60
    },
    type: ['Grass', 'Poison'],
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
    volatile: {},
    spriteBack: '',
    spriteFront: '',
    ...overrides
  }
}

export function createMockMove(overrides?: Partial<MoveData>): MoveData {
  return {
    basePower: 50,
    category: 'Physical',
    type: 'Normal',
    accuracy: 100,
    name: 'Tackle',
    pp: 35,
    priority: 0,
    ...overrides
  }
}

export function createMockItem(overrides?: Partial<ItemData>): ItemData {
  return {
    id: 'potion',
    name: 'Potion',
    desc: 'Restores 20 HP',
    category: 'Heal',
    effect: {
      healHp: 20
    },
    ...overrides
  }
}

export function createMockParty(size: number = 6): BattlePokemon[] {
  const party: BattlePokemon[] = []
  for (let i = 1; i <= size; i++) {
    party.push(createMockPokemon({
      id: i,
      name: `Pokemon${i}`
    }))
  }
  return party
}
