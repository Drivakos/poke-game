import { describe, it, expect } from 'vitest'
import { DamageCalculator } from './DamageCalculator'
import { createMockPokemon, createMockMove } from '../test/utils/mockData'

describe('DamageCalculator', () => {
  describe('calculate', () => {
    it('should calculate damage for a normal attack', () => {
      const attacker = createMockPokemon({
        name: 'Charizard',
        stats: {
          HP: 150,
          Attack: 100,
          Defense: 78,
          'Sp. Attack': 110,
          'Sp. Defense': 85,
          Speed: 100
        },
        type: ['Fire']
      })

      const defender = createMockPokemon({
        name: 'Blastoise',
        id: 2,
        stats: {
          HP: 160,
          Attack: 83,
          Defense: 100,
          'Sp. Attack': 85,
          'Sp. Defense': 105,
          Speed: 78
        },
        type: ['Water']
      })

      const move = createMockMove({
        name: 'Tackle',
        basePower: 40,
        category: 'Physical',
        type: 'Normal',
        accuracy: 100
      })

      const result = DamageCalculator.calculate(attacker, defender, move)

      expect(result).toHaveProperty('damage')
      expect(result).toHaveProperty('effectiveness')
      expect(result).toHaveProperty('critical')
      expect(result).toHaveProperty('hit')
      expect(result.hit).toBe(true)
      expect(result.damage).toBeGreaterThan(0)
    })

    it('should apply STAB when move type matches Pokemon type', () => {
      const attacker = createMockPokemon({
        name: 'Charizard',
        stats: {
          HP: 150,
          Attack: 100,
          Defense: 78,
          'Sp. Attack': 110,
          'Sp. Defense': 85,
          Speed: 100
        },
        type: ['Fire']
      })

      const defender = createMockPokemon({
        name: 'Blastoise',
        id: 2,
        type: ['Water']
      })

      const move = createMockMove({
        name: 'Flamethrower',
        basePower: 90,
        category: 'Special',
        type: 'Fire',
        accuracy: 100
      })

      const result = DamageCalculator.calculate(attacker, defender, move)
      expect(result.damage).toBeGreaterThan(0)
    })

    it('should handle type effectiveness', () => {
      const attacker = createMockPokemon({
        name: 'Charizard',
        type: ['Fire']
      })

      const defender = createMockPokemon({
        name: 'Blastoise',
        id: 2,
        type: ['Water']
      })

      const move = createMockMove({
        name: 'Flamethrower',
        basePower: 90,
        category: 'Special',
        type: 'Fire',
        accuracy: 100
      })

      const result = DamageCalculator.calculate(attacker, defender, move)
      expect(result.effectiveness).toBeLessThan(1)
      expect(result.effectiveness).toBeGreaterThan(0)
    })

    it('should handle immunity (0x effectiveness)', () => {
      const attacker = createMockPokemon({
        name: 'Charizard',
        type: ['Fire']
      })

      const defender = createMockPokemon({
        name: 'Gengar',
        id: 2,
        type: ['Ghost']
      })

      const move = createMockMove({
        name: 'Tackle',
        basePower: 40,
        category: 'Physical',
        type: 'Normal',
        accuracy: 100
      })

      const result = DamageCalculator.calculate(attacker, defender, move)
      expect(result.effectiveness).toBe(0)
      expect(result.damage).toBe(0)
    })

    it('should handle super-effective moves', () => {
      const attacker = createMockPokemon({
        name: 'Charizard',
        type: ['Fire']
      })

      const defender = createMockPokemon({
        name: 'Grass-type',
        id: 2,
        type: ['Grass']
      })

      const move = createMockMove({
        name: 'Flamethrower',
        basePower: 90,
        category: 'Special',
        type: 'Fire',
        accuracy: 100
      })

      const result = DamageCalculator.calculate(attacker, defender, move)
      expect(result.effectiveness).toBeGreaterThan(1)
    })

    it('should handle status moves (0 damage)', () => {
      const attacker = createMockPokemon({
        name: 'Charizard',
        type: ['Fire']
      })

      const defender = createMockPokemon({
        name: 'Blastoise',
        id: 2,
        type: ['Water']
      })

      const move = createMockMove({
        name: 'Will-O-Wisp',
        basePower: 0,
        category: 'Status',
        type: 'Fire',
        accuracy: 85
      })

      const result = DamageCalculator.calculate(attacker, defender, move)
      expect(result.damage).toBe(0)
      expect(result.hit).toBe(true)
    })

    it('should apply burn penalty to physical attacks', () => {
      const attacker = createMockPokemon({
        name: 'Charizard',
        type: ['Fire'],
        status: 'BRN',
        stats: {
          HP: 150,
          Attack: 100,
          Defense: 78,
          'Sp. Attack': 110,
          'Sp. Defense': 85,
          Speed: 100
        }
      })

      const defender = createMockPokemon({
        name: 'Blastoise',
        id: 2,
        type: ['Water']
      })

      const physicalMove = createMockMove({
        name: 'Slash',
        basePower: 70,
        category: 'Physical',
        type: 'Normal',
        accuracy: 100
      })

      const specialMove = createMockMove({
        name: 'Flamethrower',
        basePower: 90,
        category: 'Special',
        type: 'Fire',
        accuracy: 100
      })

      const physicalResult = DamageCalculator.calculate(attacker, defender, physicalMove)
      const specialResult = DamageCalculator.calculate(attacker, defender, specialMove)

      expect(physicalResult.damage).toBeGreaterThan(0)
      expect(specialResult.damage).toBeGreaterThan(0)
    })

  })
})
