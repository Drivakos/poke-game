import { describe, it, expect, beforeEach } from 'vitest'
import { createMockPokemon, createMockParty } from '../test/utils/mockData'

describe('useBattleStore (basic smoke test)', () => {
  it('should create a mock Pokemon correctly', () => {
    const pokemon = createMockPokemon()

    expect(pokemon).toHaveProperty('id')
    expect(pokemon).toHaveProperty('name')
    expect(pokemon).toHaveProperty('level')
    expect(pokemon).toHaveProperty('currentHp')
    expect(pokemon).toHaveProperty('maxHp')
    expect(pokemon).toHaveProperty('moves')
    expect(pokemon).toHaveProperty('stats')
    expect(pokemon).toHaveProperty('type')
    expect(pokemon).toHaveProperty('stages')
    expect(pokemon).toHaveProperty('status')
    expect(pokemon).toHaveProperty('volatile')
  })

  it('should override mock Pokemon properties', () => {
    const pokemon = createMockPokemon({
      name: 'Pikachu',
      level: 100,
      currentHp: 50
    })

    expect(pokemon.name).toBe('Pikachu')
    expect(pokemon.level).toBe(100)
    expect(pokemon.currentHp).toBe(50)
  })

  it('should create a mock party', () => {
    const party = createMockParty(3)

    expect(party).toHaveLength(3)
    expect(party[0].id).toBe(1)
    expect(party[1].id).toBe(2)
    expect(party[2].id).toBe(3)
  })

  it('should create a full mock party of 6 Pokemon', () => {
    const party = createMockParty()

    expect(party).toHaveLength(6)
  })
})
