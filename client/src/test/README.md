# Testing Guide

This directory contains utilities and helpers for testing the Pokemon battle engine.

## Running Tests

### Client Tests
```bash
cd client
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:ui       # Run tests with interactive UI
npm run test:coverage # Run tests with coverage report
```

### Server Tests
```bash
cd server
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage report
```

## Test Utilities

### Mock Data Generators (`utils/mockData.ts`)

#### `createMockPokemon(overrides?)`
Creates a mock BattlePokemon with default values.

```typescript
import { createMockPokemon } from './utils/mockData'

const pokemon = createMockPokemon({
  name: 'Pikachu',
  level: 100,
  type: ['Electric']
})
```

#### `createMockMove(overrides?)`
Creates a mock MoveData with default values.

```typescript
const move = createMockMove({
  name: 'Thunderbolt',
  basePower: 90,
  type: 'Electric',
  category: 'Special'
})
```

#### `createMockItem(overrides?)`
Creates a mock ItemData with default values.

```typescript
const item = createMockItem({
  name: 'Potion',
  effect: { healHp: 20 }
})
```

#### `createMockParty(size?)`
Creates a mock party of Pokemon.

```typescript
const party = createMockParty(3) // Creates 3 Pokemon
```

### Battle Helpers (`utils/battleHelpers.ts`)

#### `setupTestBattle(config?)`
Sets up a test battle with default player and enemy Pokemon.

```typescript
import { setupTestBattle } from './utils/battleHelpers'

const { player, enemy } = setupTestBattle({
  playerPokemon: { name: 'Charizard' },
  enemyPokemon: { name: 'Blastoise' }
})
```

#### `applyDamage(pokemon, damage)`
Returns a new Pokemon with damage applied.

```typescript
const damagedPokemon = applyDamage(pokemon, 50)
```

#### `healPokemon(pokemon, heal)`
Returns a new Pokemon with healing applied.

```typescript
const healedPokemon = healPokemon(pokemon, 30)
```

#### `setStatus(pokemon, status)`
Returns a new Pokemon with a status condition.

```typescript
const burnedPokemon = setStatus(pokemon, 'BRN')
const paralyzedPokemon = setStatus(pokemon, 'PAR')
```

#### `applyBoosts(pokemon, boosts)`
Returns a new Pokemon with stat boosts applied.

```typescript
const boostedPokemon = applyBoosts(pokemon, {
  atk: 2,
  spe: 1
})
```

#### `setVolatile(pokemon, volatile)`
Returns a new Pokemon with volatile conditions applied.

```typescript
const confusedPokemon = setVolatile(pokemon, {
  confusion: 3
})
```

#### `isFainted(pokemon)`
Returns true if the Pokemon has fainted (HP <= 0).

```typescript
if (isFainted(pokemon)) {
  console.log('Pokemon has fainted!')
}
```

#### `canMove(pokemon)`
Returns true if the Pokemon can move this turn.

```typescript
if (canMove(pokemon)) {
  // Pokemon can act
}
```

### Damage Test Helpers (`utils/damageTestHelpers.ts`)

#### `calculateExpectedDamage(attacker, defender, move, options?)`
Calculates expected damage range for a move.

```typescript
import { calculateExpectedDamage } from './utils/damageTestHelpers'

const { min, max, average } = calculateExpectedDamage(
  attacker,
  defender,
  move
)
```

#### `verifyStab(attacker, move, expectedStab)`
Verifies STAB calculation.

```typescript
const hasStab = verifyStab(attacker, move, 1.5)
```

#### `verifyEffectiveness(moveType, defenderTypes, expected)`
Verifies type effectiveness.

```typescript
const isSuperEffective = verifyEffectiveness('Fire', ['Grass'], 2)
```

#### `verifyCriticalHitChance(critChance, samples?)`
Verifies critical hit rate through sampling.

```typescript
const isCorrect = verifyCriticalHitChance(0.0625, 10000)
```

#### `verifyAccuracy(move, accuracyStage, evasionStage, samples?)`
Verifies accuracy through sampling.

```typescript
const { hits, misses, hitRate } = verifyAccuracy(
  move,
  0,   // accuracy stage
  0,   // evasion stage
  1000 // samples
)
```

#### `calculateDamageRange(attacker, defender, move, iterations?)`
Calculates damage range over multiple iterations.

```typescript
const { min, max, average, allDamages } = calculateDamageRange(
  attacker,
  defender,
  move,
  100
)
```

## Test Patterns

### Testing Damage Calculation
```typescript
import { describe, it, expect } from 'vitest'
import { DamageCalculator } from '../DamageCalculator'
import { createMockPokemon, createMockMove } from './utils/mockData'

it('should calculate damage correctly', () => {
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

  expect(result.damage).toBeGreaterThan(0)
  expect(result.effectiveness).toBeLessThan(1) // Not very effective
})
```

### Testing Battle Mechanics
```typescript
import { applyDamage, setStatus, isFainted, canMove } from './utils/battleHelpers'
import { createMockPokemon } from './utils/mockData'

it('should handle fainting', () => {
  let pokemon = createMockPokemon({
    maxHp: 100,
    currentHp: 100
  })

  pokemon = applyDamage(pokemon, 100)
  expect(isFainted(pokemon)).toBe(true)
  expect(canMove(pokemon)).toBe(false)
})
```

### Testing Status Conditions
```typescript
it('should handle burn status', () => {
  let pokemon = createMockPokemon()
  pokemon = setStatus(pokemon, 'BRN')

  expect(pokemon.status).toBe('BRN')
  expect(pokemon.statusCounter).toBe(0)
})
```

## Coverage

Coverage reports are generated in:
- `client/coverage/`
- `server/coverage/`

Open `coverage/index.html` in your browser to view the detailed coverage report.

## Notes

- All mock objects are immutable - functions return new objects
- Test utilities are designed to be composable
- Default values are provided for all required fields
- Randomness in damage calculation can be tested using the `calculateDamageRange` helper
