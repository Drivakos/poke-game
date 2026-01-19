export const MOVE_PRIORITIES: Record<string, number> = {
  // Priority +7
  'Pursuit': 7,

  // Priority +6
  // Switching is special, handled in battle logic

  // Priority +5
  'Helping Hand': 5,

  // Priority +4
  'Detect': 4,
  'Magic Coat': 4,
  'Protect': 4,
  'Snatch': 4,
  'Quick Guard': 4,
  'Rage Powder': 4,
  'Wide Guard': 4,

  // Priority +3
  'Endure': 3,
  'Fake Out': 3,
  'Follow Me': 3,

  // Priority +2
  'Extreme Speed': 2,
  'Feint': 2,

  // Priority +1
  'Accelerock': 1,
  'Ally Switch': 1,
  'Aqua Jet': 1,
  'Bide': 1,
  'Bullet Punch': 1,
  'Ice Shard': 1,
  'Mach Punch': 1,
  'Quick Attack': 1,
  'Shadow Sneak': 1,
  'Sucker Punch': 1,
  'Vacuum Wave': 1,
  'Water Shuriken': 1,

  // Priority 0 (default for most moves - not listing all)

  // Priority -1
  'Vital Throw': -1,

  // Priority -3
  'Focus Punch': -3,

  // Priority -4
  'Avalanche': -4,
  'Counter': -4,
  'Mirror Coat': -4,
  'Revenge': -4,

  // Priority -5
  'Roar': -5,
  'Whirlwind': -5
}

export function getMovePriority(moveName: string): number {
  return MOVE_PRIORITIES[moveName] ?? 0
}

export function hasHighPriority(moveName: string): boolean {
  return getMovePriority(moveName) > 0
}

export function hasLowPriority(moveName: string): boolean {
  return getMovePriority(moveName) < 0
}
