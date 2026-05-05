import * as THREE from 'three';
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// 💡 BIẾN CHO HỆ THỐNG CẦU KÍNH
let glassPlatforms = [];
let glassTimer = 0;
let glassState = true; 

// 💡 BIẾN CHO TƯỜNG VÀ 2 NÚT BẤM CO-OP
let wallModel2;
let buttonLeft, buttonRight;
let isWallUnlocked = false; 

// 💡 Cờ theo dõi trạng thái âm thanh
let wasLeftPressed = false;
let wasRightPressed = false;

const WALL_START_Y = 5; 
const WALL_TARGET_Y = -5; 
const WALL_SPEED = 5; 

// ==========================================
// BIẾN CHECKPOINT, CỜ, SKYBOX VÀ CỔNG
// ==========================================
const SAVE_POINT_1 = new THREE.Vector3(998, 4, 1000);
const SAVE_POINT_2 = new THREE.Vector3(1014, 22, 950);
const PORTAL_POS_2 = new THREE.Vector3(1015, 41, 1015); // 💡 Vị trí cổng Map 2
const FALL_LIMIT_Y = -10; 
let flagMesh2 = null;

export let map2Skybox = null; 
export let portalModel2 = null; // 💡 Biến lưu model cổng của Map 2

export function loadMap2(scene, colliders) {
    const cubeLoader = new THREE.CubeTextureLoader();
    cubeLoader.setPath('models/skyboxmap2/'); 
    map2Skybox = cubeLoader.load(
        ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'],
        (texture) => {
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.needsUpdate = true;
        },
        undefined,
        (err) => console.warn("⚠️ Lỗi tải Skybox Map 2")
    );

    const map2Group = new THREE.Group();
    map2Group.position.set(1000, 0, 1000); 
    scene.add(map2Group);

    const gltfLoader = new GLTFLoader();
    
    // 1. TẢI MAP CHÍNH 
    gltfLoader.load('models/map2.glb', (gltf) => {
        const mapModel = gltf.scene;
        mapModel.scale.set(2, 2, 2); 
        mapModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;    
                child.receiveShadow = true; 
                child.geometry.computeBoundingBox();
                child.userData.box = new THREE.Box3().setFromObject(child);
                colliders.push(child);
            }
        });
        map2Group.add(mapModel);
    });

    // ==========================================
    // TẢI CỔNG DỊCH CHUYỂN SANG MAP 3
    // ==========================================
    gltfLoader.load('models/3d_portal.glb', (gltf) => {
        portalModel2 = gltf.scene;
        portalModel2.position.copy(PORTAL_POS_2);
        portalModel2.scale.set(0.3, 0.3, 0.3); // Scale bé lại giống hệt Map 1
        
        portalModel2.traverse((child) => {
            if (child.isMesh) child.castShadow = true;
        });
        
        scene.add(portalModel2);
    });

    // ==========================================
    // TẠO LÁ CỜ TẠI SAVE POINT 2
    // ==========================================
    const flagGroup = new THREE.Group();
    flagGroup.position.set(SAVE_POINT_2.x, SAVE_POINT_2.y + 1, SAVE_POINT_2.z);

    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.castShadow = true;
    pole.receiveShadow = true;
    flagGroup.add(pole);

    const flagGeo = new THREE.PlaneGeometry(1, 0.6, 5, 5); 
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    flagMesh2 = new THREE.Mesh(flagGeo, flagMat);
    flagMesh2.position.set(0.5, 0.7, 0); 
    flagMesh2.castShadow = true;
    flagMesh2.receiveShadow = true;
    flagGroup.add(flagMesh2);

    scene.add(flagGroup);

    // 2. TẢI VÀ TẠO 8 BỆ KÍNH NHẤP NHÁY
    gltfLoader.load('models/kinh.glb', (gltf) => {
        const baseGlass = gltf.scene;
        baseGlass.scale.set(1.5, 1.5, 1.5); 
        
        baseGlass.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        for (let i = 0; i < 4; i++) {
            const zPos = 957.5 + (i * 4.5);
            let glassLeft = baseGlass.clone();
            glassLeft.position.set(1017, 21.5, zPos);
            glassLeft.userData = { pairIndex: i, isLeft: true, box: new THREE.Box3() }; 
            scene.add(glassLeft);
            colliders.push(glassLeft);
            glassPlatforms.push(glassLeft);

            let glassRight = baseGlass.clone();
            glassRight.position.set(1013, 21.5, zPos);
            glassRight.userData = { pairIndex: i, isLeft: false, box: new THREE.Box3() }; 
            scene.add(glassRight);
            colliders.push(glassRight);
            glassPlatforms.push(glassRight);
        }
        applyGlassState();
    });

    // 3. TẢI BỨC TƯỜNG (Y = 5)
    gltfLoader.load('models/tuong2.glb', (gltf) => {
        wallModel2 = gltf.scene;
        wallModel2.position.set(997.5, WALL_START_Y, 977);
        wallModel2.scale.set(3, 3, 3); 
        
        wallModel2.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        wallModel2.userData.box = new THREE.Box3();
        scene.add(wallModel2);
        colliders.push(wallModel2); 
    });

    // TẠO 2 NÚT BẤM
    const btnGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 32); 
    const btnMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    buttonLeft = new THREE.Mesh(btnGeo, btnMat);
    buttonLeft.position.set(993, 5, 981); 
    buttonLeft.castShadow = true;    
    buttonLeft.receiveShadow = true; 
    buttonLeft.userData = { baseY: 5, box: new THREE.Box3().setFromObject(buttonLeft) };
    scene.add(buttonLeft);

    buttonRight = new THREE.Mesh(btnGeo, btnMat.clone());
    buttonRight.position.set(1002, 5, 981); 
    buttonRight.castShadow = true;    
    buttonRight.receiveShadow = true; 
    buttonRight.userData = { baseY: 5, box: new THREE.Box3().setFromObject(buttonRight) };
    scene.add(buttonRight);
}

function applyGlassState() {
    glassPlatforms.forEach(plat => {
        const i = plat.userData.pairIndex;
        const isLeft = plat.userData.isLeft;
        let isVisible = (isLeft) ? (glassState === (i % 2 === 0)) : !(glassState === (i % 2 === 0));
        plat.visible = isVisible;
        plat.position.y = isVisible ? 21.5 : -1000; 
        if (plat.userData.box) plat.userData.box.setFromObject(plat);
    });
}

export function updateMap2(player1, player2, delta) {
    if (!player1.object || !player2.object) return;

    if (flagMesh2) {
        const time = Date.now() * 0.003;
        const position = flagMesh2.geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            if (x > 0) { 
                const wave = Math.sin(x * 5 - time) * 0.1;
                position.setZ(i, wave);
            }
        }
        flagMesh2.geometry.attributes.position.needsUpdate = true;
    }

    function checkCheckpointsAndFall(p, playerName) {
        if (!p.respawnPoint) {
            p.respawnPoint = new THREE.Vector3(1000, 5, 1000); 
            p.currentCheckpointId = 0; 
        }

        if (p.object.position.distanceTo(SAVE_POINT_1) < 2.0) {
            if (p.currentCheckpointId !== 1) {
                p.respawnPoint.copy(SAVE_POINT_1);
                p.currentCheckpointId = 1;
            }
        }

        if (p.object.position.distanceTo(SAVE_POINT_2) < 2.0) {
            if (p.currentCheckpointId !== 2) {
                p.respawnPoint.copy(SAVE_POINT_2);
                p.currentCheckpointId = 2;
                
                if (flagMesh2 && flagMesh2.material) {
                    flagMesh2.material.color.setHex(0xffff00);
                    flagMesh2.material.emissive.setHex(0x555500);
                }
            }
        }

        if (p.object.position.y < FALL_LIMIT_Y) {
            p.object.position.copy(p.respawnPoint);
            if (p.velocity) p.velocity.set(0, 0, 0);
        }
    }

    checkCheckpointsAndFall(player1, "Player 1");
    checkCheckpointsAndFall(player2, "Player 2");

    if (glassPlatforms.length === 8) {
        glassTimer += delta;
        if (glassTimer >= 1.0) {
            glassTimer = 0; glassState = !glassState; applyGlassState(); 
        }
    }

    if (buttonLeft && buttonRight && wallModel2) {
        const p1Box = player1.getBox(player1.object.position);
        const p2Box = player2.getBox(player2.object.position);

        const interactBoxLeft = buttonLeft.userData.box.clone().expandByScalar(0.4);
        const interactBoxRight = buttonRight.userData.box.clone().expandByScalar(0.4);

        const isLeftPressed = p1Box.intersectsBox(interactBoxLeft) || p2Box.intersectsBox(interactBoxLeft);
        const isRightPressed = p1Box.intersectsBox(interactBoxRight) || p2Box.intersectsBox(interactBoxRight);

        // 💡 GỌI ÂM THANH KHI GIẪM NÚT ĐỎ Ở MAP 2
        if (isLeftPressed && !wasLeftPressed) { if (window.playButtonSound) window.playButtonSound(); }
        if (isRightPressed && !wasRightPressed) { if (window.playButtonSound) window.playButtonSound(); }
        wasLeftPressed = isLeftPressed;
        wasRightPressed = isRightPressed;

        buttonLeft.position.y = isLeftPressed ? 4.92 : 5;
        buttonLeft.material.color.setHex(isLeftPressed ? 0x00ff00 : 0xff0000);

        buttonRight.position.y = isRightPressed ? 4.92 : 5;
        buttonRight.material.color.setHex(isRightPressed ? 0x00ff00 : 0xff0000);

        if (isLeftPressed && isRightPressed) {
            isWallUnlocked = true; 
        }

        if (isWallUnlocked) {
            if (wallModel2.position.y > WALL_TARGET_Y) {
                wallModel2.position.y -= WALL_SPEED * delta;
                wallModel2.userData.box.setFromObject(wallModel2);
            }
        }
    }
}