/**
 * CYBER RUNNER 2099 - Core Game Engine
 * Pure Vanilla JavaScript & HTML5 Canvas with Synthesized Web Audio
 */

(function () {
  'use strict';

  // --- Canvas Setup ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  let width = 800;
  let height = 450;

  function resizeCanvas() {
    width = 800;
    height = 450;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // --- Web Audio Synthesizer (Zero External Dependencies) ---
  let audioCtx = null;
  let isMuted = false;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type, duration, vol = 0.15, endFreq = null) {
    if (isMuted || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), audioCtx.currentTime + duration);
      }
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio fallback
    }
  }

  function playSound(type) {
    if (isMuted) return;
    initAudio();
    if (type === 'jump') {
      playTone(280, 'sine', 0.12, 0.15, 620);
    } else if (type === 'doubleJump') {
      playTone(520, 'triangle', 0.15, 0.18, 980);
    } else if (type === 'slide') {
      playTone(220, 'sawtooth', 0.1, 0.08, 120);
    } else if (type === 'chit') {
      playTone(880, 'sine', 0.08, 0.12);
      setTimeout(() => playTone(1174, 'sine', 0.1, 0.15), 50); // D6
    } else if (type === 'powerup') {
      playTone(523, 'triangle', 0.08, 0.2);
      setTimeout(() => playTone(659, 'triangle', 0.08, 0.2), 70);
      setTimeout(() => playTone(784, 'triangle', 0.08, 0.2), 140);
      setTimeout(() => playTone(1046, 'triangle', 0.2, 0.25), 210);
    } else if (type === 'hit') {
      playTone(180, 'square', 0.15, 0.25, 60);
    } else if (type === 'crash') {
      playTone(140, 'sawtooth', 0.35, 0.35, 30);
      setTimeout(() => playTone(70, 'square', 0.45, 0.3, 20), 40);
    }
  }

  // --- Game State ---
  let isRunning = false;
  let isPaused = false;
  let distance = 0;
  let credits = 0;
  let score = 0;
  let highScore = parseInt(localStorage.getItem('cyber_runner_highscore') || '0', 10);
  let speed = 6.2;
  const baseSpeed = 6.2;

  // Powerups
  let hasShield = false;
  let magnetTimer = 0;
  let overdriveTimer = 0;
  let screenShake = 0;

  // DOM Elements
  const distVal = document.getElementById('distVal');
  const creditsVal = document.getElementById('creditsVal');
  const scoreVal = document.getElementById('scoreVal');
  const highVal = document.getElementById('highVal');

  const startOverlay = document.getElementById('startOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');
  const finalScoreEl = document.getElementById('finalScore');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const muteBtn = document.getElementById('muteBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  const touchJump = document.getElementById('touchJump');
  const touchSlide = document.getElementById('touchSlide');

  if (highVal) highVal.textContent = highScore;

  // Initialize Pause Button State (Disabled before game begins)
  if (pauseBtn) {
    pauseBtn.disabled = true;
    pauseBtn.style.opacity = '0.4';
    pauseBtn.style.pointerEvents = 'none';
  }

  // --- Parallax Cityscape Layers ---
  const skylineFar = [];
  const skylineMid = [];
  for (let x = 0; x < width + 200; x += 55) {
    skylineFar.push({ x, w: 45 + Math.random() * 30, h: 120 + Math.random() * 100 });
  }
  for (let x = 0; x < width + 200; x += 75) {
    skylineMid.push({ x, w: 60 + Math.random() * 40, h: 70 + Math.random() * 80 });
  }

  // Hovercars in background
  const hovercars = [
    { x: 100, y: 80, speed: 1.2, color: '#06b6d4' },
    { x: 450, y: 120, speed: 2.1, color: '#f43f5e' },
    { x: 700, y: 65, speed: 1.6, color: '#a855f7' },
  ];

  // --- Ground & Rooftops System ---
  const groundY = height - 70;
  let platforms = [
    { x: 0, w: width + 200, y: groundY }
  ];

  // --- Player Object ---
  const player = {
    x: 120,
    y: groundY - 44,
    w: 26,
    h: 44,
    standH: 44,
    slideH: 22,
    vy: 0,
    gravity: 0.72,
    jumpStrength: -13.5,
    isGrounded: true,
    isSliding: false,
    slideTimer: 0,
    jumpCount: 0,
    maxJumps: 2,
    runFrame: 0,
    trails: [],
  };

  // --- Obstacles & Collectibles ---
  let obstacles = [];
  let collectibles = [];
  let particles = [];
  let floatingTexts = [];
  let spawnTimer = 0;

  // --- Controls & Input Listeners ---
  function doJump() {
    if (!isRunning || isPaused) return;
    if (player.jumpCount < player.maxJumps) {
      if (player.isSliding) {
        player.isSliding = false;
        player.h = player.standH;
      }
      player.vy = player.jumpStrength;
      player.isGrounded = false;
      player.jumpCount++;

      if (player.jumpCount === 1) {
        playSound('jump');
        spawnDust(player.x + player.w / 2, player.y + player.h, '#06b6d4', 8);
      } else {
        playSound('doubleJump');
        spawnDust(player.x + player.w / 2, player.y + player.h, '#a855f7', 12);
        floatingTexts.push({ x: player.x, y: player.y - 10, text: 'DOUBLE JUMP!', color: '#a855f7', life: 35 });
      }
    }
  }

  function doSlide() {
    if (!isRunning || isPaused) return;
    if (player.isGrounded && !player.isSliding) {
      player.isSliding = true;
      player.h = player.slideH;
      player.y = groundY - player.slideH;
      player.slideTimer = 36; // frames
      playSound('slide');
      spawnDust(player.x, player.y + player.h, '#f43f5e', 8);
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      doJump();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      doSlide();
    } else if (e.code === 'KeyP') {
      togglePause();
    } else if (e.code === 'KeyR' && !isRunning) {
      startGame();
    }
  });

  // Mobile Touch Buttons
  touchJump?.addEventListener('pointerdown', (e) => { e.preventDefault(); doJump(); });
  touchSlide?.addEventListener('pointerdown', (e) => { e.preventDefault(); doSlide(); });

  // Canvas Swipe / Tap Fallback
  let touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    const diffY = e.changedTouches[0].clientY - touchStartY;
    if (diffY < -30) {
      doJump();
    } else if (diffY > 30) {
      doSlide();
    } else {
      doJump();
    }
  }, { passive: true });

  // --- Core Lifecycle ---
  function startGame() {
    initAudio();
    isRunning = true;
    isPaused = false;
    distance = 0;
    credits = 0;
    score = 0;
    speed = baseSpeed;
    hasShield = false;
    magnetTimer = 0;
    overdriveTimer = 0;
    screenShake = 0;
    spawnTimer = 0;

    player.y = groundY - player.standH;
    player.h = player.standH;
    player.vy = 0;
    player.isGrounded = true;
    player.isSliding = false;
    player.jumpCount = 0;
    player.trails = [];

    obstacles = [];
    collectibles = [];
    particles = [];
    floatingTexts = [];

    platforms = [{ x: 0, w: width + 200, y: groundY }];

    // Enable Pause Button during active run
    if (pauseBtn) {
      pauseBtn.disabled = false;
      pauseBtn.innerHTML = '⏸️ Pause';
      pauseBtn.style.opacity = '1';
      pauseBtn.style.pointerEvents = 'auto';
    }

    updateHUD();
    startOverlay?.classList.add('hidden');
    gameOverOverlay?.classList.add('hidden');
  }

  function gameOver() {
    isRunning = false;
    isPaused = false;
    playSound('crash');

    // Disable Pause Button on Game Over
    if (pauseBtn) {
      pauseBtn.disabled = true;
      pauseBtn.innerHTML = '⏸️ Pause';
      pauseBtn.style.opacity = '0.4';
      pauseBtn.style.pointerEvents = 'none';
    }

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('cyber_runner_highscore', highScore.toString());
      if (highVal) highVal.textContent = highScore;
    }
    if (finalScoreEl) finalScoreEl.textContent = score;
    gameOverOverlay?.classList.remove('hidden');
  }

  function togglePause() {
    if (!isRunning) return;
    isPaused = !isPaused;
    if (pauseBtn) {
      pauseBtn.innerHTML = isPaused ? '▶️ Resume' : '⏸️ Pause';
    }
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (muteBtn) {
      muteBtn.innerHTML = isMuted ? '🔇 Muted' : '🔊 Sound';
    }
  }

  function updateHUD() {
    if (distVal) distVal.textContent = `${Math.floor(distance)}m`;
    if (creditsVal) creditsVal.textContent = credits;
    if (scoreVal) scoreVal.textContent = score;
    if (highVal) highVal.textContent = highScore;
  }

  // --- Spawner Engine ---
  function spawnWorldObjects() {
    spawnTimer += speed;
    if (spawnTimer > 320) {
      spawnTimer = 0;
      const rand = Math.random();

      if (rand < 0.4) {
        // Ground Spikes (Must Jump)
        obstacles.push({
          type: 'spikes',
          x: width + 50,
          y: groundY - 24,
          w: 36,
          h: 24,
          color: '#f43f5e',
        });
      } else if (rand < 0.72) {
        // High Laser Beam (Must Slide)
        obstacles.push({
          type: 'laserBeam',
          x: width + 50,
          y: groundY - 48,
          w: 42,
          h: 22,
          color: '#06b6d4',
        });
      } else {
        // Floating Cyber Drone
        obstacles.push({
          type: 'drone',
          x: width + 50,
          y: groundY - 34,
          w: 28,
          h: 28,
          color: '#a855f7',
        });
      }

      // Spawn Data Chits or Power-Ups
      const chitY = (rand < 0.5) ? (groundY - 22) : (groundY - 60);
      const chitCount = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < chitCount; i++) {
        collectibles.push({
          type: 'chit',
          x: width + 70 + (i * 26),
          y: chitY,
          radius: 7,
          color: '#06b6d4',
          val: 10,
        });
      }

      // Occasional Powerup (18%)
      if (Math.random() < 0.18) {
        const pType = Math.random() < 0.4 ? 'shield' : Math.random() < 0.7 ? 'magnet' : 'overdrive';
        let pColor = '#a855f7';
        let pIcon = '🛡️';
        if (pType === 'magnet') { pColor = '#f59e0b'; pIcon = '🧲'; }
        if (pType === 'overdrive') { pColor = '#10b981'; pIcon = '⚡'; }

        collectibles.push({
          type: pType,
          x: width + 140,
          y: groundY - 55,
          radius: 14,
          color: pColor,
          icon: pIcon,
        });
      }
    }
  }

  function spawnDust(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 4 - speed * 0.3,
        vy: (Math.random() - 0.8) * 3,
        radius: Math.random() * 2.5 + 1,
        color: color,
        life: 1,
        decay: Math.random() * 0.04 + 0.02,
      });
    }
  }

  // --- Main Update Loop ---
  function update() {
    if (!isRunning || isPaused) return;

    if (screenShake > 0) screenShake--;

    // Speed Acceleration Over Time
    speed = baseSpeed + (distance / 500) * 1.5;
    if (overdriveTimer > 0) speed *= 1.4;

    distance += speed * 0.08;
    score = Math.floor(distance) + (credits * 15);
    updateHUD();

    // Powerup Timers
    if (magnetTimer > 0) magnetTimer--;
    if (overdriveTimer > 0) overdriveTimer--;

    // Move Cityscape Parallax Layers
    for (const b of skylineFar) {
      b.x -= speed * 0.15;
      if (b.x + b.w < 0) b.x = width + Math.random() * 40;
    }
    for (const b of skylineMid) {
      b.x -= speed * 0.35;
      if (b.x + b.w < 0) b.x = width + Math.random() * 50;
    }
    for (const car of hovercars) {
      car.x -= car.speed + speed * 0.2;
      if (car.x < -60) car.x = width + 60;
    }

    // Player Physics & Grounding
    if (!player.isGrounded) {
      player.vy += player.gravity;
      player.y += player.vy;
    }

    // Ground check
    if (player.y >= groundY - player.h) {
      player.y = groundY - player.h;
      player.vy = 0;
      player.isGrounded = true;
      player.jumpCount = 0;
    }

    // Slide state timer
    if (player.isSliding) {
      player.slideTimer--;
      if (player.slideTimer <= 0) {
        player.isSliding = false;
        player.h = player.standH;
        player.y = groundY - player.standH;
      }
    }

    // Running animation cycle
    player.runFrame = (player.runFrame + 0.25) % 8;

    // Runner Trail Ghost Particles
    if (Math.random() < 0.4) {
      player.trails.push({
        x: player.x,
        y: player.y,
        w: player.w,
        h: player.h,
        life: 0.5,
        color: overdriveTimer > 0 ? '#10b981' : '#06b6d4',
      });
    }
    for (let i = player.trails.length - 1; i >= 0; i--) {
      player.trails[i].life -= 0.05;
      player.trails[i].x -= speed * 0.4;
      if (player.trails[i].life <= 0) player.trails.splice(i, 1);
    }

    // Spawn New Obstacles & Collectibles
    spawnWorldObjects();

    // Update Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed;

      // Collision Detection with Player
      const overlapX = player.x + player.w > o.x && player.x < o.x + o.w;
      const overlapY = player.y + player.h > o.y && player.y < o.y + o.h;

      if (overlapX && overlapY) {
        if (overdriveTimer > 0) {
          // Blast right through obstacle during overdrive
          playSound('hit');
          spawnDust(o.x + o.w / 2, o.y + o.h / 2, '#10b981', 18);
          obstacles.splice(i, 1);
          score += 50;
          continue;
        }

        if (hasShield) {
          hasShield = false;
          playSound('hit');
          screenShake = 10;
          spawnDust(player.x, player.y, '#a855f7', 20);
          floatingTexts.push({ x: player.x, y: player.y - 20, text: 'SHIELD DEPLETED!', color: '#a855f7', life: 35 });
          obstacles.splice(i, 1);
          continue;
        }

        // Fatal collision
        gameOver();
        return;
      }

      if (o.x < -60) {
        obstacles.splice(i, 1);
      }
    }

    // Update Collectibles
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      c.x -= speed;

      // Magnet attraction
      if (magnetTimer > 0 && c.type === 'chit') {
        const dx = player.x - c.x;
        const dy = player.y - c.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 180) {
          c.x += (dx / dist) * 10;
          c.y += (dy / dist) * 10;
        }
      }

      // Collectible Collision Check
      const dist = Math.hypot((player.x + player.w / 2) - c.x, (player.y + player.h / 2) - c.y);
      if (dist < c.radius + player.w) {
        if (c.type === 'chit') {
          credits++;
          playSound('chit');
          spawnDust(c.x, c.y, '#06b6d4', 4);
        } else if (c.type === 'shield') {
          hasShield = true;
          playSound('powerup');
          floatingTexts.push({ x: player.x, y: player.y - 20, text: '🛡️ SHIELD ONLINE!', color: '#a855f7', life: 40 });
        } else if (c.type === 'magnet') {
          magnetTimer = 380; // ~6.5 seconds
          playSound('powerup');
          floatingTexts.push({ x: player.x, y: player.y - 20, text: '🧲 DATA MAGNET!', color: '#f59e0b', life: 40 });
        } else if (c.type === 'overdrive') {
          overdriveTimer = 240; // ~4 seconds
          playSound('powerup');
          screenShake = 8;
          floatingTexts.push({ x: player.x, y: player.y - 20, text: '⚡ OVERDRIVE!', color: '#10b981', life: 40 });
        }

        collectibles.splice(i, 1);
        continue;
      }

      if (c.x < -40) {
        collectibles.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update Floating Text Alerts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 0.6;
      ft.life--;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
  }

  // --- Render Pipeline ---
  function draw() {
    ctx.save();

    if (screenShake > 0) {
      const rx = (Math.random() - 0.5) * screenShake;
      const ry = (Math.random() - 0.5) * screenShake;
      ctx.translate(rx, ry);
    }

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#04060f');
    skyGrad.addColorStop(0.65, '#0a0f26');
    skyGrad.addColorStop(1, '#1e1138');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Neon Moon
    ctx.fillStyle = '#f43f5e';
    ctx.shadowBlur = 35;
    ctx.shadowColor = '#f43f5e';
    ctx.beginPath();
    ctx.arc(680, 75, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Distant Far Skyline
    ctx.fillStyle = '#0a1024';
    for (const b of skylineFar) {
      ctx.fillRect(b.x, groundY - b.h, b.w, b.h);
      // Window lights
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      for (let wy = groundY - b.h + 10; wy < groundY - 20; wy += 22) {
        ctx.fillRect(b.x + 8, wy, 6, 8);
        ctx.fillRect(b.x + b.w - 14, wy, 6, 8);
      }
      ctx.fillStyle = '#0a1024';
    }

    // Flying Hovercars
    for (const car of hovercars) {
      ctx.fillStyle = car.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = car.color;
      ctx.fillRect(car.x, car.y, 22, 6);
      ctx.shadowBlur = 0;
    }

    // Midground Skyline
    ctx.fillStyle = '#101735';
    for (const b of skylineMid) {
      ctx.fillRect(b.x, groundY - b.h, b.w, b.h);
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, groundY - b.h, b.w, b.h);
    }

    // Rooftop Foreground Ground
    ctx.fillStyle = '#0d1224';
    ctx.fillRect(0, groundY, width, height - groundY);

    // Glowing Rooftop Neon Edge Beam
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ground Grid Lines
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.lineWidth = 1;
    for (let gy = groundY + 16; gy < height; gy += 16) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    // Collectibles (Chits & Powerups)
    for (const c of collectibles) {
      ctx.save();
      ctx.translate(c.x, c.y);

      if (c.type === 'chit') {
        // Rotating Diamond Data Chit
        ctx.fillStyle = c.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = c.color;
        ctx.beginPath();
        ctx.moveTo(0, -c.radius);
        ctx.lineTo(c.radius, 0);
        ctx.lineTo(0, c.radius);
        ctx.lineTo(-c.radius, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        // Powerup Bubble
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = c.color;
        ctx.beginPath();
        ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.icon, 0, 0);
      }
      ctx.restore();
    }

    // Obstacles
    for (const o of obstacles) {
      ctx.save();
      ctx.translate(o.x, o.y);

      if (o.type === 'spikes') {
        // Neon Hazard Spikes
        ctx.fillStyle = o.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = o.color;
        ctx.beginPath();
        ctx.moveTo(0, o.h);
        ctx.lineTo(o.w / 4, 0);
        ctx.lineTo(o.w / 2, o.h);
        ctx.lineTo((o.w * 3) / 4, 0);
        ctx.lineTo(o.w, o.h);
        ctx.closePath();
        ctx.fill();
      } else if (o.type === 'laserBeam') {
        // Overhead High Laser Grid (Must Slide)
        ctx.fillStyle = '#06b6d4';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#06b6d4';
        ctx.fillRect(0, 4, o.w, 4);

        // Warning Pylon
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 6, o.h);
        ctx.fillRect(o.w - 6, 0, 6, o.h);
      } else if (o.type === 'drone') {
        // Hover Drone
        ctx.fillStyle = o.color;
        ctx.shadowBlur = 14;
        ctx.shadowColor = o.color;
        ctx.beginPath();
        ctx.arc(o.w / 2, o.h / 2, o.w / 2, 0, Math.PI * 2);
        ctx.fill();
        // Red sensor eye
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(o.w / 2 - 3, o.h / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Runner Ghost Trail
    for (const tr of player.trails) {
      ctx.fillStyle = tr.color;
      ctx.globalAlpha = tr.life * 0.45;
      ctx.fillRect(tr.x, tr.y, tr.w, tr.h);
    }
    ctx.globalAlpha = 1;

    // Player Cyber Runner
    if (isRunning) {
      ctx.save();
      ctx.translate(player.x, player.y);

      // Overdrive Glow
      if (overdriveTimer > 0) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#10b981';
      }

      if (player.isSliding) {
        // Sliding posture
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(0, 4, player.w * 1.5, player.h - 4);

        // Neon Visor
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(player.w * 1.5 - 6, 6, 6, 5);
      } else {
        // Running Body
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(4, 12, player.w - 8, player.h - 22);

        // Cyber Head & Helmet
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(6, 0, 16, 12);

        // Glowing Visor Beam
        ctx.fillStyle = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06b6d4';
        ctx.fillRect(16, 3, 7, 4);
        ctx.shadowBlur = 0;

        // Cyber Katana on Back
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(2, 6);
        ctx.lineTo(player.w - 2, 28);
        ctx.stroke();

        // Running Legs Animation
        ctx.fillStyle = '#38bdf8';
        const legOffset = Math.sin(player.runFrame * Math.PI) * 8;
        if (player.isGrounded) {
          ctx.fillRect(4, player.h - 10, 6, 10 + legOffset);
          ctx.fillRect(player.w - 10, player.h - 10, 6, 10 - legOffset);
        } else {
          // Jump tuck legs
          ctx.fillRect(4, player.h - 8, 6, 6);
          ctx.fillRect(player.w - 10, player.h - 6, 6, 6);
        }
      }

      // Shield Bubble Aura
      if (hasShield) {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#c084fc';
        ctx.beginPath();
        ctx.arc(player.w / 2, player.h / 2, player.h * 0.75, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Particles
    for (const pt of particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Floating Text Notifications
    for (const ft of floatingTexts) {
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur = 0;
    }

    // Visual Paused State Overlay
    if (isPaused) {
      ctx.fillStyle = 'rgba(4, 6, 13, 0.75)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#06b6d4';
      ctx.font = '900 32px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#06b6d4';
      ctx.fillText('⏸️ GAME PAUSED', width / 2, height / 2 - 8);

      ctx.font = '600 15px Outfit, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.shadowBlur = 0;
      ctx.fillText('Press P or click Resume to continue your run', width / 2, height / 2 + 28);
    }

    ctx.restore();
  }

  // --- Animation Frame Loop ---
  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // --- Event Bindings ---
  startBtn?.addEventListener('click', startGame);
  restartBtn?.addEventListener('click', startGame);
  pauseBtn?.addEventListener('click', togglePause);
  muteBtn?.addEventListener('click', toggleMute);

  fullscreenBtn?.addEventListener('click', () => {
    const container = document.querySelector('.canvas-container');
    if (!document.fullscreenElement) {
      container?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  requestAnimationFrame(loop);
})();
