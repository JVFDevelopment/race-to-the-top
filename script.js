const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Basic game variables
let player = {
    x: 50,
    y: canvas.height - 100,
    width: 50,
    height: 50,
    color: 'blue',
    dy: 0, // vertical velocity
    dx: 0, // horizontal velocity
    gravity: 0.8, // gravity effect
    jumpStrength: -12, // jumping power
    isJumping: false,
    isAlive: true,
    speedBoost: false
};

let jumpCount = 0; // For double jump tracking
let isWallSliding = false; // For wall sliding tracking

const friction = 0.9; // How quickly the player slows down
const playerSpeed = 5; // Normal player speed
let isSpacePressed = false;  // Track if space is held down
let jumpTime = 0;  // Track how long the spacebar is held

// Platforms array
let platforms = [];
const platformWidth = 100;
const platformHeight = 20;
const platformGap = 150; // Gap between platforms

// Obstacles array
let obstacles = [];
const obstacleWidth = 50;
const obstacleHeight = 20;
const obstacleSpeed = 2; // Speed of horizontal movement

// Power-ups array
let powerUps = [];
const powerUpSize = 20;
const powerUpTypes = ['doubleJump', 'speedBoost'];

// Track pressed keys
let keys = {};

// Handle key press and release
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;  // Mark key as pressed

    if (e.code === 'Space' && jumpCount < 2) {  // Double jump handling
        player.dy = player.jumpStrength;
        player.isJumping = true;
        jumpCount++;
        isSpacePressed = true;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;  // Mark key as released

    if (e.code === 'Space') {
        isSpacePressed = false;
        jumpTime = 0;  // Reset jump time
    }
});

// Generate platforms
function generatePlatforms() {
    for (let i = 0; i < 10; i++) {
        let platform = {
            x: Math.random() * (canvas.width - platformWidth),  // Random x position
            y: canvas.height - (i * platformGap) - 20,          // Evenly spaced in y
            width: platformWidth,
            height: platformHeight
        };
        platforms.push(platform);

        // Add an obstacle to some of the platforms
        if (i % 2 === 0) {
            let obstacle = {
                x: platform.x + Math.random() * platform.width, // Random starting position
                y: platform.y - obstacleHeight,                 // Just above the platform
                width: obstacleWidth,
                height: obstacleHeight,
                direction: Math.random() < 0.5 ? -1 : 1         // Random movement direction
            };
            obstacles.push(obstacle);
        }
    }
}

// Generate power-ups
function generatePowerUps() {
    platforms.forEach((platform, index) => {
        if (index % 3 === 0) { // Randomize power-up appearance
            let powerUp = {
                x: platform.x + platform.width / 2 - powerUpSize / 2,
                y: platform.y - powerUpSize,
                size: powerUpSize,
                type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
            };
            powerUps.push(powerUp);
        }
    });
}

// Detect player collision with platforms, obstacles, and power-ups
function detectCollision(player, object) {
    return (
        player.x < object.x + object.width &&
        player.x + player.width > object.x &&
        player.y + player.height < object.y + object.height &&
        player.y + player.height > object.y
    );
}

function collectPowerUp(player, powerUp) {
    return (
        player.x < powerUp.x + powerUp.size &&
        player.x + player.width > powerUp.x &&
        player.y + player.height < powerUp.y + powerUp.size &&
        player.y + player.height > powerUp.y
    );
}

// Apply effects when collecting power-ups
function handlePowerUps() {
    powerUps.forEach((powerUp, index) => {
        if (collectPowerUp(player, powerUp)) {
            if (powerUp.type === 'doubleJump') {
                player.jumpStrength = -15; // Stronger jump
            } else if (powerUp.type === 'speedBoost') {
                player.speedBoost = true;
            }
            // Remove the power-up
            powerUps.splice(index, 1);
        }
    });
}

generatePlatforms();
generatePowerUps();

function updateJump() {
    if (isSpacePressed && player.isJumping) {
        jumpTime++;
        if (jumpTime < 20) {  // Allow for variable jump height
            player.dy -= 0.4;  // Apply slight upward force while holding space
        }
    }
}

// Smooth horizontal movement
function handleMovement() {
    let speed = player.speedBoost ? 10 : playerSpeed;

    if (keys['ArrowLeft']) {
        player.dx -= 0.5;  // Accelerate to the left
    }
    if (keys['ArrowRight']) {
        player.dx += 0.5;  // Accelerate to the right
    }

    player.dx *= friction;  // Apply friction for smooth movement
    player.x += player.dx;

    if (player.x < 0) player.x = 0;  // Stop player from going off the left side
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;  // Stop from going off the right side
}

// Wall sliding and wall jumping
function detectWallCollision(player, platform) {
    return (
        (player.x + player.width >= platform.x && player.x <= platform.x + platform.width && player.y + player.height >= platform.y) &&
        (player.x + player.width <= platform.x + 10 || player.x >= platform.x + platform.width - 10)
    );
}

function handleWallJump() {
    platforms.forEach(platform => {
        if (detectWallCollision(player, platform)) {
            isWallSliding = true;
            player.dy = 0.5;  // Slow down fall when sliding

            if (keys['Space']) {  // Wall jump
                player.dy = player.jumpStrength;
                isWallSliding = false;
            }
        }
    });
}

function update() {
    // Gravity
    player.dy += player.gravity;
    player.y += player.dy;

    // Collision with platforms
    platforms.forEach(platform => {
        if (detectCollision(player, platform) && player.dy >= 0) {
            player.y = platform.y - player.height;
            player.dy = 0;
            player.isJumping = false;
            jumpCount = 0;  // Reset jump count on landing
        }
    });

    // Move obstacles
    obstacles.forEach(obstacle => {
        obstacle.x += obstacle.direction * obstacleSpeed;

        if (obstacle.x <= 0 || obstacle.x + obstacle.width >= canvas.width) {
            obstacle.direction *= -1;  // Reverse direction at screen edges
        }

        if (detectCollision(player, obstacle)) {
            player.isAlive = false;  // Game over on collision
            console.log('Game Over');
        }
    });

    // Handle power-up collection
    handlePowerUps();

    // Scroll platforms and player if they reach a certain height
    if (player.y < canvas.height / 2 && player.isAlive) {
        platforms.forEach(platform => {
            platform.y += 5;
        });
        obstacles.forEach(obstacle => {
            obstacle.y += 5;
        });
        powerUps.forEach(powerUp => {
            powerUp.y += 5;
        });
        player.y += 5;
    }

    // Apply controls
    updateJump();
    handleMovement();
    handleWallJump();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    platforms.forEach(platform => {
        ctx.fillStyle = 'green';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Draw obstacles
    obstacles.forEach(obstacle => {
        ctx.fillStyle = 'red';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });

    // Draw power-ups
    powerUps.forEach(powerUp => {
        ctx.fillStyle = powerUp.type === 'doubleJump' ? 'purple' : 'yellow';
        ctx.beginPath();
        ctx.arc(powerUp.x + powerUp.size / 2, powerUp.y + powerUp.size / 2, powerUp.size / 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw the player
    if (player.isAlive) {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    // Request the next frame
    if (player.isAlive) {
        requestAnimationFrame(update);
    }
}

// Start game loop
update();
