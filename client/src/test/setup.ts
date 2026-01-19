import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { DataManager } from '../game/DataManager'

vi.mock('phaser', () => ({
  default: {},
  Scene: class {}
}))

vi.spyOn(DataManager, 'getEffectiveness').mockImplementation((moveType: string, targetTypes: string[]) => {
  const typeChart: Record<string, { weak: string[]; resist: string[]; immune: string[] }> = {
    Normal: { weak: ['Fighting'], resist: [], immune: ['Ghost'] },
    Fire: { weak: ['Water', 'Ground', 'Rock'], resist: ['Fire', 'Grass', 'Ice', 'Bug', 'Steel', 'Fairy'], immune: [] },
    Water: { weak: ['Electric', 'Grass'], resist: ['Fire', 'Water', 'Ice', 'Steel'], immune: [] },
    Grass: { weak: ['Fire', 'Ice', 'Poison', 'Flying', 'Bug'], resist: ['Water', 'Electric', 'Grass', 'Ground'], immune: [] },
    Electric: { weak: ['Ground'], resist: ['Electric', 'Flying', 'Steel'], immune: [] },
    Ice: { weak: ['Fire', 'Fighting', 'Rock', 'Steel'], resist: ['Ice'], immune: [] },
    Fighting: { weak: ['Flying', 'Psychic', 'Fairy'], resist: ['Bug', 'Rock', 'Dark'], immune: [] },
    Poison: { weak: ['Ground', 'Psychic'], resist: ['Grass', 'Fighting', 'Poison', 'Bug', 'Fairy'], immune: [] },
    Ground: { weak: ['Water', 'Grass', 'Ice'], resist: ['Poison', 'Rock'], immune: ['Electric'] },
    Flying: { weak: ['Electric', 'Ice', 'Rock'], resist: ['Grass', 'Fighting', 'Bug'], immune: ['Ground'] },
    Psychic: { weak: ['Bug', 'Ghost', 'Dark'], resist: ['Fighting', 'Psychic'], immune: [] },
    Bug: { weak: ['Fire', 'Flying', 'Rock'], resist: ['Grass', 'Fighting', 'Ground'], immune: [] },
    Rock: { weak: ['Water', 'Grass', 'Fighting', 'Ground', 'Steel'], resist: ['Normal', 'Fire', 'Poison', 'Flying'], immune: [] },
    Ghost: { weak: ['Ghost', 'Dark'], resist: ['Poison', 'Bug'], immune: ['Normal', 'Fighting'] },
    Dragon: { weak: ['Ice', 'Dragon', 'Fairy'], resist: ['Fire', 'Water', 'Electric', 'Grass'], immune: [] },
    Steel: { weak: ['Fire', 'Fighting', 'Ground'], resist: ['Normal', 'Grass', 'Ice', 'Flying', 'Psychic', 'Bug', 'Rock', 'Dragon', 'Steel', 'Fairy'], immune: ['Poison'] },
    Fairy: { weak: ['Poison', 'Steel'], resist: ['Fighting', 'Bug', 'Dark'], immune: ['Dragon'] }
  }

  let multiplier = 1.0
  for (const defType of targetTypes) {
    const defData = typeChart[defType]
    if (!defData) continue

    if (defData.weak.includes(moveType)) {
      multiplier *= 2.0
    } else if (defData.resist.includes(moveType)) {
      multiplier *= 0.5
    } else if (defData.immune.includes(moveType)) {
      multiplier *= 0.0
    }
  }

  return multiplier
})
