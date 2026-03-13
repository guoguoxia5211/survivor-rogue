/**
 * 🗡️ 勇者幸存者 v3.0.5
 * 简化版 - 确保能玩
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // 玩家 - 一开始就创建
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            hp: 100,
            maxHp: 100,
            level: 1,
            exp: 0,
            kills: 0
        };
        
        this.bullets = [];
        this.enemies = [];
        this.gems = [];
        
        // 摇杆
        this.joystick = {
            active: false,
            angle: 0,
            power: 0
        };
        
        this.lastAttack = 0;
        this.lastSpawn = 0;
        this.startTime = Date.now();
        
        this.setupInput();
        this.loop = this.loop.bind(this);
        
        console.log('🎮 游戏初始化完成');
        console.log('画布尺寸:', this.canvas.width, 'x', this.canvas.height);
        console.log('玩家位置:', this.player.x, this.player.y);
        
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
        
        let startX, startY;
        
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            this.joystick.active = true;
            console.log('👆 触摸开始');
        }, { passive: false });
        
        joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.joystick.active) return;
            
            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 40;
            const clampedDist = Math.min(dist, maxDist);
            
            this.joystick.angle = Math.atan2(dy, dx);
            this.joystick.power = clampedDist / maxDist;
            
            knob.style.transform = `translate(-50%, -50%) translate(${dx * (clampedDist/dist || 0)}px, ${dy * (clampedDist/dist || 0)}px)`;
            
            if (this.joystick.power > 0.1) {
                console.log('🕹️ 移动！power:', this.joystick.power.toFixed(2), 'angle:', this.joystick.angle.toFixed(2));
            }
        }, { passive: false });
        
        joystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.joystick.active = false;
            this.joystick.power = 0;
            knob.style.transform = 'translate(-50%, -50%)';
            console.log('👋 触摸结束');
        });
        
        window.addEventListener('resize', () => this.resize());
    }
    
    start() {
        console.log('▶️ 游戏开始！');
        this.startTime = Date.now();
        
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            hp: 100,
            maxHp: 100,
            level: 1,
            exp: 0,
            kills: 0
        };
        
        this.bullets = [];
        this.enemies = [];
        this.gems = [];
        this.lastAttack = 0;
        this.lastSpawn = 0;
        
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
    }
    
    spawnEnemy() {
        const now = Date.now();
        if (now - this.lastSpawn < 1000) return;
        this.lastSpawn = now;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(this.canvas.width, this.canvas.height) / 2 + 60;
        
        this.enemies.push({
            x: this.player.x + Math.cos(angle) * distance,
            y: this.player.y + Math.sin(angle) * distance,
            hp: 30,
            maxHp: 30,
            radius: 15,
            speed: 1.5
        });
        
        console.log('👾 生成敌人，总数:', this.enemies.length);
    }
    
    attack() {
        const now = Date.now();
        if (now - this.lastAttack < 400) return;
        this.lastAttack = now;
        
        // 找最近敌人
        let target = null;
        let minDist = 160000; // 400^2
        
        for (let enemy of this.enemies) {
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                target = enemy;
            }
        }
        
        // 发射角度
        let angle;
        if (target) {
            angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
        } else {
            angle = Math.random() * Math.PI * 2;
        }
        
        this.bullets.push({
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * 6,
            vy: Math.sin(angle) * 6,
            radius: 6,
            life: 150
        });
        
        console.log('🔫 发射子弹，总数:', this.bullets.length);
    }
    
    update() {
        // 玩家移动
        if (this.joystick.active && this.joystick.power > 0.1) {
            const speed = 3 * this.joystick.power;
            this.player.x += Math.cos(this.joystick.angle) * speed;
            this.player.y += Math.sin(this.joystick.angle) * speed;
            
            // 边界
            this.player.x = Math.max(20, Math.min(this.canvas.width - 20, this.player.x));
            this.player.y = Math.max(20, Math.min(this.canvas.height - 20, this.player.y));
        }
        
        // 攻击
        this.attack();
        
        // 生成敌人
        this.spawnEnemy();
        
        // 子弹
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            b.life--;
            if (b.life <= 0 || b.x < 0 || b.x > this.canvas.width || b.y < 0 || b.y > this.canvas.height) {
                this.bullets.splice(i, 1);
            }
        }
        
        // 敌人
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                e.x += (dx / dist) * e.speed;
                e.y += (dy / dist) * e.speed;
            }
            
            // 碰撞玩家
            if (dist < 20 + e.radius) {
                this.player.hp -= 0.5;
                if (this.player.hp <= 0) {
                    this.gameOver();
                }
            }
            
            // 子弹碰撞
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                const bdx = b.x - e.x;
                const bdy = b.y - e.y;
                const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
                
                if (bdist < b.radius + e.radius) {
                    e.hp -= 25;
                    this.bullets.splice(j, 1);
                    
                    if (e.hp <= 0) {
                        this.player.kills++;
                        this.player.exp += 10;
                        this.gems.push({ x: e.x, y: e.y, value: 10 });
                        this.enemies.splice(i, 1);
                    }
                    break;
                }
            }
        }
        
        // 宝石
        for (let i = this.gems.length - 1; i >= 0; i--) {
            const g = this.gems[i];
            const dx = this.player.x - g.x;
            const dy = this.player.y - g.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 80) {
                g.x += (dx / dist) * 8;
                g.y += (dy / dist) * 8;
            }
            
            if (dist < 25) {
                this.player.exp += g.value;
                this.gems.splice(i, 1);
            }
        }
        
        // UI
        document.getElementById('hp').textContent = Math.floor(this.player.hp);
        document.getElementById('level').textContent = this.player.level;
        document.getElementById('kills').textContent = this.player.kills;
        document.getElementById('enemies').textContent = this.enemies.length;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    gameOver() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('finalStats').innerHTML = `存活：${mins}:${secs.toString().padStart(2, '0')}<br>击杀：${this.player.kills}`;
        document.getElementById('gameOverScreen').style.display = 'flex';
    }
    
    render() {
        // 背景
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 网格
        this.ctx.strokeStyle = '#2a2a4e';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // 宝石
        for (let g of this.gems) {
            this.ctx.beginPath();
            this.ctx.arc(g.x, g.y, 6, 0, Math.PI * 2);
            this.ctx.fillStyle = '#00BCD4';
            this.ctx.fill();
            this.ctx.strokeStyle = '#FFF';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // 敌人
        for (let e of this.enemies) {
            this.ctx.beginPath();
            this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#F44336';
            this.ctx.fill();
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // 子弹
        for (let b of this.bullets) {
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fill();
            this.ctx.strokeStyle = '#FFF';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // 玩家
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, 20, 0, Math.PI * 2);
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        
        // 玩家血条
        const hpPct = this.player.hp / this.player.maxHp;
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(this.player.x - 20, this.player.y - 35, 40, 6);
        this.ctx.fillStyle = hpPct > 0.5 ? '#4CAF50' : '#F44336';
        this.ctx.fillRect(this.player.x - 20, this.player.y - 35, 40 * hpPct, 6);
    }
    
    loop() {
        this.update();
        this.render();
        requestAnimationFrame(this.loop);
    }
}

// 启动
window.onload = () => {
    window.game = new Game();
    console.log('✅ 游戏已启动');
};
