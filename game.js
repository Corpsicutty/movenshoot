const config = {
    type: Phaser.AUTO,
    width: 1600,
    height: 900,
    backgroundColor: '#87ceeb', // Sky blue
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    scene: {
        preload,
        create,
        update
    }
};

let player1, player2, cursors, keyW, keyA, keyS, keyD;
let ground, walls, pillars, platforms;

const PLAYER_SPEED = 220;
const JUMP_VELOCITY = -420;
const WALL_JUMP_X = 1200; // Super strong horizontal boost
const WALL_JUMP_Y = -650; // Moderate vertical boost

const PLAYER_ACCEL = 60; // Faster acceleration
const PLAYER_FRICTION = 40; // Faster friction
const PLAYER_MAX_SPEED = 600; // Much faster normal max speed
const PLAYER_SUPER_MAX_SPEED = 1200; // Much faster after wall jump burst

const BHOP_WINDOW = 180; // Easier timing window
const BHOP_BOOST = 350; // Much more speed per perfect hop

const SLIDE_SPEED = 900;
const SLIDE_DURATION = 400; // ms

const SECRET_BOOST_X = 2000; // Super speed boost (added to current velocity)
const SECRET_BOOST_Y = -1200; // Huge vertical boost

const MOMENTUM_BOOST = 120; // Extra max speed per bhop streak

const DASH_VELOCITY = 900;
const DASH_WINDOW = 250; // ms
const DASH_COOLDOWN = 400; // ms

const AIR_DASH_VELOCITY = 900;
const AIR_DASH_WINDOW = 250; // ms
const AIR_DASH_COOLDOWN = 1500; // ms

let p1Sticking = false;
let p2Sticking = false;

let p1LastLandTime = 0;
let p2LastLandTime = 0;

let p1JumpQueued = false;
let p2JumpQueued = false;

let p1Sliding = false;
let p2Sliding = false;
let p1SlideTimer = 0;
let p2SlideTimer = 0;

let keyShiftL, keyShiftR;
let keyQ, keySlash, keyPeriod;

let p1SecretQueued = 0;
let p2SecretQueued = 0;

let p1WallJumped = false;
let p2WallJumped = false;

let guns, bullets;
let p1HasGun = false, p2HasGun = false;
let keyE;

let p1GunSprite = null;
let p2GunSprite = null;

let p1LastShoot = 0;
let p2LastShoot = 0;

let p1BhopStreak = 0;
let p2BhopStreak = 0;

let p1LastWallTime = 0;
let p2LastWallTime = 0;
const WALL_COYOTE_TIME = 100;

let p1Health = 200, p2Health = 200;
let p1Score = 0, p2Score = 0;
let p1HealthBar, p2HealthBar, p1ScoreText, p2ScoreText;

let p1LastDir = 1;
let p2LastDir = -1;

let bulletsToDestroy = [];

let playerGroup;
let p1DamageCooldown = 0;
let p2DamageCooldown = 0;

let gameState = 'start';
let startTitle, startControls, startButton;

let startBgRect, startP1Controls, startP2Controls, startP1Title, startP2Title;

let respawnCooldown = 0;
let respawnTimer = 0;

let winnerTimeout = null;

let gameMode = null;

let p1LastLeftTap = 0, p1LastRightTap = 0, p1DashCooldown = 0;
let p2LastLeftTap = 0, p2LastRightTap = 0, p2DashCooldown = 0;

let p1DashBar, p2DashBar;

let bloodEmitter;
let dashEmitter;
let gutsEmitter;

let aiState = 'idle';
let aiStateTimer = 0;
let aiPatrolDir = 1;
let aiPrevState = 'idle';

const game = new Phaser.Game(config);

function preload() {}

function create() {
    // Draw ground texture
    const groundGfx = this.add.graphics();
    groundGfx.fillStyle(0x888888, 1);
    groundGfx.fillRect(0, 0, 1600, 40);
    groundGfx.generateTexture('ground', 1600, 40);
    // Draw wall texture
    const wallGfx = this.add.graphics();
    wallGfx.fillStyle(0x4444aa, 1);
    wallGfx.fillRect(0, 0, 20, 820);
    wallGfx.generateTexture('wall', 20, 820);
    // Draw ceiling texture
    const ceilGfx = this.add.graphics();
    ceilGfx.fillStyle(0x888888, 1);
    ceilGfx.fillRect(0, 0, 1600, 20);
    ceilGfx.generateTexture('ceiling', 1600, 20);
    // Draw pillar texture (will use random height)
    const pillarGfx = this.add.graphics();
    pillarGfx.fillStyle(0x222222, 1);
    pillarGfx.fillRect(0, 0, 40, 300);
    pillarGfx.generateTexture('pillar', 40, 300);
    // Draw platform texture (will use random width)
    const platGfxDefault = this.add.graphics();
    platGfxDefault.fillStyle(0xaaaaaa, 1);
    platGfxDefault.fillRect(0, 0, 300, 20);
    platGfxDefault.generateTexture('platform', 300, 20);
    platGfxDefault.destroy();

    // Arena ground
    ground = this.physics.add.staticGroup();
    ground.create(800, 880, 'ground');

    // Arena walls and ceiling
    walls = this.physics.add.staticGroup();
    // Left wall
    walls.create(10, 450, 'wall');
    // Right wall
    walls.create(1590, 450, 'wall');
    // Ceiling
    walls.create(800, 10, 'ceiling');

    // --- RANDOM PILLARS ---
    pillars = this.physics.add.staticGroup();
    // Pillar 1 (left)
    let pillar1Height = 140;
    let pillar1Width = 24;
    let pillar1X = 350;
    let pillar1Y = 900 - 40 - (pillar1Height / 2);
    let pillar1Key = 'pillar1';
    let pillar1Gfx = this.add.graphics();
    pillar1Gfx.fillStyle(0x222222, 1);
    pillar1Gfx.fillRect(0, 0, pillar1Width, pillar1Height);
    pillar1Gfx.generateTexture(pillar1Key, pillar1Width, pillar1Height);
    pillar1Gfx.destroy();
    pillars.create(pillar1X, pillar1Y, pillar1Key);
    // Pillar 2 (right)
    let pillar2Height = 180;
    let pillar2Width = 24;
    let pillar2X = 1250;
    let pillar2Y = 900 - 40 - (pillar2Height / 2);
    let pillar2Key = 'pillar2';
    let pillar2Gfx = this.add.graphics();
    pillar2Gfx.fillStyle(0x222222, 1);
    pillar2Gfx.fillRect(0, 0, pillar2Width, pillar2Height);
    pillar2Gfx.generateTexture(pillar2Key, pillar2Width, pillar2Height);
    pillar2Gfx.destroy();
    pillars.create(pillar2X, pillar2Y, pillar2Key);

    // --- RANDOM PLATFORMS ---
    platforms = this.physics.add.staticGroup();
    let platformData = [];
    // One long platform in the middle
    let platWidth = 1200;
    let platX = 800;
    let platY = 500;
    let platKey = 'platform_main';
    let platGfx = this.add.graphics();
    platGfx.fillStyle(0xaaaaaa, 1);
    platGfx.fillRect(0, 0, platWidth, 20);
    platGfx.generateTexture(platKey, platWidth, 20);
    platGfx.destroy();
    platforms.create(platX, platY, platKey);
    platformData.push({x: platX, y: platY, width: platWidth});

    // --- GUNS ON PLATFORMS FAR APART ---
    guns = this.physics.add.staticGroup();
    if (gameMode === 'pvp' && platformData.length >= 2) {
        // PvP: spawn guns on platforms as before
        let bestPair = null;
        let maxDist = 0;
        for (let i = 0; i < platformData.length; i++) {
            for (let j = i + 1; j < platformData.length; j++) {
                let dist = Math.abs(platformData[i].x - platformData[j].x);
                if (dist > maxDist) {
                    maxDist = dist;
                    bestPair = [platformData[i], platformData[j]];
                }
            }
        }
        let gunPlatforms = bestPair;
        for (let i = 0; i < 2; i++) {
            let plat = gunPlatforms[i];
            let gunKey = 'gun' + i;
            // Draw a sniper rifle sprite
            let gunGfx = this.add.graphics();
            // Body (long and slim)
            gunGfx.fillStyle(0x222222, 1);
            gunGfx.fillRect(6, 12, 44, 6); // main body
            // Barrel (long, thin)
            gunGfx.fillStyle(0xcccccc, 1);
            gunGfx.fillRect(50, 14, 18, 2); // barrel
            // Stock
            gunGfx.fillStyle(0x8B4513, 1);
            gunGfx.fillRect(0, 10, 10, 10); // stock
            // Scope
            gunGfx.fillStyle(0x444444, 1);
            gunGfx.fillEllipse(28, 10, 14, 8); // scope body
            gunGfx.lineStyle(2, 0x222222, 1);
            gunGfx.strokeEllipse(28, 10, 14, 8);
            gunGfx.fillStyle(0xaaaaaa, 1);
            gunGfx.fillCircle(28, 10, 3); // scope lens
            gunGfx.generateTexture(gunKey, 70, 24);
            gunGfx.destroy();
            guns.create(plat.x, plat.y - 20, gunKey);
        }
    }

    // --- BULLETS ---
    bullets = this.physics.add.group();

    // --- Stick Figure Animations ---
    function makeStickTexture(scene, key, pose, color) {
        const gfx = scene.add.graphics();
        gfx.clear();
        drawStickFigure(gfx, pose, color);
        gfx.generateTexture(key, 40, 60);
        gfx.destroy();
    }
    // PvP: default colors, PvE: green for P1, purple for P2
    let p1Color = (gameMode === 'pve') ? 0x00cc44 : 0x222222;
    let p2Color = (gameMode === 'pve') ? 0x9900cc : 0x222222;
    // Player 1 textures
    makeStickTexture(this, 'stickIdleP1', 'idle', p1Color);
    makeStickTexture(this, 'stickRun1P1', 'run1', p1Color);
    makeStickTexture(this, 'stickRun2P1', 'run2', p1Color);
    makeStickTexture(this, 'stickJumpP1', 'jump', p1Color);
    makeStickTexture(this, 'stickFallP1', 'fall', p1Color);
    makeStickTexture(this, 'stickWallLeftP1', 'wallLeft', p1Color);
    makeStickTexture(this, 'stickWallRightP1', 'wallRight', p1Color);
    makeStickTexture(this, 'stickSlideP1', 'slide', p1Color);
    makeStickTexture(this, 'stickGunRightP1', 'gunRight', p1Color);
    makeStickTexture(this, 'stickGunLeftP1', 'gunLeft', p1Color);
    // Player 2 textures
    makeStickTexture(this, 'stickIdleP2', 'idle', p2Color);
    makeStickTexture(this, 'stickRun1P2', 'run1', p2Color);
    makeStickTexture(this, 'stickRun2P2', 'run2', p2Color);
    makeStickTexture(this, 'stickJumpP2', 'jump', p2Color);
    makeStickTexture(this, 'stickFallP2', 'fall', p2Color);
    makeStickTexture(this, 'stickWallLeftP2', 'wallLeft', p2Color);
    makeStickTexture(this, 'stickWallRightP2', 'wallRight', p2Color);
    makeStickTexture(this, 'stickSlideP2', 'slide', p2Color);
    makeStickTexture(this, 'stickGunRightP2', 'gunRight', p2Color);
    makeStickTexture(this, 'stickGunLeftP2', 'gunLeft', p2Color);
    // --- Gun Sprites ---
    function makeGunTexture(scene, key, color) {
        const gunGfx = scene.add.graphics();
        gunGfx.fillStyle(color, 1);
        gunGfx.fillRect(6, 12, 44, 6); // main body
        gunGfx.fillStyle(0xcccccc, 1);
        gunGfx.fillRect(50, 14, 18, 2); // barrel
        gunGfx.fillStyle(0x8B4513, 1);
        gunGfx.fillRect(0, 10, 10, 10); // stock
        gunGfx.fillStyle(0x444444, 1);
        gunGfx.fillEllipse(28, 10, 14, 8); // scope body
        gunGfx.lineStyle(2, 0x222222, 1);
        gunGfx.strokeEllipse(28, 10, 14, 8);
        gunGfx.fillStyle(0xaaaaaa, 1);
        gunGfx.fillCircle(28, 10, 3); // scope lens
        gunGfx.generateTexture(key, 70, 24);
        gunGfx.destroy();
    }
    let p1GunColor = (gameMode === 'pve') ? 0x00cc44 : 0x222222;
    let p2GunColor = (gameMode === 'pve') ? 0x9900cc : 0x222222;
    makeGunTexture(this, 'gun0', p1GunColor);
    makeGunTexture(this, 'gun1', p2GunColor);
    // --- Shotgun Sprite ---
    if (!this.textures.exists('shotgun')) {
        const gfx = this.add.graphics();
        // Main body
        gfx.fillStyle(0x222222, 1);
        gfx.fillRect(8, 14, 36, 8); // main body
        // Barrel (short, wide)
        gfx.fillStyle(0xcccccc, 1);
        gfx.fillRect(44, 16, 18, 4); // barrel
        // Stock
        gfx.fillStyle(0x8B4513, 1);
        gfx.fillRect(0, 12, 10, 12); // stock
        // Pump
        gfx.fillStyle(0x444444, 1);
        gfx.fillRect(28, 20, 10, 4);
        // Details
        gfx.fillStyle(0xaaaaaa, 1);
        gfx.fillRect(18, 16, 6, 2);
        gfx.generateTexture('shotgun', 64, 32);
        gfx.destroy();
    }
    // Player 1 (left side)
    player1 = this.physics.add.sprite(300, 800, 'stickIdleP1')
        .setDisplaySize(40, 60)
        .setCollideWorldBounds(true);
    player1.body.setSize(24, 60);
    // Player 2 (right side)
    player2 = this.physics.add.sprite(1300, 800, 'stickIdleP2')
        .setDisplaySize(40, 60)
        .setCollideWorldBounds(true);
    player2.body.setSize(24, 60);

    // --- Player group for robust collision ---
    playerGroup = this.add.group();
    playerGroup.add(player1);
    playerGroup.add(player2);

    // Collisions
    this.physics.add.collider(player1, ground);
    this.physics.add.collider(player1, walls);
    this.physics.add.collider(player1, pillars);
    this.physics.add.collider(player1, platforms);
    this.physics.add.collider(player2, ground);
    this.physics.add.collider(player2, walls);
    this.physics.add.collider(player2, pillars);
    this.physics.add.collider(player2, platforms);

    // Input
    cursors = this.input.keyboard.createCursorKeys(); // For player 2
    keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    keyShiftL = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    keyShiftR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT, true);
    keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    keySlash = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SLASH);
    keyPeriod = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD);
    keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // --- Bullet collision with walls/platforms/pillars/ground (ricochet) ---
    this.physics.add.collider(bullets, walls, function(bullet, wall) {
        bullet.ricochetCount = (bullet.ricochetCount || 0) + 1;
        if (bullet.ricochetCount > 2) bullet.destroy();
    });
    this.physics.add.collider(bullets, platforms, function(bullet, platform) {
        bullet.ricochetCount = (bullet.ricochetCount || 0) + 1;
        if (bullet.ricochetCount > 2) bullet.destroy();
    });
    this.physics.add.collider(bullets, pillars, function(bullet, pillar) {
        bullet.ricochetCount = (bullet.ricochetCount || 0) + 1;
        if (bullet.ricochetCount > 2) bullet.destroy();
    });
    this.physics.add.collider(bullets, ground, function(bullet, ground) {
        bullet.ricochetCount = (bullet.ricochetCount || 0) + 1;
        if (bullet.ricochetCount > 2) bullet.destroy();
    });

    // --- Bullet collision with players ---
    this.physics.add.overlap(bullets, player1, (bullet, player) => {
        if (gameState !== 'play') return;
        if (bullet.active && player.active && !bullet.hasHitPlayer && p1DamageCooldown <= 0 && bullet.owner !== 1) {
            bullet.hasHitPlayer = true;
            if (bullet && bullet.active) bullet.destroy();
            // --- Blood effect ---
            bloodEmitter.emitParticleAt(player1.x, player1.y, 18);
            // --- Guts effect ---
            gutsEmitter.emitParticleAt(player1.x, player1.y, 32);
            player1.setVisible(false);
            if (p1GunSprite) p1GunSprite.setVisible(false);
            p1Health = 0;
            p1DamageCooldown = 200;
            gameState = 'gameover';
            showWinner('Player 2 wins!');
        }
    });
    this.physics.add.overlap(bullets, player2, (bullet, player) => {
        if (gameState !== 'play') return;
        if (bullet.active && player.active && !bullet.hasHitPlayer && p2DamageCooldown <= 0 && bullet.owner !== 2) {
            bullet.hasHitPlayer = true;
            if (bullet && bullet.active) bullet.destroy();
            // --- Blood effect ---
            bloodEmitter.emitParticleAt(player2.x, player2.y, 18);
            // --- Guts effect ---
            gutsEmitter.emitParticleAt(player2.x, player2.y, 32);
            player2.setVisible(false);
            if (p2GunSprite) p2GunSprite.setVisible(false);
            p2Health = 0;
            p2DamageCooldown = 200;
            gameState = 'gameover';
            showWinner('Player 1 wins!');
        }
    });

    // --- Health bars and score ---
    p1HealthBar = this.add.graphics();
    p2HealthBar = this.add.graphics();
    p1HealthBar.setDepth(100);
    p2HealthBar.setDepth(100);
    p1ScoreText = this.add.text(40, 40, 'P1: 0', { fontSize: '32px', fill: '#ff2222', fontFamily: 'monospace' }).setDepth(100);
    p2ScoreText = this.add.text(1400, 40, 'P2: 0', { fontSize: '32px', fill: '#2222ff', fontFamily: 'monospace' }).setDepth(100);

    // Add HTML menu logic:
    const pvpBtn = document.getElementById('pvp-btn');
    const pveBtn = document.getElementById('pve-btn');
    const startBtn = document.getElementById('start-btn');

    function updateModeButtons() {
        pvpBtn.style.background = gameMode === 'pvp' ? '#222' : '';
        pvpBtn.style.color = gameMode === 'pvp' ? '#fff' : '';
        pveBtn.style.background = gameMode === 'pve' ? '#222' : '';
        pveBtn.style.color = gameMode === 'pve' ? '#fff' : '';
    }

    pvpBtn.onclick = () => {
        gameMode = 'pvp';
        updateModeButtons();
    };
    pveBtn.onclick = () => {
        gameMode = 'pve';
        updateModeButtons();
    };

    startBtn.onclick = () => {
        if (!gameMode) {
            alert('Please select PvP or PvE mode!');
            return;
        }
        document.getElementById('start-menu').style.display = 'none';
        gameState = 'play';
        forceRespawn();
    };
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.getElementById('start-menu').style.display !== 'none') {
            if (!gameMode) {
                alert('Please select PvP or PvE mode!');
                return;
            }
            document.getElementById('start-menu').style.display = 'none';
            gameState = 'play';
            forceRespawn();
        }
    });

    // --- Dash cooldown bars ---
    p1DashBar = this.add.graphics();
    p2DashBar = this.add.graphics();
    p1DashBar.setDepth(101);
    p2DashBar.setDepth(101);

    // --- Blood particle emitter ---
    bloodEmitter = this.add.particles(0, 0, 'blood', {
        speed: { min: 180, max: 420 },
        angle: { min: 200, max: 340 },
        gravityY: 1200,
        lifespan: 600,
        quantity: 0,
        scale: { start: 0.5, end: 0.1 },
        alpha: { start: 1, end: 0 },
        tint: 0xff0000
    });
    // If no 'blood' texture, create a small red circle
    if (!this.textures.exists('blood')) {
        const gfx = this.add.graphics();
        gfx.fillStyle(0xff0000, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('blood', 8, 8);
        gfx.destroy();
    }

    // --- Dash particle emitter ---
    dashEmitter = this.add.particles(0, 0, 'dash', {
        speed: { min: 320, max: 600 },
        angle: { min: 0, max: 360 },
        gravityY: 0,
        lifespan: 320,
        quantity: 0,
        scale: { start: 0.5, end: 0.1 },
        alpha: { start: 1, end: 0 },
        tint: 0xff0000
    });
    // If no 'dash' texture, create a small red circle
    if (!this.textures.exists('dash')) {
        const gfx = this.add.graphics();
        gfx.fillStyle(0xff0000, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('dash', 8, 8);
        gfx.destroy();
    }

    // --- Guts particle emitter ---
    gutsEmitter = this.add.particles(0, 0, 'guts', {
        speed: { min: 220, max: 400 },
        angle: { min: 0, max: 360 },
        gravityY: 1800,
        lifespan: 2200,
        quantity: 0,
        scale: { start: 0.7, end: 0.3 },
        rotate: { min: 0, max: 360 },
        alpha: { start: 1, end: 1 },
        tint: 0xff0000
    });
    // If no 'guts' texture, create a small, solid, pure red blob
    if (!this.textures.exists('guts')) {
        const gfx = this.add.graphics();
        gfx.fillStyle(0xff0000, 1);
        gfx.beginPath();
        gfx.arc(8, 8, 7, 0, Math.PI * 2 * 0.7);
        gfx.arc(12, 7, 4, 0, Math.PI * 2);
        gfx.arc(5, 12, 3, 0, Math.PI * 2);
        gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('guts', 16, 16);
        gfx.destroy();
    }
    // --- Gutsplat texture ---
    if (!this.textures.exists('gutsplat')) {
        const gfx = this.add.graphics();
        gfx.fillStyle(0xff0000, 1);
        gfx.beginPath();
        gfx.arc(8, 8, 7, 0, Math.PI * 2 * 0.7);
        gfx.arc(12, 7, 4, 0, Math.PI * 2);
        gfx.arc(5, 12, 3, 0, Math.PI * 2);
        gfx.closePath();
        gfx.fillPath();
        gfx.generateTexture('gutsplat', 16, 16);
        gfx.destroy();
    }
    // --- Guts particles leave persistent splats ---
    gutsEmitter.onParticleDeath((particle) => {
        // Place a static gutsplat at the final position
        let splat = this.add.image(particle.x, particle.y, 'gutsplat');
        splat.setScale(Phaser.Math.FloatBetween(0.7, 1.1));
        splat.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
        splat.setDepth(2);
        splat.setAlpha(1);
        splat.setTint(0xff0000); // Force pure red
    });

    // --- SMG Sprite (remade, more detailed and compact) ---
    if (!this.textures.exists('smg')) {
        const gfx = this.add.graphics();
        // Main body
        gfx.fillStyle(0x222222, 1);
        gfx.fillRect(10, 14, 22, 6); // main body
        // Barrel
        gfx.fillStyle(0x888888, 1);
        gfx.fillRect(32, 16, 14, 2); // barrel
        // Magazine
        gfx.fillStyle(0x660000, 1);
        gfx.fillRect(18, 20, 5, 10);
        // Stock
        gfx.fillStyle(0x444444, 1);
        gfx.fillRect(0, 15, 8, 4);
        // Grip
        gfx.fillStyle(0x333333, 1);
        gfx.fillRect(24, 20, 3, 7);
        // Details
        gfx.fillStyle(0x111111, 1);
        gfx.fillRect(14, 15, 3, 2);
        gfx.fillRect(26, 15, 3, 2);
        gfx.generateTexture('smg', 48, 32);
        gfx.destroy();
    }

    // After the start menu logic in create(), add:
    const secretCodeInput = document.getElementById('secret-code');
    if (secretCodeInput) {
        secretCodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const code = secretCodeInput.value.trim().toLowerCase();
                if (code === 'guy' || code === '9/11') {
                    document.getElementById('start-menu').style.display = 'none';
                    gameState = 'secret';
                    startSecretLevel(this);
                } else if (code === '11300803' && (gameMode === 'pve' || gameMode === 'pvp')) {
                    window.devSuperP1 = true;
                    // Show dev mode message
                    let devMsg = document.createElement('div');
                    devMsg.innerText = 'DEV MODE: Player 1 is supercharged!';
                    devMsg.style.position = 'absolute';
                    devMsg.style.top = '20%';
                    devMsg.style.left = '50%';
                    devMsg.style.transform = 'translate(-50%, -50%)';
                    devMsg.style.fontSize = '3em';
                    devMsg.style.color = '#fff';
                    devMsg.style.background = 'rgba(255,0,0,0.8)';
                    devMsg.style.padding = '0.5em 2em';
                    devMsg.style.borderRadius = '24px';
                    devMsg.style.zIndex = 2000;
                    devMsg.style.textAlign = 'center';
                    devMsg.style.fontFamily = 'monospace';
                    document.body.appendChild(devMsg);
                    setTimeout(() => { devMsg.remove(); }, 2000);
                }
            }
        });
    }
}

function forceRespawn() {
    console.log('forceRespawn: START');
    p1Health = 200;
    p2Health = 200;
    // Defensive recreation if player1 is missing
    if (!player1) {
        console.error('player1 was undefined! Recreating.');
        player1 = game.scene.scenes[0].physics.add.sprite(300, 800, 'stickIdleP1')
            .setDisplaySize(40, 60)
            .setCollideWorldBounds(true);
        player1.body.setSize(24, 60);
    }
    // Defensive recreation if player2 is missing
    if (!player2) {
        console.error('player2 was undefined! Recreating.');
        player2 = game.scene.scenes[0].physics.add.sprite(1300, 800, 'stickIdleP2')
            .setDisplaySize(40, 60)
            .setCollideWorldBounds(true);
        player2.body.setSize(24, 60);
    }
    if (player1) {
        player1.x = 300; player1.y = 800;
        player1.setVelocity(0, 0);
        player1.active = true; player1.visible = true; player1.body.enable = true;
    }
    if (player2) {
        player2.x = 1300; player2.y = 800;
        player2.setVelocity(0, 0);
        player2.active = true; player2.visible = true; player2.body.enable = true;
    }
    p1DamageCooldown = 0; p2DamageCooldown = 0;
    respawnCooldown = 200;
    if (bullets) {
        bullets.children.iterate(function(bullet) {
            if (bullet && bullet.active) bullet.destroy();
        });
    }
    // Both PvE and PvP: spawn with random guns in hand
    p1HasGun = true;
    p2HasGun = true;
    const gunTypes = ['sniper', 'smg', 'shotgun'];
    p1GunType = gunTypes[Math.floor(Math.random() * gunTypes.length)];
    p2GunType = gunTypes[Math.floor(Math.random() * gunTypes.length)];
    if (p1GunSprite) p1GunSprite.destroy();
    if (p2GunSprite) p2GunSprite.destroy();
    let p1SpriteKey = (p1GunType === 'sniper') ? 'gun0' : (p1GunType === 'smg' ? 'smg' : 'shotgun');
    let p2SpriteKey = (p2GunType === 'sniper') ? 'gun1' : (p2GunType === 'smg' ? 'smg' : 'shotgun');
    p1GunSprite = game.scene.scenes[0].add.sprite(player1.x, player1.y, p1SpriteKey);
    p1GunSprite.setOrigin(0.2, 0.7);
    p1GunSprite.setDepth(10);
    p2GunSprite = game.scene.scenes[0].add.sprite(player2.x, player2.y, p2SpriteKey);
    p2GunSprite.setOrigin(0.2, 0.7);
    p2GunSprite.setDepth(10);
    console.log('forceRespawn: END');
}

// Animation state
let runAnimTimer = 0;
let runAnimFrame = 0;

// Helper for line of sight (simple: no pillar between AI and player1)
function aiHasLineOfSight(ai, target, pillars) {
    let ax = ai.x, ay = ai.y, bx = target.x, by = target.y;
    for (let pillar of pillars.getChildren()) {
        let px = pillar.x, py = pillar.y, pw = pillar.displayWidth, ph = pillar.displayHeight;
        // Simple AABB check for intersection
        let minX = Math.min(ax, bx), maxX = Math.max(ax, bx);
        let minY = Math.min(ay, by), maxY = Math.max(ay, by);
        if (
            px - pw/2 < maxX && px + pw/2 > minX &&
            py - ph/2 < maxY && py + ph/2 > minY
        ) {
            // Pillar is between
            return false;
        }
    }
    return true;
}

// Helper: blink teleport, checks for wall collisions
function blinkPlayer(player, direction, scene) {
    const BLINK_DIST = 600; // 15 spaces * 40px
    let startX = player.x;
    let startY = player.y;
    let targetX = player.x + direction * BLINK_DIST;
    // Clamp to arena bounds
    targetX = Math.max(32, Math.min(1568, targetX));
    // Check for wall collision (static walls group)
    let blocked = false;
    let testRect = new Phaser.Geom.Rectangle(targetX - 12, player.y - 30, 24, 60);
    scene.physics.world.staticBodies.iterate(body => {
        if (!body.gameObject) return;
        if (Phaser.Geom.Intersects.RectangleToRectangle(testRect, body.gameObject.getBounds())) {
            blocked = true;
        }
    });
    if (!blocked) {
        player.x = targetX;
    } else {
        // Try to move as far as possible without entering wall
        let step = direction * 20;
        let lastSafeX = player.x;
        for (let x = player.x + step; Math.abs(x - player.x) <= BLINK_DIST; x += step) {
            let rect = new Phaser.Geom.Rectangle(x - 12, player.y - 30, 24, 60);
            let hit = false;
            scene.physics.world.staticBodies.iterate(body => {
                if (!body.gameObject) return;
                if (Phaser.Geom.Intersects.RectangleToRectangle(rect, body.gameObject.getBounds())) {
                    hit = true;
                }
            });
            if (hit) break;
            lastSafeX = x;
        }
        player.x = lastSafeX;
    }
    // --- Dash effect ---
    if (typeof dashEmitter !== 'undefined') {
        dashEmitter.emitParticleAt(startX, startY, 18);
    }
}

function update(time, delta) {
    if (gameState === 'gameover') return;
    if (gameState === 'respawning') {
        if (respawnTimer > 0) {
            respawnTimer -= delta;
            if (respawnTimer <= 0) {
                forceRespawn();
                gameState = 'play';
            }
        }
        return;
    }
    if (gameState !== 'play') return;
    if (respawnCooldown > 0) respawnCooldown -= delta;

    // --- DEV SUPER POWERS OVERRIDE FOR PLAYER 1 ---
    let p1_SPEED = PLAYER_SPEED;
    let p1_JUMP_VELOCITY = JUMP_VELOCITY;
    let p1_ACCEL = PLAYER_ACCEL;
    let p1_MAX_SPEED = PLAYER_MAX_SPEED;
    let p1_SUPER_MAX_SPEED = PLAYER_SUPER_MAX_SPEED;
    let p1_BHOP_BOOST = BHOP_BOOST;
    let p1_MOMENTUM_BOOST = MOMENTUM_BOOST;
    let p1_WALL_JUMP_X = WALL_JUMP_X;
    let p1_WALL_JUMP_Y = WALL_JUMP_Y;
    if (window.devSuperP1) {
        p1_SPEED = 12000;
        p1_JUMP_VELOCITY = -18000;
        p1_ACCEL = 6000;
        p1_MAX_SPEED = 40000;
        p1_SUPER_MAX_SPEED = 80000;
        p1_BHOP_BOOST = 20000;
        p1_MOMENTUM_BOOST = 10000;
        p1_WALL_JUMP_X = 40000;
        p1_WALL_JUMP_Y = -18000;
    }

    // --- PLAYER 1 (WASD) ---
    let p1OnGround = player1.body.touching.down;
    let p1TouchingLeft = player1.body.touching.left;
    let p1TouchingRight = player1.body.touching.right;
    let p1OnWall = (p1TouchingLeft || p1TouchingRight) && !p1OnGround;
    let p1vx = player1.body.velocity.x;
    let p1vy = player1.body.velocity.y;

    // Track last wall touch for coyote time
    if ((p1TouchingLeft || p1TouchingRight) && !p1OnGround) {
        p1LastWallTime = time;
    }
    let p1CanWallJump = (p1TouchingLeft || p1TouchingRight) && !p1OnGround;
    if (!p1CanWallJump && !p1OnGround && (time - p1LastWallTime < WALL_COYOTE_TIME)) {
        p1CanWallJump = true;
    }

    // --- PLAYER 1 WALL JUMP (priority) ---
    if (p1CanWallJump && Phaser.Input.Keyboard.JustDown(keyW)) {
        player1.bhopping = false;
        p1BhopStreak = 0;
        if (p1TouchingLeft || (!p1TouchingRight && player1.body.velocity.x <= 0)) {
            player1.setVelocityY(p1_WALL_JUMP_Y);
            player1.setVelocityX(p1_WALL_JUMP_X);
        } else if (p1TouchingRight || (!p1TouchingLeft && player1.body.velocity.x > 0)) {
            player1.setVelocityY(p1_WALL_JUMP_Y);
            player1.setVelocityX(-p1_WALL_JUMP_X);
        }
        p1WallJumped = true;
    } else if (p1OnGround && Phaser.Input.Keyboard.JustDown(keyW)) {
        // --- PLAYER 1 SECRET BOOST (priority after wall jump) ---
        if (p1SecretQueued && (time - p1SecretQueued <= BHOP_WINDOW)) {
            let moveDir = 0;
            if (keyA.isDown) moveDir = -1;
            else if (keyD.isDown) moveDir = 1;
            let vxBoost = moveDir !== 0 ? SECRET_BOOST_X : 0;
            player1.setVelocityY(SECRET_BOOST_Y);
            player1.setVelocityX(player1.body.velocity.x + vxBoost);
            p1SecretQueued = 0;
            p1BhopStreak = 0;
        } else {
            // Normal jump (with b-hop check)
            if (!p1JumpQueued && (time - p1LastLandTime <= BHOP_WINDOW)) {
                p1BhopStreak = (p1BhopStreak || 0) + 1;
                let dir = Math.sign(p1vx) || p1LastDir;
                let boost = dir * p1_BHOP_BOOST * p1BhopStreak;
                let newVx = p1vx + boost;
                player1.setVelocityX(newVx);
                player1.bhopping = true;
                player1.setVelocityY(p1_JUMP_VELOCITY - 40 * p1BhopStreak);
            } else if (!p1JumpQueued) {
                player1.bhopping = false;
                p1BhopStreak = 0;
            }
            player1.setVelocityY(p1_JUMP_VELOCITY);
        }
    }
    if (!p1OnGround && !p1OnWall) player1.bhopping = false;

    // Pre-jump: queue jump if pressed just before landing (not on wall)
    if (!p1OnGround && !p1OnWall && Phaser.Input.Keyboard.JustDown(keyW)) {
        p1JumpQueued = time;
    }

    // Track landing for b-hop (only trigger if landing on ground, not wall)
    if (p1OnGround && !player1.wasOnGround) {
        p1LastLandTime = time;
        if (p1JumpQueued && (time - p1JumpQueued <= BHOP_WINDOW)) {
            p1BhopStreak = (p1BhopStreak || 0) + 1;
            let dir = Math.sign(p1vx) || p1LastDir;
            let boost = dir * p1_BHOP_BOOST * p1BhopStreak;
            let newVx = p1vx + boost;
            player1.setVelocityX(newVx);
            player1.bhopping = true;
            player1.setVelocityY(p1_JUMP_VELOCITY - 40 * p1BhopStreak);
            p1JumpQueued = false;
        } else {
            p1BhopStreak = 0;
        }
    }
    if (p1OnGround) p1JumpQueued = false;
    player1.wasOnGround = p1OnGround;

    // Momentum-based max speed
    let p1MaxSpeed = p1_MAX_SPEED + p1_MOMENTUM_BOOST * (p1BhopStreak || 0);
    if (player1.bhopping) p1MaxSpeed = p1_SUPER_MAX_SPEED + p1_MOMENTUM_BOOST * (p1BhopStreak || 0);
    if (!p1WallJumped) {
        if (keyA.isDown) {
            p1LastDir = -1;
            player1.setVelocityX(Math.max(p1vx - p1_ACCEL, -p1MaxSpeed));
            player1.flipX = true;
        } else if (keyD.isDown) {
            p1LastDir = 1;
            player1.setVelocityX(Math.min(p1vx + p1_ACCEL, p1MaxSpeed));
            player1.flipX = false;
        } else if (!player1.bhopping) {
            // Friction (unless bhopping)
            if (p1vx > 0) {
                player1.setVelocityX(Math.max(p1vx - PLAYER_FRICTION, 0));
            } else if (p1vx < 0) {
                player1.setVelocityX(Math.min(p1vx + PLAYER_FRICTION, 0));
            }
        }
    }
    p1WallJumped = false;

    // --- PLAYER 1 SLIDE ---
    if (p1OnGround && keyShiftL.isDown && Math.abs(p1vx) > 50 && !p1Sliding) {
        p1Sliding = true;
        p1SlideTimer = 0;
        player1.setSize(24, 36); // Lower hitbox
        player1.setDisplaySize(40, 36);
        player1.setVelocityX((p1vx > 0 ? 1 : -1) * SLIDE_SPEED);
    }
    if (p1Sliding) {
        p1SlideTimer += delta;
        if (p1SlideTimer > SLIDE_DURATION || !keyShiftL.isDown || !p1OnGround) {
            p1Sliding = false;
            player1.setSize(24, 60);
            player1.setDisplaySize(40, 60);
        }
    }

    // --- PLAYER 1 ANIMATION ---
    if (p1Sliding) {
        player1.setTexture('stickSlideP1');
    } else if (p1OnWall && !p1OnGround) {
        player1.setTexture(p1TouchingLeft ? 'stickWallLeftP1' : 'stickWallRightP1');
    } else if (!p1OnGround) {
        player1.setTexture(p1vy < 0 ? 'stickJumpP1' : 'stickFallP1');
    } else if (p1HasGun && !p1Sliding) {
        player1.setTexture((keyA.isDown || player1.body.velocity.x < 0) ? 'stickGunLeftP1' : 'stickGunRightP1');
    } else if (Math.abs(p1vx) > 10) {
        runAnimTimer += delta;
        if (runAnimTimer > 100) {
            runAnimFrame = 1 - runAnimFrame;
            runAnimTimer = 0;
        }
        player1.setTexture(runAnimFrame ? 'stickRun1P1' : 'stickRun2P1');
    } else {
        player1.setTexture('stickIdleP1');
    }

    // --- PLAYER 1 SHOOT (E) ---
    if (p1HasGun && p1GunSprite) {
        let now = performance.now();
        let fireDelay = (p1GunType === 'smg') ? 80 : (p1GunType === 'shotgun' ? 600 : 700);
        if (p1GunType === 'smg') {
            // Full auto: hold E
            if (keyE.isDown && now - p1LastShoot > 40) {
                let angle = p1GunSprite.rotation;
                let tipX = p1GunSprite.x + Math.cos(angle) * 22;
                let tipY = p1GunSprite.y + Math.sin(angle) * 8;
                let bullet = bullets.create(tipX, tipY, null);
                bullet.body.setSize(16, 8);
                bullet.setDisplaySize(16, 8);
                bullet.setVelocityX(Math.cos(angle) * 1200);
                bullet.setVelocityY(Math.sin(angle) * 1200);
                bullet.setTint(0xff0000);
                bullet.lifespan = 1000;
                bullet.body.allowGravity = false;
                bullet.ricochetCount = 0;
                bullet.body.bounce.x = 1;
                bullet.body.bounce.y = 1;
                bullet.hasHitPlayer = false;
                bullet.owner = 1;
                p1LastShoot = now;
            }
        } else if (p1GunType === 'shotgun') {
            // Shotgun: semi-auto, 3 pellets per shot
            if (Phaser.Input.Keyboard.JustDown(keyE) && now - p1LastShoot > fireDelay) {
                let angle = p1GunSprite.rotation;
                for (let i = 0; i < 3; i++) {
                    let spread = Phaser.Math.FloatBetween(-0.18, 0.18); // ~10 degrees
                    let pelletAngle = angle + spread;
                    // Spawn pellets at the gun tip (can self-hit if shooting into wall)
                    let tipX = p1GunSprite.x + Math.cos(pelletAngle) * 22;
                    let tipY = p1GunSprite.y + Math.sin(pelletAngle) * 8;
                    let bullet = bullets.create(tipX, tipY, null);
                    bullet.body.setSize(16, 8);
                    bullet.setDisplaySize(16, 8);
                    bullet.setVelocityX(Math.cos(pelletAngle) * 1200);
                    bullet.setVelocityY(Math.sin(pelletAngle) * 1200);
                    bullet.setTint(0xff0000);
                    bullet.lifespan = 1000;
                    bullet.body.allowGravity = false;
                    bullet.ricochetCount = 0;
                    bullet.body.bounce.x = 1;
                    bullet.body.bounce.y = 1;
                    bullet.hasHitPlayer = false;
                    bullet.owner = 1;
                }
                p1LastShoot = now;
            }
        } else {
            // Sniper: semi-auto
            if (Phaser.Input.Keyboard.JustDown(keyE) && now - p1LastShoot > fireDelay) {
                let angle = p1GunSprite.rotation;
                let tipX = p1GunSprite.x + Math.cos(angle) * 22;
                let tipY = p1GunSprite.y + Math.sin(angle) * 8;
                let bullet = bullets.create(tipX, tipY, null);
                bullet.body.setSize(16, 8);
                bullet.setDisplaySize(16, 8);
                bullet.setVelocityX(Math.cos(angle) * 1200);
                bullet.setVelocityY(Math.sin(angle) * 1200);
                bullet.setTint(0xff0000);
                bullet.lifespan = 1000;
                bullet.body.allowGravity = false;
                bullet.ricochetCount = 0;
                bullet.body.bounce.x = 1;
                bullet.body.bounce.y = 1;
                bullet.hasHitPlayer = false;
                bullet.owner = 1;
                p1LastShoot = now;
            }
        }
    }

    // --- PLAYER 1 IN-AIR BLINK (A/D double-tap) ---
    if (!p1OnGround) {
        if (Phaser.Input.Keyboard.JustDown(keyA)) {
            if (time - p1LastLeftTap < AIR_DASH_WINDOW && p1DashCooldown <= 0) {
                blinkPlayer(player1, -1, this);
                p1DashCooldown = AIR_DASH_COOLDOWN;
            }
            p1LastLeftTap = time;
        }
        if (Phaser.Input.Keyboard.JustDown(keyD)) {
            if (time - p1LastRightTap < AIR_DASH_WINDOW && p1DashCooldown <= 0) {
                blinkPlayer(player1, 1, this);
                p1DashCooldown = AIR_DASH_COOLDOWN;
            }
            p1LastRightTap = time;
        }
    }

    // --- PLAYER 2 (AI for PvE) ---
    if (gameMode === 'pve') {
        let dx = player1.x - player2.x;
        let dy = player1.y - player2.y;
        let dist = Phaser.Math.Distance.Between(player1.x, player1.y, player2.x, player2.y);
        let p2vx = player2.body.velocity.x;
        let p2vy = player2.body.velocity.y;
        let p2OnGround = player2.body.touching.down;
        let p2TouchingLeft = player2.body.touching.left;
        let p2TouchingRight = player2.body.touching.right;
        let p2OnWall = (p2TouchingLeft || p2TouchingRight) && !p2OnGround;
        let p2HasGunLocal = p2HasGun;
        player2.wallJumpCooldown = player2.wallJumpCooldown || 0;
        if (player2.wallJumpCooldown > 0) player2.wallJumpCooldown -= delta;

        // --- AI Brain: State Machine with Hysteresis and Smooth Patrol ---
        aiStateTimer -= delta;
        let AGGRO_RANGE = 900; // Increased range
        let RETREAT_RANGE = 80; // Retreat less often
        if (aiStateTimer <= 0) {
            let newState = aiState;
            if (dist < RETREAT_RANGE && Math.random() < 0.2) { // Retreat less often
                newState = 'retreat';
                aiStateTimer = Phaser.Math.Between(300, 600);
            } else if (dist < AGGRO_RANGE) {
                newState = 'chase';
                aiStateTimer = Phaser.Math.Between(400, 900);
            } else {
                newState = (Math.random() < 0.2) ? 'idle' : 'patrol';
                aiStateTimer = Phaser.Math.Between(600, 1200);
            }
            // Only update patrol direction when entering patrol
            if (newState !== aiState) {
                if (newState === 'patrol') {
                    aiPatrolDir = (Math.random() < 0.5) ? -1 : 1;
                }
                aiPrevState = aiState;
                aiState = newState;
            }
        }

        // --- AI Behavior by State ---
        if (aiState === 'idle') {
            player2.setVelocityX(p2vx * 0.95);
            if (p2OnGround && Math.random() < 0.04) { // Jump more often
                player2.setVelocityY(JUMP_VELOCITY - 60);
            }
        } else if (aiState === 'patrol') {
            player2.setVelocityX(aiPatrolDir * PLAYER_SPEED * 1.2); // Faster patrol
            if (p2OnGround && Math.random() < 0.06) {
                player2.setVelocityY(JUMP_VELOCITY - 60);
            }
        } else if (aiState === 'chase') {
            // Move toward player1
            if (Math.abs(dx) > 20) {
                if (dx < 0) {
                    player2.setVelocityX(Math.max(p2vx - PLAYER_ACCEL * 1.5, -PLAYER_MAX_SPEED * 1.2));
                    player2.flipX = true;
                } else {
                    player2.setVelocityX(Math.min(p2vx + PLAYER_ACCEL * 1.5, PLAYER_MAX_SPEED * 1.2));
                    player2.flipX = false;
                }
            } else {
                player2.setVelocityX(p2vx * 0.8);
            }
            // Jump to platform if player is above
            if (p2OnGround && player1.y + 30 < player2.y && Math.abs(dx) < 200 && Math.random() < 0.5) {
                player2.setVelocityY(JUMP_VELOCITY - 80);
            }
            // Jump more often to be unpredictable
            if (p2OnGround && Math.random() < 0.04) {
                player2.setVelocityY(JUMP_VELOCITY - 40);
            }
        } else if (aiState === 'retreat') {
            if (dx < 0) {
                player2.setVelocityX(Math.min(p2vx + PLAYER_ACCEL * 1.2, PLAYER_MAX_SPEED));
                player2.flipX = false;
            } else {
                player2.setVelocityX(Math.max(p2vx - PLAYER_ACCEL * 1.2, -PLAYER_MAX_SPEED));
                player2.flipX = true;
            }
            if (p2OnGround && Math.random() < 0.12) {
                player2.setVelocityY(JUMP_VELOCITY);
            }
        }

        // --- Dodge bullets: jump if a bullet is coming toward AI ---
        if (p2OnGround) {
            bullets.children.iterate(function(bullet) {
                if (!bullet || !bullet.active || bullet.owner === 2) return;
                let dx = bullet.x - player2.x;
                let dy = bullet.y - player2.y;
                let dvx = bullet.body.velocity.x;
                let dvy = bullet.body.velocity.y;
                // If bullet is close and moving toward AI
                if (Math.abs(dx) < 120 && Math.abs(dy) < 60 && ((dx > 0 && dvx < 0) || (dx < 0 && dvx > 0))) {
                    if (Math.random() < 0.7) {
                        player2.setVelocityY(JUMP_VELOCITY - 60);
                    }
                }
            });
        }

        // --- Smarter Wall Jump ---
        if (p2OnWall && player2.wallJumpCooldown <= 0) {
            let shouldWallJump = false;
            let jumpDir = 0;
            if (p2TouchingLeft && (dx > 40 || dy < -40)) {
                shouldWallJump = true;
                jumpDir = 1;
            } else if (p2TouchingRight && (dx < -40 || dy < -40)) {
                shouldWallJump = true;
                jumpDir = -1;
            }
            // Predictive: if falling and player1 is above, wall jump
            if (!shouldWallJump && Math.abs(dy) > 60 && dy < 0) {
                shouldWallJump = true;
                jumpDir = p2TouchingLeft ? 1 : -1;
            }
            if (shouldWallJump) {
                player2.setVelocityY(WALL_JUMP_Y - 60);
                player2.setVelocityX(jumpDir * WALL_JUMP_X * 1.1);
                player2.wallJumpCooldown = 250; // shorter cooldown
            }
        }
        // --- Bunny Hop ---
        if (!player2.wasOnGround && p2OnGround) {
            if (player2.lastAIBhop && time - player2.lastAIBhop < 200) {
                let dir = Math.sign(dx);
                player2.setVelocityX(player2.body.velocity.x + dir * BHOP_BOOST * 1.2);
            }
            player2.lastAIBhop = time;
        }
        player2.wasOnGround = p2OnGround;
        // --- Jump if stuck or player1 is above ---
        if (p2OnGround && (Math.abs(dy) > 40 || Math.abs(p2vx) < 5)) {
            player2.setVelocityY(JUMP_VELOCITY - 40);
        }
        // --- Shoot if in line of sight ---
        if (p2HasGunLocal && Math.abs(dy) < 60 && Math.abs(dx) < 800 && aiHasLineOfSight(player2, player1, pillars)) {
            let now = performance.now();
            let fireDelay = (p2GunType === 'smg') ? 40 : (p2GunType === 'shotgun' ? 350 : 400); // Faster fire
            if (!player2.lastAIShoot || now - player2.lastAIShoot > fireDelay) {
                let angle = Math.atan2(dy, dx);
                let tipX = player2.x + Math.cos(angle) * 18;
                let tipY = player2.y + Math.sin(angle) * 12;
                let bullet = bullets.create(tipX, tipY, null);
                bullet.body.setSize(16, 8);
                bullet.setDisplaySize(16, 8);
                bullet.setVelocityX(Math.cos(angle) * 1200);
                bullet.setVelocityY(Math.sin(angle) * 1200);
                bullet.setTint(0xff0000);
                bullet.lifespan = 1000;
                bullet.body.allowGravity = false;
                bullet.ricochetCount = 0;
                bullet.body.bounce.x = 1;
                bullet.body.bounce.y = 1;
                bullet.hasHitPlayer = false;
                bullet.owner = 2;
                player2.lastAIShoot = now;
            }
        }
        // --- Gun sprite follows player2 and points at player1 (PvE fix) ---
        if (p2GunSprite) {
            let dx2 = player1.x - player2.x;
            let dy2 = player1.y - player2.y;
            let angle2 = Math.atan2(dy2, dx2);
            p2GunSprite.x = player2.x + Math.cos(angle2) * 18;
            p2GunSprite.y = player2.y + Math.sin(angle2) * 12;
            p2GunSprite.rotation = angle2;
            p2GunSprite.setVisible(p2HasGun);
        }
        // --- Gun sprite follows player1 and points at player2 (PvE fix) ---
        if (p1GunSprite) {
            let dx1 = player2.x - player1.x;
            let dy1 = player2.y - player1.y;
            let angle1 = Math.atan2(dy1, dx1);
            p1GunSprite.x = player1.x + Math.cos(angle1) * 18;
            p1GunSprite.y = player1.y + Math.sin(angle1) * 12;
            p1GunSprite.rotation = angle1;
            p1GunSprite.setVisible(p1HasGun);
        }
    } else {
        // --- PLAYER 2 (ARROWS) ---
        let p2OnGround = player2.body.touching.down;
        let p2TouchingLeft = player2.body.touching.left;
        let p2TouchingRight = player2.body.touching.right;
        let p2OnWall = (p2TouchingLeft || p2TouchingRight) && !p2OnGround;
        let p2vx = player2.body.velocity.x;
        let p2vy = player2.body.velocity.y;

        if ((p2TouchingLeft || p2TouchingRight) && !p2OnGround) {
            p2LastWallTime = time;
        }
        let p2CanWallJump = (p2TouchingLeft || p2TouchingRight) && !p2OnGround;
        if (!p2CanWallJump && !p2OnGround && (time - p2LastWallTime < WALL_COYOTE_TIME)) {
            p2CanWallJump = true;
        }

        // --- PLAYER 2 WALL JUMP (priority) ---
        if (p2CanWallJump && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            player2.bhopping = false;
            p2BhopStreak = 0;
            if (p2TouchingLeft || (!p2TouchingRight && player2.body.velocity.x <= 0)) {
                player2.setVelocityY(WALL_JUMP_Y);
                player2.setVelocityX(WALL_JUMP_X);
            } else if (p2TouchingRight || (!p2TouchingLeft && player2.body.velocity.x > 0)) {
                player2.setVelocityY(WALL_JUMP_Y);
                player2.setVelocityX(-WALL_JUMP_X);
            }
            p2WallJumped = true;
        } else if (p2OnGround && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            // --- PLAYER 2 SECRET BOOST (priority after wall jump) ---
            if (p2SecretQueued && (time - p2SecretQueued <= BHOP_WINDOW)) {
                let moveDir = 0;
                if (cursors.left.isDown) moveDir = -1;
                else if (cursors.right.isDown) moveDir = 1;
                let vxBoost = moveDir !== 0 ? SECRET_BOOST_X : 0;
                player2.setVelocityY(SECRET_BOOST_Y);
                player2.setVelocityX(player2.body.velocity.x + vxBoost);
                p2SecretQueued = 0;
                p2BhopStreak = 0;
            } else {
                if (!p2JumpQueued && (time - p2LastLandTime <= BHOP_WINDOW)) {
                    p2BhopStreak = (p2BhopStreak || 0) + 1;
                    let dir = Math.sign(p2vx) || p2LastDir;
                    let boost = dir * BHOP_BOOST * p2BhopStreak;
                    let newVx = p2vx + boost;
                    player2.setVelocityX(newVx);
                    player2.bhopping = true;
                    player2.setVelocityY(JUMP_VELOCITY - 40 * p2BhopStreak);
                } else if (!p2JumpQueued) {
                    player2.bhopping = false;
                    p2BhopStreak = 0;
                }
                player2.setVelocityY(JUMP_VELOCITY);
            }
        }
        if (!p2OnGround && !p2OnWall) player2.bhopping = false;

        if (!p2OnGround && !p2OnWall && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            p2JumpQueued = time;
        }

        if (p2OnGround && !player2.wasOnGround) {
            p2LastLandTime = time;
            if (p2JumpQueued && (time - p2JumpQueued <= BHOP_WINDOW)) {
                p2BhopStreak = (p2BhopStreak || 0) + 1;
                let dir = Math.sign(p2vx) || p2LastDir;
                let boost = dir * BHOP_BOOST * p2BhopStreak;
                let newVx = p2vx + boost;
                player2.setVelocityX(newVx);
                player2.bhopping = true;
                player2.setVelocityY(JUMP_VELOCITY - 40 * p2BhopStreak);
                p2JumpQueued = false;
            } else {
                p2BhopStreak = 0;
            }
        }
        if (p2OnGround) p2JumpQueued = false;
        player2.wasOnGround = p2OnGround;

        let p2MaxSpeed = PLAYER_MAX_SPEED + MOMENTUM_BOOST * (p2BhopStreak || 0);
        if (player2.bhopping) p2MaxSpeed = PLAYER_SUPER_MAX_SPEED + MOMENTUM_BOOST * (p2BhopStreak || 0);
        if (!p2WallJumped) {
            if (cursors.left.isDown) {
                p2LastDir = -1;
                player2.setVelocityX(Math.max(p2vx - PLAYER_ACCEL, -p2MaxSpeed));
                player2.flipX = true;
            } else if (cursors.right.isDown) {
                p2LastDir = 1;
                player2.setVelocityX(Math.min(p2vx + PLAYER_ACCEL, p2MaxSpeed));
                player2.flipX = false;
            } else if (!player2.bhopping) {
                if (p2vx > 0) {
                    player2.setVelocityX(Math.max(p2vx - PLAYER_FRICTION, 0));
                } else if (p2vx < 0) {
                    player2.setVelocityX(Math.min(p2vx + PLAYER_FRICTION, 0));
                }
            }
        }
        p2WallJumped = false;

        // --- PLAYER 2 SLIDE ---
        if (p2OnGround && keyShiftR.isDown && Math.abs(p2vx) > 50 && !p2Sliding) {
            p2Sliding = true;
            p2SlideTimer = 0;
            player2.setSize(24, 36);
            player2.setDisplaySize(40, 36);
            player2.setVelocityX((p2vx > 0 ? 1 : -1) * SLIDE_SPEED);
        }
        if (p2Sliding) {
            p2SlideTimer += delta;
            if (p2SlideTimer > SLIDE_DURATION || !keyShiftR.isDown || !p2OnGround) {
                p2Sliding = false;
                player2.setSize(24, 60);
                player2.setDisplaySize(40, 60);
            }
        }

        // --- PLAYER 2 ANIMATION ---
        if (p2Sliding) {
            player2.setTexture('stickSlideP2');
        } else if (p2OnWall && !p2OnGround) {
            player2.setTexture(p2TouchingLeft ? 'stickWallLeftP2' : 'stickWallRightP2');
        } else if (!p2OnGround) {
            player2.setTexture(p2vy < 0 ? 'stickJumpP2' : 'stickFallP2');
        } else if (p2HasGun && !p2Sliding) {
            player2.setTexture((cursors.left.isDown || player2.body.velocity.x < 0) ? 'stickGunLeftP2' : 'stickGunRightP2');
        } else if (Math.abs(p2vx) > 10) {
            runAnimTimer += delta;
            if (runAnimTimer > 100) {
                runAnimFrame = 1 - runAnimFrame;
                runAnimTimer = 0;
            }
            player2.setTexture(runAnimFrame ? 'stickRun1P2' : 'stickRun2P2');
        } else {
            player2.setTexture('stickIdleP2');
        }

        // --- PLAYER 2 SHOOT (LEFT CLICK) ---
        if (p2HasGun && p2GunSprite) {
            let now = performance.now();
            let fireDelay = (p2GunType === 'smg') ? 80 : 700;
            if (p2GunType === 'smg') {
                // Full auto: hold .
                if (keyPeriod.isDown && now - p2LastShoot > 40) {
                    let angle = p2GunSprite.rotation;
                    let tipX = p2GunSprite.x + Math.cos(angle) * 22;
                    let tipY = p2GunSprite.y + Math.sin(angle) * 8;
                    let bullet = bullets.create(tipX, tipY, null);
                    bullet.body.setSize(16, 8);
                    bullet.setDisplaySize(16, 8);
                    bullet.setVelocityX(Math.cos(angle) * 1200);
                    bullet.setVelocityY(Math.sin(angle) * 1200);
                    bullet.setTint(0xff0000);
                    bullet.lifespan = 1000;
                    bullet.body.allowGravity = false;
                    bullet.ricochetCount = 0;
                    bullet.body.bounce.x = 1;
                    bullet.body.bounce.y = 1;
                    bullet.hasHitPlayer = false;
                    bullet.owner = 2;
                    p2LastShoot = now;
                }
            } else if (p2GunType === 'shotgun') {
                // Shotgun: semi-auto, 3 pellets per shot
                if (Phaser.Input.Keyboard.JustDown(keyPeriod) && now - p2LastShoot > fireDelay) {
                    let angle = p2GunSprite.rotation;
                    for (let i = 0; i < 3; i++) {
                        let spread = Phaser.Math.FloatBetween(-0.18, 0.18); // ~10 degrees
                        let pelletAngle = angle + spread;
                        // Spawn pellets at the gun tip (can self-hit if shooting into wall)
                        let tipX = p2GunSprite.x + Math.cos(pelletAngle) * 22;
                        let tipY = p2GunSprite.y + Math.sin(pelletAngle) * 8;
                        let bullet = bullets.create(tipX, tipY, null);
                        bullet.body.setSize(16, 8);
                        bullet.setDisplaySize(16, 8);
                        bullet.setVelocityX(Math.cos(pelletAngle) * 1200);
                        bullet.setVelocityY(Math.sin(pelletAngle) * 1200);
                        bullet.setTint(0xff0000);
                        bullet.lifespan = 1000;
                        bullet.body.allowGravity = false;
                        bullet.ricochetCount = 0;
                        bullet.body.bounce.x = 1;
                        bullet.body.bounce.y = 1;
                        bullet.hasHitPlayer = false;
                        bullet.owner = 2;
                    }
                    p2LastShoot = now;
                }
            } else {
                // Sniper: semi-auto
                if (Phaser.Input.Keyboard.JustDown(keyPeriod) && now - p2LastShoot > fireDelay) {
                    let angle = p2GunSprite.rotation;
                    let tipX = p2GunSprite.x + Math.cos(angle) * 22;
                    let tipY = p2GunSprite.y + Math.sin(angle) * 8;
                    let bullet = bullets.create(tipX, tipY, null);
                    bullet.body.setSize(16, 8);
                    bullet.setDisplaySize(16, 8);
                    bullet.setVelocityX(Math.cos(angle) * 1200);
                    bullet.setVelocityY(Math.sin(angle) * 1200);
                    bullet.setTint(0xff0000);
                    bullet.lifespan = 1000;
                    bullet.body.allowGravity = false;
                    bullet.ricochetCount = 0;
                    bullet.body.bounce.x = 1;
                    bullet.body.bounce.y = 1;
                    bullet.hasHitPlayer = false;
                    bullet.owner = 2;
                    p2LastShoot = now;
                }
            }
            this.input.activePointer.wasDown = this.input.activePointer.isDown;
        }
    }

    // --- Decrement damage cooldowns ---
    if (p1DamageCooldown > 0) p1DamageCooldown -= delta;
    if (p2DamageCooldown > 0) p2DamageCooldown -= delta;

    // --- Bullet lifespan ---
    bullets.children.iterate(function(bullet) {
        if (!bullet) return;
        bullet.lifespan -= delta;
        if (bullet.lifespan <= 0) bulletsToDestroy.push(bullet);
    });

    // --- Destroy bullets marked for removal ---
    for (let bullet of bulletsToDestroy) {
        if (bullet && bullet.active) bullet.destroy();
    }
    bulletsToDestroy = [];

    // --- Draw health bars ---
    p1HealthBar.clear();
    p1HealthBar.fillStyle(0x222222, 1);
    p1HealthBar.fillRect(40, 20, 300, 20);
    p1HealthBar.fillStyle(0xff4444, 1);
    p1HealthBar.fillRect(40, 20, 300 * (p1Health / 200), 20);
    p2HealthBar.clear();
    p2HealthBar.fillStyle(0x222222, 1);
    p2HealthBar.fillRect(1260, 20, 300, 20);
    p2HealthBar.fillStyle(0x4444ff, 1);
    p2HealthBar.fillRect(1260 + (300 - 300 * (p2Health / 200)), 20, 300 * (p2Health / 200), 20);
    p1ScoreText.setText('P1: ' + p1Score);
    p2ScoreText.setText('P2: ' + p2Score);

    // --- Draw dash cooldown bars ---
    // Bar settings
    let barW = 48, barH = 8, barYOffset = 38;
    // Player 1
    let p1BarX = player1.x - barW/2;
    let p1BarY = player1.y + barYOffset;
    let p1Frac = 1 - (p1DashCooldown / AIR_DASH_COOLDOWN);
    p1DashBar.clear();
    p1DashBar.fillStyle(0x222222, 1);
    p1DashBar.fillRect(p1BarX, p1BarY, barW, barH);
    p1DashBar.fillStyle(0x00ff88, 1);
    p1DashBar.fillRect(p1BarX, p1BarY, barW * p1Frac, barH);
    // Player 2
    let p2BarX = player2.x - barW/2;
    let p2BarY = player2.y + barYOffset;
    let p2Frac = 1 - (p2DashCooldown / AIR_DASH_COOLDOWN);
    p2DashBar.clear();
    p2DashBar.fillStyle(0x222222, 1);
    p2DashBar.fillRect(p2BarX, p2BarY, barW, barH);
    p2DashBar.fillStyle(0x8888ff, 1);
    p2DashBar.fillRect(p2BarX, p2BarY, barW * p2Frac, barH);

    if (gameMode === 'pvp') {
        // --- Gun sprite follows and aims for both players in PvP ---
        // Player 1: gun follows player and always points at Player 2
        if (p1GunSprite && player1 && player2) {
            let dx = player2.x - player1.x;
            let dy = player2.y - player1.y;
            let angle1 = Math.atan2(dy, dx);
            p1GunSprite.x = player1.x + Math.cos(angle1) * 18;
            p1GunSprite.y = player1.y + Math.sin(angle1) * 12;
            p1GunSprite.rotation = angle1;
            p1GunSprite.setVisible(p1HasGun);
        }
        // Player 2: gun follows player and always points at Player 1
        if (p2GunSprite && player2 && player1) {
            let dx = player1.x - player2.x;
            let dy = player1.y - player2.y;
            let angle2 = Math.atan2(dy, dx);
            p2GunSprite.x = player2.x + Math.cos(angle2) * 18;
            p2GunSprite.y = player2.y + Math.sin(angle2) * 12;
            p2GunSprite.rotation = angle2;
            p2GunSprite.setVisible(p2HasGun);
        }
    }

    if (gameState === 'secret') {
        // --- Player 1 movement (full mechanics) ---
        let p1OnGround = player1.body.touching.down;
        let p1TouchingLeft = player1.body.touching.left;
        let p1TouchingRight = player1.body.touching.right;
        let p1OnWall = (p1TouchingLeft || p1TouchingRight) && !p1OnGround;
        let p1vx = player1.body.velocity.x;
        let p1vy = player1.body.velocity.y;

        // Track last wall touch for coyote time
        if ((p1TouchingLeft || p1TouchingRight) && !p1OnGround) {
            p1LastWallTime = time;
        }
        let p1CanWallJump = (p1TouchingLeft || p1TouchingRight) && !p1OnGround;
        if (!p1CanWallJump && !p1OnGround && (time - p1LastWallTime < WALL_COYOTE_TIME)) {
            p1CanWallJump = true;
        }

        // --- WALL JUMP (priority) ---
        if (p1CanWallJump && Phaser.Input.Keyboard.JustDown(keyW)) {
            player1.bhopping = false;
            p1BhopStreak = 0;
            if (p1TouchingLeft || (!p1TouchingRight && player1.body.velocity.x <= 0)) {
                player1.setVelocityY(WALL_JUMP_Y);
                player1.setVelocityX(WALL_JUMP_X);
            } else if (p1TouchingRight || (!p1TouchingLeft && player1.body.velocity.x > 0)) {
                player1.setVelocityY(WALL_JUMP_Y);
                player1.setVelocityX(-WALL_JUMP_X);
            }
            p1WallJumped = true;
        } else if (p1OnGround && Phaser.Input.Keyboard.JustDown(keyW)) {
            // Normal jump (with b-hop check)
            if (!p1JumpQueued && (time - p1LastLandTime <= BHOP_WINDOW)) {
                p1BhopStreak = (p1BhopStreak || 0) + 1;
                let dir = Math.sign(p1vx) || p1LastDir;
                let boost = dir * BHOP_BOOST * p1BhopStreak;
                let newVx = p1vx + boost;
                player1.setVelocityX(newVx);
                player1.bhopping = true;
                player1.setVelocityY(JUMP_VELOCITY - 40 * p1BhopStreak);
            } else if (!p1JumpQueued) {
                player1.bhopping = false;
                p1BhopStreak = 0;
            }
            player1.setVelocityY(JUMP_VELOCITY);
        }
        if (!p1OnGround && !p1OnWall) player1.bhopping = false;

        // Pre-jump: queue jump if pressed just before landing (not on wall)
        if (!p1OnGround && !p1OnWall && Phaser.Input.Keyboard.JustDown(keyW)) {
            p1JumpQueued = time;
        }

        // Track landing for b-hop (only trigger if landing on ground, not wall)
        if (p1OnGround && !player1.wasOnGround) {
            p1LastLandTime = time;
            if (p1JumpQueued && (time - p1JumpQueued <= BHOP_WINDOW)) {
                p1BhopStreak = (p1BhopStreak || 0) + 1;
                let dir = Math.sign(p1vx) || p1LastDir;
                let boost = dir * BHOP_BOOST * p1BhopStreak;
                let newVx = p1vx + boost;
                player1.setVelocityX(newVx);
                player1.bhopping = true;
                player1.setVelocityY(JUMP_VELOCITY - 40 * p1BhopStreak);
                p1JumpQueued = false;
            } else {
                p1BhopStreak = 0;
            }
        }
        if (p1OnGround) p1JumpQueued = false;
        player1.wasOnGround = p1OnGround;

        // Momentum-based max speed
        let p1MaxSpeed = PLAYER_MAX_SPEED + MOMENTUM_BOOST * (p1BhopStreak || 0);
        if (player1.bhopping) p1MaxSpeed = PLAYER_SUPER_MAX_SPEED + MOMENTUM_BOOST * (p1BhopStreak || 0);
        if (!p1WallJumped) {
            if (keyA.isDown) {
                p1LastDir = -1;
                player1.setVelocityX(Math.max(p1vx - PLAYER_ACCEL, -p1MaxSpeed));
                player1.flipX = true;
            } else if (keyD.isDown) {
                p1LastDir = 1;
                player1.setVelocityX(Math.min(p1vx + PLAYER_ACCEL, p1MaxSpeed));
                player1.flipX = false;
            } else if (!player1.bhopping) {
                // Friction (unless bhopping)
                if (p1vx > 0) {
                    player1.setVelocityX(Math.max(p1vx - PLAYER_FRICTION, 0));
                } else if (p1vx < 0) {
                    player1.setVelocityX(Math.min(p1vx + PLAYER_FRICTION, 0));
                }
            }
        }
        p1WallJumped = false;

        // --- SLIDE ---
        // Simple WASD movement for player1
        let vx = player1.body.velocity.x;
        let vy = player1.body.velocity.y;
        let onGround = player1.body.touching.down;
        if (keyA.isDown) {
            player1.setVelocityX(-PLAYER_SPEED);
            player1.flipX = true;
        } else if (keyD.isDown) {
            player1.setVelocityX(PLAYER_SPEED);
            player1.flipX = false;
        } else {
            player1.setVelocityX(0);
        }
        if (onGround && Phaser.Input.Keyboard.JustDown(keyW)) {
            player1.setVelocityY(JUMP_VELOCITY);
        }
        // Animation
        if (!onGround) {
            player1.setTexture(vy < 0 ? 'stickJumpP1' : 'stickFallP1');
        } else if (Math.abs(vx) > 10) {
            runAnimTimer += delta;
            if (runAnimTimer > 100) {
                runAnimFrame = 1 - runAnimFrame;
                runAnimTimer = 0;
            }
            player1.setTexture(runAnimFrame ? 'stickRun1P1' : 'stickRun2P1');
        } else {
            player1.setTexture('stickIdleP1');
        }
        return;
    }

    // In update(), override Player 1's movement constants if window.devSuperP1 is true:
    if (window.devSuperP1) {
        var DEV_PLAYER_SPEED = 12000;
        var DEV_JUMP_VELOCITY = -18000;
        var DEV_PLAYER_ACCEL = 6000;
        var DEV_PLAYER_MAX_SPEED = 40000;
        var DEV_PLAYER_SUPER_MAX_SPEED = 80000;
        var DEV_BHOP_BOOST = 20000;
        var DEV_MOMENTUM_BOOST = 10000;
        var DEV_WALL_JUMP_X = 40000;
        var DEV_WALL_JUMP_Y = -18000;
    }
}

function startGame(scene) {
    gameState = 'play';
    startTitle.setVisible(false);
    startButton.setVisible(false);
    startBgRect.setVisible(false);
    startP1Controls.setVisible(false);
    startP2Controls.setVisible(false);
    startP1Title.setVisible(false);
    startP2Title.setVisible(false);
}

function drawStickFigure(gfx, pose, color=0x222222) {
    gfx.clear();
    // Head
    gfx.lineStyle(0, 0x000000, 0);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(20, 15, 10);
    gfx.lineStyle(3, color, 1);
    gfx.strokeCircle(20, 15, 10);
    // Body
    gfx.lineStyle(3, color, 1);
    if (pose === 'slide') {
        gfx.lineBetween(18, 28, 28, 48); // Body at angle
        gfx.lineBetween(18, 32, 8, 60); // Left arm to floor
        gfx.lineBetween(28, 38, 38, 28); // Right arm out
        gfx.lineBetween(28, 48, 40, 60); // Left leg
        gfx.lineBetween(28, 48, 24, 58); // Right leg
    } else if (pose === 'gunRight') {
        gfx.lineBetween(20, 25, 20, 45); // Spine
        gfx.lineBetween(20, 30, 5, 40);
        gfx.lineStyle(4, color, 1);
        gfx.lineBetween(20, 30, 36, 36);
        gfx.lineStyle(3, color, 1);
        gfx.lineBetween(20, 45, 10, 58);
        gfx.lineBetween(20, 45, 30, 58);
    } else if (pose === 'gunLeft') {
        gfx.lineBetween(20, 25, 20, 45); // Spine
        gfx.lineBetween(20, 30, 35, 40);
        gfx.lineStyle(4, color, 1);
        gfx.lineBetween(20, 30, 4, 36);
        gfx.lineStyle(3, color, 1);
        gfx.lineBetween(20, 45, 10, 58);
        gfx.lineBetween(20, 45, 30, 58);
    } else if (pose === 'idle') {
        gfx.lineBetween(20, 25, 20, 45); // Spine
        gfx.lineBetween(20, 30, 5, 40);
        gfx.lineBetween(20, 30, 35, 40);
        gfx.lineBetween(20, 45, 10, 58);
        gfx.lineBetween(20, 45, 30, 58);
    } else if (pose === 'run1') {
        gfx.lineBetween(20, 25, 20, 45); // Spine
        gfx.lineBetween(20, 30, 5, 35);
        gfx.lineBetween(20, 30, 35, 45);
        gfx.lineBetween(20, 45, 8, 55);
        gfx.lineBetween(20, 45, 32, 58);
    } else if (pose === 'run2') {
        gfx.lineBetween(20, 25, 20, 45); // Spine
        gfx.lineBetween(20, 30, 5, 45);
        gfx.lineBetween(20, 30, 35, 35);
        gfx.lineBetween(20, 45, 12, 58);
        gfx.lineBetween(20, 45, 28, 55);
    } else if (pose === 'jump') {
        gfx.lineBetween(20, 25, 20, 45); // Spine
        gfx.lineBetween(20, 25, 5, 10);
        gfx.lineBetween(20, 25, 35, 10);
        gfx.lineBetween(20, 45, 15, 58);
        gfx.lineBetween(20, 45, 25, 58);
    } else if (pose === 'fall') {
        gfx.lineBetween(20, 25, 20, 45); // Spine
        gfx.lineBetween(20, 30, 5, 20);
        gfx.lineBetween(20, 30, 35, 20);
        gfx.lineBetween(20, 45, 5, 58);
        gfx.lineBetween(20, 45, 35, 58);
    } else if (pose === 'wallLeft') {
        gfx.lineBetween(20, 25, 20, 45); // Spine
        gfx.lineBetween(20, 25, 5, 10);
        gfx.lineBetween(20, 30, 35, 40);
        gfx.lineBetween(20, 45, 10, 58);
        gfx.lineBetween(20, 45, 25, 55);
    } else if (pose === 'wallRight') {
        gfx.lineBetween(20, 25, 20, 45); // Spine
        gfx.lineBetween(20, 25, 35, 10);
        gfx.lineBetween(20, 30, 5, 40);
        gfx.lineBetween(20, 45, 30, 58);
        gfx.lineBetween(20, 45, 15, 55);
    }
}

function showWinner(msg) {
    let winnerDiv = document.getElementById('winner-message');
    if (!winnerDiv) {
        winnerDiv = document.createElement('div');
        winnerDiv.id = 'winner-message';
        winnerDiv.style.position = 'absolute';
        winnerDiv.style.top = '40%';
        winnerDiv.style.left = '50%';
        winnerDiv.style.transform = 'translate(-50%, -50%)';
        winnerDiv.style.fontSize = '4em';
        winnerDiv.style.color = '#fff';
        winnerDiv.style.background = 'rgba(30,60,114,0.9)';
        winnerDiv.style.padding = '0.5em 2em';
        winnerDiv.style.borderRadius = '32px';
        winnerDiv.style.zIndex = 2000;
        winnerDiv.style.textAlign = 'center';
        winnerDiv.style.fontFamily = 'monospace';
        document.body.appendChild(winnerDiv);
    }
    winnerDiv.innerText = msg;
    winnerDiv.style.display = 'block';
    if (winnerTimeout) clearTimeout(winnerTimeout);
    winnerTimeout = setTimeout(() => {
        winnerDiv.style.display = 'none';
        location.reload();
    }, 5000);
}

// Add this function at the end of the file:
function startSecretLevel(scene) {
    // Hide all game UI
    if (p1HealthBar) p1HealthBar.setVisible(false);
    if (p2HealthBar) p2HealthBar.setVisible(false);
    if (p1ScoreText) p1ScoreText.setVisible(false);
    if (p2ScoreText) p2ScoreText.setVisible(false);
    if (p1DashBar) p1DashBar.setVisible(false);
    if (p2DashBar) p2DashBar.setVisible(false);
    if (p1GunSprite) p1GunSprite.setVisible(false);
    if (p2GunSprite) p2GunSprite.setVisible(false);
    if (player2) player2.setVisible(false);
    // Remove all bullets
    if (bullets) bullets.clear(true, true);
    // Create a simple ground
    if (!scene.textures.exists('secretGround')) {
        const gfx = scene.add.graphics();
        gfx.fillStyle(0x888888, 1);
        gfx.fillRect(0, 0, 1200, 40);
        gfx.generateTexture('secretGround', 1200, 40);
        gfx.destroy();
    }
    let secretGround = scene.physics.add.staticSprite(800, 820, 'secretGround');
    // Create player1 at center
    if (player1) player1.destroy();
    player1 = scene.physics.add.sprite(800, 700, 'stickIdleP1')
        .setDisplaySize(40, 60)
        .setCollideWorldBounds(true);
    player1.body.setSize(24, 60);
    scene.physics.add.collider(player1, secretGround);
    // Show message
    scene.add.text(800, 300, 'Yay you found an easter egg!', {
        fontSize: '64px',
        fill: '#fff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#222',
        strokeThickness: 8
    }).setOrigin(0.5);
    // Confetti effect
    for (let i = 0; i < 80; i++) {
        let color = Phaser.Display.Color.RandomRGB().color;
        let confetti = scene.add.rectangle(800, 350, 12, 24, color).setAngle(Phaser.Math.Between(0, 360));
        scene.tweens.add({
            targets: confetti,
            x: 800 + Phaser.Math.Between(-600, 600),
            y: 900 + Phaser.Math.Between(0, 200),
            angle: Phaser.Math.Between(0, 360),
            duration: Phaser.Math.Between(1200, 2200),
            ease: 'Cubic.easeIn',
            delay: Phaser.Math.Between(0, 400),
            onComplete: () => confetti.destroy()
        });
    }
    // Store secret ground for update
    scene.secretGround = secretGround;
    // Reload the page after 5 seconds
    setTimeout(() => { location.reload(); }, 5000);
} 