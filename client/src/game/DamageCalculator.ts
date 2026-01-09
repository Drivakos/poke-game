import { DataManager } from './DataManager';
import type { BattlePokemon, MoveData } from './types';

export class DamageCalculator {
    private static getStageMultiplier(stage: number): number {
        if (stage >= 0) return (2 + stage) / 2;
        return 2 / (2 + Math.abs(stage));
    }

    private static getAccuracyMultiplier(stage: number): number {
        if (stage >= 0) return (3 + stage) / 3;
        return 3 / (3 + Math.abs(stage));
    }

    static calculate(attacker: BattlePokemon, defender: BattlePokemon, move: MoveData): { damage: number; effectiveness: number; critical: boolean; hit: boolean } {
        // 0. Accuracy Check
        if (move.accuracy && move.accuracy < 100) {
            // Apply Accuracy/Evasion stages
            const accStage = Math.max(-6, Math.min(6, attacker.stages.acc));
            const evaStage = Math.max(-6, Math.min(6, defender.stages.eva));
            const stage = Math.max(-6, Math.min(6, accStage - evaStage));
            const modifier = this.getAccuracyMultiplier(stage);
            
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

        // Type Effectiveness Check (Early exit for immunity)
        const effectiveness = DataManager.getEffectiveness(move.type, defender.type);
        if (effectiveness === 0) {
            return { damage: 0, effectiveness: 0, critical: false, hit: true };
        }

        let damage = 0;

        if (move.fixedDamage) {
            if (move.fixedDamage === 'level') damage = attacker.level;
            else damage = move.fixedDamage;
            return { damage, effectiveness: 1, critical: false, hit: true };
        }

        let power = move.basePower;

        // Magnitude Logic
        if (move.name === 'Magnitude') {
            const r = Math.random();
            if (r < 0.05) power = 10;
            else if (r < 0.15) power = 30;
            else if (r < 0.35) power = 50;
            else if (r < 0.65) power = 70;
            else if (r < 0.85) power = 90;
            else if (r < 0.95) power = 110;
            else power = 150;
        }

        // 2. Base Damage
        damage = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * power * atkStat / defStat) / 50) + 2;

        // 3. Modifiers
        // STAB
        if (attacker.type.includes(move.type)) {
            damage = Math.floor(damage * 1.5);
        }

        // Type Effectiveness
        damage = Math.floor(damage * effectiveness);
        
        // Critical Hit (Standard logic)


        const highCritMoves = [
            'Slash', 'Razor Leaf', 'Karate Chop', 'Crabhammer', 'Cross Chop', 'Aeroblast', 'Air Cutter', 
            'Stone Edge', 'Leaf Blade', 'Night Slash', 'Psycho Cut', 'Shadow Claw', 'Spacial Rend', 
            'Attack Order', 'Drill Run', 'Blaze Kick', 'Snipe Shot', 'G-Max Chi Strike'
        ];

        let critChance = 0.0625;
        if (move.name && highCritMoves.includes(move.name)) {
            critChance = 0.125; // +1 Stage (1/8)
        }

        const isCritical = Math.random() < critChance; 
        if (isCritical) {
            damage = Math.floor(damage * 1.5);
        }

        const random = (Math.floor(Math.random() * 16) + 85) / 100;
        damage = Math.floor(damage * random);

        return { damage, effectiveness, critical: isCritical, hit: true };
    }
}
