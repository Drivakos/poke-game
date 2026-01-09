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
            this.movesCache[key] = res.data;
            return res.data;
        } catch (e) {
            console.error(`Failed to load move ${key}`, e);
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
