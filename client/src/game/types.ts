export interface StatStages {
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
    acc: number;
    eva: number;
}

export interface BattlePokemon {
    id: number;
    name: string;
    level: number;
    currentHp: number;
    maxHp: number;
    moves: MoveData[];
    stats: {
        HP: number;
        Attack: number;
        Defense: number;
        'Sp. Attack': number;
        'Sp. Defense': number;
        Speed: number;
    };
    type: string[];
    stages: StatStages;
    status: 'BRN' | 'PAR' | 'PSN' | 'SLP' | 'FRZ' | 'SEED' | 'WRAP' | null;
    statusCounter: number; // For Sleep turns or Toxic scaling
    volatile: {
        confusion?: number;
        lockedMove?: { moveName: string; turns: number };
        trap?: { name: string; turns: number };
        seeded?: boolean;
    };
    spriteBack?: string;
    spriteFront?: string;
}

export interface MoveData {
    basePower: number;
    category: 'Physical' | 'Special' | 'Status';
    type: string;
    boosts?: Partial<StatStages>;
    statusEffect?: 'BRN' | 'PAR' | 'PSN' | 'SLP' | 'FRZ';
    statusChance?: number; // 0-100
    accuracy?: number;
    target?: string;
    name?: string;
    pp?: number;
    multihit?: number | [number, number];
    magnitude?: boolean;
    recoil?: number; // 0-1 (fraction of damage dealt)
    drain?: number;  // 0-1 (fraction of damage dealt)
    selfDestruct?: boolean;
    fixedDamage?: number | 'level';
    selfBoosts?: Partial<StatStages>;
}

export interface ItemData {
    id: string;
    name: string;
    desc?: string;
    shortDesc?: string;
    category?: 'Status' | 'Heal' | 'Ball' | 'Battle' | 'Key'; // Simplified categories
    effect?: {
        healHp?: number;      // Flat amount
        healPercent?: number; // 0-1 (e.g. 0.5 for 50%)
        cureStatus?: ('BRN' | 'PAR' | 'PSN' | 'SLP' | 'FRZ' | 'all')[];
        catchRate?: number;   // 1.0, 1.5, 2.0 etc.
    };
}

export interface InventoryItem {
    item: ItemData;
    count: number;
}
