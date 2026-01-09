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
    status: 'BRN' | 'PAR' | 'PSN' | 'SLP' | 'FRZ' | null;
    statusCounter: number; // For Sleep turns or Toxic scaling
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
}
