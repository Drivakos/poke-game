import Phaser from 'phaser';

export class AnimationManager {
    static generateTextures(scene: Phaser.Scene) {
        // 1. Orb (Generic Energy)
        const orb = scene.make.graphics({ x: 0, y: 0 });
        orb.fillStyle(0xffffff);
        orb.fillCircle(16, 16, 16);
        orb.generateTexture('orb', 32, 32);

        // 2. Star (Swift, etc)
        const star = scene.make.graphics({ x: 0, y: 0 });
        star.fillStyle(0xffff00);
        star.fillPoints([{x:16, y:0}, {x:32, y:16}, {x:16, y:32}, {x:0, y:16}], true, true);
        star.generateTexture('star', 32, 32);

        // 3. Scratch (Normal)
        const scratch = scene.make.graphics({ x: 0, y: 0 });
        scratch.lineStyle(4, 0xffffff);
        scratch.beginPath();
        scratch.moveTo(0, 0);
        scratch.lineTo(32, 32);
        scratch.strokePath();
        scratch.generateTexture('scratch', 32, 32);

        // 4. Bubble (Water)
        const bubble = scene.make.graphics({ x: 0, y: 0 });
        bubble.lineStyle(2, 0x44aaff);
        bubble.strokeCircle(16, 16, 14);
        bubble.fillStyle(0x88ccff, 0.5);
        bubble.fillCircle(16, 16, 14);
        bubble.generateTexture('bubble', 32, 32);

        // 5. Leaf (Grass)
        const leaf = scene.make.graphics({ x: 0, y: 0 });
        leaf.fillStyle(0x4caf50);
        leaf.fillEllipse(16, 16, 16, 8);
        leaf.generateTexture('leaf', 32, 32);

        // 6. Rock (Rock/Ground)
        const rock = scene.make.graphics({ x: 0, y: 0 });
        rock.fillStyle(0x795548);
        rock.fillRect(4, 4, 24, 24);
        rock.generateTexture('rock', 32, 32);
        
        // 7. Fire
        const fire = scene.make.graphics({ x: 0, y: 0 });
        fire.fillStyle(0xff5722);
        fire.fillTriangle(16, 0, 32, 32, 0, 32);
        fire.generateTexture('fire', 32, 32);
    }

    static playMoveAnimation(scene: Phaser.Scene, moveName: string, moveType: string, startX: number, startY: number, endX: number, endY: number, onComplete?: () => void) {
        // 0. Check for External Asset (Sprite/Animation)
        const slug = moveName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const assetKey = `move_${slug}`;

        if (scene.textures.exists(assetKey)) {
            // Determine position based on move nature? For now, target.
            // Some moves travel, some are static.
            // If we have an asset, assume it plays on target (most Gen 1 moves do).
            const animSprite = scene.add.sprite(endX, endY, assetKey);
            
            // If it's an animation (spritesheet has been processed)
            if (scene.anims.exists(assetKey)) {
                animSprite.play(assetKey);
                animSprite.once('animationcomplete', () => {
                    animSprite.destroy();
                    if (onComplete) onComplete();
                });
            } else {
                // Static Sprite Fallback (Fade out)
                scene.tweens.add({
                    targets: animSprite,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        animSprite.destroy();
                        if (onComplete) onComplete();
                    }
                });
            }
            return;
        }

        // 1. Specific Move Animations (Gen 1 Style)
        
        if (moveName === 'Tackle' || moveName === 'Pound' || moveName === 'Slam') {
            scene.cameras.main.shake(100, 0.01);
            // Simple impact star
            const impact = scene.add.sprite(endX, endY, 'star');
            impact.setTint(0xffffff);
            impact.setScale(2);
            scene.tweens.add({
                targets: impact,
                scale: 0,
                duration: 200,
                onComplete: () => {
                    impact.destroy();
                    if (onComplete) onComplete();
                }
            });
            return;
        }

        if (moveName === 'Scratch' || moveName === 'Cut' || moveName === 'Slash') {
            const scratch = scene.add.sprite(endX, endY, 'scratch');
            scratch.setScale(2);
            scene.tweens.add({
                targets: scratch,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    scratch.destroy();
                    if (onComplete) onComplete();
                }
            });
            return;
        }

        if (moveName === 'Thunder Shock' || moveName === 'Thunderbolt') {
            scene.cameras.main.flash(100, 255, 255, 0); // Flash Yellow
            scene.cameras.main.shake(200, 0.02);
            // Sparks
            const emitter = scene.add.particles(endX, endY, 'star', {
                speed: 200,
                scale: { start: 1, end: 0 },
                lifespan: 300,
                tint: 0xffff00,
                quantity: 10,
                emitting: false
            });
            emitter.explode(10, endX, endY);
            scene.time.delayedCall(300, () => {
                if (onComplete) onComplete();
            });
            return;
        }

        if (moveName === 'Earthquake' || moveName === 'Magnitude') {
            scene.cameras.main.shake(1000, 0.05);
            scene.time.delayedCall(1000, () => {
                if (onComplete) onComplete();
            });
            return;
        }

        // 2. Generic Type-Based Fallback
        // Generic Particles
        let texture = 'orb';
        let color = 0xffffff;
        let speed = 200;
        let scale = { start: 1, end: 0 };
        let lifespan = 500;
        let quantity = 10;
        
        switch (moveType.toLowerCase()) {
            case 'fire':
                texture = 'fire';
                color = 0xff5722;
                speed = 300;
                quantity = 20;
                break;
            case 'water':
            case 'ice':
                texture = 'bubble';
                color = 0x2196f3;
                break;
            case 'grass':
            case 'bug':
                texture = 'leaf';
                color = 0x4caf50;
                break;
            case 'electric':
                texture = 'star'; // Reuse star for spark
                color = 0xffeb3b;
                speed = 500;
                break;
            case 'rock':
            case 'ground':
                texture = 'rock';
                color = 0x795548;
                break;
            case 'normal':
            case 'fighting':
                texture = 'scratch';
                break;
            case 'poison':
                texture = 'bubble';
                color = 0x9c27b0;
                break;
            case 'psychic':
            case 'ghost':
            case 'fairy':
                texture = 'orb';
                color = 0xe91e63;
                break;
            default:
                break;
        }

        const emitter = scene.add.particles(startX, startY, texture, {
            speed: speed,
            scale: scale,
            blendMode: 'ADD',
            lifespan: lifespan,
            tint: color,
            quantity: quantity,
            emitting: false
        });

        // Calculate Angle
        const angle = Phaser.Math.Angle.Between(startX, startY, endX, endY);
        emitter.setAngle(Phaser.Math.RadToDeg(angle));
        
        // Move Emitter or Particles?
        // Let's shoot particles towards target
        emitter.emitParticleAt(startX, startY, quantity);
        
        // Better: Projectile
        const projectile = scene.add.sprite(startX, startY, texture);
        projectile.setTint(color);
        
        scene.tweens.add({
            targets: projectile,
            x: endX,
            y: endY,
            duration: 300,
            onComplete: () => {
                projectile.destroy();
                // Impact Effect
                const impact = scene.add.particles(endX, endY, texture, {
                    speed: { min: 50, max: 200 },
                    scale: { start: 1, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 300,
                    tint: color,
                    quantity: 10,
                    emitting: false
                });
                impact.explode(10, endX, endY);
                if (onComplete) onComplete();
            }
        });
    }
}
