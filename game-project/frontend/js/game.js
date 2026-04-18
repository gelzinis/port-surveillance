// ==================== GAME ENGINE ====================
class ArenaSurvival {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.gameState = 'start'; // start, playing, paused, gameover
        this.score = 0;
        this.highscore = 0;
        this.survivalTime = 0;
        this.enemiesKilled = 0;
        this.powerupsUsed = 0;
        this.difficulty = 1;

        this.player = null;
        this.enemies = [];
        this.powerups = [];
        this.particles = new ParticleSystem();
        this.screenEffects = new ScreenEffects(this.canvas);
        this.background = new Background(this.width, this.height);
        this.floatingTexts = new FloatingTextSystem();

        this.keys = { up: false, down: false, left: false, right: false };
        this.enemyFreezeTime = 0;
        this.lastTime = 0;
        this.animationId = null;

        this.spawnTimers = {
            enemy: 0,
            powerup: 0
        };

        this.loadHighscore();
        this.bindEvents();
        this.draw();
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.startGame());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();

        if (key === 'w' || key === 'arrowup') this.keys.up = true;
        if (key === 's' || key === 'arrowdown') this.keys.down = true;
        if (key === 'a' || key === 'arrowleft') this.keys.left = true;
        if (key === 'd' || key === 'arrowright') this.keys.right = true;

        if (key === ' ' && this.gameState === 'playing') {
            e.preventDefault();
            this.togglePause();
        }
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();

        if (key === 'w' || key === 'arrowup') this.keys.up = false;
        if (key === 's' || key === 'arrowdown') this.keys.down = false;
        if (key === 'a' || key === 'arrowleft') this.keys.left = false;
        if (key === 'd' || key === 'arrowright') this.keys.right = false;
    }

    loadHighscore() {
        try {
            this.highscore = parseInt(localStorage.getItem('arenaSurvivalHighscore')) || 0;
        } catch (e) {
            this.highscore = 0;
        }
        document.getElementById('highscore').textContent = this.highscore;
        document.getElementById('titleHighscore').textContent = this.highscore;
    }

    saveHighscore() {
        if (this.score > this.highscore) {
            this.highscore = this.score;
            try {
                localStorage.setItem('arenaSurvivalHighscore', this.highscore);
            } catch (e) {}
            return true;
        }
        return false;
    }

    startGame() {
        sound.init();

        this.player = new Player(this.width / 2, this.height / 2);
        this.enemies = [];
        this.powerups = [];
        this.particles.clear();
        this.floatingTexts.texts = [];
        this.screenEffects = new ScreenEffects(this.canvas);

        this.score = 0;
        this.survivalTime = 0;
        this.enemiesKilled = 0;
        this.powerupsUsed = 0;
        this.difficulty = 1;
        this.enemyFreezeTime = 0;

        this.spawnTimers.enemy = 0;
        this.spawnTimers.powerup = 0;

        document.getElementById('score').textContent = '0';
        document.getElementById('timer').textContent = '00:00';

        this.getScreen('startScreen').classList.remove('active');
        this.getScreen('pauseScreen').classList.remove('active');
        this.getScreen('gameOverScreen').classList.remove('active');

        this.gameState = 'playing';
        this.lastTime = performance.now();
        this.gameLoop();
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            cancelAnimationFrame(this.animationId);
            this.getScreen('pauseScreen').classList.add('active');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.getScreen('pauseScreen').classList.remove('active');
            this.lastTime = performance.now();
            this.gameLoop();
        }
    }

    gameOver() {
        this.gameState = 'gameover';
        cancelAnimationFrame(this.animationId);

        sound.play('gameover');

        const isNewHighscore = this.saveHighscore();

        document.getElementById('score').textContent = this.score;
        document.getElementById('highscore').textContent = this.highscore;
        document.getElementById('titleHighscore').textContent = this.highscore;

        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalTime').textContent = this.formatTime(this.survivalTime);
        document.getElementById('finalEnemies').textContent = this.enemiesKilled;
        document.getElementById('finalPowerups').textContent = this.powerupsUsed;

        const newHighscoreBadge = document.getElementById('newHighscoreBadge');
        if (isNewHighscore) {
            newHighscoreBadge.classList.add('show');
        } else {
            newHighscoreBadge.classList.remove('show');
        }

        this.getScreen('gameOverScreen').classList.add('active');
    }

    gameLoop() {
        if (this.gameState !== 'playing') return;

        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    update(dt) {
        this.survivalTime += dt;
        this.difficulty = 1 + this.survivalTime / 30; // Increase difficulty every 30 seconds

        // Update score
        this.score += dt * 10 * this.player.getScoreMultiplier();
        document.getElementById('score').textContent = Math.floor(this.score);
        document.getElementById('timer').textContent = this.formatTime(this.survivalTime);

        // Update player
        this.player.update(this.keys, dt * 1000, this.width, this.height);

        // Update enemies freeze
        if (this.enemyFreezeTime > 0) {
            this.enemyFreezeTime -= dt * 1000;
        }

        // Spawn enemies
        this.spawnTimers.enemy += dt * 1000;
        const enemySpawnRate = Math.max(500, 2000 - this.difficulty * 400);

        if (this.spawnTimers.enemy >= enemySpawnRate) {
            this.spawnEnemy();
            this.spawnTimers.enemy = 0;
            sound.play('spawn');
        }

        // Spawn powerups
        this.spawnTimers.powerup += dt * 1000;
        if (this.spawnTimers.powerup >= 8000) {
            if (Math.random() < 0.4) {
                this.spawnPowerup();
            }
            this.spawnTimers.powerup = 0;
        }

        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            const speedMult = this.enemyFreezeTime > 0 ? 0 : this.difficulty * 0.5 + 0.5;
            enemy.update(this.player.x, this.player.y, dt * 1000, speedMult, this.enemyFreezeTime > 0);

            // Collision with player
            if (this.checkCollision(this.player, enemy)) {
                if (this.player.takeDamage(enemy.damage)) {
                    sound.play('damage');
                    this.screenEffects.flashScreen('#ff0000', 150);
                    this.screenEffects.shakeScreen(15, 200);
                    this.particles.emitExplosion(this.player.x, this.player.y, '#ff0000', 15);
                    this.floatingTexts.add(this.player.x, this.player.y - 30, `-${enemy.damage}`, '#ff4444');

                    if (this.player.health <= 0) {
                        this.gameOver();
                        return false;
                    }
                } else {
                    // Shield blocked damage
                    this.particles.emitExplosion(enemy.x, enemy.y, '#4488ff', 10);
                }
                return false;
            }

            // Check bounds
            return enemy.x > -50 && enemy.x < this.width + 50 &&
                   enemy.y > -50 && enemy.y < this.height + 50;
        });

        // Update powerups
        this.powerups = this.powerups.filter(powerup => {
            powerup.update(dt * 1000);

            if (this.checkCollision(this.player, powerup)) {
                powerup.applyTo(this.player, this);
                this.powerupsUsed++;
                sound.play('pickup');
                this.particles.emitExplosion(powerup.x, powerup.y, powerup.color, 15);
                this.floatingTexts.add(powerup.x, powerup.y - 20, `+${powerup.type.toUpperCase()}`, powerup.color);

                // Apply score bonus for some power-ups
                if (powerup.type === PowerUp.TYPES.NUKE) {
                    this.score += 500;
                } else if (powerup.type === PowerUp.TYPES.HEALTH) {
                    this.score += 50;
                }
                return false;
            }

            return powerup.y < this.height + 30;
        });

        // Update particles
        this.particles.update();
        this.screenEffects.update(dt * 1000);
        this.floatingTexts.update();

        // Update HUD
        this.updateHUD();
    }

    draw() {
        const ctx = this.ctx;

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, this.width, this.height);

        // Background
        this.background.draw(ctx, Date.now() * 0.001);

        // Screen shake offset
        const shake = this.screenEffects.getShakeOffset();
        ctx.save();
        ctx.translate(shake.x, shake.y);

        // Draw powerups
        this.powerups.forEach(p => p.draw(ctx));

        // Draw enemies
        this.enemies.forEach(e => e.draw(ctx));

        // Draw player
        if (this.player) {
            this.player.draw(ctx);
        }

        // Draw particles
        this.particles.draw(ctx);

        // Draw floating texts
        this.floatingTexts.draw(ctx);

        // Screen effects
        this.screenEffects.draw(ctx);

        ctx.restore();
    }

    spawnEnemy() {
        const x = Math.random() * (this.width - 60) + 30;
        const y = -30;

        // Determine enemy type based on difficulty
        let type = Enemy.TYPES.CHASER;
        const rand = Math.random();

        if (this.difficulty > 3) {
            if (rand < 0.15) type = Enemy.TYPES.SPLITTER;
            else if (rand < 0.4) type = Enemy.TYPES.TANK;
            else if (rand < 0.6) type = Enemy.TYPES.SPRINTER;
        } else if (this.difficulty > 2) {
            if (rand < 0.25) type = Enemy.TYPES.TANK;
            else if (rand < 0.45) type = Enemy.TYPES.SPRINTER;
        } else if (this.difficulty > 1.5) {
            if (rand < 0.3) type = Enemy.TYPES.SPRINTER;
        }

        this.enemies.push(new Enemy(x, y, type));
    }

    spawnPowerup() {
        const x = Math.random() * (this.width - 60) + 30;
        const y = -20;

        this.powerups.push(new PowerUp(x, y, PowerUp.getRandomType()));
    }

    checkCollision(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < a.radius + b.radius;
    }

    updateHUD() {
        // Health bar
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        document.getElementById('healthFill').style.width = `${healthPercent}%`;

        // Power-up indicators
        document.getElementById('powerupShield').classList.toggle('active', this.player.shieldTime > 0);
        document.getElementById('powerupSpeed').classList.toggle('active', this.player.speedBoostTime > 0);
        document.getElementById('powerupFreeze').classList.toggle('active', this.enemyFreezeTime > 0);
    }

    freezeEnemies(duration) {
        this.enemyFreezeTime = duration;
        sound.play('freeze');
        this.screenEffects.showFreezeOverlay(duration);
    }

    triggerNuke() {
        sound.play('nuke');
        this.screenEffects.flashScreen('#ffffff', 300);
        this.screenEffects.shakeScreen(30, 500);

        // Kill all enemies
        const killed = [];
        this.enemies.forEach(enemy => {
            this.particles.emitExplosion(enemy.x, enemy.y, enemy.color, 10);
            killed.push({
                x: enemy.x,
                y: enemy.y,
                color: enemy.color,
                value: enemy.scoreValue
            });
            this.enemiesKilled++;
        });

        // Add score
        killed.forEach(e => {
            this.score += e.value;
            this.floatingTexts.add(e.x, e.y, `+${e.value}`, e.color);
        });

        this.enemies = [];

        // Spawn mini enemies from splitters
        const newEnemies = [];
        killed.forEach(k => {
            if (Math.random() < 0.5) {
                for (let i = 0; i < 2; i++) {
                    const angle = (i * Math.PI * 2 / 2);
                    const child = new Enemy(
                        k.x + Math.cos(angle) * 30,
                        k.y + Math.sin(angle) * 30,
                        Enemy.TYPES.CHASER
                    );
                    child.speed = 3;
                    newEnemies.push(child);
                }
            }
        });
        this.enemies.push(...newEnemies);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    getScreen(id) {
        return document.getElementById(id);
    }
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    window.game = new ArenaSurvival();
});