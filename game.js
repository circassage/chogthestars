// Canvas ve temel ayarlar
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ses efektleri
const collectSound = new Audio('assets/collect.wav');
const finalSound = new Audio('assets/final.wav');
const backgroundMusic = new Audio('assets/background.mp3');
const jumpSound = new Audio('assets/jump.wav');
const boostSound = new Audio('assets/boost.wav');

// Ses ayarları
backgroundMusic.loop = true;
backgroundMusic.volume = 0.2;
jumpSound.volume = 0.2;
collectSound.volume = 0.2;
finalSound.volume = 0.2;
boostSound.volume = 0.2;

// Dikey format için boyutları değiştir
canvas.width = 400;
canvas.height = 800;

// Ana menü için değişkenler
let gameState = 'firstMenu';
const coverImage = new Image();
coverImage.src = 'assets/cover.jpg';

// Resimlerin yüklenmesini bekle
let imagesLoaded = 0;
const totalImages = 8; // cover, boost, magnet, canvas bg, base, platform, walk, chog2

function startGameWhenReady() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        gameLoop();
    }
}

coverImage.onload = startGameWhenReady;

// Boost resmi için
const boostImage = new Image();
boostImage.src = 'assets/boost.png';
boostImage.onload = startGameWhenReady;

// Mıknatıs resmi için
const magnetImage = new Image();
magnetImage.src = 'assets/magnet.png';
magnetImage.onload = startGameWhenReady;

// Canvas arka plan resmi
const canvasBgImage = new Image();
canvasBgImage.src = 'assets/canvas.png';
canvasBgImage.onload = startGameWhenReady;

// Platform resimleri
const basePlatformImage = new Image();
basePlatformImage.src = 'assets/base.png';
basePlatformImage.onload = startGameWhenReady;

const platformImage = new Image();
platformImage.src = 'assets/platform.png';
platformImage.onload = startGameWhenReady;

// Chog resimleri
const walkGif = document.createElement('img');
walkGif.src = 'assets/walk.gif';
walkGif.onload = startGameWhenReady;

const chogJump = new Image();
chogJump.src = 'assets/chog2.png';
chogJump.onload = startGameWhenReady;

// Chog sprite sheet ve animasyon ayarları
const chogSprite = new Image();
chogSprite.src = 'assets/spritesheet.png';
chogSprite.onload = startGameWhenReady;

let currentFrame = 0;
let frameCount = 6;
let frameWidth = 211;  // Sprite sheet'teki her karenin gerçek genişliği
let frameHeight = 264; // Sprite sheet'teki her karenin gerçek yüksekliği
let frameTimer = 0;
const FRAME_DELAY = 100; // 100ms'den 50ms'ye düşürdük - daha hızlı animasyon

// Kamera pozisyonu
let cameraY = 0;
const CAMERA_OFFSET = canvas.height * 0.6;

// Duvarlar için sabitler
const WALL_WIDTH = 20;
const WALL_COLOR = '#4a3b9f';

// Su ve platform ayarları
const platforms = [];
const platformWidth = 120;
const platformHeight = 25;
let baseWaterSpeed = 1.8;
let waterRiseSpeed = baseWaterSpeed;
let waterLevel = canvas.height + 200;

// Oyun değişkenleri
let gameStartTime = Date.now();
let score = 0;
let difficulty = 1;
let countDown = 3;

// Skor animasyonu için değişkenler
let scoreGlowIntensity = 0;
let lastScore = 0;
let scoreScale = 1;

// Boncuk ve güçlendirme ayarları
const POWERUP_TYPES = {
    SCORE: 'score',
    MAGNET: 'magnet',
    BOOST: 'boost'
};

const powerups = [];
const POWERUP_SIZE = 12;
const MAGNET_DURATION = 5000;
const BOOST_FORCE = -25;
let magnetActive = false;
let magnetEndTime = 0;

// Başlangıç platformu
const startPlatform = {
    x: 0,
    y: canvas.height - 70,
    width: canvas.width,
    height: platformHeight
};

// Oyuncu ayarları
const player = {
    x: canvas.width / 2,
    y: startPlatform.y - 50,
    width: 60,
    height: 84,
    speed: 5,
    jumpForce: -12,
    velocityY: 0,
    gravity: 0.5,
    canDoubleJump: false,
    hasDoubleJumped: false,
    lastPlatformId: null,
    direction: 1,
    isMoving: false,
    lastDirection: 1
};

// Tuş durumları
const keys = {
    a: false,
    d: false,
    jump: false
};

// Oyun başladığında kontrol bilgisini gizle
document.querySelector('.controls-info').style.display = 'none';

// Zıplama yüksekliği hesaplama
const calculateJumpHeight = () => {
    const time = -player.jumpForce / player.gravity;
    return -(player.jumpForce * time + (0.5 * player.gravity * time * time));
};

const maxJumpHeight = calculateJumpHeight();
const minPlatformGap = 200;
const maxPlatformGap = maxJumpHeight * 1.1;

// Çarpışma kontrolü
function checkCollision(player, platform) {
    return player.x < platform.x + platform.width &&
           player.x + player.width > platform.x &&
           player.y + player.height > platform.y &&
           player.y < platform.y + platform.height;
}

// Son powerup konumu için global değişken
let lastPowerupX = 0;
let lastPowerupY = 0;

// Güçlendirme oluşturma
function createPowerup(x, y) {
    // Önceki powerup ile arasında minimum mesafe kontrolü
    const distanceFromLast = Math.sqrt(
        Math.pow(x - lastPowerupX, 2) + Math.pow(y - lastPowerupY, 2)
    );
    
    // Eğer çok yakınsa powerup oluşturma
    if (distanceFromLast < 150) {
        return;
    }

    const chance = Math.random() * 100;
    let type;
    let powerupX = x;
    let powerupY = y;

    if (chance < 70) {
        type = POWERUP_TYPES.SCORE;
        // Skor yıldızları platform üzerinde kalacak
        powerupY = y - 15;
    } else if (chance < 80) {
        type = POWERUP_TYPES.MAGNET;
        // Mıknatıs platformun yanlarında olacak (±100px)
        powerupX = x + (Math.random() < 0.5 ? -100 : platformWidth + 100);
        powerupY = y - 40;
    } else {
        type = POWERUP_TYPES.BOOST;
        // Boost platformun yanlarında olacak (±100px)
        powerupX = x + (Math.random() < 0.5 ? -100 : platformWidth + 100);
        powerupY = y - 40;
    }
    
    // Powerup konumunu kaydet
    lastPowerupX = powerupX;
    lastPowerupY = powerupY;
    
    powerups.push({
        x: powerupX,
        y: powerupY,
        type: type,
        width: POWERUP_SIZE,
        height: POWERUP_SIZE,
        collected: false
    });
}

// Platform oluşturma
function createPlatform() {
    let x, y;
    
    if (platforms.length === 0) {
        const gap = minPlatformGap + Math.random() * (maxPlatformGap - minPlatformGap);
        x = WALL_WIDTH + Math.random() * (canvas.width - platformWidth - WALL_WIDTH * 2);
        y = startPlatform.y - gap;
    } else {
        const lastPlatform = platforms[platforms.length - 1];
        const minX = Math.max(WALL_WIDTH, lastPlatform.x - maxJumpHeight);
        const maxX = Math.min(canvas.width - platformWidth - WALL_WIDTH, lastPlatform.x + maxJumpHeight);
        x = minX + Math.random() * (maxX - minX);
        
        const gap = minPlatformGap + Math.random() * (maxPlatformGap - minPlatformGap);
        y = lastPlatform.y - gap;
    }

    // Powerup spawn oranını azalt
    if (Math.random() < 0.4) { // 0.5'ten 0.4'e düşürdük
        createPowerup(x + platformWidth / 2, y - 35);
    }

    platforms.push({
        x: x,
        y: y,
        width: platformWidth,
        height: platformHeight,
        id: Date.now() + Math.random()
    });
}

// İlk platformları oluştur
for (let i = 0; i < 2; i++) {
    createPlatform();
}

// Müzik başlatma fonksiyonu
async function playBackgroundMusicFromRandomPoint() {
    try {
        // Müziği baştan başlat
        backgroundMusic.currentTime = 0;
        await backgroundMusic.play();
        console.log("Müzik başlatıldı");
    } catch (error) {
        console.log("Müzik başlatılamadı:", error);
    }
}

// Oyun başlangıcında müziği yükle
document.addEventListener('DOMContentLoaded', () => {
    // Kullanıcı etkileşimi için bir kere tıklama gerekiyor
    document.addEventListener('click', async () => {
        if (!backgroundMusic.playing) {
            await playBackgroundMusicFromRandomPoint();
        }
    }, { once: true });
});

// Tuş dinleyicileri
document.addEventListener('keydown', async (e) => {
    const key = e.key.toLowerCase();

    if ((gameState === 'firstMenu' || gameState === 'menu') && (key === ' ' || key === 'space')) {
        gameState = 'countdown';
        gameStartTime = Date.now();
        document.querySelector('.controls-info').style.display = 'block';
        
        if (!backgroundMusic.playing) {
            await playBackgroundMusicFromRandomPoint();
        }
        return;
    }

    if (gameState === 'gameover' && (key === ' ' || key === 'space')) {
        restartGame();
        return;
    }
    
    if (gameState !== 'playing') return;
    
    if (key === 'a' || key === 'd') {
        keys[key] = true;
    }
    
    if ((key === 'w' || key === ' ') && !keys.jump) {
        keys.jump = true;
        if (player.velocityY === 0) {
            // İlk zıplama
            player.velocityY = player.jumpForce;
            player.canDoubleJump = true;
            jumpSound.currentTime = 0;
            jumpSound.play();
        } else if (player.canDoubleJump) {
            // İkinci zıplama
            player.velocityY = player.jumpForce * 0.8;
            player.canDoubleJump = false;
            jumpSound.currentTime = 0;
            jumpSound.play();
        }
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'a' || key === 'd') {
        keys[key] = false;
    }
    if (key === 'w' || key === ' ') {
        keys.jump = false;
    }
});

// Yıldız çizimi için fonksiyon
function drawStar(ctx, x, y, size, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    // Arka parıltı
    const gradient = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 1.5);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Yıldız çizimi
    ctx.beginPath();
    const points = 5;
    const innerRadius = size * 0.4;
    const outerRadius = size;
    const smoothness = 0.35;

    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        
        const nextRadius = i === points * 2 - 1 ? outerRadius : (i % 2 === 0 ? innerRadius : outerRadius);
        const nextAngle = ((i + 1) * Math.PI) / points - Math.PI / 2;
        
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const nextX = nextRadius * Math.cos(nextAngle);
        const nextY = nextRadius * Math.sin(nextAngle);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            if (i % 2 === 0) {
                const cp1x = x + (nextX - x) * smoothness;
                const cp1y = y + (nextY - y) * smoothness;
                const cp2x = nextX - (nextX - x) * smoothness;
                const cp2y = nextY - (nextY - y) * smoothness;
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, nextX, nextY);
            } else {
                ctx.lineTo(x, y);
                ctx.lineTo(nextX, nextY);
            }
        }
    }
    ctx.closePath();
    ctx.restore();
}

// Mıknatıs çizimi için fonksiyon
function drawMagnet(ctx, x, y, size, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Mıknatıs gövdesi (U şekli)
    const gradient = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
    gradient.addColorStop(0, '#FF00FF');
    gradient.addColorStop(1, '#CC00CC');

    // Ana U şekli
    ctx.beginPath();
    ctx.moveTo(-size/2, -size/2);
    ctx.lineTo(-size/2, size/2);
    ctx.lineTo(-size/4, size/2);
    ctx.lineTo(-size/4, -size/4);
    ctx.lineTo(size/4, -size/4);
    ctx.lineTo(size/4, size/2);
    ctx.lineTo(size/2, size/2);
    ctx.lineTo(size/2, -size/2);
    ctx.closePath();

    // Gölge efekti
    ctx.shadowColor = 'rgba(255, 0, 255, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = gradient;
    ctx.fill();

    // Kutup işaretleri
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(-size/3, -size/2, size/6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0000FF';
    ctx.beginPath();
    ctx.arc(size/3, -size/2, size/6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Menü çizimi
function drawMenu() {
    if (gameState === 'firstMenu') {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.drawImage(coverImage, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Oyun başlığı
        ctx.font = 'bold 48px Poppins';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#836ef9';
        ctx.shadowColor = 'rgba(131, 110, 249, 0.5)';
        ctx.shadowBlur = 15;
        ctx.fillText('Chog the Stars', canvas.width/2, canvas.height/2 - 100);

        // Başlama talimatı
        ctx.font = 'bold 24px Poppins'; // Boyutu küçülttük
        ctx.fillStyle = '#836ef9';
        ctx.shadowColor = 'rgba(131, 110, 249, 0.5)';
        ctx.shadowBlur = 15;
        ctx.fillText('Press SPACE to Start', canvas.width/2, canvas.height/2);
        ctx.shadowBlur = 0;
    } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#2a1f66');
        gradient.addColorStop(1, '#1a1440');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 24px Poppins';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#836ef9';
        ctx.shadowColor = 'rgba(131, 110, 249, 0.5)';
        ctx.shadowBlur = 15;
        ctx.fillText('Press SPACE to Start', canvas.width/2, canvas.height/2);
        ctx.shadowBlur = 0;
    }
}

// Arka plan pozisyonu
let bgOffset = 0;

// Oyun döngüsü
function gameLoop() {
    // Müzik kontrolü
    if (gameState === 'playing' && backgroundMusic.ended) {
        playBackgroundMusicFromRandomPoint();
    }
    
    updateGame();
    drawGame();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Animasyon frame ID'si için global değişken
let animationFrameId;

// Oyun otomatik olarak başlamayacak, resimler yüklendiğinde başlayacak 

// Oyun güncelleme fonksiyonu
function updateGame() {
    if (gameState === 'menu' || gameState === 'firstMenu') {
        // Menüdeyken oyunu sıfırla
        player.x = canvas.width / 2;
        player.y = canvas.height - 100;
        player.velocityY = 0;
        waterLevel = canvas.height + 200;
        return;
    }

    if (gameState === 'countdown') {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - gameStartTime) / 1000;
        countDown = Math.ceil(3 - elapsedTime);
        
        if (elapsedTime >= 3) {
            gameState = 'playing';
            gameStartTime = Date.now();
            // Oyun başladığında platformları oluştur
            platforms.length = 0;
            for (let i = 0; i < 2; i++) {
                createPlatform();
            }
            // Yıldız tozlarını başlangıç pozisyonlarına yerleştir
            starParticles.forEach(particle => {
                particle.reset();
                particle.y = player.y + canvas.height + Math.random() * 200;
            });
        }
        return;
    }

    if (gameState === 'gameover') return;

    // Tuş kontrolleri ve oyun mantığı
    if (keys.a) {
        player.x -= player.speed;
        player.direction = 1;
        player.isMoving = true;
    } else if (keys.d) {
        player.x += player.speed;
        player.direction = -1;
        player.isMoving = true;
    } else {
        player.isMoving = false;
    }

    // Oyuncu fiziği
    player.velocityY += player.gravity;
    player.y += player.velocityY;

    // Kamera takibi
    const targetCameraY = player.y - CAMERA_OFFSET;
    cameraY += (targetCameraY - cameraY) * 0.1;

    // Duvarlarla çarpışma kontrolü
    if (player.x < WALL_WIDTH) {
        player.x = WALL_WIDTH;
    }
    if (player.x + player.width > canvas.width - WALL_WIDTH) {
        player.x = canvas.width - player.width - WALL_WIDTH;
    }

    // Platform çarpışma kontrolü
    let isOnPlatform = false;
    for (const platform of platforms) {
        if (checkCollision(player, platform) && player.velocityY > 0) {
            player.y = platform.y - player.height;
            player.velocityY = 0;
            isOnPlatform = true;
            player.canDoubleJump = true;

            // Yeni platforma basma kontrolü
            if (player.lastPlatformId !== platform.id) {
                player.lastPlatformId = platform.id;
                score += 1;
                scoreGlowIntensity = 1;
                scoreScale = 1.2;
                lastScore = score;
            }
        }
    }

    // Başlangıç platformu çarpışma kontrolü
    if (checkCollision(player, startPlatform) && player.velocityY > 0) {
        player.y = startPlatform.y - player.height;
        player.velocityY = 0;
        isOnPlatform = true;
        player.canDoubleJump = true; // Başlangıç platformuna değdiğinde de double jump'ı resetle
    }

    // Zorluk artışı
    difficulty += 0.001;

    // Oyun sonu kontrolü
    if (player.y > waterLevel + 500) {
        gameOver();
    }

    // Platform temizleme ve yeni platform oluşturma
    if (platforms[platforms.length - 1].y > player.y - canvas.height * 0.5) {
        createPlatform();
    }
    
    // Ekrandan çıkan platformları temizle
    while (platforms.length > 0 && platforms[0].y > player.y + canvas.height * 0.3) {
        platforms.shift();
    }

    // Güçlendirmeleri güncelle
    for (const powerup of powerups) {
        if (!powerup.collected) {
            // Mıknatıs aktifken yıldızları çek
            if (magnetActive && powerup.type === POWERUP_TYPES.SCORE) {
                const dx = (player.x + player.width/2) - powerup.x;
                const dy = (player.y + player.height/2) - powerup.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 200) {
                    powerup.x += dx * 0.1;
                    powerup.y += dy * 0.1;
                }
            }

            // Çarpışma kontrolü
            if (checkCollision(player, powerup)) {
                powerup.collected = true;
                switch (powerup.type) {
                    case POWERUP_TYPES.SCORE:
                        score += 5;
                        scoreGlowIntensity = 1;
                        scoreScale = 1.4;
                        lastScore = score;
                        collectSound.currentTime = 0;
                        collectSound.play();
                        break;
                    case POWERUP_TYPES.MAGNET:
                        magnetActive = true;
                        magnetEndTime = Date.now() + MAGNET_DURATION;
                        break;
                    case POWERUP_TYPES.BOOST:
                        player.velocityY = BOOST_FORCE;
                        player.canDoubleJump = true;
                        boostSound.currentTime = 0;
                        boostSound.play();
                        boostTrail.start();
                        break;
                }
            }
        }
    }

    // Mıknatıs süresini kontrol et
    if (magnetActive && Date.now() > magnetEndTime) {
        magnetActive = false;
    }

    // Kullanılmış güçlendirmeleri temizle
    powerups.forEach((powerup, index) => {
        if (powerup.collected || powerup.y > player.y + canvas.height) {
            powerups.splice(index, 1);
        }
    });

    // Animasyon efektlerini güncelle
    if (scoreGlowIntensity > 0) {
        scoreGlowIntensity -= 0.05;
    }
    if (scoreScale > 1) {
        scoreScale -= 0.02;
    }
    if (scoreScale < 1) scoreScale = 1;

    // Su yükselmesi yerine yıldız tozu yükselmesi
    const gameTime = (Date.now() - gameStartTime) / 1000;
    waterLevel -= 2; // Yıldız tozları yukarı hareket edecek

    // Yıldız tozlarını sadece oyun aktifken güncelle ve çarpışma kontrolü yap
    if (gameState === 'playing') {
        starParticles.forEach(particle => {
            const currentSpeed = particle.speed * (1 + difficulty * 0.15);
            particle.y -= currentSpeed;
            particle.x += Math.sin(Date.now() * 0.0005 + particle.angle) * particle.wobble;

            // Çarpışma kontrolü sadece oyun aktifken
            const dx = particle.x - (player.x + player.width/2);
            const dy = particle.y - (player.y + player.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < (player.width/2 + particle.size)) {
                gameOver();
                return;
            }

            // Ekrandan çıkınca resetle
            if (particle.y < player.y - canvas.height || 
                particle.x < -100 || 
                particle.x > canvas.width + 100) {
                particle.reset();
            }
        });
    } else {
        // Oyun aktif değilken sadece pozisyon güncelle, çarpışma kontrolü yapma
        starParticles.forEach(particle => {
            const currentSpeed = particle.speed * (1 + difficulty * 0.15);
            particle.y -= currentSpeed;
            particle.x += Math.sin(Date.now() * 0.0005 + particle.angle) * particle.wobble;

            if (particle.y < player.y - canvas.height || 
                particle.x < -100 || 
                particle.x > canvas.width + 100) {
                particle.reset();
            }
        });
    }

    // Boost trail güncelleme
    boostTrail.update(player.x, player.y, player.width, player.height);
}

// Yıldız tozu parçacıkları için class
class StarParticle {
    constructor() {
        this.reset();
    }

    reset() {
        const spreadX = canvas.width * 1.5;
        this.x = player.x + (Math.random() - 0.5) * spreadX;
        this.y = player.y + canvas.height/2 + Math.random() * 200;
        this.size = 2 + Math.random() * 4;
        this.alpha = 0.4 + Math.random() * 0.6;
        // Temel hızı artırdık
        const baseSpeed = 2.2 + Math.random() * 0.8; // 1.8-2.5'ten 2.2-3.0'a çıkardık
        this.speed = baseSpeed * (1 + difficulty * 0.15);
        this.color = `hsl(${220 + Math.random() * 40}, 100%, ${75 + Math.random() * 25}%)`;
        this.angle = Math.random() * Math.PI * 2;
        this.wobble = Math.random() * 0.15;
    }

    update() {
        // Hızı sürekli güncelle (zorluk arttıkça)
        const currentSpeed = this.speed * (1 + difficulty * 0.15);
        
        // Yukarı doğru hareket
        this.y -= currentSpeed;
        
        // Daha yavaş sallantılı hareket
        this.x += Math.sin(Date.now() * 0.0005 + this.angle) * this.wobble;
        
        // Oyuncuya değme kontrolü - sadece oyun aktifken
        if (gameState === 'playing') {
            const dx = this.x - (player.x + player.width/2);
            const dy = this.y - (player.y + player.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < (player.width/2 + this.size)) {
                gameOver();
                return;
            }
        }
        
        // Ekrandan çıkınca resetle
        if (this.y < player.y - canvas.height || 
            this.x < -100 || 
            this.x > canvas.width + 100) {
            this.reset();
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Daha fazla yıldız tozu parçacığı
const starParticles = Array(200).fill(null).map(() => new StarParticle());

// Boost efekti için class
class BoostTrail {
    constructor() {
        this.particles = [];
        this.active = false;
        this.duration = 1000;
        this.startTime = 0;
        this.maxParticles = 50; // Maksimum parçacık sayısı
    }

    start() {
        this.active = true;
        this.startTime = Date.now();
        this.particles = []; // Önceki parçacıkları temizle
        
        // Başlangıç parçacıkları
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: player.x + player.width/2,
                y: player.y + player.height/2,
                size: 8 + Math.random() * 8,
                alpha: 1,
                speedY: -2 - Math.random() * 2,
                speedX: (Math.random() - 0.5) * 3
            });
        }
    }

    update(playerX, playerY, playerWidth, playerHeight) {
        if (!this.active) return;

        if (Date.now() - this.startTime > this.duration) {
            this.active = false;
            this.particles = [];
            return;
        }

        // Yeni parçacıklar ekle (parçacık sayısı limitini kontrol et)
        if (this.particles.length < this.maxParticles && Math.random() < 0.3) {
            this.particles.push({
                x: playerX + Math.random() * playerWidth,
                y: playerY + playerHeight,
                size: 5 + Math.random() * 6,
                alpha: 1,
                speedY: -1.5 - Math.random() * 2,
                speedX: (Math.random() - 0.5) * 1.5
            });
        }

        // Parçacıkları güncelle
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            particle.speedY *= 0.98;
            particle.size *= 0.97;
            particle.alpha -= 0.025;

            if (particle.alpha <= 0 || particle.size <= 0.5) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        if (!this.active || this.particles.length === 0) return;

        ctx.save();
        this.particles.forEach(particle => {
            const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, particle.size
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.alpha * 1.5})`);
            gradient.addColorStop(0.3, `rgba(200, 180, 255, ${particle.alpha * 1.2})`);
            gradient.addColorStop(0.6, `rgba(131, 110, 249, ${particle.alpha})`);
            gradient.addColorStop(1, 'rgba(131, 110, 249, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();

            // Tek bir gölge efekti kullan
            ctx.globalAlpha = particle.alpha * 0.6;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(200, 180, 255, 1)';
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}

// Boost trail instance'ı oluştur
const boostTrail = new BoostTrail();

// Oyun çizim fonksiyonu
function drawGame() {
    if (gameState === 'firstMenu' || gameState === 'menu') {
        drawMenu();
        return;
    }

    // Arka plan resmi (tekrarlanan)
    const bgHeight = canvas.height;
    bgOffset = (cameraY * 0.5) % bgHeight;

    ctx.save();
    ctx.globalAlpha = 0.8;
    // İlk arka plan
    ctx.drawImage(canvasBgImage, 0, -bgOffset, canvas.width, bgHeight);
    // Üstteki arka plan
    ctx.drawImage(canvasBgImage, 0, -bgOffset - bgHeight, canvas.width, bgHeight);
    // Alttaki arka plan
    ctx.drawImage(canvasBgImage, 0, -bgOffset + bgHeight, canvas.width, bgHeight);
    ctx.restore();

    // Gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(42, 31, 102, 0.3)');
    gradient.addColorStop(1, 'rgba(26, 20, 64, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Tüm çizimleri kameraya göre kaydır
    ctx.save();
    ctx.translate(0, -cameraY);

    // Başlangıç platformu
    if (startPlatform.y > cameraY - 100 && startPlatform.y < cameraY + canvas.height + 100) {
        // Platform gölgesi
        ctx.fillStyle = 'rgba(42, 31, 102, 0.3)';
        ctx.fillRect(startPlatform.x + 5, startPlatform.y + 5, startPlatform.width, startPlatform.height);
        
        // Base platform resmi
        ctx.drawImage(basePlatformImage, startPlatform.x, startPlatform.y, startPlatform.width, startPlatform.height);

        // Base platformun altını kapat
        ctx.fillStyle = '#1a1440';
        ctx.fillRect(0, startPlatform.y + startPlatform.height, canvas.width, canvas.height);
    }

    // Duvarları çiz
    ctx.fillStyle = '#4a3b9f';
    const visibleTop = cameraY - 100;
    const visibleBottom = cameraY + canvas.height + 100;
    ctx.fillRect(0, visibleTop, WALL_WIDTH, visibleBottom - visibleTop);
    ctx.fillRect(canvas.width - WALL_WIDTH, visibleTop, WALL_WIDTH, visibleBottom - visibleTop);

    // Platformlar
    for (const platform of platforms) {
        if (platform.y > cameraY - 100 && platform.y < cameraY + canvas.height + 100) {
            // Platform gölgesi
            ctx.fillStyle = 'rgba(42, 31, 102, 0.05)';
            ctx.fillRect(platform.x + 5, platform.y + 5, platform.width, platform.height);
            
            // Platform resmi
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.globalCompositeOperation = 'source-over';
            ctx.shadowBlur = 0;
            ctx.filter = 'none';
            ctx.globalAlpha = 0.9;
            
            // Kesin piksel konumlandırma için Math.floor kullan
            const drawX = Math.floor(platform.x);
            const drawY = Math.floor(platform.y);
            const drawWidth = Math.floor(platform.width);
            const drawHeight = Math.floor(platform.height);
            
            // Piksel-perfect çizim için crisp-edges
            ctx.imageSmoothingQuality = 'high';
            ctx.imageSmoothingEnabled = false;
            
            // PNG çizimi
            ctx.drawImage(platformImage, drawX, drawY, drawWidth, drawHeight);
            ctx.restore();
        }
    }

    // Güçlendirmeler
    for (const powerup of powerups) {
        if (!powerup.collected) {
            const glowSize = 20 + Math.sin(Date.now() / 100) * 5;
            
            switch (powerup.type) {
                case POWERUP_TYPES.SCORE:
                    ctx.save();
                    ctx.translate(powerup.x, powerup.y);
                    
                    // Dış parıltı
                    const starGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize * 2);
                    starGlow.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
                    starGlow.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
                    starGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
                    ctx.fillStyle = starGlow;
                    ctx.beginPath();
                    ctx.arc(0, 0, glowSize * 2, 0, Math.PI * 2);
                    ctx.fill();

                    // Yıldız çizimi
                    drawStar(ctx, 0, 0, POWERUP_SIZE * 0.9, 0);
                    ctx.fillStyle = '#FFD700';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    ctx.restore();
                    break;

                case POWERUP_TYPES.MAGNET:
                    ctx.save();
                    ctx.translate(powerup.x, powerup.y);
                    
                    // Dış parıltı
                    const magnetGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize * 1.5);
                    magnetGlow.addColorStop(0, 'rgba(255, 0, 255, 0.4)');
                    magnetGlow.addColorStop(0.5, 'rgba(255, 0, 255, 0.2)');
                    magnetGlow.addColorStop(1, 'rgba(255, 0, 255, 0)');
                    ctx.fillStyle = magnetGlow;
                    ctx.beginPath();
                    ctx.arc(0, 0, glowSize * 1.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Mıknatıs resmi - boyutu artırıldı
                    const magnetSize = 20 * 1.5; // 13'ten 20'ye çıkardık
                    ctx.drawImage(magnetImage, -magnetSize/2, -magnetSize/2, magnetSize, magnetSize);
                    
                    ctx.restore();
                    break;

                case POWERUP_TYPES.BOOST:
                    ctx.save();
                    ctx.translate(powerup.x, powerup.y);

                    // Dış parıltı halkası
                    const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize * 2);
                    outerGlow.addColorStop(0, 'rgba(131, 110, 249, 0.4)');
                    outerGlow.addColorStop(0.5, 'rgba(131, 110, 249, 0.2)');
                    outerGlow.addColorStop(1, 'rgba(131, 110, 249, 0)');
                    ctx.fillStyle = outerGlow;
                    ctx.beginPath();
                    ctx.arc(0, 0, glowSize * 2, 0, Math.PI * 2);
                    ctx.fill();

                    // İç parıltı
                    const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
                    innerGlow.addColorStop(0, 'rgba(131, 110, 249, 0.5)');
                    innerGlow.addColorStop(1, 'rgba(131, 110, 249, 0)');
                    ctx.fillStyle = innerGlow;
                    ctx.beginPath();
                    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
                    ctx.fill();

                    // Boost resmi - boyutu artırıldı
                    const size = 20 * 1.5; // 13'ten 20'ye çıkardık
                    ctx.drawImage(boostImage, -size/2, -size/2, size, size);

                    ctx.restore();
                    break;
            }
        }
    }

    // Oyuncu çizimi
    drawPlayer(ctx);

    // Mıknatıs efekti
    if (magnetActive) {
        // Yakındaki skor boncuklarına hortum efekti çiz
        powerups.forEach(powerup => {
            if (!powerup.collected && powerup.type === POWERUP_TYPES.SCORE) {
                const dx = player.x + player.width/2 - powerup.x;
                const dy = player.y + player.height/2 - powerup.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 200) {
                    // Hortum efekti
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(powerup.x, powerup.y);
                    
                    // Bezier eğrisi için kontrol noktaları
                    const midX = (powerup.x + player.x + player.width/2) / 2;
                    const midY = (powerup.y + player.y + player.height/2) / 2;
                    
                    // Sallanma efekti için sin dalgası
                    const wave = Math.sin(Date.now() / 200) * 20;
                    const ctrlX = midX + wave;
                    const ctrlY = midY + wave;
                    
                    // Hortum çizimi
                    ctx.quadraticCurveTo(
                        ctrlX, ctrlY,
                        player.x + player.width/2,
                        player.y + player.height/2
                    );
                    
                    // Gradient ve stil
                    const gradient = ctx.createLinearGradient(
                        powerup.x, powerup.y,
                        player.x + player.width/2,
                        player.y + player.height/2
                    );
                    gradient.addColorStop(0, 'rgba(255, 0, 255, 0.1)');
                    gradient.addColorStop(0.5, 'rgba(255, 0, 255, 0.3)');
                    gradient.addColorStop(1, 'rgba(255, 0, 255, 0.1)');
                    
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 10 + Math.sin(Date.now() / 100) * 3; // Kalınlık animasyonu
                    ctx.lineCap = 'round';
                    ctx.stroke();
                    
                    // Parçacık efekti
                    const particleCount = 3;
                    for (let i = 0; i < particleCount; i++) {
                        const t = (Date.now() / 500 + i / particleCount) % 1;
                        const x = powerup.x + (player.x + player.width/2 - powerup.x) * t;
                        const y = powerup.y + (player.y + player.height/2 - powerup.y) * t;
                        
                        ctx.beginPath();
                        ctx.arc(x, y, 3, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(255, 0, 255, 0.6)';
                        ctx.fill();
                    }
                    
                    ctx.restore();
                }
            }
        });
    }

    // Yıldız tozlarını çiz ve güncelle
    if (gameState === 'playing' || gameState === 'countdown') {
        ctx.save();
        starParticles.forEach(particle => {
            particle.draw(ctx);
        });
        ctx.restore();
    }

    // Boost trail çizimi
    boostTrail.draw(ctx);

    ctx.restore();

    // Skor gösterimi
    if (score > 0) {
        const scoreText = score.toString();
        ctx.font = 'bold 44px Poppins';
        ctx.textAlign = 'center';
        
        if (scoreGlowIntensity > 0) {
            ctx.shadowBlur = 20 * scoreGlowIntensity;
            ctx.shadowColor = '#836ef9';
            ctx.fillStyle = `rgba(131, 110, 249, ${scoreGlowIntensity})`;
            
            ctx.save();
            ctx.translate(canvas.width / 2, 60);
            ctx.scale(scoreScale, scoreScale);
            ctx.fillText(scoreText, 0, 0);
            ctx.restore();
        }
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#836ef9';
        ctx.fillText(scoreText, canvas.width / 2, 60);
    }

    // Geri sayım
    if (gameState === 'countdown') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height/2 - 100, canvas.width, 160);

        ctx.fillStyle = '#836ef9';
        ctx.font = 'bold 48px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText(`${countDown}`, canvas.width/2, canvas.height/2 + 20);
        
        ctx.font = 'bold 24px Poppins';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText("Get Ready!", canvas.width/2, canvas.height/2 - 40);
    }
}

// Game Over fonksiyonu
function gameOver() {
    gameState = 'gameover';
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('finalScore').textContent = score;
    document.querySelector('.controls-info').textContent = 'Press SPACE to Play Again';
    finalSound.currentTime = 0;
    finalSound.play();
    backgroundMusic.pause();
    cancelAnimationFrame(animationFrameId);
}

// Oyunu yeniden başlat
function restartGame() {
    player.x = canvas.width / 2;
    player.y = startPlatform.y - 30;
    player.velocityY = 0;
    platforms.length = 0;
    waterLevel = canvas.height + 200;
    waterRiseSpeed = baseWaterSpeed;
    score = 0;
    difficulty = 1;
    countDown = 3;
    gameStartTime = Date.now();
    
    for (let i = 0; i < 2; i++) {
        createPlatform();
    }
    
    document.getElementById('gameOver').style.display = 'none';
    document.querySelector('.controls-info').style.display = 'none';
    
    powerups.length = 0;
    magnetActive = false;
    magnetEndTime = 0;
    player.lastPlatformId = null;
    
    scoreGlowIntensity = 0;
    lastScore = 0;
    scoreScale = 1;
    
    gameState = 'countdown';
    playBackgroundMusicFromRandomPoint();
}

// Oyuncu çizim fonksiyonu
function drawPlayer(ctx) {
    ctx.save();
    
    // Oyuncunun yönüne göre çevirme
    if (player.direction === -1) {
        ctx.scale(-1, 1);
        ctx.translate(-player.x * 2 - player.width, 0);
    }
    
    // Hangi resmin kullanılacağına karar ver
    if (player.velocityY !== 0) {
        // Zıplama
        ctx.drawImage(chogJump, 
            0, 0, frameWidth, frameHeight,
            player.x, player.y, player.width, player.height
        );
    } else if (player.isMoving) {
        // Yürüme animasyonu - sadece hareket varken
        const now = Date.now();
        if (now - frameTimer > FRAME_DELAY) {
            // Yön değiştiğinde animasyonu sıfırla
            if (player.direction !== player.lastDirection) {
                currentFrame = 0;
                player.lastDirection = player.direction;
            } else {
                currentFrame = (currentFrame + 1) % frameCount;
            }
            frameTimer = now;
        }

        // Sprite sheet'ten doğru kareyi çiz
        const frameX = currentFrame * frameWidth;
        ctx.drawImage(
            chogSprite,
            frameX, 0, frameWidth, frameHeight,
            player.x, player.y, player.width, player.height
        );
    } else {
        // Durma durumunda ilk kareyi göster
        ctx.drawImage(
            chogSprite,
            0, 0, frameWidth, frameHeight,
            player.x, player.y, player.width, player.height
        );
        // Durduğunda animasyonu sıfırla
        currentFrame = 0;
    }
    
    ctx.restore();
}

// Touchpad kontrolü için değişkenler
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;

// Touchpad elementlerini al
const touchpad = document.getElementById('touchpad');
const touchIndicator = document.getElementById('touchIndicator');
const jumpButton = document.getElementById('jumpButton');

// Touchpad kontrolleri
touchpad.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const rect = touchpad.getBoundingClientRect();
    touchStartX = touch.clientX - rect.left - rect.width / 2;
    touchStartY = touch.clientY - rect.top - rect.height / 2;
    isTouching = true;
    e.preventDefault();
});

touchpad.addEventListener('touchmove', (e) => {
    if (!isTouching) return;
    
    const touch = e.touches[0];
    const rect = touchpad.getBoundingClientRect();
    const x = touch.clientX - rect.left - rect.width / 2;
    const y = touch.clientY - rect.top - rect.height / 2;
    
    // Hareket mesafesini hesapla
    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = rect.width / 2 - touchIndicator.offsetWidth / 2;
    
    // Hareket yönünü belirle
    if (x < -10) {
        keys.a = true;
        keys.d = false;
    } else if (x > 10) {
        keys.a = false;
        keys.d = true;
    } else {
        keys.a = false;
        keys.d = false;
    }
    
    // Touchpad göstergesini hareket ettir
    const limitedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(y, x);
    const indicatorX = Math.cos(angle) * limitedDistance;
    const indicatorY = Math.sin(angle) * limitedDistance;
    
    touchIndicator.style.transform = `translate(calc(-50% + ${indicatorX}px), calc(-50% + ${indicatorY}px))`;
    
    e.preventDefault();
});

touchpad.addEventListener('touchend', () => {
    isTouching = false;
    keys.a = false;
    keys.d = false;
    touchIndicator.style.transform = 'translate(-50%, -50%)';
});

// Jump button kontrolü
jumpButton.addEventListener('touchstart', (e) => {
    keys.jump = true;
    e.preventDefault();
});

jumpButton.addEventListener('touchend', () => {
    keys.jump = false;
});

// Canvas'a dokunma olayı ekle
canvas.addEventListener('touchstart', (e) => {
    if (gameState === 'firstMenu') {
        gameState = 'countdown';
        gameStartTime = Date.now();
        playBackgroundMusicFromRandomPoint();
    }
    e.preventDefault();
});

// Mobil cihaz kontrolü
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Oyun başlangıcında mobil kontrolü
if (isMobile()) {
    document.querySelector('.controls-info').style.display = 'none';
} else {
    document.querySelector('.controls-info').textContent = 'Press SPACE to Start';
}

// Space tuşu kontrolünü güncelle
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'KeyW') {
        if (!keys.jump) {
            if (gameState === 'firstMenu') {
                if (!isMobile()) { // Sadece mobil değilse space ile başlat
                    gameState = 'countdown';
                    gameStartTime = Date.now();
                    playBackgroundMusicFromRandomPoint();
                }
            } else if (gameState === 'playing') {
                if (player.canDoubleJump && !player.hasDoubleJumped) {
                    player.velocityY = player.jumpForce;
                    player.hasDoubleJumped = true;
                    jumpSound.currentTime = 0;
                    jumpSound.play();
                }
            } else if (gameState === 'gameover') {
                restartGame();
            }
        }
        keys.jump = true;
    }
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyD') keys.d = true;
}); 