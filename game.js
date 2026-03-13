/**
 * 🗡️ 勇者幸存者 v3.0.0
 * 完整重做版 - 确保能玩
 */

// ==================== 游戏配置 ====================
const CONFIG = {
    playerSpeed: 3,
    playerRadius: 20,
    bulletSpeed: 6,
    bulletRadius: 6,
    enemySpeed: 1.5,
    enemyRadius: 15,
    attackCooldown: 400,
    spawnInterval: 1000
};

// ==================== 游戏主类 ====================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // 游戏状态
        this.state = 'menu'; // menu, playing, gameover
        this.lastTime = 0;
        
        // 玩家
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            hp: 100,
            maxHp: 100,
            level: 1,
            exp: 0,
            expToNext: 20,
            kills: 0
        };
        
        // 游戏对象
        this.bullets = [];
        this.enemies = [];
        this.gems = [];
        this.damageNumbers = [];
        
        // 计时器
        this.lastAttack = 0;
        this.lastSpawn = 0;
        
        // 摇杆
        this.joystick = {
            active: false,
            dx: 0,
            dy: 0,
            distance: 0,
            angle: 0
        };
        
        this.setupInput();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }
    
    resize() {
        const container = document.getElementById('gameContainer');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        if (this.player) {
            this.player.x = this.canvas.width / 2;
            this.player.y = this.canvas.height / 2;
        }
    }
    
    setupInput() {
        const joystick = document.getElementById('joystick');
        const knob = document.getElementById('joystickKnob');
        let touchId = null;
        let rect = joystick.getBoundingClientRect();
        let centerX = rect.left + rect.width / 2;
        let centerY = rect.top + rect.height / 2;
        
        joystick.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            touchId = touch.identifier;
            rect = joystick.getBoundingClientRect();
            centerX = rect.left + rect.width / 2;
            centerY = rect.top + rect.height / 2;
            this.joystick.active = true;
        }, { passive: false });
        
        joystick.addEventListener('touchmove', e => {
            e.preventDefault();
            if (!this.joystick.active) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    const touch = e.changedTouches[i];
                    this.joystick.dx = touch.clientX - centerX;
                    this.joystick.dy = touch.clientY - centerY;
                    this.joystick.distance = Math.min(40, Math.sqrt(this.joystick.dx ** 2 + this.joystick.dy ** 2));
                    this.joystick.angle = Math.atan2(this.joystick.dy, this.joystick.dx);
                    
                    knob.style.transform = `translate(-50%, -50%) translate(${Math.cos(this.joystick.angle) * this.joystick.distance}px, ${Math.sin(this.joystick.angle) * this.joystick.distance}px)`;
                }
            }
        }, { passive: false });
        
        joystick.addEventListener('touchend', e => {
            e.preventDefault();
            this.joystick.active = false;
            this.joystick.dx = 0;
            this.joystick.dy = 0;
            this.joystick.distance = 0;
            knob.style.transform = 'translate(-50%, -50%)';
        });
        
        window.addEventListener('resize', () => this.resize());
    }
    
    start() {
        this.state = 'playing';
        this.startTime = Date.now();
        this.lastTime = Date.now();
        
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            hp: 100,
            maxHp: 100,
            level: 1,
            exp: 0,
            expToNext: 20,
            kills: 0
        };
        
        this.bullets = [];
        this.enemies = [];
        this.gems = [];
        this.damageNumbers = [];
        this.lastAttack = 0;
        this.lastSpawn = 0;
        
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
    }
    
    spawnEnemy() {
        const now = Date.now();
        if (now - this.lastSpawn < CONFIG.spawnInterval) return;
        this.lastSpawn = now;
        
        // 在屏幕外随机位置生成
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;
        
        const enemy = {
            x: this.player.x + Math.cos(angle) * distance,
            y: this.player.y + Math.sin(angle) * distance,
            hp: 30 + this.player.level * 5,
            maxHp: 30 + this.player.level * 5,
            speed: CONFIG.enemySpeed,
            damage: 10,
            exp: 10,
            radius: CONFIG.enemyRadius
        };
        
        this.enemies.push(enemy);
    }
    
    attack() {
        const now = Date.now();
        if (now - this.lastAttack < CONFIG.attackCooldown) return;
        this.lastAttack = now;
        
        // 找最近的敌人
        let target = null;
        let minDist = 400 * 400;
        
        for (let enemy of this.enemies) {
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                target = enemy;
            }
        }
        
        // 计算发射角度
        let angle;
        if (target) {
            angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
        } else {
            angle = Math.random() * Math.PI * 2;
        }
        
        // 发射子弹
        this.bullets.push({
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * CONFIG.bulletSpeed,
            vy: Math.sin(angle) * CONFIG.bulletSpeed,
            damage: 25,
            radius: CONFIG.bulletRadius,
            life: 150
        });
    }
    
    update() {
        if (this.state !== 'playing') return;
        
        const now = Date.now();
        
        // 玩家移动
        if (this.joystick.active && this.joystick.distance > 5) {
            this.player.x += Math.cos(this.joystick.angle) * CONFIG.playerSpeed * (this.joystick.distance / 40);
            this.player.y += Math.sin(this.joystick.angle) * CONFIG.playerSpeed * (this.joystick.distance / 40);
            
            // 边界限制
            this.player.x = Math.max(CONFIG.playerRadius, Math.min(this.canvas.width - CONFIG.playerRadius, this.player.x));
            this.player.y = Math.max(CONFIG.playerRadius, Math.min(this.canvas.height - CONFIG.playerRadius, this.player.y));
        }
        
        // 自动攻击
        this.attack();
        
        // 生成敌人
        this.spawnEnemy();
        
        // 更新子弹
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.life--;
            
            // 边界检查
            if (bullet.x < 0 || bullet.x > this.canvas.width || 
                bullet.y < 0 || bullet.y > this.canvas.height || bullet.life <= 0) {
                this.bullets.splice(i, 1);
            }
        }
        
        // 更新敌人
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
            }
            
            // 碰撞玩家
            if (dist < CONFIG.playerRadius + enemy.radius) {
                this.player.hp -= enemy.damage;
                if (this.player.hp <= 0) {
                    this.gameOver();
                }
            }
        }
        
        // 子弹碰撞敌人
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < bullet.radius + enemy.radius) {
                    enemy.hp -= bullet.damage;
                    this.bullets.splice(i, 1);
                    
                    // 显示伤害数字
                    this.damageNumbers.push({
                        x: enemy.x,
                        y: enemy.y,
                        value: bullet.damage,
                        life: 30
                    });
                    
                    if (enemy.hp <= 0) {
                        this.player.kills++;
                        this.player.exp += enemy.exp;
                        this.gems.push({ x: enemy.x, y: enemy.y, value: enemy.exp, radius: 6 });
                        this.enemies.splice(j, 1);
                        
                        // 升级
                        if (this.player.exp >= this.player.expToNext) {
                            this.player.exp -= this.player.expToNext;
                            this.player.level++;
                            this.player.expToNext = Math.floor(this.player.expToNext * 1.3);
                            this.player.maxHp += 20;
                            this.player.hp = this.player.maxHp;
                            this.showLevelUp();
                        }
                    }
                    break;
                }
            }
        }
        
        // 更新宝石
        for (let i = this.gems.length - 1; i >= 0; i--) {
            const gem = this.gems[i];
            const dx = this.player.x - gem.x;
            const dy = this.player.y - gem.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 80) {
                gem.x += (dx / dist) * 8;
                gem.y += (dy / dist) * 8;
            }
            
            if (dist < CONFIG.playerRadius + gem.radius) {
                this.player.exp += gem.value;
                this.gems.splice(i, 1);
                
                if (this.player.exp >= this.player.expToNext) {
                    this.player.exp -= this.player.expToNext;
                    this.player.level++;
                    this.player.expToNext = Math.floor(this.player.expToNext * 1.3);
                    this.player.maxHp += 20;
                    this.player.hp = this.player.maxHp;
                    this.showLevelUp();
                }
            }
        }
        
        // 更新伤害数字
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            this.damageNumbers[i].y -= 1;
            this.damageNumbers[i].life--;
            if (this.damageNumbers[i].life <= 0) {
                this.damageNumbers.splice(i, 1);
            }
        }
        
        this.updateUI();
    }
    
    showLevelUp() {
        // 简化：升级时回满血
    }
    
    updateUI() {
        document.getElementById('hp').textContent = Math.floor(this.player.hp);
        document.getElementById('level').textContent = this.player.level;
        document.getElementById('kills').textContent = this.player.kills;
        document.getElementById('enemies').textContent = this.enemies.length;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        
        const expPct = (this.player.exp / this.player.expToNext) * 100;
        document.getElementById('expFill').style.width = expPct + '%';
        document.getElementById('expText').textContent = `${this.player.exp}/${this.player.expToNext}`;
    }
    
    gameOver() {
        this.state = 'gameover';
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('finalStats').innerHTML = `存活：${mins}:${secs.toString().padStart(2, '0')}<br>击杀：${this.player.kills}<br>等级：${this.player.level}`;
        document.getElementById('gameOverScreen').style.display = 'flex';
    }
    
    render() {
        // 清空
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.state !== 'playing') return;
        
        // 绘制宝石
        for (let gem of this.gems) {
            this.ctx.beginPath();
            this.ctx.arc(gem.x, gem.y, gem.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#00BCD4';
            this.ctx.fill();
            this.ctx.strokeStyle = '#FFF';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // 绘制敌人
        for (let enemy of this.enemies) {
            this.ctx.beginPath();
            this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#F44336';
            this.ctx.fill();
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // 敌人血条
            const hpPct = enemy.hp / enemy.maxHp;
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(enemy.x - 12, enemy.y - enemy.radius - 6, 24, 3);
            this.ctx.fillStyle = hpPct > 0.5 ? '#4CAF50' : '#F44336';
            this.ctx.fillRect(enemy.x - 12, enemy.y - enemy.radius - 6, 24 * hpPct, 3);
        }
        
        // 绘制子弹
        for (let bullet of this.bullets) {
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fill();
            this.ctx.strokeStyle = '#FFF';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // 绘制玩家
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, CONFIG.playerRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fill();
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // 绘制伤害数字
        this.ctx.font = 'bold 16px Arial';
        for (let dn of this.damageNumbers) {
            this.ctx.fillStyle = '#FF5252';
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(dn.value, dn.x, dn.y);
            this.ctx.fillText(dn.value, dn.x, dn.y);
        }
    }
    
    loop() {
        const now = Date.now();
        const dt = now - this.lastTime;
        this.lastTime = now;
        
        if (this.state === 'playing') {
            this.update();
        }
        this.render();
        
        requestAnimationFrame(this.loop);
    }
}

// ==================== 初始化 ====================
let game;
window.onload = () => {
    game = new Game();
    console.log('🗡️ 勇者幸存者 v3.0.0 启动');
};
