import Phaser from 'phaser';
import axios from 'axios';
import { useBattleStore } from '../../stores/useBattleStore';
import { DataManager } from '../DataManager';
import { DamageCalculator } from '../DamageCalculator';
import { AnimationManager } from '../AnimationManager';

export class BattleScene extends Phaser.Scene {
    private playerSprite: Phaser.GameObjects.DOMElement | null = null;
    private enemySprite: Phaser.GameObjects.DOMElement | null = null;
    private unsubscribe: (() => void) | null = null;

    private playerMon: any = null;
    private enemyMon: any = null;

    constructor() {
        super('BattleScene');
    }

    preload() {
        this.load.image('background', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png');
        // Custom move assets can be loaded here if added
    }

    create() {
        AnimationManager.generateTextures(this);
        DataManager.loadTypeChart();

        this.unsubscribe = useBattleStore.subscribe((state, prevState) => {
            if (state.phase !== prevState.phase) {
                this.handlePhaseChange(state.phase);
            }
            if (state.activePlayerIndex !== prevState.activePlayerIndex) {
                this.handlePlayerSwitch(state.activePlayerIndex);
            }
        });

        const getRandomIds = (count: number) => {
            const ids = new Set<number>();
            while(ids.size < count) {
                ids.add(Math.floor(Math.random() * 151) + 1);
            }
            return Array.from(ids);
        };

        const playerTeam = getRandomIds(6);
        const enemyTeam = getRandomIds(6);

        this.startBattle(playerTeam, enemyTeam);
    }

    async startBattle(playerIds: number[], enemyIds: number[]) {
        try {
            const playerPromises = playerIds.map(id => axios.get(`http://localhost:3000/api/pokemon/${id}`));
            const enemyPromises = enemyIds.map(id => axios.get(`http://localhost:3000/api/pokemon/${id}`));

            const [playerResponses, enemyResponses] = await Promise.all([
                Promise.all(playerPromises),
                Promise.all(enemyPromises)
            ]);

            const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown';

            const processParty = async (responses: any[]) => {
                return Promise.all(responses.map(async (res) => {
                    const p = res.data;
                    const name = typeof p.name === 'object' ? p.name.english : p.name;
                    
                    let possibleMoves: string[] = [];
                    if (p.learnset && typeof p.learnset === 'object') {
                        possibleMoves = Object.keys(p.learnset);
                    } else if (Array.isArray(p.moves)) {
                        possibleMoves = p.moves;
                    }

                    if (possibleMoves.length === 0) possibleMoves = ['tackle', 'struggle'];

                    const selectedKeys = possibleMoves.sort(() => 0.5 - Math.random()).slice(0, 4);
                    const movesData = await Promise.all(selectedKeys.map(k => DataManager.getMove(k)));
                    const validMoves = movesData.filter(m => m !== null);

                    if (validMoves.length === 0) {
                         const tackle = await DataManager.getMove('tackle');
                         if (tackle) validMoves.push(tackle);
                    }

                    return {
                        ...p, 
                        name: name,
                        level: 50,
                        currentHp: Math.floor(p.stats.HP * 1.5),
                        maxHp: Math.floor(p.stats.HP * 1.5),
                        moves: validMoves,
                        stages: { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 },
                        status: null,
                        statusCounter: 0,
                        volatile: {},
                        spriteBack: `${baseUrl}/back/${p.id}.gif`,
                        spriteFront: `${baseUrl}/${p.id}.gif`
                    };
                }));
            };

            const playerParty = await processParty(playerResponses);
            const enemyParty = await processParty(enemyResponses);

            useBattleStore.getState().initBattle(playerParty, enemyParty);
            this.playerMon = playerParty[0];
            this.enemyMon = enemyParty[0];

            this.setupBattleField();

        } catch (err) {
            console.error('Failed to load battle data', err);
        }
    }

    setupBattleField() {
        // Use DOM elements for GIFs
        const enemyImg = document.createElement('img');
        enemyImg.src = this.enemyMon.spriteFront;
        enemyImg.style.width = '150px';
        enemyImg.style.height = '150px';
        this.enemySprite = this.add.dom(600, 250, enemyImg);
        
        const playerImg = document.createElement('img');
        playerImg.src = this.playerMon.spriteBack;
        playerImg.style.width = '150px';
        playerImg.style.height = '150px';
        this.playerSprite = this.add.dom(200, 400, playerImg);
        
        this.enemySprite.setScale(1.5);
        this.playerSprite.setScale(1.5);
    }

    handlePlayerSwitch(index: number) {
        const party = useBattleStore.getState().playerParty;
        const newMon = party[index];
        this.playerMon = newMon;

        if (this.playerSprite) {
            this.tweens.add({
                targets: this.playerSprite,
                x: -100,
                duration: 500,
                onComplete: () => {
                    const img = this.playerSprite?.node as HTMLImageElement;
                    if (img) img.src = newMon.spriteBack || '';
                    
                    this.playerSprite?.setAlpha(1);
                    this.tweens.add({
                        targets: this.playerSprite,
                        x: 200,
                        duration: 500
                    });
                }
            });
        }
    }

    async handlePhaseChange(phase: string) {
        if (phase === 'PLAYER_ANIMATION') {
            if (!this.checkCanMove(this.playerMon, true)) {
                this.time.delayedCall(1000, () => {
                    useBattleStore.getState().setPhase('ENEMY_ANIMATION');
                });
                return;
            }

            if (this.playerMon.volatile?.lockedMove) {
                const lock = this.playerMon.volatile.lockedMove;
                const newTurns = lock.turns - 1;
                const move = await DataManager.getMove(lock.moveName);
                
                useBattleStore.getState().addLog(`${this.playerMon.name} is rampaging!`);
                this.executeMove(this.playerMon, this.enemyMon, move, true);

                if (newTurns <= 0) {
                     useBattleStore.getState().setVolatile('player', { lockedMove: undefined, confusion: Math.floor(Math.random()*4)+1 });
                     useBattleStore.getState().addLog(`${this.playerMon.name} became confused due to fatigue!`);
                } else {
                     useBattleStore.getState().setVolatile('player', { lockedMove: { ...lock, turns: newTurns } });
                }
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

            if (this.enemyMon.volatile?.lockedMove) {
                const lock = this.enemyMon.volatile.lockedMove;
                const newTurns = lock.turns - 1;
                const move = await DataManager.getMove(lock.moveName);
                
                useBattleStore.getState().addLog(`${this.enemyMon.name} is rampaging!`);
                this.executeMove(this.enemyMon, this.playerMon, move, false);

                if (newTurns <= 0) {
                     useBattleStore.getState().setVolatile('enemy', { lockedMove: undefined, confusion: Math.floor(Math.random()*4)+1 });
                     useBattleStore.getState().addLog(`${this.enemyMon.name} became confused due to fatigue!`);
                } else {
                     useBattleStore.getState().setVolatile('enemy', { lockedMove: { ...lock, turns: newTurns } });
                }
                return;
            }

             useBattleStore.getState().addLog("Enemy used Scratch!");
             const mockMove = { basePower: 40, category: 'Physical', type: 'Normal', name: 'Scratch', accuracy: 100 };
             this.executeMove(this.enemyMon, this.playerMon, mockMove, false);
        }
    }

    checkCanMove(mon: any, isPlayer: boolean): boolean {
        if (mon.volatile?.confusion) {
            useBattleStore.getState().addLog(`${mon.name} is confused!`);
            
            const newTurns = mon.volatile.confusion - 1;
            if (newTurns <= 0) {
                 useBattleStore.getState().setVolatile(isPlayer ? 'player' : 'enemy', { confusion: undefined });
                 useBattleStore.getState().addLog(`${mon.name} snapped out of its confusion!`);
            } else {
                 useBattleStore.getState().setVolatile(isPlayer ? 'player' : 'enemy', { confusion: newTurns });
            }

            if (Math.random() < 0.5) {
                useBattleStore.getState().addLog(`It hurt itself in its confusion!`);
                const damage = Math.floor((((2 * mon.level / 5 + 2) * 40 * mon.stats.Attack / mon.stats.Defense) / 50) + 2);
                if (isPlayer) useBattleStore.getState().damagePlayer(damage);
                else useBattleStore.getState().damageEnemy(damage);
                return false;
            }
        }

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

    getHitCount(moveName: string): number {
        const twoToFive = [
            'Double Slap', 'Comet Punch', 'Fury Attack', 'Pin Missile', 'Barrage', 
            'Spike Cannon', 'Fury Swipes', 'Bone Rush', 'Bullet Seed', 'Icicle Spear', 
            'Rock Blast', 'Tail Slap', 'Arm Thrust', 'Scale Shot'
        ];
        const twoHit = [
            'Double Kick', 'Bonemerang', 'Twineedle', 'Double Hit', 'Double Iron Bash', 
            'Dragon Darts', 'Dual Chop', 'Dual Wingbeat', 'Gear Grind', 'Tachyon Cutter', 'Twin Beam'
        ];
        
        if (twoHit.includes(moveName)) return 2;
        if (twoToFive.includes(moveName)) {
            const r = Math.random();
            if (r < 0.375) return 2;
            if (r < 0.75) return 3;
            if (r < 0.875) return 4;
            return 5;
        }
        return 1;
    }

    executeMove(attacker: any, defender: any, move: any, isPlayer: boolean) {
        // Safe Cast to DOM Element if logic requires sprite props
        const attackerSprite = isPlayer ? this.playerSprite : this.enemySprite;
        const targetSprite = isPlayer ? this.enemySprite : this.playerSprite;
        const targetKey = isPlayer ? 'enemy' : 'player'; 

        attacker.stages = isPlayer ? useBattleStore.getState().playerStages : useBattleStore.getState().enemyStages;
        defender.stages = isPlayer ? useBattleStore.getState().enemyStages : useBattleStore.getState().playerStages;

        const totalHits = this.getHitCount(move.name || '');
        let currentHit = 0;
        let hitsLanded = 0;

        const performHit = () => {
            currentHit++;
            
            // Cast sprites for AnimationManager (it expects Sprite or GameObject, DOMElement is GameObject)
            // AnimationManager uses .x, .y which exist on DOMElement.
            // However, type signature says Phaser.Scene, ...
            // The `playAttackAnim` function expects Phaser.GameObjects.Sprite.
            // I need to update `playAttackAnim` signature to accept `DOMElement` or `GameObject`.
            // For now, I'll cast to `any` in the call to avoid errors or update the method below.
            
            this.playAttackAnim(attackerSprite as any, targetSprite as any, move.category, move.type, move.name || '', () => {
                // @ts-ignore
                const result = DamageCalculator.calculate(attacker, defender, move);
                
                if (!result.hit) {
                    if (currentHit === 1) useBattleStore.getState().addLog(`${attacker.name}'s attack missed!`);
                    this.finishTurn(isPlayer);
                    return;
                }

                hitsLanded++;

                if (move.category === 'Status') {
                    if (move.boosts) {
                        const isSelf = move.target === 'self';
                        const effectTarget = isSelf ? (isPlayer ? 'player' : 'enemy') : targetKey;
                        useBattleStore.getState().applyBoosts(effectTarget as any, move.boosts);
                        Object.keys(move.boosts).forEach(stat => {
                            const val = move.boosts[stat];
                            const change = val > 0 ? 'rose' : 'fell';
                            this.showFloatingText(targetSprite as any, `${stat.toUpperCase()} ${change}!`);
                        });
                    }
                    
                    if (move.name === 'Leech Seed') {
                         useBattleStore.getState().applyStatus(targetKey, 'SEED');
                         useBattleStore.getState().addLog(`${isPlayer ? 'Enemy' : 'Player'} was seeded!`);
                    } else {
                         useBattleStore.getState().addLog(`${move.name} succeeded!`);
                    }

                } else {
                    if (isPlayer) useBattleStore.getState().damageEnemy(result.damage);
                    else useBattleStore.getState().damagePlayer(result.damage);
                    
                    if (currentHit === 1) {
                         if (result.critical) useBattleStore.getState().addLog("A critical hit!");
                         if (result.effectiveness > 1) useBattleStore.getState().addLog("It's super effective!");
                         else if (result.effectiveness < 1 && result.effectiveness > 0) useBattleStore.getState().addLog("It's not very effective...");
                         else if (result.effectiveness === 1) useBattleStore.getState().addLog("It's effective.");
                    }

                    if (move.selfDestruct) {
                        useBattleStore.getState().addLog(`${attacker.name} self-destructed!`);
                        if (isPlayer) useBattleStore.getState().damagePlayer(attacker.currentHp);
                        else useBattleStore.getState().damageEnemy(attacker.currentHp);
                    }

                    if (move.drain) {
                        const heal = Math.max(1, Math.floor(result.damage * move.drain));
                        if (isPlayer) useBattleStore.getState().damagePlayer(-heal);
                        else useBattleStore.getState().damageEnemy(-heal);
                        useBattleStore.getState().addLog(`${attacker.name} drained health!`);
                    }

                    if (move.recoil && !move.selfDestruct) { 
                        const recoilDmg = Math.max(1, Math.floor(result.damage * move.recoil));
                        if (isPlayer) useBattleStore.getState().damagePlayer(recoilDmg);
                        else useBattleStore.getState().damageEnemy(recoilDmg);
                        useBattleStore.getState().addLog(`${attacker.name} is hit with recoil!`);
                    }

                    if (move.selfBoosts) {
                        useBattleStore.getState().applyBoosts(isPlayer ? 'player' : 'enemy', move.selfBoosts);
                        Object.keys(move.selfBoosts).forEach(stat => {
                            const val = move.selfBoosts[stat];
                            const change = val > 0 ? 'rose' : 'fell';
                            this.showFloatingText(attackerSprite as any, `${stat.toUpperCase()} ${change}!`);
                        });
                    }

                    const trapMoves = ['Fire Spin', 'Whirlpool', 'Clamp', 'Sand Tomb', 'Magma Storm', 'Infestation', 'Bind', 'Wrap'];
                    if (trapMoves.includes(move.name)) {
                        useBattleStore.getState().setVolatile(targetKey, { trap: { name: move.name, turns: Math.floor(Math.random() * 4) + 2 } });
                        useBattleStore.getState().addLog(`${isPlayer ? 'Enemy' : 'Player'} was trapped by ${move.name}!`);
                    }

                    const lockedMoves = ['Outrage', 'Thrash', 'Petal Dance'];
                    if (lockedMoves.includes(move.name) && !attacker.volatile?.lockedMove) {
                         useBattleStore.getState().setVolatile(isPlayer ? 'player' : 'enemy', { lockedMove: { moveName: move.name, turns: Math.floor(Math.random() * 2) + 2 } });
                    }
                }

                const confuseMoves = ['Confuse Ray', 'Supersonic', 'Sweet Kiss', 'Teeter Dance', 'Swagger', 'Flatter'];
                if (confuseMoves.includes(move.name)) {
                    useBattleStore.getState().setVolatile(targetKey, { confusion: Math.floor(Math.random() * 4) + 1 });
                    useBattleStore.getState().addLog(`${isPlayer ? 'Enemy' : 'Player'} became confused!`);
                }

                const state = useBattleStore.getState();
                const targetHp = isPlayer ? state.enemyHp : state.playerHp;

                if (targetHp <= 0) {
                    useBattleStore.getState().addLog(`${isPlayer ? 'Enemy' : 'Player'} fainted!`);
                    this.playFaintAnim(targetSprite as any, () => {
                        this.handleFaint(isPlayer);
                    });
                    return; 
                }

                if (currentHit < totalHits) {
                    this.time.delayedCall(200, performHit);
                } else {
                    if (totalHits > 1 && hitsLanded > 0) {
                        useBattleStore.getState().addLog(`Hit ${hitsLanded} time(s)!`);
                    }

                    if (move.statusEffect && Math.random() * 100 < (move.statusChance || 100)) {
                        const targetKey = isPlayer ? 'enemy' : 'player';
                        useBattleStore.getState().applyStatus(targetKey, move.statusEffect);
                        useBattleStore.getState().addLog(`${isPlayer ? 'Enemy' : 'Player'} was ${this.getStatusName(move.statusEffect)}!`);
                    }

                    this.time.delayedCall(1000, () => {
                         this.finishTurn(isPlayer);
                    });
                }
            });
        };

        performHit();
    }

    finishTurn(isPlayer: boolean) {
        if (isPlayer) {
            useBattleStore.getState().setPhase('ENEMY_ANIMATION');
        } else {
            this.processEndOfTurn();
        }
    }

    processEndOfTurn() {
        const processDot = (mon: any, isPlayer: boolean) => {
            if (!mon.status || mon.currentHp <= 0) return;
            
            const maxHp = mon.maxHp;
            let dmg = 0;
            let msg = '';

            if (mon.volatile?.trap) {
                const trapDmg = Math.floor(maxHp / 8);
                if (isPlayer) useBattleStore.getState().damagePlayer(trapDmg);
                else useBattleStore.getState().damageEnemy(trapDmg);
                
                useBattleStore.getState().addLog(`${mon.name} is hurt by ${mon.volatile.trap.name}!`);
                
                const newTurns = mon.volatile.trap.turns - 1;
                if (newTurns <= 0) {
                     useBattleStore.getState().setVolatile(isPlayer ? 'player' : 'enemy', { trap: undefined });
                     useBattleStore.getState().addLog(`${mon.name} was freed from ${mon.volatile.trap.name}!`);
                } else {
                     useBattleStore.getState().setVolatile(isPlayer ? 'player' : 'enemy', { trap: { ...mon.volatile.trap, turns: newTurns } });
                }
            }

            if (mon.status === 'BRN' || mon.status === 'PSN') {
                dmg = Math.floor(maxHp / 8);
                msg = `${mon.name} is hurt by its ${mon.status === 'BRN' ? 'burn' : 'poison'}!`;
            } else if (mon.status === 'WRAP') {
                dmg = Math.floor(maxHp / 8);
                msg = `${mon.name} is hurt by the Wrap!`;
            } else if (mon.status === 'SEED') {
                dmg = Math.floor(maxHp / 8);
                msg = `${mon.name}'s health is sapped by Leech Seed!`;
                if (isPlayer) useBattleStore.getState().damageEnemy(-dmg);
                else useBattleStore.getState().damagePlayer(-dmg);
            }

            if (dmg > 0) {
                if (isPlayer) useBattleStore.getState().damagePlayer(dmg);
                else useBattleStore.getState().damageEnemy(dmg);
                useBattleStore.getState().addLog(msg);
            }
        };

        processDot(this.playerMon, true);
        processDot(this.enemyMon, false);

        const pState = useBattleStore.getState();
        if (pState.playerHp <= 0) {
            this.playFaintAnim(this.playerSprite as any, () => this.handleFaint(false));
        } else if (pState.enemyHp <= 0) {
            this.playFaintAnim(this.enemySprite as any, () => this.handleFaint(true));
        } else {
            useBattleStore.getState().setPhase('PLAYER_SELECT');
        }
    }

    getStatusName(code: string) {
        const map: any = { 
            'BRN': 'burned', 'PAR': 'paralyzed', 'PSN': 'poisoned', 
            'FRZ': 'frozen', 'SLP': 'put to sleep',
            'SEED': 'seeded', 'WRAP': 'wrapped' 
        };
        return map[code] || code;
    }

    showFloatingText(target: Phaser.GameObjects.DOMElement | null, text: string) {
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

    playAttackAnim(attacker: Phaser.GameObjects.DOMElement | null, target: Phaser.GameObjects.DOMElement | null, category: string, moveType: string, moveName: string, onComplete: () => void) {
        if (!attacker || !target) {
            onComplete();
            return;
        }

        if (category === 'Status') {
            this.tweens.add({
                targets: attacker,
                scaleX: (attacker.scaleX || 1) * 1.1,
                scaleY: (attacker.scaleY || 1) * 1.1,
                duration: 200,
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    onComplete();
                }
            });
        } else {
            const isPlayer = attacker.x < 400;
            
            this.tweens.add({
                targets: attacker,
                x: isPlayer ? attacker.x + 30 : attacker.x - 30,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    AnimationManager.playMoveAnimation(this, moveName, moveType, attacker.x, attacker.y, target.x, target.y, onComplete);
                }
            });
        }
    }

    playFaintAnim(target: Phaser.GameObjects.DOMElement | null, onComplete: () => void) {
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

    handleFaint(playerWon: boolean) {
        const state = useBattleStore.getState();
        
        if (playerWon) {
            const nextEnemyIndex = state.enemyParty.findIndex(p => p.currentHp > 0);
            if (nextEnemyIndex !== -1) {
                this.time.delayedCall(1000, () => {
                    useBattleStore.getState().switchEnemyPokemon(nextEnemyIndex);
                    const newEnemy = useBattleStore.getState().enemyParty[nextEnemyIndex];
                    this.enemyMon = newEnemy;
                    
                    if (this.enemySprite) {
                        const img = this.enemySprite.node as HTMLImageElement;
                        img.src = newEnemy.spriteFront || '';
                        
                        this.enemySprite.setAlpha(1);
                        this.enemySprite.setY(250); // Reset position
                        this.tweens.add({
                            targets: this.enemySprite,
                            alpha: { from: 0, to: 1 },
                            duration: 1000
                        });
                    }

                    useBattleStore.getState().setPhase('PLAYER_SELECT');
                });
            } else {
                useBattleStore.getState().setPhase('END');
                useBattleStore.setState({ winner: 'player' });
            }
        } else {
            const nextPlayerIndex = state.playerParty.findIndex(p => p.currentHp > 0);
            if (nextPlayerIndex !== -1) {
                useBattleStore.getState().addLog(`Player sent out ${state.playerParty[nextPlayerIndex].name}!`);
                useBattleStore.getState().switchPlayerPokemon(nextPlayerIndex);
                
                useBattleStore.getState().setPhase('PLAYER_SELECT');
            } else {
                useBattleStore.getState().setPhase('END');
                useBattleStore.setState({ winner: 'enemy' });
            }
        }
    }

    shutdown() {
        if (this.unsubscribe) this.unsubscribe();
    }
}
