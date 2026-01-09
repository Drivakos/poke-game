import { DataManager } from './DataManager';
import type { BattlePokemon, MoveData } from './types';

export class DamageCalculator {
    private static getStageMultiplier(stage: number): number {
        if (stage >= 0) return (2 + stage) / 2;
        return 2 / (2 + Math.abs(stage));
    }

    static calculate(attacker: BattlePokemon, defender: BattlePokemon, move: MoveData): { damage: number; effectiveness: number; critical: boolean; hit: boolean } {
        // 0. Accuracy Check
        if (move.accuracy && move.accuracy < 100) {
            // Apply Accuracy/Evasion stages
            const accStage = Math.max(-3, Math.min(3, attacker.stages.acc));
            const evaStage = Math.max(-3, Math.min(3, defender.stages.eva));
            const stage = Math.max(-3, Math.min(3, accStage - evaStage));
            const modifier = stage >= 0 ? (3 + stage) / 3 : 3 / (3 + Math.abs(stage));
            
            const hitChance = move.accuracy * modifier;
            if (Math.random() * 100 > hitChance) {
                return { damage: 0, effectiveness: 0, critical: false, hit: false };
            }
        }

        if (move.category === 'Status' || move.basePower === 0) {
            return { damage: 0, effectiveness: 1, critical: false, hit: true };
        }

        const level = attacker.level;
        
        // 1. Calculate Effective Stats
        let atkStat = move.category === 'Physical' ? attacker.stats.Attack : attacker.stats['Sp. Attack'];
        let defStat = move.category === 'Physical' ? defender.stats.Defense : defender.stats['Sp. Defense'];

        // Apply Status Drops
        if (attacker.status === 'BRN' && move.category === 'Physical') {
            atkStat = Math.floor(atkStat * 0.5);
        }

        // Apply Stages
        const atkStage = move.category === 'Physical' ? attacker.stages.atk : attacker.stages.spa;
        const defStage = move.category === 'Physical' ? defender.stages.def : defender.stages.spd;

        atkStat = Math.floor(atkStat * this.getStageMultiplier(atkStage));
        defStat = Math.floor(defStat * this.getStageMultiplier(defStage));

        const power = move.basePower;

        // 2. Base Damage
        let damage = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * power * atkStat / defStat) / 50) + 2;

        // 3. Modifiers
        // STAB
        if (attacker.type.includes(move.type)) {
            damage = Math.floor(damage * 1.5);
        }

        // Type Effectiveness
        const effectiveness = DataManager.getEffectiveness(move.type, defender.type);
        damage = Math.floor(damage * effectiveness);

        const isCritical = Math.random() < 0.0625; 
        if (isCritical) {
            damage = Math.floor(damage * 1.5);
        }

        const random = (Math.floor(Math.random() * 16) + 85) / 100;
        damage = Math.floor(damage * random);

        return { damage, effectiveness, critical: isCritical, hit: true };
    }
}
