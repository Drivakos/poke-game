import React, { useState } from 'react';
import { useBattleStore } from '../stores/useBattleStore';
import type { StatStages } from '../game/types';

export const BattleOverlay: React.FC = () => {
        const {
            phase, 
            playerParty, activePlayerIndex,
            enemyParty, activeEnemyIndex,
            playerHp, playerMaxHp, playerStages, playerStatus,
            enemyHp, enemyMaxHp, enemyStages, enemyStatus,
            playerMoves, 
            battleLog,
            inventory, // Added inventory
            setPhase,
            addLog,
            setSelectedMove,
            switchPlayerPokemon,
            useItem // Added useItem
        } = useBattleStore();
    
        const [view, setView] = useState<'MAIN' | 'FIGHT' | 'PARTY' | 'BAG'>('MAIN');
    
        const activePlayerMon = playerParty[activePlayerIndex];
        const activeEnemyMon = enemyParty[activeEnemyIndex];
    
        const hpPercent = (curr: number, max: number) => Math.max(0, (curr / max) * 100) + '%';
        const hpColor = (curr: number, max: number) => {
            const p = curr / max;
            if (p > 0.5) return '#4caf50'; 
            if (p > 0.2) return '#ffeb3b'; 
            return '#f44336'; 
        };
    
        const renderStages = (stages: StatStages) => {
            return Object.entries(stages)
                .filter(([_, val]) => val !== 0)
                .map(([stat, val]) => (
                    <span key={stat} style={styles.stageTag}>
                        {stat.toUpperCase()} {val > 0 ? `+${val}` : val}
                    </span>
                ));
        };
    
        const handleFightClick = () => setView('FIGHT');
        const handlePartyClick = () => setView('PARTY');
        const handleBagClick = () => setView('BAG');
            const handleBack = () => setView('MAIN');
        
            const renderPartyIcons = (party: any[]) => (
                <div style={styles.partyIcons}>
                    {party.map((p, i) => (
                        <div key={i} style={{
                            ...styles.partyIcon,
                            background: p.currentHp > 0 ? (p.status ? '#ffc107' : '#4caf50') : '#555'
                        }} />
                    ))}
                </div>
            );
        
            const handleMoveClick = (moveIndex: number) => {                const move = playerMoves[moveIndex];
                if (!move) return;
        
                // Check for useless Status Moves (Stat Limits)
                if (move.category === 'Status' && move.boosts) {
                    const isSelf = move.target === 'self';
                    const stages = isSelf ? playerStages : enemyStages; // Enemy stages if target is enemy
                    const targetName = isSelf ? activePlayerMon.name : activeEnemyMon.name;
        
                    let allFailed = true;
                    for (const [stat, val] of Object.entries(move.boosts)) {
                        const current = stages[stat as keyof StatStages];
                        const change = val as number;
                        // If attempting to raise and not maxed, OR attempting to lower and not min
                        if ((change > 0 && current < 6) || (change < 0 && current > -6)) {
                            allFailed = false;
                            break;
                        }
                    }
        
                    if (allFailed) {
                        addLog(`But it failed! ${targetName}'s stats won't go any ${move.boosts.atk && move.boosts.atk > 0 ? 'higher' : 'lower'}!`);
                        return; // User does NOT lose turn
                    }
                }
        
                addLog(`${activePlayerMon.name} used ${move.name}!`);
                setSelectedMove(moveIndex);
                setPhase('PLAYER_ANIMATION');
                setView('MAIN');
            };    
        const handleSwitch = (index: number) => {
            if (index === activePlayerIndex) return;
            if (playerParty[index].currentHp <= 0) return;
            
            switchPlayerPokemon(index);
            setView('MAIN');
        };

        const handleUseItem = (index: number) => {
            useItem(index);
            setView('MAIN');
        };
    
        if (!activePlayerMon || !activeEnemyMon) return null;
    
        return (
            <div style={styles.overlay}>
                {/* Enemy HUD */}
                            <div style={styles.enemyHud}>
                                {renderPartyIcons(enemyParty)}
                                <div style={styles.header}>                        <span style={styles.nameTag}>{activeEnemyMon.name} Lv.{activeEnemyMon.level}</span>
                        {enemyStatus && <span style={styles.statusTag}>{enemyStatus.toUpperCase()}</span>}
                    </div>
                    <div style={styles.hpBarContainer}>
                        <div style={{...styles.hpFill, width: hpPercent(enemyHp, enemyMaxHp), background: hpColor(enemyHp, enemyMaxHp)}} />
                    </div>
                    <div style={styles.stagesContainer}>{renderStages(enemyStages)}</div>
                </div>
    
                {/* Player HUD */}
                <div style={styles.playerHud}>
                    <div style={styles.header}>
                        <span style={styles.nameTag}>{activePlayerMon.name} Lv.{activePlayerMon.level}</span>
                        {playerStatus && <span style={styles.statusTag}>{playerStatus.toUpperCase()}</span>}
                    </div>
                    <div style={styles.hpText}>{playerHp}/{playerMaxHp}</div>
                    <div style={styles.hpBarContainer}>
                        <div style={{...styles.hpFill, width: hpPercent(playerHp, playerMaxHp), background: hpColor(playerHp, playerMaxHp)}} />
                    </div>
                    <div style={styles.stagesContainer}>{renderStages(playerStages)}</div>
                </div>
    
                {/* Dialog Box / Menu */}
                <div style={styles.dialogBox}>
                    <div style={styles.log}>
                        {battleLog.length > 0 ? battleLog[battleLog.length - 1] : `What will ${activePlayerMon.name} do?`}
                    </div>
    
                    {phase === 'PLAYER_SELECT' && (
                        <div style={styles.menuContainer}>
                            {view === 'MAIN' && (
                                <div style={styles.menu}>
                                    <button style={styles.btn} onClick={handleFightClick}>FIGHT</button>
                                    <button style={styles.btn} onClick={handleBagClick}>BAG</button>
                                    <button style={styles.btn} onClick={handlePartyClick}>POKEMON</button>
                                    <button style={styles.btn}>RUN</button>
                                </div>
                            )}
                            
                            {view === 'FIGHT' && (
                                <div style={styles.movesMenu}>
                                    {playerMoves.map((move, i) => (
                                        <button key={i} style={styles.moveBtn} onClick={() => handleMoveClick(i)}>
                                            {move.name.toUpperCase()}
                                            <span style={styles.ppText}>{move.pp}/{move.pp}</span>
                                        </button>
                                    ))}
                                    <button style={styles.backBtn} onClick={handleBack}>BACK</button>
                                </div>
                            )}
    
                            {view === 'PARTY' && (
                                <div style={styles.partyMenu}>
                                    {playerParty.map((p, i) => (
                                        <button key={i} style={{...styles.partyBtn, opacity: p.currentHp > 0 ? 1 : 0.5}} onClick={() => handleSwitch(i)}>
                                            <div style={{fontSize: '12px'}}>{p.name}</div>
                                            <div style={{width: '60px', height: '4px', background: '#ccc', marginTop: '2px'}}>
                                                <div style={{width: hpPercent(p.currentHp, p.maxHp), height: '100%', background: hpColor(p.currentHp, p.maxHp)}} />
                                            </div>
                                        </button>
                                    ))}
                                    <button style={styles.backBtn} onClick={handleBack}>BACK</button>
                                </div>
                            )}

                            {view === 'BAG' && (
                                <div style={styles.bagMenu}>
                                    {inventory.map((item, i) => (
                                        <button key={i} style={{...styles.itemBtn, opacity: item.count > 0 ? 1 : 0.5}} onClick={() => item.count > 0 && handleUseItem(i)}>
                                            <div style={{fontWeight:'bold'}}>{item.item.name} x{item.count}</div>
                                            <div style={{fontSize:'10px'}}>{item.item.desc}</div>
                                        </button>
                                    ))}
                                    <button style={styles.backBtn} onClick={handleBack}>BACK</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    const styles: Record<string, React.CSSProperties> = {
        overlay: {
            position: 'absolute', top: 0, left: 0,
            width: '800px', height: '600px',
            pointerEvents: 'none', fontFamily: '"Courier New", Courier, monospace',
            fontWeight: 'bold', zIndex: 10
        },
        enemyHud: {
            position: 'absolute', top: 30, left: 50,
            background: 'rgba(255,255,255,0.9)', padding: '10px',
            border: '2px solid #333', borderRadius: '0 15px 0 15px', width: '250px'
        },
        playerHud: {
            position: 'absolute', bottom: 180, right: 50,
            background: 'rgba(255,255,255,0.9)', padding: '10px',
            border: '2px solid #333', borderRadius: '15px 0 15px 0', width: '250px'
        },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' },
        nameTag: { fontSize: '18px', color: '#000' },
        statusTag: { background: '#f44336', color: '#fff', padding: '2px 5px', fontSize: '12px', borderRadius: '4px' },
        hpText: { textAlign: 'right', fontSize: '14px', color: '#000' },
        hpBarContainer: {
            width: '100%', height: '12px', background: '#444',
            borderRadius: '6px', overflow: 'hidden', border: '1px solid #000'
        },
        hpFill: { height: '100%', transition: 'width 0.5s ease-out' },
        stagesContainer: { marginTop: '5px', display: 'flex', gap: '5px', flexWrap: 'wrap' },
        stageTag: { background: '#2196f3', color: '#fff', fontSize: '10px', padding: '1px 4px', borderRadius: '3px' },
        partyIcons: { display: 'flex', gap: '5px', marginBottom: '8px' },
        partyIcon: { width: '12px', height: '12px', borderRadius: '50%', border: '1px solid #000' },
        dialogBox: {
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '150px', background: '#fff', border: '4px solid #444',
            display: 'flex', color: '#222', pointerEvents: 'auto', borderRadius: '10px 10px 0 0'
        },
        log: { flex: 2, padding: '20px', fontSize: '22px', display: 'flex', alignItems: 'center', color: '#000' },
        menuContainer: { flex: 1, background: '#444', padding: '5px' },
        menu: { display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', gap: '5px' },
        movesMenu: { display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', gap: '5px' },
        partyMenu: { display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', gap: '5px' },
        bagMenu: { display: 'grid', gridTemplateColumns: '1fr', overflowY: 'auto', maxHeight: '140px', gap: '2px' },
            btn: { fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', border: 'none', background: '#eee', color: '#000' },
            moveBtn: { fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', border: 'none', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#000' },
            partyBtn: { fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', border: 'none', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5px', color: '#000' },
            itemBtn: { fontSize: '12px', cursor: 'pointer', border: 'none', background: '#fff', textAlign: 'left', padding: '5px', color: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
            ppText: { fontSize: '10px', color: '#333' },
            backBtn: { fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', border: 'none', background: '#f44336', color: '#fff' }
        };    
