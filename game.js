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
let keyQ, keySlash;

let p1SecretQueued = 0;
let p2SecretQueued = 0;

let p1WallJumped = false;
let p2WallJumped = false;

let guns, bullets;
let p1HasGun = false, p2HasGun = false;
let keyE;

let p1GunSprite = null;
let p2GunSprite = null;

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
    const platGfx = this.add.graphics();
    platGfx.fillStyle(0xaaaaaa, 1);
    platGfx.fillRect(0, 0, 300, 20);
    platGfx.generateTexture('platform', 300, 20);

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
    let numPillars = Phaser.Math.Between(2, 5);
    for (let i = 0; i < numPillars; i++) {
        let pillarHeight = Phaser.Math.Between(120, 400);
        let pillarX = Phaser.Math.Between(80, 1520); // Avoid walls
        let pillarY = 900 - 40 - (pillarHeight / 2); // Stand on ground
        // Create a new pillar texture for this height
        let pillarKey = 'pillar' + i;
        let pillarGfx = this.add.graphics();
        pillarGfx.fillStyle(0x222222, 1);
        pillarGfx.fillRect(0, 0, 40, pillarHeight);
        pillarGfx.generateTexture(pillarKey, 40, pillarHeight);
        pillarGfx.destroy();
        pillars.create(pillarX, pillarY, pillarKey);
    }

    // --- RANDOM PLATFORMS ---
    platforms = this.physics.add.staticGroup();
    let platformData = [];
    let numPlatforms = Phaser.Math.Between(3, 6);
    for (let i = 0; i < numPlatforms; i++) {
        let platWidth = Phaser.Math.Between(120, 400);
        let platX = Phaser.Math.Between(platWidth / 2 + 40, 1600 - platWidth / 2 - 40); // Avoid walls
        let platY = Phaser.Math.Between(120, 800); // Avoid floor/ceiling
        // Create a new platform texture for this width
        let platKey = 'platform' + i;
        let platGfx = this.add.graphics();
        platGfx.fillStyle(0xaaaaaa, 1);
        platGfx.fillRect(0, 0, platWidth, 20);
        platGfx.generateTexture(platKey, platWidth, 20);
        platGfx.destroy();
        platforms.create(platX, platY, platKey);
        platformData.push({x: platX, y: platY, width: platWidth});
    }

    // --- GUNS ON PLATFORMS FAR APART ---
    guns = this.physics.add.staticGroup();
    if (platformData.length >= 2) {
        // Find two platforms far apart in X
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
    function makeStickTexture(scene, key, pose) {
        const gfx = scene.add.graphics();
        gfx.clear();
        drawStickFigure(gfx, pose);
        gfx.generateTexture(key, 40, 60);
        gfx.destroy();
    }
    makeStickTexture(this, 'stickIdle', 'idle');
    makeStickTexture(this, 'stickRun1', 'run1');
    makeStickTexture(this, 'stickRun2', 'run2');
    makeStickTexture(this, 'stickJump', 'jump');
    makeStickTexture(this, 'stickFall', 'fall');
    makeStickTexture(this, 'stickWallLeft', 'wallLeft');
    makeStickTexture(this, 'stickWallRight', 'wallRight');
    makeStickTexture(this, 'stickSlide', 'slide');
    makeStickTexture(this, 'stickGunRight', 'gunRight');
    makeStickTexture(this, 'stickGunLeft', 'gunLeft');

    // Player 1 (left side)
    player1 = this.physics.add.sprite(300, 800, 'stickIdle')
        .setDisplaySize(40, 60)
        .setCollideWorldBounds(true);
    player1.body.setSize(24, 60);
    // Player 2 (right side)
    player2 = this.physics.add.sprite(1300, 800, 'stickIdle')
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
    keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // --- Gun pickup collisions ---
    this.physics.add.overlap(player1, guns, (player, gun) => {
        if (!p1HasGun) {
            p1HasGun = true;
            gun.destroy();
            // Attach gun sprite to player1
            p1GunSprite = this.add.sprite(player1.x, player1.y, 'gun0');
            p1GunSprite.setOrigin(0.2, 0.7);
            p1GunSprite.setDepth(10);
        }
    });
    this.physics.add.overlap(player2, guns, (player, gun) => {
        if (!p2HasGun) {
            p2HasGun = true;
            gun.destroy();
            // Attach gun sprite to player2
            p2GunSprite = this.add.sprite(player2.x, player2.y, 'gun1');
            p2GunSprite.setOrigin(0.2, 0.7);
            p2GunSprite.setDepth(10);
        }
    });

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
    document.getElementById('start-btn').onclick = () => {
        document.getElementById('start-menu').style.display = 'none';
        gameState = 'play';
    };
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.getElementById('start-menu').style.display !== 'none') {
            document.getElementById('start-menu').style.display = 'none';
            gameState = 'play';
        }
    });
}

function forceRespawn() {
    console.log('forceRespawn: START');
    p1Health = 200;
    p2Health = 200;
    // Defensive recreation if player1 is missing
    if (!player1) {
        console.error('player1 was undefined! Recreating.');
        player1 = game.scene.scenes[0].physics.add.sprite(300, 800, 'stickIdle')
            .setDisplaySize(40, 60)
            .setCollideWorldBounds(true);
        player1.body.setSize(24, 60);
    }
    // Defensive recreation if player2 is missing
    if (!player2) {
        console.error('player2 was undefined! Recreating.');
        player2 = game.scene.scenes[0].physics.add.sprite(1300, 800, 'stickIdle')
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
    console.log('forceRespawn: END');
}

// Animation state
let runAnimTimer = 0;
let runAnimFrame = 0;

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
            player1.setVelocityY(WALL_JUMP_Y);
            player1.setVelocityX(WALL_JUMP_X);
        } else if (p1TouchingRight || (!p1TouchingLeft && player1.body.velocity.x > 0)) {
            player1.setVelocityY(WALL_JUMP_Y);
            player1.setVelocityX(-WALL_JUMP_X);
        }
        p1WallJumped = true;
    } else if (p1OnGround && Phaser.Input.Keyboard.JustDown(keyW)) {
        // --- PLAYER 1 SECRET BOOST (priority after wall jump) ---
        if (p1SecretQueued && (time - p1SecretQueued <= BHOP_WINDOW)) {
            let moveDir = 0;
            if (keyA.isDown) moveDir = -1;
            else if (keyD.isDown) moveDir = 1;
            let vxBoost = moveDir !== 0 ? moveDir * SECRET_BOOST_X : 0;
            player1.setVelocityY(SECRET_BOOST_Y);
            player1.setVelocityX(player1.body.velocity.x + vxBoost);
            p1SecretQueued = 0;
            p1BhopStreak = 0;
        } else {
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
        player1.setTexture('stickSlide');
    } else if (p1OnWall && !p1OnGround) {
        if (p1TouchingLeft) {
            player1.setTexture('stickWallLeft');
        } else {
            player1.setTexture('stickWallRight');
        }
    } else if (!p1OnGround) {
        if (p1vy < 0) {
            player1.setTexture('stickJump');
        } else {
            player1.setTexture('stickFall');
        }
    } else if (p1HasGun) {
        if (keyA.isDown || player1.body.velocity.x < 0) {
            player1.setTexture('stickGunLeft');
        } else {
            player1.setTexture('stickGunRight');
        }
    } else if (Math.abs(p1vx) > 10) {
        runAnimTimer += delta;
        if (runAnimTimer > 100) {
            runAnimFrame = 1 - runAnimFrame;
            runAnimTimer = 0;
        }
        player1.setTexture(runAnimFrame ? 'stickRun1' : 'stickRun2');
    } else {
        player1.setTexture('stickIdle');
    }

    // --- PLAYER 1 SHOOT (E) ---
    if (p1HasGun && Phaser.Input.Keyboard.JustDown(keyE) && p1GunSprite) {
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
    }

    // --- Gun sprite follows player1 and points at player2 ---
    if (p1GunSprite) {
        let dx = player2.x - player1.x;
        let dy = player2.y - player1.y;
        let angle = Math.atan2(dy, dx);
        p1GunSprite.x = player1.x + Math.cos(angle) * 18;
        p1GunSprite.y = player1.y + Math.sin(angle) * 12;
        p1GunSprite.rotation = angle;
        p1GunSprite.setVisible(p1HasGun);
    }

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
            let vxBoost = moveDir !== 0 ? moveDir * SECRET_BOOST_X : 0;
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
        player2.setTexture('stickSlide');
    } else if (p2OnWall && !p2OnGround) {
        if (p2TouchingLeft) {
            player2.setTexture('stickWallLeft');
        } else {
            player2.setTexture('stickWallRight');
        }
    } else if (!p2OnGround) {
        if (p2vy < 0) {
            player2.setTexture('stickJump');
        } else {
            player2.setTexture('stickFall');
        }
    } else if (p2HasGun) {
        if (cursors.left.isDown || player2.body.velocity.x < 0) {
            player2.setTexture('stickGunLeft');
        } else {
            player2.setTexture('stickGunRight');
        }
    } else if (Math.abs(p2vx) > 10) {
        runAnimTimer += delta;
        if (runAnimTimer > 100) {
            runAnimFrame = 1 - runAnimFrame;
            runAnimTimer = 0;
        }
        player2.setTexture(runAnimFrame ? 'stickRun1' : 'stickRun2');
    } else {
        player2.setTexture('stickIdle');
    }

    // --- PLAYER 2 SHOOT (LEFT CLICK) ---
    if (p2HasGun && this.input.activePointer.isDown && !this.input.activePointer.wasDown && p2GunSprite) {
        let angle = p2GunSprite.rotation;
        let tipX = p2GunSprite.x + Math.cos(angle) * 22;
        let tipY = p2GunSprite.y + Math.sin(angle) * 8;
        let bullet = bullets.create(tipX, tipY, null);
        bullet.body.setSize(16, 8);
        bullet.setDisplaySize(16, 8);
        bullet.setVelocityX(Math.cos(angle) * 1200);
        bullet.setVelocityY(Math.sin(angle) * 1200);
        bullet.setTint(0x0000ff);
        bullet.lifespan = 1000;
        bullet.body.allowGravity = false;
        bullet.ricochetCount = 0;
        bullet.body.bounce.x = 1;
        bullet.body.bounce.y = 1;
        bullet.hasHitPlayer = false;
        bullet.owner = 2;
    }
    this.input.activePointer.wasDown = this.input.activePointer.isDown;

    // --- Gun sprite follows player2 and points at player1 ---
    if (p2GunSprite) {
        let dx = player1.x - player2.x;
        let dy = player1.y - player2.y;
        let angle = Math.atan2(dy, dx);
        p2GunSprite.x = player2.x + Math.cos(angle) * 18;
        p2GunSprite.y = player2.y + Math.sin(angle) * 12;
        p2GunSprite.rotation = angle;
        p2GunSprite.setVisible(p2HasGun);
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
    // Optionally, reset game state here
}

function drawStickFigure(gfx, pose) {
    gfx.clear();
    // Head
    gfx.lineStyle(0, 0x000000, 0);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(20, 15, 10);
    gfx.lineStyle(3, 0x222222, 1);
    gfx.strokeCircle(20, 15, 10);
    // Body
    if (pose === 'slide') {
        // Lean back at an angle
        gfx.lineBetween(18, 28, 28, 48); // Body at angle
        // Left arm grabs floor
        gfx.lineBetween(18, 32, 8, 60); // Left arm to floor
        // Right arm out for balance
        gfx.lineBetween(28, 38, 38, 28); // Right arm out
        // Left leg extended forward
        gfx.lineBetween(28, 48, 40, 60); // Left leg
        // Right leg bent
        gfx.lineBetween(28, 48, 24, 58); // Right leg
    } else if (pose === 'gunRight') {
        // Stickman holding gun to the right (no drawn gun, just arm out)
        gfx.lineStyle(3, 0x222222, 1);
        gfx.lineBetween(20, 25, 20, 45); // Spine
        // Left arm
        gfx.lineBetween(20, 30, 5, 40);
        // Right arm outstretched
        gfx.lineStyle(4, 0x222222, 1);
        gfx.lineBetween(20, 30, 36, 36);
        // Legs
        gfx.lineStyle(3, 0x222222, 1);
        gfx.lineBetween(20, 45, 10, 58);
        gfx.lineBetween(20, 45, 30, 58);
    } else if (pose === 'gunLeft') {
        // Stickman holding gun to the left (no drawn gun, just arm out)
        gfx.lineStyle(3, 0x222222, 1);
        gfx.lineBetween(20, 25, 20, 45); // Spine
        // Right arm
        gfx.lineBetween(20, 30, 35, 40);
        // Left arm outstretched
        gfx.lineStyle(4, 0x222222, 1);
        gfx.lineBetween(20, 30, 4, 36);
        // Legs
        gfx.lineStyle(3, 0x222222, 1);
        gfx.lineBetween(20, 45, 10, 58);
        gfx.lineBetween(20, 45, 30, 58);
    } else if (pose === 'idle') {
        gfx.lineStyle(3, 0x222222, 1);
        gfx.lineBetween(20, 25, 20, 45); // Spine
        // Arms
        gfx.lineBetween(20, 30, 5, 40);
        gfx.lineBetween(20, 30, 35, 40);
        // Legs
        gfx.lineBetween(20, 45, 10, 58);
        gfx.lineBetween(20, 45, 30, 58);
    } else if (pose === 'run1') {
        gfx.lineStyle(3, 0x222222, 1);
        gfx.lineBetween(20, 25, 20, 45); // Spine
        // Arms
        gfx.lineBetween(20, 30, 5, 35);
        gfx.lineBetween(20, 30, 35, 45);
        // Legs
        gfx.lineBetween(20, 45, 8, 55);
        gfx.lineBetween(20, 45, 32, 58);
    } else if (pose === 'run2') {
        gfx.lineStyle(3, 0x222222, 1);
        gfx.lineBetween(20, 25, 20, 45); // Spine
        // Arms
        gfx.lineBetween(20, 30, 5, 45);
        gfx.lineBetween(20, 30, 35, 35);
        // Legs
        gfx.lineBetween(20, 45, 12, 58);
        gfx.lineBetween(20, 45, 28, 55);
    } else if (pose === 'jump') {
        gfx.lineStyle(3, 0x222222, 1);
        gfx.lineBetween(20, 25, 20, 45); // Spine
        // Arms up
        gfx.lineBetween(20, 25, 5, 10);
        gfx.lineBetween(20, 25, 35, 10);
        // Legs together
        gfx.lineBetween(20, 45, 15, 58);
        gfx.lineBetween(20, 45, 25, 58);
    } else if (pose === 'fall') {
        gfx.lineStyle(3, 0x222222, 1);
        gfx.lineBetween(20, 25, 20, 45); // Spine
        // Arms out
        gfx.lineBetween(20, 30, 5, 20);
        gfx.lineBetween(20, 30, 35, 20);
        // Legs apart
        gfx.lineBetween(20, 45, 5, 58);
        gfx.lineBetween(20, 45, 35, 58);
    } else if (pose === 'wallLeft') {
        gfx.lineStyle(3, 0x222222, 1);
        gfx.lineBetween(20, 25, 20, 45); // Spine
        // Lean left, left arm up, right arm out
        gfx.lineBetween(20, 25, 5, 10);
        gfx.lineBetween(20, 30, 35, 40);
        // Legs angled
        gfx.lineBetween(20, 45, 10, 58);
        gfx.lineBetween(20, 45, 25, 55);
    } else if (pose === 'wallRight') {
        gfx.lineStyle(3, 0x222222, 1);
        gfx.lineBetween(20, 25, 20, 45); // Spine
        // Lean right, right arm up, left arm out
        gfx.lineBetween(20, 25, 35, 10);
        gfx.lineBetween(20, 30, 5, 40);
        // Legs angled
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
        document.getElementById('start-menu').style.display = '';
        gameState = 'start';
        forceRespawn();
    }, 1000);
} 