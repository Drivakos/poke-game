import { create } from 'zustand';
import type { StatStages, BattlePokemon, InventoryItem } from '../game/types';

export type BattlePhase = 'START' | 'PLAYER_SELECT' | 'PLAYER_SWITCH' | 'PLAYER_ANIMATION' | 'ENEMY_ANIMATION' | 'END';

const DEFAULT_STAGES: StatStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 };

// Simple hardcoded effects for MVP
const ITEM_EFFECTS: Record<string, (mon: BattlePokemon) => { success: boolean, msg: string, changes?: Partial<BattlePokemon> }> = {
    'Potion': (mon) => {
        if (mon.currentHp >= mon.maxHp) return { success: false, msg: 'It had no effect!' };
        const heal = 20;
        const newHp = Math.min(mon.maxHp, mon.currentHp + heal);
        return { success: true, msg: `Used Potion! Restored ${newHp - mon.currentHp} HP.`, changes: { currentHp: newHp } };
    },
    'Super Potion': (mon) => {
        if (mon.currentHp >= mon.maxHp) return { success: false, msg: 'It had no effect!' };
        const heal = 60;
        const newHp = Math.min(mon.maxHp, mon.currentHp + heal);
        return { success: true, msg: `Used Super Potion! Restored ${newHp - mon.currentHp} HP.`, changes: { currentHp: newHp } };
    },
    'Antidote': (mon) => {
        if (mon.status !== 'PSN') return { success: false, msg: 'It had no effect!' };
        return { success: true, msg: `Used Antidote! Cured poison!`, changes: { status: null, statusCounter: 0 } };
    },
    'Paralyze Heal': (mon) => {
        if (mon.status !== 'PAR') return { success: false, msg: 'It had no effect!' };
        return { success: true, msg: `Used Paralyze Heal! Cured paralysis!`, changes: { status: null } };
    }
};

interface BattleState {
    phase: BattlePhase;
    battleLog: string[];
    
    // Player State
    playerParty: BattlePokemon[];
    activePlayerIndex: number;
    playerHp: number;
    playerMaxHp: number;
    playerMoves: any[];
    playerStages: StatStages;
    playerStatus: string | null;
    inventory: InventoryItem[];
    
    // Enemy State
    enemyParty: BattlePokemon[];
    activeEnemyIndex: number;
    enemyHp: number;
    enemyMaxHp: number;
    enemyStages: StatStages;
    enemyStatus: string | null;

    winner: 'player' | 'enemy' | null;

    // Actions
    addLog: (msg: string) => void;
    setPhase: (phase: BattlePhase) => void;
    
    damagePlayer: (amount: number) => void;
    damageEnemy: (amount: number) => void;
    
    applyBoosts: (target: 'player' | 'enemy', boosts: Partial<StatStages>) => void;
    setStatus: (target: 'player' | 'enemy', status: string) => void;
    applyStatus: (target: 'player' | 'enemy', status: 'BRN' | 'PAR' | 'PSN' | 'SLP' | 'FRZ' | 'SEED' | 'WRAP') => void;
    setVolatile: (target: 'player' | 'enemy', update: any) => void;

    initBattle: (playerParty: BattlePokemon[], enemyParty: BattlePokemon[]) => void;
    switchPlayerPokemon: (index: number) => void;
    switchEnemyPokemon: (index: number) => void;
    
    selectedMoveIndex: number | null;
    setSelectedMove: (index: number | null) => void;
    
    useItem: (itemIndex: number) => void;
}

export const useBattleStore = create<BattleState>((set) => ({
    phase: 'START',
    battleLog: [],
    
    playerParty: [],
    activePlayerIndex: 0,
    playerHp: 100,
    playerMaxHp: 100,
    playerMoves: [],
    playerStages: { ...DEFAULT_STAGES },
    playerStatus: null,
    inventory: [
        { item: { id: 'potion', name: 'Potion', desc: 'Restores 20 HP' }, count: 5 },
        { item: { id: 'superpotion', name: 'Super Potion', desc: 'Restores 60 HP' }, count: 2 },
        { item: { id: 'antidote', name: 'Antidote', desc: 'Cures Poison' }, count: 1 },
        { item: { id: 'paralyzeheal', name: 'Paralyze Heal', desc: 'Cures Paralysis' }, count: 1 }
    ],
    
    enemyParty: [],
    activeEnemyIndex: 0,
    enemyHp: 100,
    enemyMaxHp: 100,
    enemyStages: { ...DEFAULT_STAGES },
    enemyStatus: null,
    
    winner: null,
    
    selectedMoveIndex: null,

    addLog: (msg) => set((state) => ({ battleLog: [...state.battleLog, msg] })),
    setPhase: (phase) => set({ phase }),
    
    damagePlayer: (amount) => set((state) => {
        const newHp = Math.max(0, state.playerHp - amount);
        const newParty = [...state.playerParty];
        if (newParty[state.activePlayerIndex]) {
            newParty[state.activePlayerIndex] = { ...newParty[state.activePlayerIndex], currentHp: newHp };
        }
        return { playerHp: newHp, playerParty: newParty };
    }),
    
    damageEnemy: (amount) => set((state) => {
        const newHp = Math.max(0, state.enemyHp - amount);
        const newParty = [...state.enemyParty];
        if (newParty[state.activeEnemyIndex]) {
            newParty[state.activeEnemyIndex] = { ...newParty[state.activeEnemyIndex], currentHp: newHp };
        }
        return { enemyHp: newHp, enemyParty: newParty };
    }),

    applyBoosts: (target, boosts) => set((state) => {
        const key = target === 'player' ? 'playerStages' : 'enemyStages';
        const current = state[key];
        const next = { ...current };
        const newLogs: string[] = [];
        
        const monName = target === 'player' 
             ? (state.playerParty[state.activePlayerIndex]?.name || 'Player') 
             : (state.enemyParty[state.activeEnemyIndex]?.name || 'Enemy');

        Object.entries(boosts).forEach(([stat, val]) => {
            const currentVal = current[stat as keyof StatStages];
            const change = val as number;

            if (change > 0 && currentVal >= 6) {
                 newLogs.push(`${monName}'s ${stat.toUpperCase()} won't go any higher!`);
            } else if (change < 0 && currentVal <= -6) {
                 newLogs.push(`${monName}'s ${stat.toUpperCase()} won't go any lower!`);
            } else {
                 next[stat as keyof StatStages] = Math.max(-6, Math.min(6, currentVal + change));
            }
        });

        return { 
            [key]: next,
            battleLog: [...state.battleLog, ...newLogs]
        };
    }),

    setStatus: (target, status) => set({
        [target === 'player' ? 'playerStatus' : 'enemyStatus']: status
    }),

    applyStatus: (target, status) => set((state) => {
        // Sync to Party
        const isPlayer = target === 'player';
        const party = isPlayer ? [...state.playerParty] : [...state.enemyParty];
        const index = isPlayer ? state.activePlayerIndex : state.activeEnemyIndex;
        
        if (party[index].status) return {}; // Already has status

        party[index].status = status;
        party[index].statusCounter = 0; // Reset counter

        return {
            [isPlayer ? 'playerParty' : 'enemyParty']: party,
            [isPlayer ? 'playerStatus' : 'enemyStatus']: status
        };
    }),

    setVolatile: (target, update) => set((state) => {
        const isPlayer = target === 'player';
        const party = isPlayer ? [...state.playerParty] : [...state.enemyParty];
        const index = isPlayer ? state.activePlayerIndex : state.activeEnemyIndex;
        
        const currentVolatile = party[index].volatile || {};
        party[index].volatile = { ...currentVolatile, ...update };

        return {
             [isPlayer ? 'playerParty' : 'enemyParty']: party
        };
    }),

    initBattle: (playerParty, enemyParty) => {
        const pLead = playerParty[0];
        const eLead = enemyParty[0];
        set({
            playerParty, enemyParty,
            activePlayerIndex: 0, activeEnemyIndex: 0,
            
            playerHp: pLead.currentHp, playerMaxHp: pLead.maxHp,
            playerMoves: pLead.moves, playerStages: { ...DEFAULT_STAGES },
            
            enemyHp: eLead.currentHp, enemyMaxHp: eLead.maxHp,
            enemyStages: { ...DEFAULT_STAGES },
            
            phase: 'PLAYER_SELECT'
        });
    },

    switchPlayerPokemon: (index) => set((state) => {
        const newMon = state.playerParty[index];
        if (!newMon || newMon.currentHp <= 0) return {}; // Invalid switch

        return {
            activePlayerIndex: index,
            playerHp: newMon.currentHp,
            playerMaxHp: newMon.maxHp,
            playerMoves: newMon.moves,
            playerStages: { ...DEFAULT_STAGES }, // Reset stages on switch
            playerStatus: null, // Should persist? Usually status persists, but we'll reset for simplicity or read from mon
            // In a real game, status (burn, par) is on the Pokemon object.
            // We should read it if we had it. For now, reset or keep null.
            phase: 'ENEMY_ANIMATION', // Switching takes a turn
            battleLog: [...state.battleLog, `Go! ${newMon.name}!`]
        };
    }),

    switchEnemyPokemon: (index) => set((state) => {
        const newMon = state.enemyParty[index];
        if (!newMon || newMon.currentHp <= 0) return {};

        return {
            activeEnemyIndex: index,
            enemyHp: newMon.currentHp,
            enemyMaxHp: newMon.maxHp,
            enemyStages: { ...DEFAULT_STAGES },
            enemyStatus: newMon.status || null,
            battleLog: [...state.battleLog, `Enemy sent out ${newMon.name}!`]
        };
    }),
    
    setSelectedMove: (index) => set({ selectedMoveIndex: index }),

    useItem: (itemIndex) => set((state) => {
        const invItem = state.inventory[itemIndex];
        if (!invItem || invItem.count <= 0) return {};

        const activeMon = state.playerParty[state.activePlayerIndex];
        const effectFn = ITEM_EFFECTS[invItem.item.name];
        
        if (!effectFn) {
            return { battleLog: [...state.battleLog, `Cannot use ${invItem.item.name} right now.`] };
        }

        const result = effectFn(activeMon);
        
        if (!result.success) {
             return { battleLog: [...state.battleLog, result.msg] };
        }

        // Apply Changes
        const newParty = [...state.playerParty];
        newParty[state.activePlayerIndex] = { ...activeMon, ...result.changes };
        
        // Update Inventory
        const newInventory = [...state.inventory];
        newInventory[itemIndex] = { ...invItem, count: invItem.count - 1 };

        // Determine Updates
        const updates: Partial<BattleState> = {
            inventory: newInventory,
            playerParty: newParty,
            battleLog: [...state.battleLog, result.msg],
            phase: 'ENEMY_ANIMATION' // Using item takes turn
        };

        if (result.changes?.currentHp !== undefined) {
            updates.playerHp = result.changes.currentHp;
        }
        if (result.changes?.status !== undefined) {
            updates.playerStatus = result.changes.status as string | null;
        }

        return updates;
    })
}));
