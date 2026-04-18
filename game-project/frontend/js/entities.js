// ==================== PLAYER ====================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 18;
        this.baseSpeed = 5;
        this.speed = 5;
        this.maxHealth = 100;
        this.health = 100;
        this.speedBoostTime = 0;
        this.shieldTime = 0;
        this.scoreMultiplierTime = 0;
        this.color = '#00f0ff';
        this.glowColor = 'rgba(0, 240, 255, 0.4)';
    }

    update(keys, dt, width, height) {
        // Apply speed boost
        if (this.speedBoostTime > 0) {
            this.speedBoostTime -= dt;
            this.speed = this.baseSpeed * 1.8;
        } else {
            this.speed = this.baseSpeed;
        }

        // Apply speed boost decay
        if (this.speedBoostTime <= 0) this.speedBoostTime = 0;
        if (this.shieldTime > 0) this.shieldTime -= dt;
        if (this.scoreMultiplierTime > 0) this.scoreMultiplierTime -= dt;

        // Movement
        let dx = 0, dy = 0;
        if (keys.up) dy -= 1;
        if (keys.down) dy += 1;
        if (keys.left) dx -= 1;
        if (keys.right) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
        }

        this.x += dx * this.speed;
        this.y += dy * this.speed;

        // Boundary collision
        this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));
    }

    draw(ctx) {
        // Shield effect
        if (this.shieldTime > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 12 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(100, 150, 255, ${0.3 + Math.sin(Date.now() * 0.008) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius + 15);
        gradient.addColorStop(0, this.glowColor);
        gradient.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.radius - 20, this.y - this.radius - 20, this.radius * 2 + 40, this.radius * 2 + 40);

        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Speed boost indicator
        if (this.speedBoostTime > 0) {
            ctx.strokeStyle = '#ffc800';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Score multiplier indicator
        if (this.scoreMultiplierTime > 0) {
            ctx.strokeStyle = '#44ff88';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    takeDamage(amount) {
        if (this.shieldTime > 0) return false;
        this.health -= amount;
        return true;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    activateSpeedBoost(duration) {
        this.speedBoostTime = duration;
    }

    activateShield(duration) {
        this.shieldTime = duration;
    }

    activateScoreMultiplier(duration) {
        this.scoreMultiplierTime = duration;
    }

    hasShield() {
        return this.shieldTime > 0;
    }

    getScoreMultiplier() {
        return this.scoreMultiplierTime > 0 ? 2 : 1;
    }
}

// ==================== ENEMIES ====================
class Enemy {
    static TYPES = {
        CHASER: 'chaser',
        SPRINTER: 'sprinter',
        TANK: 'tank',
        SPLITTER: 'splitter'
    };

    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.setPropertiesByType();

        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
    }

    setPropertiesByType() {
        switch (this.type) {
            case Enemy.TYPES.CHASER:
                this.radius = 15;
                this.speed = 2;
                this.health = 1;
                this.color = '#ff4444';
                this.damage = 10;
                this.scoreValue = 10;
                break;
            case Enemy.TYPES.SPRINTER:
                this.radius = 10;
                this.speed = 4.5;
                this.health = 1;
                this.color = '#ffaa00';
                this.damage = 15;
                this.scoreValue = 15;
                break;
            case Enemy.TYPES.TANK:
                this.radius = 25;
                this.speed = 1;
                this.health = 4;
                this.color = '#8844ff';
                this.damage = 25;
                this.scoreValue = 25;
                break;
            case Enemy.TYPES.SPLITTER:
                this.radius = 18;
                this.speed = 2.2;
                this.health = 2;
                this.color = '#ff00aa';
                this.damage = 15;
                this.scoreValue = 20;
                break;
        }
    }

    update(targetX, targetY, dt, speedMult = 1, freeze = false) {
        if (freeze) return;

        // Move towards player
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.x += (dx / dist) * this.speed * speedMult;
            this.y += (dy / dist) * this.speed * speedMult;
        }

        this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw based on type
        switch (this.type) {
            case Enemy.TYPES.CHASER:
                this.drawChaser(ctx);
                break;
            case Enemy.TYPES.SPRINTER:
                this.drawSprinter(ctx);
                break;
            case Enemy.TYPES.TANK:
                this.drawTank(ctx);
                break;
            case Enemy.TYPES.SPLITTER:
                this.drawSplitter(ctx);
                break;
        }

        ctx.restore();
    }

    drawChaser(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        for (let i = 1; i < 6; i++) {
            const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
            ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ff8888';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSprinter(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius * 0.7, this.radius * 0.6);
        ctx.lineTo(-this.radius * 0.7, -this.radius * 0.6);
        ctx.closePath();
        ctx.fill();

        // Trail effect
        ctx.fillStyle = 'rgba(255, 170, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.7, 0);
        ctx.lineTo(-this.radius * 1.8, this.radius * 0.4);
        ctx.lineTo(-this.radius * 1.8, -this.radius * 0.4);
        ctx.closePath();
        ctx.fill();
    }

    drawTank(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Armor rings
        ctx.strokeStyle = '#aa66ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
        ctx.stroke();

        // Health indicator
        if (this.health < 4) {
            ctx.fillStyle = '#fff';
            ctx.font = `${this.radius * 0.8}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.health.toString(), 0, 0);
        }
    }

    drawSplitter(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(this.radius * 0.3, this.radius * 0.8);
        ctx.lineTo(-this.radius * 0.5, this.radius * 0.8);
        ctx.lineTo(-this.radius * 0.8, 0);
        ctx.lineTo(-this.radius * 0.5, -this.radius * 0.8);
        ctx.lineTo(this.radius * 0.3, -this.radius * 0.8);
        ctx.closePath();
        ctx.fill();

        // Pulsing core
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(Date.now() * 0.01) * 0.2})`;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }

    getSplitEnemies() {
        if (this.type !== Enemy.TYPES.SPLITTER || this.health > 0) return [];

        const children = [];
        for (let i = 0; i < 2; i++) {
            const angle = (i * Math.PI * 2 / 2);
            const child = new Enemy(
                this.x + Math.cos(angle) * this.radius,
                this.y + Math.sin(angle) * this.radius,
                Enemy.TYPES.CHASER
            );
            child.speed = this.speed * 1.2;
            children.push(child);
        }
        return children;
    }
}

// ==================== POWER-UPS ====================
class PowerUp {
    static TYPES = {
        HEALTH: 'health',
        SPEED: 'speed',
        SHIELD: 'shield',
        FREEZE: 'freeze',
        MULTIPLIER: 'multiplier',
        NUKE: 'nuke'
    };

    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 14;
        this.setPropertiesByType();
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = 0.05;
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    setPropertiesByType() {
        switch (this.type) {
            case PowerUp.TYPES.HEALTH:
                this.color = '#ff4466';
                this.symbol = '❤';
                break;
            case PowerUp.TYPES.SPEED:
                this.color = '#ffc800';
                this.symbol = '⚡';
                break;
            case PowerUp.TYPES.SHIELD:
                this.color = '#4488ff';
                this.symbol = '🛡';
                break;
            case PowerUp.TYPES.FREEZE:
                this.color = '#88ddff';
                this.symbol = '❄';
                break;
            case PowerUp.TYPES.MULTIPLIER:
                this.color = '#44ff88';
                this.symbol = '×2';
                break;
            case PowerUp.TYPES.NUKE:
                this.color = '#ff4400';
                this.symbol = '💥';
                break;
        }
    }

    update(dt) {
        this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
        const bobY = this.y + Math.sin(Date.now() * 0.005 + this.bobOffset) * 5;

        ctx.save();
        ctx.translate(this.x, bobY);
        ctx.rotate(this.rotation);

        // Glow effect
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
        gradient.addColorStop(0, this.color + '80');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Background circle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Symbol
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, 0, 1);

        ctx.restore();
    }

    applyTo(player, game) {
        switch (this.type) {
            case PowerUp.TYPES.HEALTH:
                player.heal(25);
                break;
            case PowerUp.TYPES.SPEED:
                player.activateSpeedBoost(5000);
                break;
            case PowerUp.TYPES.SHIELD:
                player.activateShield(8000);
                break;
            case PowerUp.TYPES.FREEZE:
                game.freezeEnemies(5000);
                break;
            case PowerUp.TYPES.MULTIPLIER:
                player.activateScoreMultiplier(10000);
                break;
            case PowerUp.TYPES.NUKE:
                game.triggerNuke();
                break;
        }
    }

    static getRandomType() {
        const types = Object.values(PowerUp.TYPES);
        const weights = [30, 15, 15, 15, 15, 10]; // Health most common
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < types.length; i++) {
            random -= weights[i];
            if (random <= 0) return types[i];
        }
        return PowerUp.TYPES.HEALTH;
    }
}