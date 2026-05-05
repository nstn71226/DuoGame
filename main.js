import * as THREE from "three";
import { loadMap1, updateMap1, syncBridgeOnline, autoPlatforms, movingPlatform, slidingBridge, portalModel } from "./map1.js"; 
import { loadMap2, updateMap2, map2Skybox, portalModel2 } from "./map2.js"; 
import { loadMap3, updateMap3, syncMap3TrapOnline, map3Skybox, portalModel3, resetMap3Traps } from "./map3.js"; 
import { loadMap4, updateMap4, tryFire, syncCannonOnline, map4Skybox, zombieData, finalBoss, button1, button2, barrier, flagCloth, syncZombieOnline } from "./map4.js"; 
import { Player } from "./player.js";
import { io } from "https://cdn.socket.io/4.7.4/socket.io.esm.min.js";

const clock = new THREE.Clock();
const scene = new THREE.Scene();

let currentMap = 0; 
let isGameStarted = false;

// 💡 SỬA: Đổi cờ Transition thành biến toàn cục để Player.js nhận diện lúc đổi map (tránh phát tiếng Die)
window.isTransitioning = false; 

let gameMode = 'local'; 
let myRole = 'player1'; 
let socket = null;
let isNetworkPause = false; 

// ==========================================
// 🎵 HỆ THỐNG ÂM THANH NỀN & SFX
// ==========================================
window.isSFXOn = true;
window.isMusicOn = true;

// 1. Nhạc In-game
const bgMusic = new Audio('models/musicnen.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.15; 

// 2. Nhạc Menu
const menuMusic = new Audio('models/nhacnenmenu.mp3');
menuMusic.loop = true;
menuMusic.volume = 0.3;

// 3. Âm thanh Click UI
const clickSound = new Audio('models/amthanhclick.mp3');
clickSound.volume = 1.0; 

// 4. Âm thanh Đạp nút (Gọi từ Map1)
window.buttonSound = new Audio('models/damnut.mp3');
window.buttonSound.volume = 1.0;
window.playButtonSound = function() {
    if (window.isSFXOn && window.buttonSound) {
        window.buttonSound.currentTime = 0;
        window.buttonSound.play().catch(() => {});
    }
};

// Cài đặt BGM từ Setting
const toggleMusic = document.getElementById('toggle-music');
if (toggleMusic) {
    toggleMusic.addEventListener('change', (e) => {
        window.isMusicOn = e.target.checked;
        if (window.isMusicOn) {
            if (isGameStarted) bgMusic.play().catch(() => {});
            else menuMusic.play().catch(() => {});
        } else {
            bgMusic.pause();
            menuMusic.pause();
        }
    });
}

// Cài đặt SFX từ Setting
const toggleSfx = document.getElementById('toggle-sfx');
if (toggleSfx) {
    toggleSfx.addEventListener('change', (e) => {
        window.isSFXOn = e.target.checked;
    });
}

// Click Menu phát tiếng
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('close-modal')) {
        if (window.isSFXOn !== false) {
            clickSound.currentTime = 0; 
            clickSound.play().catch(() => {});
        }
    }
});

// Chạy nhạc Menu từ Click đầu tiên 
const playMenuInit = () => {
    if (!isGameStarted && window.isMusicOn) {
        menuMusic.play().catch(() => {});
    }
    document.removeEventListener('click', playMenuInit);
};
document.addEventListener('click', playMenuInit);

// --- ĐỊA CHỈ SERVER ---
const SERVER_URL = 'https://duo-game-sv.onrender.com';

const cubeLoader = new THREE.CubeTextureLoader();
cubeLoader.setPath('models/'); 

const skyboxTexture = cubeLoader.load(
    ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
    function(texture) {
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace; 
        texture.needsUpdate = true;
    }
);

scene.background = skyboxTexture; 
scene.environment = skyboxTexture;
scene.fog = new THREE.Fog(0xfff3b0, 10, 80); 
scene.add(new THREE.AmbientLight(0xfff3b0, 0.6)); 

const dirLight = new THREE.DirectionalLight(0xffcc44, 4.0); 
dirLight.position.set(20, 35, 15); 
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024; 
dirLight.shadow.mapSize.height = 1024;

const d = 20; 
dirLight.shadow.camera.left = -d; dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d; dirLight.shadow.camera.bottom = -d;
dirLight.shadow.camera.far = 80; 
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const lightTarget = new THREE.Object3D();
lightTarget.position.set(0, 0, 0); 
scene.add(lightTarget);
dirLight.target = lightTarget;

const aspect = (window.innerWidth / 2) / window.innerHeight; 
const camera1 = new THREE.PerspectiveCamera(75, aspect, 0.1, 80); 
const camera2 = new THREE.PerspectiveCamera(75, aspect, 0.1, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1); 
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; 
renderer.shadowMap.type = THREE.PCFShadowMap; 
renderer.toneMapping = THREE.ACESFilmicToneMapping; 
renderer.toneMappingExposure = 0.9; 
renderer.setScissorTest(true); 
document.body.appendChild(renderer.domElement);

const colliders = [];
loadMap1(scene, colliders);
loadMap2(scene, colliders); 
loadMap3(scene, colliders); 
loadMap4(scene, colliders); 

const portalBox = new THREE.Box3();  
const portalBox2 = new THREE.Box3(); 
const portalBox3 = new THREE.Box3(); 

const keysP1 = { forward: 'w', backward: 's', left: 'a', right: 'd', jump: ' ', interact: 'e', attack: 'mouse0' };
const keysP2 = { forward: 'arrowup', backward: 'arrowdown', left: 'arrowleft', right: 'arrowright', jump: 'enter', interact: 'p', attack: 'l' };
const p1Anims = { idle: 'models/Dwarf Idle.dae', run: 'models/Medium Run.dae', jump: 'models/jump.dae' };

const player1 = new Player(scene, colliders, "models/nhanvat2.dae", keysP1, new THREE.Vector3(-2, 5, 2), null, p1Anims, true);
const player2 = new Player(scene, colliders, "models/nhanvat.dae", keysP2, new THREE.Vector3(0, 5, 2), 0, null, true);

const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const instructionElm = document.getElementById('map-instruction');
let isInstructionVisible = false;
let instructionTimeout;

const mapHints = {
    1: `<div class="hint-title">MAP 1</div>
        🎯 <b>Mục tiêu:</b> Phối hợp giữa các nhân vật để vượt chướng ngại vật.<br><br>
        ⚙️ <b>Cơ chế chính:</b> Nút bấm và Trụ điều khiển.`,
    2: `<div class="hint-title">MAP 2</div>
        🎯 <b>Mục tiêu:</b> Phối hợp cùng nhau vượt chướng ngại vật.`,
    3: `<div class="hint-title">MAP 3</div>
        🎯 <b>Mục tiêu:</b> chạm khối cầu lơ lửng màu xanh cùng lúc để mở cổng.`,
    4: `<div class="hint-title">MAP 4</div>
        🎯 <b>Mục tiêu:</b> Tìm chìa khóa và Tiêu diệt Boss.`
};

function updateAndShowInstruction(mapNum) {
    if (!instructionElm) return;
    instructionElm.innerHTML = mapHints[mapNum] + `<div class="hint-toggle-text">[ Bấm V để Bật / Tắt bảng hướng dẫn ]</div>`;
    instructionElm.style.opacity = "1";
    isInstructionVisible = true;
    if (instructionTimeout) clearTimeout(instructionTimeout);
    instructionTimeout = setTimeout(() => { instructionElm.style.opacity = "0"; isInstructionVisible = false; }, 7000);
}

function toggleInstruction() {
    if (!instructionElm || !isGameStarted) return;
    if (instructionTimeout) clearTimeout(instructionTimeout);
    isInstructionVisible = !isInstructionVisible;
    instructionElm.style.opacity = isInstructionVisible ? "1" : "0";
}

function showLoadingScreen(text, actionCallback) {
    loadingText.innerText = text;
    loadingScreen.style.display = 'flex'; 
    let progress = 0;
    loadingBar.style.width = '0%';
    if(actionCallback) actionCallback();
    const interval = setInterval(() => {
        progress += Math.random() * 30; 
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            loadingBar.style.width = '100%';
            setTimeout(() => { loadingScreen.style.display = 'none'; }, 300);
        } else {
            loadingBar.style.width = progress + '%';
        }
    }, 100); 
}

function optimizeTextures() {
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    scene.traverse((child) => {
        if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(mat => {
                if (mat.map) { mat.map.generateMipmaps = true; mat.map.minFilter = THREE.LinearMipmapLinearFilter; mat.map.anisotropy = maxAnisotropy; mat.map.needsUpdate = true; }
            });
        }
    });
}

function transitionToMap(targetMap) {
    if (currentMap === targetMap || window.isTransitioning) return;
    window.isTransitioning = true; 

    showLoadingScreen(`LOADING MAP ${targetMap}...`, () => {
        currentMap = targetMap; 
        updateAndShowInstruction(targetMap);
        
        executeMapReset(targetMap);

        let lightTargetPos = { 1: [20,35,15, 0,0,0], 2: [1020,35,1015, 1000,0,1000], 3: [1020,35,15, 1000,0,0], 4: [520,35,515, 500,0,500] };
        let lPos = lightTargetPos[targetMap];
        dirLight.position.set(lPos[0], lPos[1], lPos[2]); 
        lightTarget.position.set(lPos[3], lPos[4], lPos[5]);
        dirLight.shadow.camera.updateProjectionMatrix();

        let targetSkybox = targetMap === 2 ? map2Skybox : (targetMap === 3 ? map3Skybox : (targetMap === 4 ? map4Skybox : skyboxTexture));
        if (targetSkybox) { scene.background = targetSkybox; scene.environment = targetSkybox; }

        window.isTransitioning = false; 
    });
}

function startGame() {
    document.getElementById('mode-select-modal').style.display = 'none';
    document.getElementById('main-menu').style.display = 'none';

    if (gameMode === 'local') {
        player1.isLocal = true; player1.keyMap = keysP1;
        player2.isLocal = true; player2.keyMap = keysP2;
    } else {
        if (myRole === 'player1') {
            player1.isLocal = true; player1.keyMap = keysP1;
            player2.isLocal = false; 
        } else {
            player2.isLocal = true; player2.keyMap = keysP1; 
            player1.isLocal = false; 
        }
    }

    optimizeTextures();
    isGameStarted = true;
    transitionToMap(1); 
    document.body.requestPointerLock(); 
    
    // 💡 TẮT NHẠC MENU & BẮT ĐẦU NHẠC NỀN GAME
    menuMusic.pause();
    if (window.isMusicOn) {
        bgMusic.play().catch(e => console.log("Cần click chuột vào màn hình để phát nhạc"));
    }
}

document.getElementById('local-mode-btn').addEventListener('click', () => { gameMode = 'local'; startGame(); });

function initOnline(roomId, action) {
    if (!socket) {
        socket = io(SERVER_URL);

        socket.on('connect', () => { 
            socket.emit(action, roomId);
        });
        
        socket.on('initPlayer', (data) => {
            myRole = data.role;
            gameMode = 'online';
            startGame();
        });

        socket.on('playerMoved', (data) => {
            let remotePlayer = (data.role === 'player1') ? player1 : player2;
            if (remotePlayer && remotePlayer.object) {
                if (remotePlayer.syncNetworkData) {
                    remotePlayer.syncNetworkData(data.x, data.y, data.z, data.rotationY, data.anim);
                } else {
                    remotePlayer.object.position.set(data.x, data.y, data.z);
                    remotePlayer.object.rotation.y = data.rotationY;
                }
                remotePlayer.cameraAngleX = data.camX || 0;
                remotePlayer.cameraAngleY = data.camY || 0.5;

                if (data.isDead && !remotePlayer.isDead) {
                    remotePlayer.isDead = true;
                    remotePlayer.deathTimer = 5.0; 
                    remotePlayer.object.visible = false;
                } else if (!data.isDead && remotePlayer.isDead) {
                    remotePlayer.isDead = false;
                    remotePlayer.object.visible = true;
                }
            }
        });

        socket.on('gameAction', (actionData) => {
            if (actionData.type === 'pauseGame') {
                isNetworkPause = true;
                document.exitPointerLock(); 
                if (pauseMenu) pauseMenu.style.display = 'flex';
            }
            if (actionData.type === 'resumeGame') {
                isNetworkPause = true;
                if (pauseMenu) pauseMenu.style.display = 'none';
            }

            if (actionData.type === 'fireCannon' && currentMap === 4) tryFire(scene); 
            if (actionData.type === 'syncBridge' && currentMap === 1) syncBridgeOnline(actionData.x, actionData.isControlling);
            if (actionData.type === 'triggerMap3Trap' && currentMap === 3) syncMap3TrapOnline(actionData.trapId);
            if (actionData.type === 'syncCannon' && currentMap === 4) syncCannonOnline(actionData.isControlling);
            if (actionData.type === 'changeMap') transitionToMap(actionData.targetMap);
            if (actionData.type === 'resetMapState') executeMapReset(actionData.targetMap);
            if (actionData.type === 'bossTakeDamage' && currentMap === 4) {
                if (finalBoss && !finalBoss.isDead) finalBoss.takeDamage(actionData.damage);
            }
            if (actionData.type === 'triggerBossArena' && currentMap === 4) {
                if (finalBoss) {
                    finalBoss.bossArenaTriggered = true;
                    window.arenaSynced = true;
                }
            }
            if (actionData.type === 'syncZombie' && currentMap === 4 && myRole === 'player2') {
                syncZombieOnline(actionData.zombieData);
            }
        });
    } else {
        socket.emit(action, roomId);
    }
}

document.getElementById('host-game-btn').addEventListener('click', () => {
    let roomId = document.getElementById('server-ip-input').value.trim();
    if (roomId) initOnline(roomId, 'createRoom');
});

document.getElementById('join-game-btn').addEventListener('click', () => {
    let roomId = document.getElementById('server-ip-input').value.trim();
    if (roomId) initOnline(roomId, 'joinRoom');
});

// ==========================================
// 💡 CỖ MÁY DỌN DẸP SỰ KIỆN (RESET MAP)
// ==========================================
function executeMapReset(mapIndex) {
    const startMapPositions = {
        1: [new THREE.Vector3(-2, 5, 2), new THREE.Vector3(0, 5, 2)],
        2: [new THREE.Vector3(998, 4, 1000), new THREE.Vector3(995, 4, 1000)],
        3: [new THREE.Vector3(989, 1, -53), new THREE.Vector3(987, 1, -53)],
        4: [new THREE.Vector3(481, 8, 505), new THREE.Vector3(480, 8, 505)]
    };
    
    player1.object.position.copy(startMapPositions[mapIndex][0]);
    player2.object.position.copy(startMapPositions[mapIndex][1]);
    
    if (player1.targetPosition) player1.targetPosition.copy(startMapPositions[mapIndex][0]);
    if (player2.targetPosition) player2.targetPosition.copy(startMapPositions[mapIndex][1]);

    player1.spawnPoint.copy(startMapPositions[mapIndex][0]);
    player2.spawnPoint.copy(startMapPositions[mapIndex][1]);

    player1.respawnPoint = startMapPositions[mapIndex][0].clone(); 
    player2.respawnPoint = startMapPositions[mapIndex][1].clone();
    player1.velocityY = player2.velocityY = 0;

    if (mapIndex === 1) {
        if (movingPlatform) movingPlatform.position.y = 3.7;
        if (slidingBridge) {
            slidingBridge.position.x = 43;
            if (slidingBridge.userData.box) slidingBridge.userData.box.setFromObject(slidingBridge);
        }
    } 
    else if (mapIndex === 3) {
        if (portalModel3) portalModel3.visible = false;
        if (typeof resetMap3Traps === 'function') resetMap3Traps();
    } 
    else if (mapIndex === 4) {
        if (barrier) {
            barrier.position.y = 1; 
            if (barrier.userData.box) barrier.userData.box.setFromObject(barrier);
        }
        if (flagCloth) {
            flagCloth.material.color.setHex(0xff0000);
        }
        if (zombieData && zombieData.model) {
            zombieData.health = 3;
            zombieData.isDead = false;
            zombieData.state = 'idle';
            zombieData.hasHit = false;
            zombieData.attackTimer = 0;
            zombieData.model.position.copy(zombieData.spawnPos);
            if (zombieData.activeAction) zombieData.activeAction.stop();
            if (zombieData.actions['idle']) {
                zombieData.actions['idle'].reset().play();
                zombieData.activeAction = zombieData.actions['idle'];
            }
        }
        
        if (finalBoss && typeof finalBoss.resetBoss === 'function') {
            finalBoss.resetBoss();
        }

        if (button1) {
            button1.userData.isCollected = false;
            button1.position.set(475, 0.5, 520);
            if (!button1.parent) scene.add(button1);
        }
        if (button2) {
            button2.userData.isCollected = false;
            button2.position.set(448, 0.5, 466);
            if (!button2.parent) scene.add(button2);
        }
    }
}

// ==========================================
// 💡 LOGIC MENU TẠM DỪNG (PAUSE MENU) ĐỒNG BỘ
// ==========================================
const pauseMenu = document.getElementById('pause-menu-modal');

document.addEventListener('pointerlockchange', () => {
    if (isGameStarted) {
        if (document.pointerLockElement === document.body) {
            if (pauseMenu) pauseMenu.style.display = 'none';
            if (gameMode === 'online' && socket && !isNetworkPause) {
                socket.emit('gameAction', { type: 'resumeGame' });
            }
            isNetworkPause = false; 
            clock.getDelta(); // 💡 VÁ LỖI ALT-TAB
        } else {
            if (pauseMenu) pauseMenu.style.display = 'flex';
            if (gameMode === 'online' && socket && !isNetworkPause) {
                socket.emit('gameAction', { type: 'pauseGame' });
            }
            isNetworkPause = false;
        }
    }
});

if (pauseMenu) pauseMenu.addEventListener('mousedown', (e) => e.stopPropagation());

const resumeBtn = document.getElementById('resume-btn');
if (resumeBtn) resumeBtn.addEventListener('click', () => {
    clock.getDelta(); // 💡 VÁ LỖI ALT-TAB
    document.body.requestPointerLock();
});

const resetMapBtn = document.getElementById('reset-map-btn');
if (resetMapBtn) resetMapBtn.addEventListener('click', () => {
    if (pauseMenu) pauseMenu.style.display = 'none';
    document.body.requestPointerLock();
    
    if (gameMode === 'online' && socket) {
        socket.emit('gameAction', { type: 'resetMapState', targetMap: currentMap });
    }
    
    executeMapReset(currentMap);
});

const exitMainMenuBtn = document.getElementById('exit-main-menu-btn');
if (exitMainMenuBtn) exitMainMenuBtn.addEventListener('click', () => {
    location.reload(); 
});

// ----------------------------------

window.addEventListener('keydown', (e) => {
    if (!isGameStarted) return; 
    if (e.key.toLowerCase() === 'v') { toggleInstruction(); return; }

    if (['1','2','3','4'].includes(e.key)) {
        let targetMap = parseInt(e.key);
        if (currentMap !== targetMap) {
            transitionToMap(targetMap);
            if (gameMode === 'online' && socket) {
                socket.emit('gameAction', { type: 'changeMap', targetMap: targetMap });
            }
        }
    }
});

document.body.addEventListener('mousedown', (e) => { 
    if (isGameStarted && document.pointerLockElement !== document.body && pauseMenu.style.display !== 'flex') {
        document.body.requestPointerLock(); 
    }
});

window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === document.body) {
      if (gameMode === 'local' || myRole === 'player1') {
          player1.cameraAngleX -= e.movementX * 0.003; 
          player1.cameraAngleY += e.movementY * 0.003; 
          player1.cameraAngleY = Math.max(-0.2, Math.min(1.5, player1.cameraAngleY)); 
      }
      if (gameMode === 'online' && myRole === 'player2') {
          player2.cameraAngleX -= e.movementX * 0.003; 
          player2.cameraAngleY += e.movementY * 0.003; 
          player2.cameraAngleY = Math.max(-0.2, Math.min(1.5, player2.cameraAngleY)); 
      }
  }
});

window.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement === document.body && e.button === 0 && currentMap === 4) { 
        let localPlayer = (gameMode === 'online' && myRole === 'player2') ? player2 : player1;
        tryFire(scene); 
        if (socket && gameMode === 'online') socket.emit('gameAction', { type: 'fireCannon' });
    }
});

function movePlayerWithPlatforms(player, deltaX, deltaY, deltaZ, platformObj) {
    if (!player.object || !platformObj.userData.box) return;
    const pBox = player.getBox(player.object.position);
    const playerFeetY = pBox.min.y;
    const platformTopY = platformObj.userData.box.max.y;
    pBox.min.y -= 0.2; 
    
    if (pBox.intersectsBox(platformObj.userData.box)) {
        if (playerFeetY >= platformTopY - 0.3) {
            player.object.position.x += deltaX; 
            player.object.position.y += deltaY; 
            player.object.position.z += deltaZ;
        } else {
            if (deltaX !== 0) player.object.position.x += deltaX * 1.2;
            if (deltaZ !== 0) player.object.position.z += deltaZ * 1.2;
        }
    }
}

window.addEventListener("resize", () => {
    const newAspect = (window.innerWidth / 2) / window.innerHeight;
    camera1.aspect = newAspect; camera1.updateProjectionMatrix();
    camera2.aspect = newAspect; camera2.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  
  if(!isGameStarted) return;

  if (player1.object && !player1.object.userData.isScaled) {
      player1.object.scale.multiplyScalar(0.8); 
      player1.object.userData.isScaled = true; 
  }

  const delta = Math.min(clock.getDelta(), 0.1); // 💡 VÁ LỖI ALT-TAB CHÍNH
  
  const portals = [{m: 1, p: portalModel, b: portalBox}, {m: 2, p: portalModel2, b: portalBox2}, {m: 3, p: portalModel3, b: portalBox3}];
  portals.forEach(port => {
      if (currentMap === port.m && player1.object && player2.object && port.p && (port.p.visible !== false)) {
          port.b.setFromObject(port.p); port.b.expandByScalar(-0.5); 
          
          if (player1.getBox(player1.object.position).intersectsBox(port.b) && player2.getBox(player2.object.position).intersectsBox(port.b)) {
              let tMap = port.m + 1;
              if (currentMap !== tMap && !window.isTransitioning) {
                  transitionToMap(tMap);
                  if (gameMode === 'online' && socket) {
                      socket.emit('gameAction', { type: 'changeMap', targetMap: tMap });
                  }
              }
          }
      }
  });

  if (currentMap === 1) {
      const map1Deltas = updateMap1(player1, player2) || {};
      if (autoPlatforms && autoPlatforms.length > 0 && map1Deltas.deltaAutoZs) {
          autoPlatforms.forEach((plat, i) => { if (map1Deltas.deltaAutoZs[i] !== 0) { movePlayerWithPlatforms(player1, 0, 0, map1Deltas.deltaAutoZs[i], plat); movePlayerWithPlatforms(player2, 0, 0, map1Deltas.deltaAutoZs[i], plat); } });
      }
      if (map1Deltas.deltaPlatY && map1Deltas.deltaPlatY !== 0 && movingPlatform) { movePlayerWithPlatforms(player1, 0, map1Deltas.deltaPlatY, 0, movingPlatform); movePlayerWithPlatforms(player2, 0, map1Deltas.deltaPlatY, 0, movingPlatform); }
      if (map1Deltas.deltaBridgeX && map1Deltas.deltaBridgeX !== 0 && slidingBridge) { movePlayerWithPlatforms(player1, map1Deltas.deltaBridgeX, 0, 0, slidingBridge); movePlayerWithPlatforms(player2, map1Deltas.deltaBridgeX, 0, 0, slidingBridge); }
      
      if (gameMode === 'online' && socket) {
          let localPlayer = (myRole === 'player1') ? player1 : player2;
          if (localPlayer.isControllingDevice || map1Deltas.justReleased) {
              socket.emit('gameAction', { type: 'syncBridge', x: slidingBridge.position.x, isControlling: !!localPlayer.isControllingDevice });
          }
      }
  } else if (currentMap === 2) { 
      updateMap2(player1, player2, delta); 
  } else if (currentMap === 3) { 
      const map3Deltas = updateMap3(player1, player2, delta) || {}; 
      if (gameMode === 'online' && socket && map3Deltas.triggeredTraps && map3Deltas.triggeredTraps.length > 0) {
          map3Deltas.triggeredTraps.forEach(trapId => { socket.emit('gameAction', { type: 'triggerMap3Trap', trapId: trapId }); });
      }
  } else if (currentMap === 4) {
      const isHost = (gameMode === 'local' || myRole === 'player1');
      const map4Deltas = updateMap4(player1, player2, delta, scene, isHost); 
      let localPlayer = (gameMode === 'online' && myRole === 'player2') ? player2 : player1;
      
      if (finalBoss && !finalBoss.isPatched) {
          const origKill = finalBoss.killPlayer.bind(finalBoss);
          finalBoss.killPlayer = function(p) {
              if (p.isLocal) origKill(p); 
          };
          finalBoss.isPatched = true;
      }

      if (finalBoss && finalBoss.bossArenaTriggered && !window.arenaSynced) {
          window.arenaSynced = true;
          if (socket && gameMode === 'online') socket.emit('gameAction', { type: 'triggerBossArena' });
      }
      if (finalBoss && !finalBoss.bossArenaTriggered) {
          window.arenaSynced = false;
      }

      if (localPlayer.justPressedFire()) {
          tryFire(scene);
          if (socket && gameMode === 'online') socket.emit('gameAction', { type: 'fireCannon' });
      }

      if (gameMode === 'online' && socket) {
          if (localPlayer.isControllingDevice || map4Deltas.cannonJustReleased) {
              socket.emit('gameAction', { type: 'syncCannon', isControlling: !!localPlayer.isControllingDevice });
          }
          if (localPlayer.justDamagedBoss) {
              localPlayer.justDamagedBoss = false; 
              socket.emit('gameAction', { type: 'bossTakeDamage', damage: 2 });
          }
          
          if (isHost && map4Deltas.zombieSyncData) {
              socket.emit('gameAction', { 
                  type: 'syncZombie', 
                  zombieData: map4Deltas.zombieSyncData 
              });
          }
      }
  }

  // 💡 MẶT TRỜI BÁM THEO NGƯỜI CHƠI (Tối ưu hóa bóng đổ)
  if (player1.object && player2.object) {
      const midX = (player1.object.position.x + player2.object.position.x) / 2;
      const midY = (player1.object.position.y + player2.object.position.y) / 2;
      const midZ = (player1.object.position.z + player2.object.position.z) / 2;

      lightTarget.position.set(midX, midY, midZ);
      dirLight.position.set(midX + 20, midY + 35, midZ + 15);
      dirLight.shadow.camera.updateProjectionMatrix();
  }

  player1.update(camera1); 
  player2.update(camera2);
  
  if (gameMode === 'online') {
      if (myRole === 'player1') player2.updateCameraOrbit(camera2);
      else player1.updateCameraOrbit(camera1);
  }

  player1.updateAnimation(delta); 
  player2.updateAnimation(delta);

  if (gameMode === 'online' && socket) {
      let activeLocalPlayer = (myRole === 'player1') ? player1 : player2;
      if (activeLocalPlayer && activeLocalPlayer.object && !window.isTransitioning) {
          socket.emit('playerMovement', {
              x: activeLocalPlayer.object.position.x,
              y: activeLocalPlayer.object.position.y,
              z: activeLocalPlayer.object.position.z,
              rotationY: activeLocalPlayer.object.rotation.y,
              anim: activeLocalPlayer.currentAnimName,
              camX: activeLocalPlayer.cameraAngleX, 
              camY: activeLocalPlayer.cameraAngleY,
              isDead: activeLocalPlayer.isDead 
          });
      }
  }

  const halfWidth = window.innerWidth / 2;
  renderer.setViewport(0, 0, halfWidth, window.innerHeight);
  renderer.setScissor(0, 0, halfWidth, window.innerHeight);
  renderer.render(scene, camera1);
  
  renderer.setViewport(halfWidth, 0, halfWidth, window.innerHeight);
  renderer.setScissor(halfWidth, 0, halfWidth, window.innerHeight);
  renderer.render(scene, camera2);
}
animate();