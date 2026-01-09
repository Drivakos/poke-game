import axios from 'axios';

interface TypeData {
    name: string;
    weak: string[];
    resist: string[];
    immune: string[];
}

export class DataManager {
    private static typeChart: Record<string, TypeData> = {};
    private static movesCache: Record<string, any> = {};

    static async loadTypeChart() {
        if (Object.keys(this.typeChart).length > 0) return;
        try {
            const res = await axios.get('http://localhost:3000/api/types');
            res.data.forEach((t: TypeData) => {
                this.typeChart[t.name] = t;
            });
            console.log('Type Chart Loaded');
        } catch (e) {
            console.error('Failed to load types', e);
        }
    }

    static async getMove(key: string) {
        if (this.movesCache[key]) return this.movesCache[key];
        try {
            const res = await axios.get(`http://localhost:3000/api/moves/${key}`);
            const data = res.data;
            
            // Normalize Boosts
            if (data.boosts) {
                if (data.boosts.accuracy !== undefined) {
                    data.boosts.acc = data.boosts.accuracy;
                    delete data.boosts.accuracy;
                }
                if (data.boosts.evasion !== undefined) {
                    data.boosts.eva = data.boosts.evasion;
                    delete data.boosts.evasion;
                }
            }

            // Special Move Flags
            const selfDestructMoves = ['Self-Destruct', 'Explosion', 'Misty Explosion', 'Healing Wish', 'Lunar Dance', 'Memento', 'Final Gambit'];
            const recoilMoves = ['Take Down', 'Double-Edge', 'Submission', 'Brave Bird', 'Flare Blitz', 'Head Charge', 'Volt Tackle', 'Wave Crash', 'Wild Charge', 'Wood Hammer'];
            const heavyRecoilMoves = ['Head Smash', 'Light of Ruin'];
            const drainMoves = ['Mega Drain', 'Absorb', 'Giga Drain', 'Drain Punch', 'Horn Leech', 'Parabolic Charge', 'Oblivion Wing'];

            if (selfDestructMoves.includes(data.name)) {
                data.selfDestruct = true;
            } else if (recoilMoves.includes(data.name)) {
                data.recoil = 0.25; // Standard recoil
            } else if (heavyRecoilMoves.includes(data.name)) {
                data.recoil = 0.5; // Heavy recoil
            } else if (drainMoves.includes(data.name)) {
                data.drain = 0.5;
            } else if (data.name === 'Dragon Rage') {
                data.fixedDamage = 40;
            } else if (data.name === 'Sonic Boom') {
                data.fixedDamage = 20;
            } else if (['Seismic Toss', 'Night Shade', 'Psywave'].includes(data.name)) {
                data.fixedDamage = 'level';
            }
            
            // Self Boosts / Drops
            if (['Overheat', 'Draco Meteor', 'Leaf Storm', 'Psycho Boost', 'Fleur Cannon'].includes(data.name)) {
                data.selfBoosts = { spa: -2 };
            } else if (data.name === 'Superpower') {
                data.selfBoosts = { atk: -1, def: -1 };
            } else if (['Close Combat', 'Headlong Rush', 'Armor Cannon', 'Dragon Ascent'].includes(data.name)) {
                data.selfBoosts = { def: -1, spd: -1 };
            } else if (data.name === 'V-create') {
                data.selfBoosts = { def: -1, spd: -1, spe: -1 };
            } else if (['Hammer Arm', 'Ice Hammer'].includes(data.name)) {
                data.selfBoosts = { spe: -1 };
            } else if (data.name === 'Shell Smash') {
                data.selfBoosts = { def: -1, spd: -1, atk: 2, spa: 2, spe: 2 }; // Shell Smash is status but applies to self
            }

            this.movesCache[key] = data;
            return data;
        } catch (e) {
            console.error(`Failed to load move ${key}`, e);
            return null;
        }
    }

    static async getItems(page = 1, limit = 50) {
        try {
            const res = await axios.get(`http://localhost:3000/api/items`, { params: { page, limit } });
            return res.data;
        } catch (e) {
            console.error('Failed to load items', e);
            return [];
        }
    }

    static async getItem(key: string) {
        try {
            const res = await axios.get(`http://localhost:3000/api/items/${key}`);
            return res.data;
        } catch (e) {
            console.error(`Failed to load item ${key}`, e);
            return null;
        }
    }

    static getEffectiveness(moveType: string, targetTypes: string[]): number {
        let multiplier = 1.0;
        const typeData = this.typeChart[moveType];
        
        if (!typeData) return 1.0;

        targetTypes.forEach(defType => {
            // MongoDB "Type" names might be capitalized or not, ensure matching
            // My DB has "Fire", "Water" (Capitalized)
            
            // Check Weakness (2x)
            if (typeData.resist.includes(defType)) { 
                // Wait, logic inversion? 
                // TypeChart in DB: "Fire" -> { weak: ["Water"] } means Fire is weak to Water.
                // Attacker: Water. Defender: Fire.
                // Water's chart says ???
                // Usually charts are stored as "Attacker": { "SuperEffective": [...], "NotVery": [...] }
                
                // My DB Data (from previous script):
                // "Fire": { weak: ["Water"], resist: ["Fire", "Grass"] }
                // This describes the DEFENDER properties.
                // i.e. If I am Fire, I am weak to Water.
                
                // So if Attacker is WATER and Defender is FIRE:
                // Look up FIRE in chart.
                // Is 'Water' in Fire.weak? Yes -> 2.0
            }
        });
        
        // Correct Logic for "Defender-Centric" chart:
        for (const defType of targetTypes) {
            const defData = this.typeChart[defType];
            if (!defData) continue;

            if (defData.weak.includes(moveType)) {
                multiplier *= 2.0;
            } else if (defData.resist.includes(moveType)) {
                multiplier *= 0.5;
            } else if (defData.immune.includes(moveType)) {
                multiplier *= 0.0;
            }
        }

        return multiplier;
    }
}
