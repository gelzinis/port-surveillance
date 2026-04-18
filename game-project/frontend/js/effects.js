// ==================== PARTICLES ====================
class Particle {
    constructor(x, y, color, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || (Math.random() - 0.5) * 10;
        this.vy = options.vy || (Math.random() - 0.5) * 10;
        this.color = color;
        this.size = options.size || 4;
        this.life = 1;
        this.decay = options.decay || 0.02;
        this.gravity = options.gravity || 0;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
        this.size *= 0.98;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, color, count = 10, options = {}) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = options.speed || 5;
            this.particles.push(new Particle(x, y, color, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: options.size || 4,
                decay: options.decay || 0.02,
                gravity: options.gravity || 0
            }));
        }
    }

    emitExplosion(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 2;
            this.particles.push(new Particle(x, y, color, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2,
                decay: Math.random() * 0.02 + 0.01,
                gravity: 0.1
            }));
        }
    }

    emitTrail(x, y, color, direction, speed = 3) {
        const spread = 0.5;
        this.particles.push(new Particle(x, y, color, {
            vx: direction.vx * speed + (Math.random() - 0.5) * spread,
            vy: direction.vy * speed + (Math.random() - 0.5) * spread,
            size: 3,
            decay: 0.05,
            gravity: 0
        }));
    }

    update() {
        this.particles = this.particles.filter(p => p.update());
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
    }

    clear() {
        this.particles = [];
    }
}

// ==================== SCREEN EFFECTS ====================
class ScreenEffects {
    constructor(canvas) {
        this.canvas = canvas;
        this.flash = 0;
        this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
        this.freezeOverlay = 0;
    }

    flashScreen(color, duration) {
        this.flash = { color, duration, elapsed: 0, max: duration };
    }

    shakeScreen(intensity, duration) {
        this.screenShake = { intensity, duration, elapsed: 0, x: 0, y: 0 };
    }

    showFreezeOverlay(duration) {
        this.freezeOverlay = { duration, elapsed: 0, max: duration };
    }

    update(dt) {
        // Flash
        if (this.flash) {
            this.flash.elapsed += dt;
            if (this.flash.elapsed >= this.flash.max) {
                this.flash = 0;
            }
        }

        // Screen shake
        if (this.screenShake.duration > 0) {
            this.screenShake.elapsed += dt;
            if (this.screenShake.elapsed >= this.screenShake.duration) {
                this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
            } else {
                const t = this.screenShake.elapsed / this.screenShake.duration;
                const intensity = this.screenShake.intensity * (1 - t);
                this.screenShake.x = (Math.random() - 0.5) * intensity;
                this.screenShake.y = (Math.random() - 0.5) * intensity;
            }
        }

        // Freeze overlay
        if (this.freezeOverlay) {
            this.freezeOverlay.elapsed += dt;
            if (this.freezeOverlay.elapsed >= this.freezeOverlay.max) {
                this.freezeOverlay = 0;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.screenShake.x, this.screenShake.y);

        // Flash
        if (this.flash) {
            const progress = 1 - (this.flash.elapsed / this.flash.max);
            ctx.globalAlpha = progress * 0.3;
            ctx.fillStyle = this.flash.color;
            ctx.fillRect(-this.screenShake.x, -this.screenShake.y, this.canvas.width, this.canvas.height);
            ctx.globalAlpha = 1;
        }

        // Freeze overlay
        if (this.freezeOverlay) {
            const progress = 1 - (this.freezeOverlay.elapsed / this.freezeOverlay.max);
            ctx.globalAlpha = progress * 0.2;
            ctx.fillStyle = '#88ddff';
            ctx.fillRect(-this.screenShake.x, -this.screenShake.y, this.canvas.width, this.canvas.height);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    getShakeOffset() {
        return { x: this.screenShake.x, y: this.screenShake.y };
    }

    isShaking() {
        return this.screenShake.duration > 0;
    }
}

// ==================== BACKGROUND ====================
class Background {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.stars = [];
        this.gridLines = [];

        // Initialize stars
        for (let i = 0; i < 80; i++) {
            this.stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random(),
                speed: Math.random() * 0.5 + 0.2
            });
        }

        // Initialize grid
        const spacing = 50;
        for (let x = 0; x <= width; x += spacing) {
            this.gridLines.push({ x1: x, y1: 0, x2: x, y2: height, vertical: true });
        }
        for (let y = 0; y <= height; y += spacing) {
            this.gridLines.push({ x1: 0, y1: y, x2: width, y2: y, vertical: false });
        }
    }

    draw(ctx, time) {
        // Draw grid
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 1;
        this.gridLines.forEach(line => {
            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
        });

        // Draw stars
        this.stars.forEach(star => {
            const twinkle = Math.sin(time * star.speed + star.x) * 0.3 + 0.7;
            ctx.globalAlpha = star.brightness * twinkle;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
}

// ==================== DAMAGE NUMBERS ====================
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1;
        this.vy = -2;
    }

    update() {
        this.y += this.vy;
        this.life -= 0.02;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.font = 'bold 18px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

class FloatingTextSystem {
    constructor() {
        this.texts = [];
    }

    add(x, y, text, color) {
        this.texts.push(new FloatingText(x, y, text, color));
    }

    update() {
        this.texts = this.texts.filter(t => t.update());
    }

    draw(ctx) {
        this.texts.forEach(t => t.draw(ctx));
    }
}