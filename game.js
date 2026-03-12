/**
 * 🗡️ 勇者幸存者 v1.0.0
 * 割草 Roguelike - 核心玩法
 */

// ==================== 技能数据库 ====================
const SKILLS = {
    // 武器类
    magic_missile: { id: 'magic_missile', name: '魔法飞弹', type: 'weapon', desc: '自动攻击最近敌人，造成 25 伤害', damage: 25, cooldown: 60, speed: 8, count: 1, pierce: 1 },
    fireball: { id: 'fireball', name: '火球术', type: 'weapon', desc: '发射火球，造成 40 范围伤害', damage: 40, cooldown: 90, speed: 6, explosion: 80 },
    lightning: { id: 'lightning', name: '闪电链', type: 'weapon', desc: '连锁闪电，弹射 4 个敌人', damage: 18, cooldown: 50, chain: 4 },
    aura: { id: 'aura', name: '圣光光环', type: 'weapon', desc: '周围持续伤害，每秒 15 伤害', damage: 15, radius: 100, tickRate: 60 },
    ice_nova: { id: 'ice_nova', name: '冰霜新星', type: 'weapon', desc: '周期性冰冻周围敌人', damage: 20, cooldown: 120, freeze: 2, radius: 120 },
    
    // 被动类
    might: { id: 'might', name: '力量', type: 'passive', desc: '伤害 +15%', damageBonus: 0.15, maxLevel: 5 },
    haste: { id: 'haste', name: '急速', type: 'passive', desc: '攻击速度 +20%', attackSpeedBonus: 0.2, maxLevel: 5 },
    vitality: { id: 'vitality', name: '活力', type: 'passive', desc: '最大生命 +30', healthBonus: 30, maxLevel: 5 },
    armor: { id: 'armor', name: '护甲', type: 'passive', desc: '伤害减免 +12%', damageReduction: 0.12, maxLevel: 5 },
    projectile_up: { id: 'projectile_up', name: '弹药扩充', type: 'passive', desc: '投射物数量 +1', projectileCount: 1, maxLevel: 3 },
    area_up: { id: 'area_up', name: '范围扩大', type: 'passive', desc: '攻击范围 +25%', areaBonus: 0.25, maxLevel: 5 },
    pickup_up: { id: 'pickup_up', name: '磁石', type: 'passive', desc: '拾取范围 +30%', pickupRange: 0.3, maxLevel: 3 },
    regen: { id: 'regen', name: '恢复', type: 'passive', desc: '每秒恢复 2 生命', regen: 2, maxLevel: 5 }
};

// ==================== 敌人类 ====================
class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type;
        
        const configs = {
            basic: { radius: 15, speed: 1.2, hp: 30, damage: 8, exp: 10, color: '#F44336' },
            fast: { radius: 12, speed: 2.5, hp: 20, damage: 6, exp: 15, color: '#FF9800' },
            tank: { radius: 22, speed: 0.7, hp: 100, damage: 15, exp: 30, color: '#9C27B0' },
            boss: { radius: 40, speed: 0.5, hp: 500, damage: 25, exp: 100, color: '#795548' }
        };
        
        const cfg = configs[type] || configs.basic;
        Object.assign(this, cfg);
        this.maxHp = this.hp;
    }
    
    update(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
        
        return dist < this.radius + player.radius;
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 血条
        const hpPct = this.hp / this.maxHp;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - 12, this.y - this.radius - 6, 24, 3);
        ctx.fillStyle = hpPct > 0.5 ? '#4CAF50' : '#F44336';
        ctx.fillRect(this.x - 12, this.y - this.radius - 6, 24 * hpPct, 3);
    }
    
    takeDamage(amount) {
        this.hp -= amount;
        return this.hp <= 0;
    }
}

// ==================== 投射物类 ====================
class Projectile {
    constructor(x, y, vx, vy, damage, type, extra = {}) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.type = type;
        this.extra = extra;
        this.radius = type === 'fireball' ? 10 : 5;
        this.active = true;
        this.hitCount = 0;
        this.life = 300;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        
        if (this.x < 0 || this.x > game.width || this.y < 0 || this.y > game.height || this.life <= 0) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.type === 'fireball' ? '#FF5722' : this.type === 'lightning' ? '#2196F3' : '#4CAF50';
        ctx.fill();
    }
}

// ==================== 经验宝石类 ====================
class Gem {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.radius = 6;
        this.active = true;
    }
    
    update(player, pickupRange) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < pickupRange) {
            this.x += (dx / dist) * 10;
            this.y += (dy / dist) * 10;
        }
        
        if (dist < player.radius + this.radius) {
            game.addExp(this.value);
            this.active = false;
        }
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
        
        this.width = 400;
        this.height = 700;
        
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.gems = [];
        this.damageNumbers = [];
        
        this.exp = 0;
        this.expToNext = 20;
        this.level = 1;
        this.kills = 0;
        this.startTime = 0;
        this.running = false;
        this.gameOver = false;
        
        this.skills = [];
        this.skillLevels = {};
        this.passives = {};
        
        this.joystick = { active: false, x: 0, y: 0, angle: 0, power: 0 };
        
        this.setupInput();
        this.loop = this.loop.bind(this);
    }
    
    resizeCanvas() {
        const container = document.getElementById('gameContainer');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
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
            if (!this.joystick.active) return;
            
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
            x: this.width / 2,
            y: this.height / 2,
            radius: 18,
            speed: 3,
            hp: 100,
            maxHp: 100,
            damageMultiplier: 1,
            attackSpeedMultiplier: 1,
            damageReduction: 0,
            pickupRange: 80,
            regen: 0
        };
        
        this.enemies = [];
        this.projectiles = [];
        this.gems = [];
        this.damageNumbers = [];
        
        this.exp = 0;
        this.expToNext = 20;
        this.level = 1;
        this.kills = 0;
        this.startTime = Date.now();
        this.running = true;
        this.gameOver = false;
        
        this.skills = ['magic_missile'];
        this.skillLevels = { magic_missile: 1 };
        this.passives = {};
        
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('levelUp').style.display = 'none';
        
        this.lastAttack = {};
        this.lastRegen = Date.now();
        
        requestAnimationFrame(this.loop);
    }
    
    spawnEnemy() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const spawnRate = Math.max(20, 60 - elapsed * 2);
        
        if (Math.random() < 1 / spawnRate) {
            const side = Math.floor(Math.random() * 4);
            let x, y;
            const buffer = 50;
            
            switch(side) {
                case 0: x = Math.random() * this.width; y = -buffer; break;
                case 1: x = this.width + buffer; y = Math.random() * this.height; break;
                case 2: x = Math.random() * this.width; y = this.height + buffer; break;
                case 3: x = -buffer; y = Math.random() * this.height; break;
            }
            
            let type = 'basic';
            if (elapsed > 120 && Math.random() < 0.05) type = 'boss';
            else if (elapsed > 60 && Math.random() < 0.2) type = Math.random() < 0.5 ? 'fast' : 'tank';
            
            this.enemies.push(new Enemy(x, y, type));
        }
    }
    
    findNearestEnemy(x, y) {
        let nearest = null;
        let minDist = Infinity;
        
        for (let enemy of this.enemies) {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }
        return nearest;
    }
    
    attack(skillId) {
        const skill = SKILLS[skillId];
        const level = this.skillLevels[skillId] || 1;
        const damage = skill.damage * level * this.player.damageMultiplier;
        const now = Date.now();
        const lastAttackTime = this.lastAttack[skillId] || 0;
        const cooldown = (skill.cooldown / this.player.attackSpeedMultiplier) * 16.67;
        
        if (now - lastAttackTime < cooldown) return;
        this.lastAttack[skillId] = now;
        
        switch(skillId) {
            case 'magic_missile':
                const target = this.findNearestEnemy(this.player.x, this.player.y);
                if (target) {
                    const count = (skill.count || 1) + (this.passives.projectile_up || 0);
                    for (let i = 0; i < count; i++) {
                        setTimeout(() => {
                            const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x) + (i - (count-1)/2) * 0.15;
                            this.projectiles.push(new Projectile(
                                this.player.x, this.player.y,
                                Math.cos(angle) * skill.speed,
                                Math.sin(angle) * skill.speed,
                                damage, 'magic', { pierce: skill.pierce || 1 }
                            ));
                        }, i * 80);
                    }
                }
                break;
                
            case 'fireball':
                const fbTarget = this.findNearestEnemy(this.player.x, this.player.y);
                if (fbTarget) {
                    const angle = Math.atan2(fbTarget.y - this.player.y, fbTarget.x - this.player.x);
                    this.projectiles.push(new Projectile(
                        this.player.x, this.player.y,
                        Math.cos(angle) * skill.speed,
                        Math.sin(angle) * skill.speed,
                        damage, 'fireball', { explosion: skill.explosion * (this.passives.area_up || 1) }
                    ));
                }
                break;
                
            case 'lightning':
                const targets = this.enemies.slice(0, skill.chain || 4);
                targets.forEach((enemy, i) => {
                    setTimeout(() => {
                        enemy.takeDamage(damage);
                        this.showDamageNumber(enemy.x, enemy.y, Math.floor(damage));
                    }, i * 100);
                });
                break;
                
            case 'aura':
                const radius = skill.radius * (this.passives.area_up || 1);
                this.enemies.forEach(enemy => {
                    const dx = enemy.x - this.player.x;
                    const dy = enemy.y - this.player.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= radius) {
                        enemy.takeDamage(damage);
                        this.showDamageNumber(enemy.x, enemy.y, Math.floor(damage));
                    }
                });
                break;
        }
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
        
        const available = Object.values(SKILLS).filter(s => {
            if (s.type === 'weapon') return true;
            const current = this.passives[s.id] || 0;
            return current < s.maxLevel;
        });
        
        const selected = [];
        for (let i = 0; i < 3 && available.length > 0; i++) {
            const idx = Math.floor(Math.random() * available.length);
            selected.push(available[idx]);
            available.splice(idx, 1);
        }
        
        const container = document.getElementById('skillCards');
        container.innerHTML = '';
        selected.forEach(skill => {
            const card = document.createElement('div');
            card.className = `skill-card ${skill.type === 'weapon' ? '' : skill.name.includes('扩充') || skill.name.includes('磁石') ? 'skill-rare' : 'skill-epic'}`;
            card.innerHTML = `<div class="skill-name">${skill.name}</div><div class="skill-desc">${skill.desc}</div>`;
            card.onclick = () => this.selectSkill(skill);
            container.appendChild(card);
        });
        
        document.getElementById('levelUp').style.display = 'block';
    }
    
    selectSkill(skill) {
        if (skill.type === 'weapon') {
            if (!this.skills.includes(skill.id)) {
                this.skills.push(skill.id);
            }
            this.skillLevels[skill.id] = (this.skillLevels[skill.id] || 0) + 1;
        } else {
            this.passives[skill.id] = (this.passives[skill.id] || 0) + 1;
            this.applyPassive(skill);
        }
        
        document.getElementById('levelUp').style.display = 'none';
        this.running = true;
    }
    
    applyPassive(skill) {
        const level = this.passives[skill.id];
        switch(skill.id) {
            case 'might': this.player.damageMultiplier = 1 + skill.damageBonus * level; break;
            case 'haste': this.player.attackSpeedMultiplier = 1 + skill.attackSpeedBonus * level; break;
            case 'vitality': this.player.maxHp += skill.healthBonus * level; this.player.hp += skill.healthBonus * level; break;
            case 'armor': this.player.damageReduction = Math.min(0.5, skill.damageReduction * level); break;
            case 'projectile_up': break;
            case 'area_up': break;
            case 'pickup_up': this.player.pickupRange = 80 * (1 + skill.pickupRange * level); break;
            case 'regen': this.player.regen = skill.regen * level; break;
        }
    }
    
    update() {
        if (!this.running || this.gameOver) return;
        
        const elapsed = (Date.now() - this.startTime) / 1000;
        
        // 玩家移动
        if (this.joystick.active && this.joystick.power > 0) {
            this.player.x += Math.cos(this.joystick.angle) * this.player.speed * this.joystick.power;
            this.player.y += Math.sin(this.joystick.angle) * this.player.speed * this.joystick.power;
            this.player.x = Math.max(this.player.radius, Math.min(this.width - this.player.radius, this.player.x));
            this.player.y = Math.max(this.player.radius, Math.min(this.height - this.player.radius, this.player.y));
        }
        
        // 自动攻击
        this.skills.forEach(skillId => this.attack(skillId));
        
        // 生命恢复
        if (this.player.regen > 0 && Date.now() - this.lastRegen >= 1000) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.regen);
            this.lastRegen = Date.now();
        }
        
        // 更新实体
        this.projectiles.forEach(p => p.update());
        this.enemies.forEach((enemy, ei) => {
            const hitPlayer = enemy.update(this.player);
            if (hitPlayer) {
                let damage = enemy.damage * (1 - this.player.damageReduction);
                this.player.hp -= damage;
                if (this.player.hp <= 0) this.endGame();
            }
        });
        
        // 碰撞检测
        this.projectiles.forEach(proj => {
            if (!proj.active) return;
            this.enemies.forEach(enemy => {
                if (enemy.hp <= 0) return;
                const dx = proj.x - enemy.x;
                const dy = proj.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < proj.radius + enemy.radius) {
                    const killed = enemy.takeDamage(proj.damage);
                    proj.hitCount++;
                    
                    if (proj.extra.explosion) {
                        this.enemies.forEach(e => {
                            const ex = e.x - proj.x;
                            const ey = e.y - proj.y;
                            if (Math.sqrt(ex*ex + ey*ey) < proj.extra.explosion) {
                                e.takeDamage(proj.damage * 0.5);
                            }
                        });
                        proj.active = false;
                    } else if (proj.hitCount >= (proj.extra.pierce || 1)) {
                        proj.active = false;
                    }
                    
                    if (killed) {
                        this.kills++;
                        this.gems.push(new Gem(enemy.x, enemy.y, enemy.exp));
                        enemy.hp = 0;
                    }
                    
                    this.showDamageNumber(proj.x, proj.y, Math.floor(proj.damage));
                }
            });
        });
        
        this.gems.forEach(gem => gem.update(this.player, this.player.pickupRange));
        
        // 清理
        this.projectiles = this.projectiles.filter(p => p.active);
        this.enemies = this.enemies.filter(e => e.hp > 0);
        this.gems = this.gems.filter(g => g.active);
        
        // 生成敌人
        this.spawnEnemy();
        
        // 更新 UI
        this.updateUI();
    }
    
    showDamageNumber(x, y, amount) {
        const el = document.createElement('div');
        el.className = 'damage-number';
        el.textContent = amount;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.getElementById('gameContainer').appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }
    
    updateUI() {
        document.getElementById('hp').textContent = Math.floor(this.player.hp);
        document.getElementById('level').textContent = this.level;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        document.getElementById('kills').textContent = this.kills;
        
        const expPct = (this.exp / this.expToNext) * 100;
        document.getElementById('expFill').style.width = expPct + '%';
        document.getElementById('expText').textContent = `${this.exp}/${this.expToNext}`;
    }
    
    endGame() {
        this.gameOver = true;
        this.running = false;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        
        document.getElementById('finalStats').innerHTML = `存活时间：${mins}:${secs.toString().padStart(2, '0')}<br>击杀：${this.kills}<br>等级：${this.level}`;
        document.getElementById('gameOverScreen').style.display = 'flex';
    }
    
    loop() {
        this.update();
        this.render();
        if (this.running || !this.gameOver) {
            requestAnimationFrame(this.loop);
        }
    }
    
    render() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 网格
        this.ctx.strokeStyle = '#2a2a4e';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.width; x += 40) {
            this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.height); this.ctx.stroke();
        }
        for (let y = 0; y < this.height; y += 40) {
            this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(this.width, y); this.ctx.stroke();
        }
        
        this.gems.forEach(g => g.draw(this.ctx));
        this.enemies.forEach(e => e.draw(this.ctx));
        
        // 玩家
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fill();
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        this.projectiles.forEach(p => p.draw(this.ctx));
    }
}

// ==================== 游戏初始化 ====================
const game = new Game();
console.log('🗡️ 勇者幸存者 v1.0.0 已启动');
