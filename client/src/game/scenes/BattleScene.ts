import Phaser from 'phaser';
import axios from 'axios';
import { useBattleStore } from '../../stores/useBattleStore';
import { DataManager } from '../DataManager';
import { DamageCalculator } from '../DamageCalculator';

export class BattleScene extends Phaser.Scene {
    private playerSprite: Phaser.GameObjects.Sprite | null = null;
    private enemySprite: Phaser.GameObjects.Sprite | null = null;
    private unsubscribe: (() => void) | null = null;

    private playerMon: any = null;
    private enemyMon: any = null;

    constructor() {
        super('BattleScene');
    }

    preload() {
        this.load.image('background', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png');
    }

    create() {
        DataManager.loadTypeChart();

        this.unsubscribe = useBattleStore.subscribe((state, prevState) => {
            if (state.phase !== prevState.phase) {
                this.handlePhaseChange(state.phase);
            }
            if (state.activePlayerIndex !== prevState.activePlayerIndex) {
                this.handlePlayerSwitch(state.activePlayerIndex);
            }
        });

        this.startBattle([1, 4, 7, 25, 133, 143], 150);
    }

    async startBattle(playerIds: number[], enemyId: number) {
        try {
            // 1. Fetch Data
            const playerPromises = playerIds.map(id => axios.get(`http://localhost:3000/api/pokemon/${id}`));
            const enemyPromise = axios.get(`http://localhost:3000/api/pokemon/${enemyId}`);

            const [playerResponses, enemyResponse] = await Promise.all([
                Promise.all(playerPromises),
                enemyPromise
            ]);

            const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

            // 2. Build Party Objects
            const playerParty = await Promise.all(playerResponses.map(async (res) => {
                const p = res.data;
                // Handle localized name if it's an object
                const name = typeof p.name === 'object' ? p.name.english : p.name;
                
                const moves = await Promise.all(['tackle', 'growl'].map(k => DataManager.getMove(k)));
                return {
                    ...p, 
                    name: name,
                    level: 5,
                    currentHp: p.stats.HP,
                    maxHp: p.stats.HP,
                    moves: moves.filter(m => m !== null),
                    stages: { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 },
                    status: null,
                    statusCounter: 0,
                    spriteBack: `back_${p.id}`,
                    spriteFront: `front_${p.id}`
                };
            }));

            const eData = enemyResponse.data;
            const eName = typeof eData.name === 'object' ? eData.name.english : eData.name;
            const eMoves = await Promise.all(['scratch', 'leer'].map(k => DataManager.getMove(k)));
            const enemyParty = [{
                ...eData,
                name: eName,
                level: 5,
                currentHp: eData.stats.HP,
                maxHp: eData.stats.HP,
                moves: eMoves.filter(m => m !== null),
                stages: { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 },
                status: null,
                statusCounter: 0,
                spriteBack: `back_${eData.id}`,
                spriteFront: `front_${eData.id}`
            }];

            // 3. Queue Sprites
            playerParty.forEach((p: any) => {
                this.load.image(p.spriteBack, `${baseUrl}/back/${p.id}.png`);
                this.load.image(p.spriteFront, `${baseUrl}/${p.id}.png`);
            });
            enemyParty.forEach((p: any) => {
                this.load.image(p.spriteFront, `${baseUrl}/${p.id}.png`);
            });

            // 4. Init Store
            useBattleStore.getState().initBattle(playerParty, enemyParty);
            this.playerMon = playerParty[0];
            this.enemyMon = enemyParty[0];

            this.load.once('complete', () => {
                this.setupBattleField();
            });
            this.load.start();

        } catch (err) {
            console.error('Failed to load battle data', err);
        }
    }

    setupBattleField() {
        this.enemySprite = this.add.sprite(600, 250, `front_${this.enemyMon.id}`).setScale(3);
        this.playerSprite = this.add.sprite(200, 400, `back_${this.playerMon.id}`).setScale(3);
    }

    handlePlayerSwitch(index: number) {
        const party = useBattleStore.getState().playerParty;
        const newMon = party[index];
        this.playerMon = newMon;

        // Visual Switch
        if (this.playerSprite) {
            this.tweens.add({
                targets: this.playerSprite,
                x: -100,
                duration: 500,
                onComplete: () => {
                    this.playerSprite?.setTexture(newMon.spriteBack || '');
                    this.playerSprite?.setAlpha(1); // Ensure visible in case it was fainted/faded
                    this.tweens.add({
                        targets: this.playerSprite,
                        x: 200,
                        duration: 500
                    });
                }
            });
        }
    }

    handlePhaseChange(phase: string) {
        if (phase === 'PLAYER_ANIMATION') {
            if (!this.checkCanMove(this.playerMon, true)) {
                this.time.delayedCall(1000, () => {
                    useBattleStore.getState().setPhase('ENEMY_ANIMATION');
                });
                return;
            }

            const moveIndex = useBattleStore.getState().selectedMoveIndex;
            const moves = useBattleStore.getState().playerMoves;
            const move = moves[moveIndex || 0];

            this.executeMove(this.playerMon, this.enemyMon, move, true);
        }
        else if (phase === 'ENEMY_ANIMATION') {
            if (!this.checkCanMove(this.enemyMon, false)) {
                this.time.delayedCall(1000, () => {
                     this.processEndOfTurn();
                });
                return;
            }

             // Enemy Logic
             useBattleStore.getState().addLog("Enemy used Scratch!");
             const mockMove = { basePower: 40, category: 'Physical', type: 'Normal', name: 'Scratch', accuracy: 100 };
             this.executeMove(this.enemyMon, this.playerMon, mockMove, false);
        }
    }

    checkCanMove(mon: any, isPlayer: boolean): boolean {
        if (!mon.status) return true;

        if (mon.status === 'PAR') {
            if (Math.random() < 0.25) {
                useBattleStore.getState().addLog(`${mon.name} is paralyzed! It can't move!`);
                return false;
            }
        }
        if (mon.status === 'FRZ') {
            if (Math.random() < 0.2) {
                useBattleStore.getState().applyStatus(isPlayer ? 'player' : 'enemy', null as any); // Thaw
                useBattleStore.getState().addLog(`${mon.name} thawed out!`);
                return true;
            }
            useBattleStore.getState().addLog(`${mon.name} is frozen solid!`);
            return false;
        }
        if (mon.status === 'SLP') {
            mon.statusCounter--;
            if (mon.statusCounter <= 0) {
                useBattleStore.getState().applyStatus(isPlayer ? 'player' : 'enemy', null as any); // Wake up
                useBattleStore.getState().addLog(`${mon.name} woke up!`);
                return true;
            }
            useBattleStore.getState().addLog(`${mon.name} is fast asleep.`);
            return false;
        }

        return true;
    }

    executeMove(attacker: any, defender: any, move: any, isPlayer: boolean) {
        const attackerSprite = isPlayer ? this.playerSprite : this.enemySprite;
        const targetSprite = isPlayer ? this.enemySprite : this.playerSprite;
        const targetKey = isPlayer ? 'enemy' : 'player'; 

        attacker.stages = isPlayer ? useBattleStore.getState().playerStages : useBattleStore.getState().enemyStages;
        defender.stages = isPlayer ? useBattleStore.getState().enemyStages : useBattleStore.getState().playerStages;

        this.playAttackAnim(attackerSprite, targetSprite, move.category, () => {
            // Check Hit/Miss
            // @ts-ignore
            const result = DamageCalculator.calculate(attacker, defender, move);
            
            if (!result.hit) {
                useBattleStore.getState().addLog(`${attacker.name}'s attack missed!`);
                this.finishTurn(isPlayer);
                return;
            }

            if (move.category === 'Status') {
                if (move.boosts) {
                    const isSelf = move.target === 'self';
                    const effectTarget = isSelf ? (isPlayer ? 'player' : 'enemy') : targetKey;
                    useBattleStore.getState().applyBoosts(effectTarget as any, move.boosts);
                    Object.keys(move.boosts).forEach(stat => {
                        const val = move.boosts[stat];
                        const change = val > 0 ? 'rose' : 'fell';
                        this.showFloatingText(targetSprite, `${stat.toUpperCase()} ${change}!`);
                    });
                }
                useBattleStore.getState().addLog(`${move.name} succeeded!`);
            } else {
                if (isPlayer) useBattleStore.getState().damageEnemy(result.damage);
                else useBattleStore.getState().damagePlayer(result.damage);
                
                if (result.critical) useBattleStore.getState().addLog("A critical hit!");
                if (result.effectiveness > 1) useBattleStore.getState().addLog("It's super effective!");
                if (result.effectiveness < 1 && result.effectiveness > 0) useBattleStore.getState().addLog("It's not very effective...");
            }

            // Apply Status Effect Chance
            if (move.statusEffect && Math.random() * 100 < (move.statusChance || 100)) {
                // Check if target already has status? Handled in store but good to check here too or just fire it
                const targetKey = isPlayer ? 'enemy' : 'player';
                // Type immunity checks (e.g. Fire cannot be burned) would go here
                useBattleStore.getState().applyStatus(targetKey, move.statusEffect);
                useBattleStore.getState().addLog(`${isPlayer ? 'Enemy' : 'Player'} was ${this.getStatusName(move.statusEffect)}!`);
            }

            this.time.delayedCall(1000, () => {
                const state = useBattleStore.getState();
                const targetHp = isPlayer ? state.enemyHp : state.playerHp;
                
                if (targetHp <= 0) {
                    useBattleStore.getState().addLog(`${isPlayer ? 'Enemy' : 'Player'} fainted!`);
                    this.playFaintAnim(targetSprite, () => {
                        useBattleStore.getState().setPhase('END');
                        useBattleStore.setState({ winner: isPlayer ? 'player' : 'enemy' });
                    });
                } else {
                    this.finishTurn(isPlayer);
                }
            });
        });
    }

    finishTurn(isPlayer: boolean) {
        if (isPlayer) {
            useBattleStore.getState().setPhase('ENEMY_ANIMATION');
        } else {
            this.processEndOfTurn();
        }
    }

    processEndOfTurn() {
        // Burn / Poison Damage
        const processDot = (mon: any, isPlayer: boolean) => {
            if (!mon.status || mon.currentHp <= 0) return;
            if (mon.status === 'BRN' || mon.status === 'PSN') {
                const dmg = Math.floor(mon.maxHp / 8);
                if (isPlayer) useBattleStore.getState().damagePlayer(dmg);
                else useBattleStore.getState().damageEnemy(dmg);
                useBattleStore.getState().addLog(`${mon.name} is hurt by its ${mon.status === 'BRN' ? 'burn' : 'poison'}!`);
            }
        };

        processDot(this.playerMon, true);
        processDot(this.enemyMon, false);

        // Check Faint after DOT
        const pState = useBattleStore.getState();
        if (pState.playerHp <= 0 || pState.enemyHp <= 0) {
             if (pState.playerHp <= 0) {
                 this.playFaintAnim(this.playerSprite, () => {
                     useBattleStore.getState().setPhase('END');
                     useBattleStore.setState({ winner: 'enemy' });
                 });
             } else {
                 this.playFaintAnim(this.enemySprite, () => {
                     useBattleStore.getState().setPhase('END');
                     useBattleStore.setState({ winner: 'player' });
                 });
             }
        } else {
            useBattleStore.getState().setPhase('PLAYER_SELECT');
        }
    }

    getStatusName(code: string) {
        const map: any = { 'BRN': 'burned', 'PAR': 'paralyzed', 'PSN': 'poisoned', 'FRZ': 'frozen', 'SLP': 'put to sleep' };
        return map[code] || code;
    }

    showFloatingText(target: Phaser.GameObjects.Sprite | null, text: string) {
        if (!target) return;
        const t = this.add.text(target.x, target.y - 50, text, { 
            fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 
        }).setOrigin(0.5);

        this.tweens.add({
            targets: t,
            y: t.y - 50,
            alpha: 0,
            duration: 1500,
            onComplete: () => t.destroy()
        });
    }

    playAttackAnim(attacker: Phaser.GameObjects.Sprite | null, target: Phaser.GameObjects.Sprite | null, category: string, onComplete: () => void) {
        if (!attacker || !target) {
            onComplete();
            return;
        }

        const startX = attacker.x;
        const startY = attacker.y;
        const isPlayer = attacker.x < 400;

        if (category === 'Status') {
            // Pulse Animation
            this.tweens.add({
                targets: attacker,
                scaleX: attacker.scaleX * 1.1,
                scaleY: attacker.scaleY * 1.1,
                duration: 200,
                yoyo: true,
                repeat: 1,
                onComplete: onComplete
            });
        } else {
            // Physical Lunge
            this.tweens.add({
                targets: attacker,
                x: isPlayer ? attacker.x + 50 : attacker.x - 50,
                y: isPlayer ? attacker.y - 30 : attacker.y + 30,
                duration: 100,
                yoyo: true,
                repeat: 1,
                onYoyo: () => {
                    if (target.alpha === 1) target.setAlpha(0.5);
                    else target.setAlpha(1);
                },
                onComplete: () => {
                    target.setAlpha(1);
                    attacker.x = startX;
                    attacker.y = startY;
                    onComplete();
                }
            });
        }
    }

    playFaintAnim(target: Phaser.GameObjects.Sprite | null, onComplete: () => void) {
        if (!target) {
            onComplete();
            return;
        }

        this.tweens.add({
            targets: target,
            y: target.y + 50,
            alpha: 0,
            duration: 1000,
            onComplete: onComplete
        });
    }

    shutdown() {
        if (this.unsubscribe) this.unsubscribe();
    }
}
