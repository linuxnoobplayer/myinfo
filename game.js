document.addEventListener('DOMContentLoaded', () => {
    const hobbyCard = document.getElementById('gamingHobbyCard');
    const gameModal = document.getElementById('flappyEasterEgg');
    const closeBtn = document.getElementById('closeFlappyBtn');
    const startBtn = document.getElementById('startGameBtn');
    const restartBtn = document.getElementById('restartGameBtn');
    const restartBtnWin = document.getElementById('restartGameBtnWin');
    const highScoreDisplay = document.getElementById('highScoreDisplay');
    const finalScoreDisplay = document.getElementById('finalScore');
    const highScoreGameOver = document.getElementById('highScore');
    const winScreen = document.getElementById('winScreen');

    let canvas = document.getElementById('flappyCanvas');
    let ctx = canvas?.getContext('2d');
    let gameRunning = false;
    let gameActive = false;
    let score = 0;
    let frames = 0;
    let pipes = [];
    let fireworks = [];
    let animationId = null;
    let lastTime = 0;
    let audioContext = null;

    function initAudio() {
        if (audioContext) return;
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {}
    }

    function playSound(type) {
        initAudio();
        if (!audioContext) return;
        const now = audioContext.currentTime;
        if (type === 'flap') {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.setValueAtTime(400, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.setValueAtTime(0, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'score') {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.setValueAtTime(0, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'gameover') {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.setValueAtTime(200, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.setValueAtTime(0, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        }
    }

    function restoreCursor() {
        if (window.toggleCursorVisibility) {
            window.toggleCursorVisibility(true);
        }
    }

    const gameState = {
        current: 'menu',
        highScore: parseInt(localStorage.getItem('flappyHighScore')) || 0
    };

    if (highScoreDisplay) {
        highScoreDisplay.textContent = gameState.highScore;
    }

    const bird = {
        x: 80,
        y: 300,
        radius: 12,
        velocity: 0,
        gravity: 0.5,
        jumpPower: -8,
        maxVelocity: 6,
        rotation: 0,
        color: '#FFD700',
        draw() {
            if (!ctx) return;
            ctx.save();
            ctx.translate(this.x, this.y);
            this.rotation = Math.min(Math.max(this.velocity * 0.08, -0.5), 0.8);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            const wingOffset = Math.sin(frames * 0.15) * 3;
            ctx.fillStyle = '#FFA500';
            ctx.beginPath();
            ctx.ellipse(-2, wingOffset, 7, 5, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(6, -4, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(7, -4, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FF6347';
            ctx.beginPath();
            ctx.moveTo(9, -1);
            ctx.lineTo(16, 0);
            ctx.lineTo(9, 1);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        },
        update(deltaTime) {
            if (!gameRunning) return;
            this.velocity += this.gravity * deltaTime * 60;
            this.velocity = Math.min(this.velocity, this.maxVelocity);
            this.y += this.velocity * deltaTime * 60;
            if (this.y + this.radius >= (canvas?.height || 600) - 40) {
                endGame();
                return;
            }
            if (this.y - this.radius <= 10) {
                this.y = this.radius + 10;
                this.velocity = Math.max(this.velocity, 0);
            }
        },
        flap() {
            if (gameRunning && gameActive) {
                this.velocity = this.jumpPower;
                playSound('flap');
            }
        },
        reset() {
            this.y = canvas?.height ? canvas.height / 2 : 300;
            this.velocity = 0;
            this.rotation = 0;
        }
    };

    const pipeWidth = 60;
    const pipeGap = 140;
    const pipeSpeed = 5;

    function createPipe() {
        if (!canvas) return;
        const minHeight = 50;
        const maxHeight = (canvas.height * 0.65) - pipeGap;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        pipes.push({
            x: canvas.width,
            topHeight,
            bottomY: topHeight + pipeGap,
            width: pipeWidth,
            scored: false
        });
    }

    function drawPipes() {
        if (!ctx || !canvas) return;
        pipes.forEach(pipe => {
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(pipe.x - 3, pipe.topHeight - 8, pipe.width + 6, 8);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, canvas.height - pipe.bottomY);
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(pipe.x - 3, pipe.bottomY, pipe.width + 6, 8);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 2;
            ctx.strokeRect(pipe.x + 2, pipe.topHeight + 2, pipe.width - 4, 6);
            ctx.strokeRect(pipe.x + 2, pipe.bottomY + 2, pipe.width - 4, 6);
        });
    }

    function updatePipes(deltaTime) {
        if (!gameRunning || !canvas) return;
        frames += deltaTime;
        if (frames >= 1.8) {
            createPipe();
            frames = 0;
        }
        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].x -= pipeSpeed * deltaTime * 60;
            if (pipes[i].x + pipes[i].width < -50) {
                pipes.splice(i, 1);
                continue;
            }
            if (!pipes[i].scored && pipes[i].x + pipes[i].width < bird.x) {
                pipes[i].scored = true;
                score++;
                playSound('score');
                if (score >= 20) {
                    winGameNow();
                    return;
                }
            }
            if (checkCollision(bird, pipes[i])) {
                endGame();
                return;
            }
        }
    }

    function checkCollision(bird, pipe) {
        const birdLeft = bird.x - bird.radius;
        const birdRight = bird.x + bird.radius;
        const birdTop = bird.y - bird.radius;
        const birdBottom = bird.y + bird.radius;
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + pipe.width;
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            if (birdTop < pipe.topHeight || birdBottom > pipe.bottomY) {
                return true;
            }
        }
        return false;
    }

    function createFirework(x, y) {
        const particles = [];
        const colors = ['#FF5252', '#4CAF50', '#2196F3', '#FFEB3B', '#9C27B0', '#FF9800'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const count = 80 + Math.random() * 40;
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                decay: Math.random() * 0.02 + 0.005,
                color
            });
        }
        fireworks.push(particles);
    }

    function updateFireworks() {
        for (let i = fireworks.length - 1; i >= 0; i--) {
            const particles = fireworks[i];
            for (let j = particles.length - 1; j >= 0; j--) {
                const p = particles[j];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.02;
                p.life -= p.decay;
                if (p.life <= 0) {
                    particles.splice(j, 1);
                }
            }
            if (particles.length === 0) {
                fireworks.splice(i, 1);
            }
        }
    }

    function drawFireworks() {
        fireworks.forEach(particles => {
            particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        });
    }

    function startFireworks() {
        if (!gameModal || gameModal.style.display !== 'block') return;
        const interval = setInterval(() => {
            if (gameState.current !== 'won') {
                clearInterval(interval);
                return;
            }
            const x = Math.random() * (canvas?.width || 500);
            const y = Math.random() * ((canvas?.height || 400) * 0.6);
            createFirework(x, y);
        }, 300);
    }

    function drawGround() {
        if (!ctx || !canvas) return;
        const groundY = canvas.height - 40;
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(0, groundY, canvas.width, 40);
        ctx.fillStyle = '#A0826D';
        ctx.fillRect(0, groundY, canvas.width, 3);
        ctx.fillStyle = '#6B5344';
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.fillRect(i, groundY + 12, 30, 4);
        }
    }

    function drawBackground() {
        if (!ctx || !canvas) return;
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.5, '#B0E0E6');
        gradient.addColorStop(1, '#E0F6FF');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        drawCloud(80, 60, 25);
        drawCloud(220, 100, 30);
        drawCloud(400, 70, 28);
        drawCloud(550, 110, 32);
    }

    function drawCloud(x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.arc(x + size * 0.6, y - size * 0.3, size * 0.7, 0, Math.PI * 2);
        ctx.arc(x + size * 1.1, y - size * 0.1, size * 0.8, 0, Math.PI * 2);
        ctx.arc(x + size * 0.5, y + size * 0.3, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawScore() {
        if (!ctx || !canvas) return;
        ctx.font = 'bold 48px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(score, canvas.width / 2, 80);
    }

    function endGame() {
        gameRunning = false;
        gameActive = false;
        gameState.current = 'gameover';
        playSound('gameover');
        if (score > gameState.highScore) {
            gameState.highScore = score;
            localStorage.setItem('flappyHighScore', score.toString());
        }
        if (finalScoreDisplay) finalScoreDisplay.textContent = score;
        if (highScoreGameOver) highScoreGameOver.textContent = gameState.highScore;
        if (highScoreDisplay) highScoreDisplay.textContent = gameState.highScore;
        setTimeout(() => {
            document.getElementById('gameOverScreen').style.display = 'flex';
            restoreCursor();
        }, 300);
    }

    function winGameNow() {
        gameRunning = false;
        gameActive = false;
        gameState.current = 'won';
        playSound('score');
        if (score > gameState.highScore) {
            gameState.highScore = score;
            localStorage.setItem('flappyHighScore', score.toString());
        }
        setTimeout(() => {
            winScreen.style.display = 'flex';
            restoreCursor();
            startFireworks();
        }, 300);
    }

    function resetGameState() {
        bird.reset();
        pipes = [];
        fireworks = [];
        score = 0;
        frames = 0;
        gameRunning = false;
        gameActive = false;
        gameState.current = 'menu';
        document.getElementById('startScreen').style.display = 'flex';
        document.getElementById('gameOverScreen').style.display = 'none';
        winScreen.style.display = 'none';
        const gift = document.getElementById('giftBox');
        if (gift) {
            gift.style.animation = 'none';
            gift.style.opacity = '1';
            gift.style.transform = 'scale(1)';
            gift.dataset.clicked = 'false';
        }
    }

    function beginGame() {
        resetGameState();
        gameRunning = true;
        gameActive = true;
        gameState.current = 'playing';
        document.getElementById('startScreen').style.display = 'none';
    }

    function resizeCanvas() {
        if (!canvas || !canvas.parentElement) return;
        const container = canvas.parentElement;
        canvas.width = Math.min(container.clientWidth, 500);
        canvas.height = container.clientHeight;
    }

    function generateCodeSuffix() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let suffix = '';
        for (let i = 0; i < 4; i++) {
            suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return suffix;
    }

    const giftBox = document.getElementById('giftBox');
    if (giftBox) {
        giftBox.dataset.clicked = 'false';
        giftBox.addEventListener('click', () => {
            if (giftBox.dataset.clicked === 'true') return;
            giftBox.dataset.clicked = 'true';

            const secretCode = `FLAPPY_MASTER_${generateCodeSuffix()}`;
            localStorage.setItem('sudoRogueSecretCode', secretCode);

            giftBox.style.animation = 'openGift 0.8s ease forwards';

            setTimeout(() => {
                const modal = document.createElement('div');
                modal.innerHTML = `
                    <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(2,6,23,0.95);z-index:10002;display:flex;justify-content:center;align-items:center;padding:20px;box-sizing:border-box;text-align:center;">
                        <div style="background:#1e293b;border-radius:16px;padding:30px;max-width:400px;color:white;font-family:monospace;font-size:1.2rem;box-shadow:0 0 30px rgba(236,72,153,0.5);">
                            <h3 style="margin-top:0;color:#ec4899;">🔓 Secret Code!</h3>
                            <p id="secretCodeText" style="font-size:1.1rem;word-break:break-all;user-select:text;">${secretCode}</p>
                            <button id="copyCodeBtn" style="margin-top:15px;padding:8px 20px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer;">📋 Copy Code</button>
                            <button id="closeCodeBtn" style="margin-top:10px;padding:8px 20px;background:#475569;color:white;border:none;border-radius:6px;cursor:pointer;">Close</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.querySelector('#copyCodeBtn').onclick = () => {
                    navigator.clipboard.writeText(secretCode).then(() => {
                        const btn = modal.querySelector('#copyCodeBtn');
                        btn.textContent = '✅ Copied!';
                        btn.style.background = '#10b981';
                        setTimeout(() => {
                            btn.textContent = '📋 Copy Code';
                            btn.style.background = '#6366f1';
                        }, 1500);
                    }).catch(() => {
                        alert('Copy failed. Please select and copy manually.');
                    });
                };

                const closeHandler = () => {
                    document.body.removeChild(modal);
                    restoreCursor();
                };
                modal.querySelector('#closeCodeBtn').onclick = closeHandler;
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') closeHandler();
                });
            }, 800);
        });
    }

    function gameLoop(currentTime) {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        resizeCanvas();
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBackground();
            drawGround();
            if (gameState.current === 'won') {
                drawFireworks();
                updateFireworks();
            }
            if (gameRunning && gameActive) {
                bird.update(deltaTime);
                updatePipes(deltaTime);
            }
            drawPipes();
            bird.draw();
            drawScore();
        }
        animationId = requestAnimationFrame(gameLoop);
    }

    if (hobbyCard) {
        hobbyCard.addEventListener('click', () => {
            if (gameModal) {
                gameModal.style.display = 'block';
                restoreCursor();
                resetGameState();
                setTimeout(() => {
                    resizeCanvas();
                    lastTime = performance.now();
                    gameLoop(lastTime);
                }, 50);
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            gameModal.style.display = 'none';
            gameRunning = false;
            gameActive = false;
            restoreCursor();
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        });
    }

    if (startBtn) startBtn.addEventListener('click', beginGame);
    if (restartBtn) restartBtn.addEventListener('click', beginGame);
    if (restartBtnWin) restartBtnWin.addEventListener('click', beginGame);

    let spacePressed = false;
    document.addEventListener('keydown', (e) => {
        if (gameModal?.style.display !== 'block') return;
        if (e.code === 'Space') {
            e.preventDefault();
            if (!spacePressed) {
                spacePressed = true;
                if (gameState.current === 'menu') beginGame();
                else if (gameState.current === 'playing') bird.flap();
            }
        }
        if (e.code === 'Escape') {
            closeBtn?.click();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') spacePressed = false;
    });

    if (canvas) {
        canvas.addEventListener('mousedown', (e) => {
            if (gameModal?.style.display !== 'block') return;
            e.preventDefault();
            if (gameState.current === 'menu') beginGame();
            else if (gameState.current === 'playing') bird.flap();
        });
        canvas.addEventListener('touchstart', (e) => {
            if (gameModal?.style.display !== 'block') return;
            e.preventDefault();
            if (gameState.current === 'menu') beginGame();
            else if (gameState.current === 'playing') bird.flap();
        });
    }

    window.addEventListener('resize', () => {
        if (gameModal?.style.display === 'block') {
            resizeCanvas();
        }
    });

    console.log('🚀 Flappy Bird Master with Secret Code System loaded!');
});
