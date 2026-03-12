/**
 * 🗡️ 勇者幸存者 v2.0.0
 * 完整重制版
 */

// ==================== 技能数据 ====================
const SKILLS = {
    magic_missile: { id: 'magic_missile', name: '魔法飞弹', type: 'weapon', damage: 25, cooldown: 500, speed: 7 },
    fireball: { id: 'fireball', name: '火球术', type: 'weapon', damage: 40, cooldown: 800, speed: 5 },
    might: { id: 'might', name: '力量', type: 'passive', damageBonus: 0.15, maxLevel: 5 },
    haste: { id: 'haste', name: '急速', type: 'passive', attackSpeedBonus: 0.2, maxLevel: 5 },
    vitality: { id: 'vitality', name: '活力', type: 'passive', healthBonus: 30, maxLevel: 5 }
};

// ==================== 敌人类 ====================
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.hp = 30;
        this.maxHp = 30;
        this.speed = 1.5;
        this.damage = 8;
        this.exp = 10;
        this.radius = 15;
        this.color = '#F44336';
    }
    
    update(playerX, playerY) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
        return dist;
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    takeDamage(amount) {
        this.hp -= amount;
        return this.hp <= 0;
    }
}

// ==================== 子弹类 ====================
class Bullet {
    constructor(x, y, vx, vy, damage) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.radius = 8;
        this.active = true;
        this.life = 200;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        if (this.life <= 0) this.active = false;
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFF00';
        ctx.fill();
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// ==================== 经验宝石 ====================
class Gem {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.radius = 6;
        this.active = true;
    }
    
    update(playerX, playerY, pickupRange) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < pickupRange) {
            this.x += (dx / dist) * 10;
            this.y += (dy / dist) * 10;
        }
        if (dist < 25) {
            this.active = false;
            return this.value;
        }
        return 0;
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#00BCD4';
        ctx.fill();
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// ==================== 游戏主类 ====================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        this.worldX = 0;
        this.worldY = 0;
        this.distance = 0;
        
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.gems = [];
        
        this.exp = 0;
        this.expToNext = 20;
        this.level = 1;
        this.kills = 0;
        this.startTime = 0;
        this.running = false;
        
        this.skills = ['magic_missile'];
        this.skillLevels = { magic_missile: 1 };
        this.passives = {};
        
        this.joystick = { active: false, angle: 0, power: 0 };
        this.lastAttack = 0;
        
        this.setupInput();
        this.loop = this.loop.bind(this);
    }
    
    resizeCanvas() {
        const container = document.getElementById('gameContainer');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }
    
    setupInput() {
        const joystick = document.getElementById('joystick');
        const knob = document.getElementById('joystickKnob');
        let touchId = null;
        let startX, startY;
        
        joystick.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            touchId = touch.identifier;
            const rect = joystick.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
            this.joystick.active = true;
        });
        
        joystick.addEventListener('touchmove', e => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    const touch = e.changedTouches[i];
                    const dx = touch.clientX - startX;
                    const dy = touch.clientY - startY;
                    const dist = Math.min(40, Math.sqrt(dx * dx + dy * dy));
                    this.joystick.angle = Math.atan2(dy, dx);
                    this.joystick.power = dist / 40;
                    knob.style.transform = `translate(-50%, -50%) translate(${Math.cos(this.joystick.angle) * dist}px, ${Math.sin(this.joystick.angle) * dist}px)`;
                }
            }
        });
        
        joystick.addEventListener('touchend', e => {
            e.preventDefault();
            this.joystick.active = false;
            this.joystick.power = 0;
            knob.style.transform = 'translate(-50%, -50%)';
        });
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    start() {
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: 18,
            speed: 3,
            hp: 100,
            maxHp: 100,
            damageMultiplier: 1,
            attackSpeedMultiplier: 1,
            pickupRange: 80
        };
        
        this.worldX = 0;
        this.worldY = 0;
        this.distance = 0;
        
        this.enemies = [];
        this.bullets = [];
        this.gems = [];
        
        this.exp = 0;
        this.expToNext = 20;
        this.level = 1;
        this.kills = 0;
        this.startTime = Date.now();
        this.running = true;
        
        this.skills = ['magic_missile'];
        this.skillLevels = { magic_missile: 1 };
        this.passives = {};
        this.lastAttack = 0;
        
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('levelUp').style.display = 'none';
        
        requestAnimationFrame(this.loop);
    }
    
    spawnEnemy() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const spawnRate = Math.max(20, 60 - elapsed * 2);
        
        if (Math.random() < 1 / spawnRate) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.max(this.canvas.width, this.canvas.height) / 2 + 80;
            
            const worldX = this.worldX + Math.cos(angle) * distance;
            const worldY = this.worldY + Math.sin(angle) * distance;
            
            this.enemies.push(new Enemy(worldX, worldY));
        }
    }
    
    attack() {
        const now = Date.now();
        const cooldown = 500 / this.player.attackSpeedMultiplier;
        
        if (now - this.lastAttack < cooldown) return;
        this.lastAttack = now;
        
        // 找最近的敌人
        let target = null;
        let minDist = 500 * 500;
        for (let enemy of this.enemies) {
            const dx = enemy.x - this.worldX;
            const dy = enemy.y - this.worldY;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                target = enemy;
            }
        }
        
        // 发射子弹
        let angle;
        if (target) {
            angle = Math.atan2(target.y - this.worldY, target.x - this.worldX);
        } else {
            angle = Math.random() * Math.PI * 2;
        }
        
        const damage = 25 * this.skillLevels['magic_missile'] * this.player.damageMultiplier;
        const speed = 7;
        
        this.bullets.push(new Bullet(
            this.worldX,
            this.worldY,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            damage
        ));
    }
    
    addExp(amount) {
        this.exp += amount;
        if (this.exp >= this.expToNext) {
            this.exp -= this.expToNext;
            this.level++;
            this.expToNext = Math.floor(this.expToNext * 1.3);
            this.player.maxHp += 20;
            this.player.hp = this.player.maxHp;
            this.showLevelUp();
        }
    }
    
    showLevelUp() {
        this.running = false;
        
        const skills = Object.values(SKILLS);
        const selected = [];
        for (let i = 0; i < 3; i++) {
            selected.push(skills[Math.floor(Math.random() * skills.length)]);
        }
        
        const container = document.getElementById('skillCards');
        container.innerHTML = '';
        selected.forEach(skill => {
            const card = document.createElement('div');
            card.className = 'skill-card';
            card.innerHTML = `<div class="skill-name">${skill.name}</div><div class="skill-desc">${skill.type === 'weapon' ? '武器' : '被动'}</div>`;
            card.onclick = () => {
                if (skill.type === 'weapon') {
                    if (!this.skills.includes(skill.id)) this.skills.push(skill.id);
                    this.skillLevels[skill.id] = (this.skillLevels[skill.id] || 0) + 1;
                } else {
                    this.passives[skill.id] = (this.passives[skill.id] || 0) + 1;
                    if (skill.id === 'might') this.player.damageMultiplier = 1 + skill.damageBonus * this.passives[skill.id];
                    if (skill.id === 'haste') this.player.attackSpeedMultiplier = 1 + skill.attackSpeedBonus * this.passives[skill.id];
                    if (skill.id === 'vitality') {
                        this.player.maxHp += skill.healthBonus;
                        this.player.hp += skill.healthBonus;
                    }
                }
                document.getElementById('levelUp').style.display = 'none';
                this.running = true;
            };
            container.appendChild(card);
        });
        
        document.getElementById('levelUp').style.display = 'block';
    }
    
    update() {
        if (!this.running) return;
        
        // 玩家移动
        if (this.joystick.active && this.joystick.power > 0) {
            const moveX = Math.cos(this.joystick.angle) * this.player.speed * this.joystick.power;
            const moveY = Math.sin(this.joystick.angle) * this.player.speed * this.joystick.power;
            this.worldX += moveX;
            this.worldY += moveY;
            this.distance += Math.sqrt(moveX * moveX + moveY * moveY);
        }
        
        // 自动攻击
        this.attack();
        
        // 生成敌人
        this.spawnEnemy();
        
        // 更新子弹
        this.bullets.forEach(b => b.update());
        
        // 更新敌人
        this.enemies.forEach(enemy => {
            const dist = enemy.update(this.worldX, this.worldY);
            if (dist < enemy.radius + this.player.radius) {
                this.player.hp -= enemy.damage;
                if (this.player.hp <= 0) this.endGame();
            }
        });
        
        // 子弹碰撞
        this.bullets.forEach(bullet => {
            if (!bullet.active) return;
            this.enemies.forEach(enemy => {
                if (enemy.hp <= 0) return;
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < bullet.radius + enemy.radius) {
                    const killed = enemy.takeDamage(bullet.damage);
                    bullet.active = false;
                    if (killed) {
                        this.kills++;
                        this.gems.push(new Gem(enemy.x, enemy.y, enemy.exp));
                    }
                }
            });
        });
        
        // 更新宝石
        this.gems.forEach(gem => {
            const exp = gem.update(this.worldX, this.worldY, this.player.pickupRange);
            if (exp > 0) this.addExp(exp);
        });
        
        // 清理
        this.bullets = this.bullets.filter(b => b.active);
        this.enemies = this.enemies.filter(e => e.hp > 0);
        this.gems = this.gems.filter(g => g.active);
        
        // UI
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('hp').textContent = Math.floor(this.player.hp);
        document.getElementById('level').textContent = this.level;
        document.getElementById('enemies').textContent = this.enemies.length;
        document.getElementById('kills').textContent = this.kills;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        
        const expPct = (this.exp / this.expToNext) * 100;
        document.getElementById('expFill').style.width = expPct + '%';
        document.getElementById('expText').textContent = `${this.exp}/${this.expToNext}`;
    }
    
    endGame() {
        this.running = false;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('finalStats').innerHTML = `存活：${mins}:${secs.toString().padStart(2, '0')}<br>击杀：${this.kills}<br>等级：${this.level}`;
        document.getElementById('gameOverScreen').style.display = 'flex';
    }
    
    render() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 背景装饰点
        this.ctx.fillStyle = '#2a2a4e';
        for (let i = 0; i < 15; i++) {
            const x = ((i * 137 + this.worldX * 0.1) % this.canvas.width);
            const y = ((i * 243 + this.worldY * 0.1) % this.canvas.height);
            this.ctx.fillRect(x, y, 2, 2);
        }
        
        // 绘制实体（世界坐标转屏幕坐标）
        this.ctx.save();
        this.ctx.translate(this.canvas.width/2 - this.worldX, this.canvas.height/2 - this.worldY);
        
        const margin = 150;
        const minX = this.worldX - this.canvas.width/2 - margin;
        const maxX = this.worldX + this.canvas.width/2 + margin;
        const minY = this.worldY - this.canvas.height/2 - margin;
        const maxY = this.worldY + this.canvas.height/2 + margin;
        
        this.gems.forEach(g => {
            if (g.x >= minX && g.x <= maxX && g.y >= minY && g.y <= maxY) g.draw(this.ctx);
        });
        
        this.enemies.forEach(e => {
            if (e.x >= minX && e.x <= maxX && e.y >= minY && e.y <= maxY) e.draw(this.ctx);
        });
        
        this.bullets.forEach(b => {
            if (b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY) b.draw(this.ctx);
        });
        
        this.ctx.restore();
        
        // 玩家（屏幕中央）
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fill();
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }
    
    loop() {
        this.update();
        this.render();
        if (this.running || !this.gameOver) {
            requestAnimationFrame(this.loop);
        }
    }
}

// ==================== 初始化 ====================
const game = new Game();
console.log('🗡️ 勇者幸存者 v2.0.0 启动');
