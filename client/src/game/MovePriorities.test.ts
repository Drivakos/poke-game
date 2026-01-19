import { describe, it, expect } from 'vitest'
import { getMovePriority, hasHighPriority, hasLowPriority, MOVE_PRIORITIES } from '../game/MovePriorities'

describe('MovePriorities', () => {
  describe('getMovePriority', () => {
    it('should return 0 for moves not in priority table', () => {
      expect(getMovePriority('Tackle')).toBe(0)
      expect(getMovePriority('Flamethrower')).toBe(0)
      expect(getMovePriority('Water Gun')).toBe(0)
    })

    it('should return +5 for Helping Hand', () => {
      expect(getMovePriority('Helping Hand')).toBe(5)
    })

    it('should return +4 for protection moves', () => {
      expect(getMovePriority('Protect')).toBe(4)
      expect(getMovePriority('Detect')).toBe(4)
      expect(getMovePriority('Snatch')).toBe(4)
    })

    it('should return +3 for Fake Out and Follow Me', () => {
      expect(getMovePriority('Fake Out')).toBe(3)
      expect(getMovePriority('Follow Me')).toBe(3)
    })

    it('should return +2 for Extreme Speed', () => {
      expect(getMovePriority('Extreme Speed')).toBe(2)
      expect(getMovePriority('Feint')).toBe(2)
    })

    it('should return +1 for priority moves', () => {
      expect(getMovePriority('Quick Attack')).toBe(1)
      expect(getMovePriority('Aqua Jet')).toBe(1)
      expect(getMovePriority('Bullet Punch')).toBe(1)
      expect(getMovePriority('Mach Punch')).toBe(1)
      expect(getMovePriority('Ice Shard')).toBe(1)
      expect(getMovePriority('Shadow Sneak')).toBe(1)
      expect(getMovePriority('Sucker Punch')).toBe(1)
      expect(getMovePriority('Vacuum Wave')).toBe(1)
      expect(getMovePriority('Water Shuriken')).toBe(1)
    })

    it('should return -1 for Vital Throw', () => {
      expect(getMovePriority('Vital Throw')).toBe(-1)
    })

    it('should return -3 for Focus Punch', () => {
      expect(getMovePriority('Focus Punch')).toBe(-3)
    })

    it('should return -4 for counter moves', () => {
      expect(getMovePriority('Avalanche')).toBe(-4)
      expect(getMovePriority('Counter')).toBe(-4)
      expect(getMovePriority('Mirror Coat')).toBe(-4)
      expect(getMovePriority('Revenge')).toBe(-4)
    })

    it('should return -5 for phazing moves', () => {
      expect(getMovePriority('Roar')).toBe(-5)
      expect(getMovePriority('Whirlwind')).toBe(-5)
    })
  })

  describe('hasHighPriority', () => {
    it('should return true for positive priority moves', () => {
      expect(hasHighPriority('Quick Attack')).toBe(true)
      expect(hasHighPriority('Extreme Speed')).toBe(true)
      expect(hasHighPriority('Helping Hand')).toBe(true)
    })

    it('should return false for zero priority moves', () => {
      expect(hasHighPriority('Tackle')).toBe(false)
      expect(hasHighPriority('Flamethrower')).toBe(false)
    })

    it('should return false for negative priority moves', () => {
      expect(hasHighPriority('Focus Punch')).toBe(false)
      expect(hasHighPriority('Roar')).toBe(false)
    })
  })

  describe('hasLowPriority', () => {
    it('should return true for negative priority moves', () => {
      expect(hasLowPriority('Focus Punch')).toBe(true)
      expect(hasLowPriority('Roar')).toBe(true)
      expect(hasLowPriority('Avalanche')).toBe(true)
    })

    it('should return false for zero priority moves', () => {
      expect(hasLowPriority('Tackle')).toBe(false)
      expect(hasLowPriority('Flamethrower')).toBe(false)
    })

    it('should return false for positive priority moves', () => {
      expect(hasLowPriority('Quick Attack')).toBe(false)
      expect(hasLowPriority('Extreme Speed')).toBe(false)
    })
  })

  describe('MOVE_PRIORITIES constant', () => {
    it('should have entries for all priority moves', () => {
      expect(MOVE_PRIORITIES['Quick Attack']).toBe(1)
      expect(MOVE_PRIORITIES['Protect']).toBe(4)
      expect(MOVE_PRIORITIES['Focus Punch']).toBe(-3)
    })

    it('should not have entries for zero priority moves', () => {
      expect(MOVE_PRIORITIES['Tackle']).toBeUndefined()
      expect(MOVE_PRIORITIES['Flamethrower']).toBeUndefined()
    })
  })
})
