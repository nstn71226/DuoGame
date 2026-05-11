import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export let groundMesh = null;
export let autoPlatforms = []; 
export let movingPlatform = null;
export let slidingBridge = null;
export let portalModel = null; 
export let interactUI = null; // Biến lưu giao diện nút E

// --- CÁC BIẾN TRẠNG THÁI & CONSTANTS ---
let button1, button2;
const platStartY = 3.7, platTargetY = 10.7; 
const platSpeedY = 0.02;

let controlPanel1, controlPanel2; 
const bridgeSpeedX = 0.15; 
const bridgeLimitMinX = 43, bridgeLimitMaxX = 61; 
let activeControllerPlayer = null;

let lastBridgeX = 43; 
let targetBridgeX = 43; 

const SAVE_POINT = new THREE.Vector3(37, 13, 4);
const PORTAL_POS = new THREE.Vector3(69, 10, -4); 
const FALL_LIMIT_Y = -10; 
let flagMesh = null;

// 💡 Cờ theo dõi trạng thái nút (Để âm thanh chỉ kêu 1 lần lúc mới giẫm)
let wasBtn1Pressed = false;
let wasBtn2Pressed = false;

export function loadMap1(scene, colliders) {
    const loader = new GLTFLoader();

    const platformsConfig = [
        { x: 45, z: 2, speed: 0.04, dir: 1 },  
        { x: 51, z: 8, speed: 0.06, dir: -1 }, 
        { x: 57, z: 5, speed: 0.03, dir: 1}   
    ];

    platformsConfig.forEach((cfg) => {
        let platGroup = new THREE.Group();
        platGroup.position.set(cfg.x, 14, cfg.z); 
        platGroup.userData = { config: cfg, box: new THREE.Box3() };
        platGroup.userData.box.setFromObject(platGroup); 
        scene.add(platGroup);
        colliders.push(platGroup); 
        autoPlatforms.push(platGroup);
    });

    slidingBridge = new THREE.Group();
    slidingBridge.position.set(43, 13, 4); 
    slidingBridge.userData.box = new THREE.Box3().setFromObject(slidingBridge);
    scene.add(slidingBridge);
    colliders.push(slidingBridge);
    
    lastBridgeX = slidingBridge.position.x;
    targetBridgeX = slidingBridge.position.x;

    const flagGroup = new THREE.Group();
    flagGroup.position.set(SAVE_POINT.x, SAVE_POINT.y + 0.5, SAVE_POINT.z);

    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888 }); 
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.castShadow = true;
    pole.receiveShadow = true;
    flagGroup.add(pole);

    const flagGeo = new THREE.PlaneGeometry(1, 0.6, 5, 5); 
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(0.5, 0.7, 0); 
    flagMesh.castShadow = true;
    flagMesh.receiveShadow = true;
    flagGroup.add(flagMesh);
    scene.add(flagGroup);

    loader.load('models/3d_portal.glb', (gltf) => {
        portalModel = gltf.scene;
        portalModel.position.copy(PORTAL_POS);
        portalModel.scale.set(0.3, 0.3, 0.3); 
        portalModel.traverse((child) => { if (child.isMesh) child.castShadow = true; });
        scene.add(portalModel);
    });

    loader.load("models/map1.glb", (gltf) => {
            const map = gltf.scene;
            map.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.userData.box = new THREE.Box3().setFromObject(child);
                    colliders.push(child);
                    if (!groundMesh) {
                        const size = new THREE.Vector3();
                        child.userData.box.getSize(size);
                        if (size.y < 1) groundMesh = child;
                    }
                }
            });
            if (!groundMesh && colliders.length > 0) groundMesh = colliders[0];
            scene.add(map);
            loadBrickAndSan(loader, scene);
        }
    );

    function loadBrickAndSan(loader, scene) {
        loader.load('models/brick.glb', (gltf) => {
            const brickModel = gltf.scene;
            brickModel.scale.set(5, 5, 5); 
            brickModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true; child.receiveShadow = true;
                    if (groundMesh && groundMesh.material) child.material = groundMesh.material;
                }
            });
            autoPlatforms.forEach((platGroup) => {
                const modelClone = brickModel.clone();
                platGroup.add(modelClone);
                platGroup.userData.box.setFromObject(platGroup);
            });
        });

        loader.load('models/san.glb', (gltf) => {
            const sanModel = gltf.scene;
            sanModel.scale.set(1.5, 1.5, 1.5); 
            sanModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true; child.receiveShadow = true;
                    if (groundMesh && groundMesh.material) child.material = groundMesh.material;
                }
            });
            slidingBridge.add(sanModel);
            slidingBridge.userData.box.setFromObject(slidingBridge);
        });
    }

    const btnGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 16);
    button1 = new THREE.Mesh(btnGeo, new THREE.MeshStandardMaterial({ color: 0xff0000 }));
    button1.position.set(25, 4.3, -2); button1.receiveShadow = true; button1.castShadow = true; scene.add(button1); button1.userData.baseY = 4.3;

    button2 = new THREE.Mesh(btnGeo, new THREE.MeshStandardMaterial({ color: 0xff0000 }));
    button2.position.set(32, 9.6, 3.8); button2.receiveShadow = true; button2.castShadow = true; scene.add(button2); button2.userData.baseY = 9.6;

    movingPlatform = new THREE.Group(); 
    movingPlatform.position.set(27, platStartY, 2); 
    scene.add(movingPlatform);
    colliders.push(movingPlatform); 

    loader.load('models/bedo.glb', (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; if (child.material) child.material.color.setHex(0xB8860B); }
        });
        movingPlatform.add(model);
    });

    const panelGeo = new THREE.BoxGeometry(0.5, 1, 0.5);
    const sharedPanelMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });
    
    controlPanel1 = new THREE.Mesh(panelGeo, sharedPanelMat); controlPanel1.position.set(37, 13, 7); scene.add(controlPanel1);
    controlPanel2 = new THREE.Mesh(panelGeo, sharedPanelMat.clone()); controlPanel2.position.set(65, 12.5, 6); scene.add(controlPanel2);

    // 💡 TẠO GIAO DIỆN CHỮ "E" BẰNG HTML/CSS
    if (!document.getElementById("interact-prompt")) {
        interactUI = document.createElement("div");
        interactUI.id = "interact-prompt";
        interactUI.style.cssText = `
            position: absolute;
            bottom: 15%;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            pointer-events: none; /* Không chặn click chuột */
            z-index: 1000;
            display: none; /* Mặc định ẩn */
            border: 2px solid #555;
            box-shadow: 0px 4px 6px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(interactUI);
    } else {
        interactUI = document.getElementById("interact-prompt");
    }
}

export function syncBridgeOnline(newX, isControlling) {
    if (slidingBridge) {
        targetBridgeX = newX;
    }
    if (controlPanel1 && controlPanel2) {
        const color = isControlling ? 0x00ff00 : 0xff0000;
        controlPanel1.material.color.setHex(color);
        controlPanel1.material.emissive.setHex(color);
        controlPanel2.material.color.setHex(color);
        controlPanel2.material.emissive.setHex(color);
    }
}

export function updateMap1(player1, player2) {
    let deltaAutoZs = []; 
    let deltaPlatY = 0;
    let deltaBridgeX = 0;
    let justReleased = false; 

    // Biến theo dõi hiển thị UI
    let shouldShowUI = false;
    let uiText = "";

    if (flagMesh) {
        const time = Date.now() * 0.003; 
        const position = flagMesh.geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            if (x > 0) { 
                const wave = Math.sin(x * 5 - time) * 0.1;
                position.setZ(i, wave);
            }
        }
        flagMesh.geometry.attributes.position.needsUpdate = true;
    }

    if (!player1.object || !player2.object) return { deltaAutoZs, deltaPlatY, deltaBridgeX, justReleased };

    function checkPlayerLogic(p, playerName) {
        if (!p.respawnPoint) p.respawnPoint = new THREE.Vector3(0, 5, 0); 

        if (p.object.position.distanceTo(SAVE_POINT) < 2.0) {
            if (!p.hasReachedSavePoint) {
                p.respawnPoint.copy(SAVE_POINT);
                p.hasReachedSavePoint = true;
                if (flagMesh && flagMesh.material) {
                    flagMesh.material.color.setHex(0xffff00); 
                    flagMesh.material.emissive.setHex(0x555500); 
                }
            }
        }
        if (p.object.position.y < FALL_LIMIT_Y) {
            p.object.position.copy(p.respawnPoint);
            if (p.velocity) p.velocity.set(0, 0, 0);
        }
    }
    checkPlayerLogic(player1, "Player 1");
    checkPlayerLogic(player2, "Player 2");

    const p1Box = player1.getBox(player1.object.position);
    const p2Box = player2.getBox(player2.object.position);

    if (autoPlatforms.length > 0) {
        autoPlatforms.forEach((platGroup) => {
            const oldZ = platGroup.position.z;
            const cfg = platGroup.userData.config;
            platGroup.position.z += cfg.speed * cfg.dir;
            if (platGroup.position.z >= 10) { platGroup.position.z = 10; cfg.dir = -1; } 
            else if (platGroup.position.z <= 0) { platGroup.position.z = 0; cfg.dir = 1; }
            if (platGroup.children.length > 0) platGroup.userData.box.setFromObject(platGroup);
            deltaAutoZs.push(platGroup.position.z - oldZ);
        });
    }

    const btn1Box = new THREE.Box3().setFromObject(button1);
    const btn2Box = new THREE.Box3().setFromObject(button2);
    let isBtn1 = p1Box.intersectsBox(btn1Box) || p2Box.intersectsBox(btn1Box);
    let isBtn2 = p1Box.intersectsBox(btn2Box) || p2Box.intersectsBox(btn2Box);
    
    if (isBtn1 && !wasBtn1Pressed) { if (window.playButtonSound) window.playButtonSound(); }
    if (isBtn2 && !wasBtn2Pressed) { if (window.playButtonSound) window.playButtonSound(); }
    wasBtn1Pressed = isBtn1;
    wasBtn2Pressed = isBtn2;

    button1.position.y = isBtn1 ? button1.userData.baseY - 0.05 : button1.userData.baseY; button1.material.color.setHex(isBtn1 ? 0x00ff00 : 0xff0000);
    button2.position.y = isBtn2 ? button2.userData.baseY - 0.05 : button2.userData.baseY; button2.material.color.setHex(isBtn2 ? 0x00ff00 : 0xff0000);

    const oldY = movingPlatform.position.y;
    if ((isBtn1 || isBtn2) && movingPlatform.position.y < platTargetY) movingPlatform.position.y += platSpeedY;
    else if (!(isBtn1 || isBtn2) && movingPlatform.position.y > platStartY) movingPlatform.position.y -= platSpeedY;
    movingPlatform.userData.box = new THREE.Box3().setFromObject(movingPlatform);
    deltaPlatY = movingPlatform.position.y - oldY;

    function checkPanels(p) {
        const dist1 = p.object.position.distanceTo(controlPanel1.position);
        const dist2 = p.object.position.distanceTo(controlPanel2.position);
        const isNear = dist1 < 1.5 || dist2 < 1.5;

        // 💡 XỬ LÝ GIAO DIỆN CHỮ E
        if (isNear) {
            shouldShowUI = true;
            if (p.isControllingDevice) {
                uiText = 'Nhấn <span style="color:#ff4444;">[E]</span> để Hủy điều khiển';
            } else if (!activeControllerPlayer) {
                uiText = 'Nhấn <span style="color:#00ff00;">[E]</span> để Điều khiển cầu';
            } else {
                uiText = 'Người khác đang điều khiển...';
            }
        }

        if (isNear && p.justPressedInteract()) {
            if (activeControllerPlayer && activeControllerPlayer !== p) return;

            p.isControllingDevice = !p.isControllingDevice;
            activeControllerPlayer = p.isControllingDevice ? p : null;
            
            if (window.playButtonSound) window.playButtonSound();

            if (!activeControllerPlayer) justReleased = true; 

            const color = activeControllerPlayer ? 0x00ff00 : 0xff0000;
            controlPanel1.material.color.setHex(color);
            controlPanel1.material.emissive.setHex(color);
            controlPanel2.material.color.setHex(color);
            controlPanel2.material.emissive.setHex(color);
        }
    }
    
    checkPanels(player1);
    checkPanels(player2);

    // 💡 CẬP NHẬT HIỂN THỊ HTML UI CHO NGƯỜI CHƠI
    if (interactUI) {
        if (shouldShowUI) {
            interactUI.style.display = "block";
            interactUI.innerHTML = uiText;
        } else {
            interactUI.style.display = "none";
        }
    }

    if (slidingBridge) {
        if (activeControllerPlayer) {
            let moveDirX = 0;
            if (activeControllerPlayer.keys[activeControllerPlayer.keyMap.left]) moveDirX = -1;
            if (activeControllerPlayer.keys[activeControllerPlayer.keyMap.right]) moveDirX = 1;

            if (moveDirX !== 0) {
                targetBridgeX = Math.max(bridgeLimitMinX, Math.min(bridgeLimitMaxX, slidingBridge.position.x + moveDirX * bridgeSpeedX));
            }
        }
        
        if (Math.abs(slidingBridge.position.x - targetBridgeX) > 0.01) {
            slidingBridge.position.x += (targetBridgeX - slidingBridge.position.x) * 0.4;
            if (slidingBridge.children.length > 0) slidingBridge.userData.box.setFromObject(slidingBridge);
        }
        
        deltaBridgeX = slidingBridge.position.x - lastBridgeX;
        lastBridgeX = slidingBridge.position.x;
    }

    return { deltaAutoZs, deltaPlatY, deltaBridgeX, justReleased };
}