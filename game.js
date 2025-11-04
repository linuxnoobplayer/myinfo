// Flappy Bird Game - Fixed Version
document.addEventListener('DOMContentLoaded', () => {
    const hobbyCard = document.getElementById('gamingHobbyCard');
    const gameModal = document.getElementById('flappyEasterEgg');
    const closeBtn = document.getElementById('closeFlappyBtn');
    const startBtn = document.getElementById('startGameBtn');
    const restartBtn = document.getElementById('restartGameBtn');
    const highScoreDisplay = document.getElementById('highScoreDisplay');
    const finalScoreDisplay = document.getElementById('finalScore');
    const highScoreGameOver = document.getElementById('highScore');
    
    let canvas = document.getElementById('flappyCanvas');
    let ctx = canvas?.getContext('2d');
    let gameRunning = false;
    let gameActive = false; // NEW: Separate flag for allowing actions
    let score = 0;
    let frames = 0;
    let pipes = [];
    let animationId = null;

    const gameState = {
        current: 'menu',
        highScore: localStorage.getItem('flappyHighScore') || 0
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
        
        update() {
            if (!gameRunning) return;
            
            this.velocity += this.gravity;
            this.velocity = Math.min(this.velocity, this.maxVelocity);
            this.y += this.velocity;
            
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
    const pipeSpacing = 120;

    function createPipe() {
        if (!canvas) return;
        const minHeight = 50;
        const maxHeight = (canvas.height * 0.65) - pipeGap;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        
        pipes.push({
            x: canvas.width + pipeSpacing,
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

    function updatePipes() {
        if (!gameRunning || !canvas) return;
        
        if (frames % 100 === 0) {
            createPipe();
        }
        
        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].x -= pipeSpeed;
            
            if (pipes[i].x + pipes[i].width < -50) {
                pipes.splice(i, 1);
                continue;
            }
            
            if (!pipes[i].scored && pipes[i].x + pipes[i].width < bird.x && pipes[i].x + pipes[i].width > bird.x - pipeSpeed - 5) {
                pipes[i].scored = true;
                score++;
                playSound('score');
                
                if (score >= 50) {
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
            const gameOverScreen = document.getElementById('gameOverScreen');
            if (gameOverScreen) gameOverScreen.style.display = 'flex';
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
            const winScreen = document.getElementById('winScreen');
            if (winScreen) winScreen.style.display = 'flex';
        }, 300);
    }

    function resetGameState() {
        bird.reset();
        pipes = [];
        score = 0;
        frames = 0;
        gameRunning = false;
        gameActive = false;
        gameState.current = 'menu';
        
        const startScreen = document.getElementById('startScreen');
        const gameOverScreen = document.getElementById('gameOverScreen');
        const winScreen = document.getElementById('winScreen');
        
        if (startScreen) startScreen.style.display = 'flex';
        if (gameOverScreen) gameOverScreen.style.display = 'none';
        if (winScreen) winScreen.style.display = 'none';
    }

    function beginGame() {
        resetGameState();
        gameRunning = true;
        gameActive = true;
        gameState.current = 'playing';
        
        const startScreen = document.getElementById('startScreen');
        if (startScreen) startScreen.style.display = 'none';
    }

    function resizeCanvas() {
        if (!canvas || !canvas.parentElement) return;
        const container = canvas.parentElement;
        canvas.width = Math.min(container.clientWidth, 500);
        canvas.height = container.clientHeight;
    }

    function gameLoop() {
        resizeCanvas();
        
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBackground();
            drawGround();
            
            if (gameRunning && gameActive) {
                bird.update();
                updatePipes();
                frames++;
            }
            
            drawPipes();
            bird.draw();
            drawScore();
        }
        
        animationId = requestAnimationFrame(gameLoop);
    }

    function playSound(type) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
        } catch (e) {}
    }

    if (hobbyCard) {
        hobbyCard.addEventListener('click', () => {
            if (gameModal) {
                gameModal.style.display = 'block';
                if (window.toggleCursorVisibility) {
                    window.toggleCursorVisibility(false);
                }
                resetGameState();
                setTimeout(() => {
                    resizeCanvas();
                    gameLoop();
                }, 50);
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            gameModal.style.display = 'none';
            gameRunning = false;
            gameActive = false;
            if (window.toggleCursorVisibility) {
                window.toggleCursorVisibility(true);
            }
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        });
    }

    if (startBtn) startBtn.addEventListener('click', beginGame);
    if (restartBtn) restartBtn.addEventListener('click', beginGame);

    const giftBox = document.getElementById('giftBox');
    if (giftBox) {
        giftBox.addEventListener('click', () => {
            giftBox.style.animation = 'openGift 0.8s ease forwards';
            setTimeout(() => {
                window.location.href = 'congratulations.html';
            }, 800);
        });
    }

    let spacePressed = false;
    document.addEventListener('keydown', (e) => {
        if (gameModal?.style.display !== 'block') return;
        
        if (e.code === 'Space') {
            e.preventDefault();
            if (!spacePressed) {
                spacePressed = true;
                if (gameState.current === 'menu' && gameActive === false) {
                    beginGame();
                } else if (gameState.current === 'playing' && gameActive === true) {
                    bird.flap();
                }
            }
        }
        
        if (e.code === 'Escape') {
            closeBtn?.click();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            spacePressed = false;
        }
    });

    if (canvas) {
        canvas.addEventListener('mousedown', (e) => {
            if (gameModal?.style.display !== 'block') return;
            e.preventDefault();
            if (gameState.current === 'menu' && gameActive === false) {
                beginGame();
            } else if (gameState.current === 'playing' && gameActive === true) {
                bird.flap();
            }
        });
        
        canvas.addEventListener('touchstart', (e) => {
            if (gameModal?.style.display !== 'block') return;
            e.preventDefault();
            if (gameState.current === 'menu' && gameActive === false) {
                beginGame();
            } else if (gameState.current === 'playing' && gameActive === true) {
                bird.flap();
            }
        });
    }

    window.addEventListener('resize', () => {
        if (gameModal?.style.display === 'block') {
            resizeCanvas();
        }
    });

    console.log('Enhanced Flappy Bird loaded!');
});
