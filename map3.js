import * as THREE from 'three';
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ==========================================================
// 🌌 TẢI SKYBOX RIÊNG CHO MAP 3
// ==========================================================
export let map3Skybox = null;
const cubeLoader = new THREE.CubeTextureLoader();
cubeLoader.setPath('models/skyboxmap3/'); 
map3Skybox = cubeLoader.load(
    ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'], 
    function(texture) {
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace; 
        texture.needsUpdate = true;
    },
    undefined,
    (err) => console.warn("⚠️ Không tìm thấy ảnh skybox map 3!")
);

// ==========================================
// BIẾN CHECKPOINT & CỜ
// ==========================================
const SAVE_POINT_1 = new THREE.Vector3(989, 1, -53);   
const SAVE_POINT_2 = new THREE.Vector3(988, 67, 72); 

const FALL_LIMIT_Y = -8; 
let flagMesh3 = null;

let redButton1, redButton2, redButton3, redButton4, redButton5, redButton6, redButton7, redButton8, redButton9;
let carModel1, carModel2, carModel3, carModel4A, carModel4B, carModel5, carModel6, carModel7, carModel8, carModel9;
let wall8, wall9; 

let elevatorPad; 
let elevatorButton;       
let elevatorButtonTop;    
const ELEVATOR_START_Y = -1;
const ELEVATOR_TARGET_Y = 70;
const ELEVATOR_SPEED = 10;

let movingClouds = []; 
const CLOUD_AUTO_SPEED = 0.3; 

// ==========================================================
// 🦅 BIẾN CHO CHIM BAY VÒNG TRÒN
// ==========================================================
let birdModel;
let birdMixer; 
let birdAngle = 0; 
const BIRD_SPEED = 0.8; 
const BIRD_CENTER_X = 987; 
const BIRD_CENTER_Z = -39.5;
const BIRD_RADIUS = 37.3; 
const BIRD_HEIGHT = 64; 

let coopButton1, coopButton2;
export let portalModel3 = null; 
let isPortalActive = false;

let wall8Timer = 0; 
let wall9Timer = 0; 

// KHAI BÁO BIẾN GỌI XE
let isCarSummoned1 = false;
let isCarSummoned2 = false;
let isCarSummoned3 = false;
let isCarSummoned4 = false;
let isCarSummoned5 = false;
let isCarSummoned6 = false;
let isCarSummoned7 = false;
let isCarSummoned8 = false;
let isCarSummoned9 = false;

// 💡 BIẾN KHÓA BẪY (Chỉ dùng 1 lần)
let isCarLocked1 = false;
let isCarLocked2 = false;
let isCarLocked3 = false;
let isCarLocked4 = false;
let isCarLocked5 = false;
let isCarLocked6 = false;
let isCarLocked7 = false;
let isCarLocked8 = false;
let isCarLocked9 = false;

// 💡 TỐC ĐỘ XE: Đã giảm 20% (từ 60 xuống 48)
const CAR_SPEED = 48; 

export function loadMap3(scene, colliders) {
    const map3Group = new THREE.Group();
    map3Group.position.set(1000, 0, 0); 
    scene.add(map3Group);

    const gltfLoader = new GLTFLoader();
    
    gltfLoader.load('models/map3.glb', (gltf) => {
        const mapModel = gltf.scene;
        mapModel.scale.set(1.5, 1.5, 1.5); 
        mapModel.traverse((child) => {
            if (child.isMesh) {
                child.geometry.computeBoundingBox();
                child.userData.box = new THREE.Box3().setFromObject(child);
                colliders.push(child);
            }
        });
        map3Group.add(mapModel);

        gltfLoader.load('models/car.glb', (gltfCar) => {
            carModel1 = gltfCar.scene;
            carModel1.scale.set(3, 3, 3); 
            carModel1.position.set(991, 0.7, 20); 
            carModel1.visible = false; 
            carModel1.rotation.y = Math.PI / 2; 
            carModel1.userData.box = new THREE.Box3(); 

            scene.add(carModel1);

            carModel2 = carModel1.clone(); carModel2.position.set(988, 0.7, 30); carModel2.userData.box = new THREE.Box3(); scene.add(carModel2);
            carModel3 = carModel1.clone(); carModel3.position.set(988, 0.7, 20); carModel3.userData.box = new THREE.Box3(); scene.add(carModel3);
            carModel4A = carModel1.clone(); carModel4A.position.set(988, 0.7, 50); carModel4A.userData.box = new THREE.Box3(); scene.add(carModel4A);
            carModel4B = carModel1.clone(); carModel4B.position.set(990, 0.7, 50); carModel4B.userData.box = new THREE.Box3(); scene.add(carModel4B);
            carModel5 = carModel1.clone(); carModel5.position.set(989, 0.7, 10); carModel5.userData.box = new THREE.Box3(); scene.add(carModel5);
            carModel6 = carModel1.clone(); carModel6.position.set(991, 0.7, 60); carModel6.userData.box = new THREE.Box3(); scene.add(carModel6);
            carModel7 = carModel1.clone(); carModel7.position.set(1020, 0.7, 35); carModel7.rotation.y = Math.PI; carModel7.userData.box = new THREE.Box3(); scene.add(carModel7);
            carModel8 = carModel1.clone(); carModel8.position.set(989, 0.7, 25); carModel8.rotation.y = -Math.PI / 2; carModel8.userData.box = new THREE.Box3(); scene.add(carModel8);
            carModel9 = carModel1.clone(); carModel9.position.set(991, 0.7, 22); carModel9.rotation.y = -Math.PI / 2; carModel9.userData.box = new THREE.Box3(); scene.add(carModel9);
        });
    });

    const flagGroup = new THREE.Group();
    flagGroup.position.set(SAVE_POINT_2.x, 66.5, SAVE_POINT_2.z);

    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    flagGroup.add(pole);

    const flagGeo = new THREE.PlaneGeometry(1, 0.6, 5, 5); 
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    flagMesh3 = new THREE.Mesh(flagGeo, flagMat);
    flagMesh3.position.set(0.5, 0.7, 0); 
    flagGroup.add(flagMesh3);

    scene.add(flagGroup);

    const wallGeo = new THREE.BoxGeometry(4.5, 4.5, 1);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    wall8 = new THREE.Mesh(wallGeo, wallMat); wall8.position.set(989, -5, 48); wall8.userData.box = new THREE.Box3().setFromObject(wall8); scene.add(wall8); colliders.push(wall8); 
    wall9 = new THREE.Mesh(wallGeo, wallMat.clone()); wall9.position.set(991, -5, 45); wall9.userData.box = new THREE.Box3().setFromObject(wall9); scene.add(wall9); colliders.push(wall9); 

    const buttonGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 16); 
    const buttonMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000 });
    redButton1 = new THREE.Mesh(buttonGeo, buttonMat); redButton1.position.set(991, 0.5, -10); redButton1.userData.box = new THREE.Box3().setFromObject(redButton1); scene.add(redButton1);
    redButton2 = new THREE.Mesh(buttonGeo, buttonMat.clone()); redButton2.position.set(988, 0.5, 0); redButton2.userData.box = new THREE.Box3().setFromObject(redButton2); scene.add(redButton2);
    redButton3 = new THREE.Mesh(buttonGeo, buttonMat.clone()); redButton3.position.set(988, 0.5, -10); redButton3.userData.box = new THREE.Box3().setFromObject(redButton3); scene.add(redButton3);
    redButton4 = new THREE.Mesh(buttonGeo, buttonMat.clone()); redButton4.position.set(989, 0.5, 25); redButton4.userData.box = new THREE.Box3().setFromObject(redButton4); scene.add(redButton4);
    redButton5 = new THREE.Mesh(buttonGeo, buttonMat.clone()); redButton5.position.set(989, 0.5, -20); redButton5.userData.box = new THREE.Box3().setFromObject(redButton5); scene.add(redButton5);
    redButton6 = new THREE.Mesh(buttonGeo, buttonMat.clone()); redButton6.position.set(991, 0.5, 33); redButton6.userData.box = new THREE.Box3().setFromObject(redButton6); scene.add(redButton6);
    redButton7 = new THREE.Mesh(buttonGeo, buttonMat.clone()); redButton7.position.set(988, 0.5, 35); redButton7.userData.box = new THREE.Box3().setFromObject(redButton7); scene.add(redButton7);
    redButton8 = new THREE.Mesh(buttonGeo, buttonMat.clone()); redButton8.position.set(989, 0.5, 45); redButton8.userData.box = new THREE.Box3().setFromObject(redButton8); scene.add(redButton8);
    redButton9 = new THREE.Mesh(buttonGeo, buttonMat.clone()); redButton9.position.set(991, 0.5, 42); redButton9.userData.box = new THREE.Box3().setFromObject(redButton9); scene.add(redButton9);

    [redButton1, redButton2, redButton3, redButton4, redButton5, redButton6, redButton7, redButton8, redButton9].forEach(btn => btn.visible = false);

    const coopBtnGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const coopBtnMat = new THREE.MeshStandardMaterial({ color: 0x0000ff, emissive: 0x000055 }); 

    coopButton1 = new THREE.Mesh(coopBtnGeo, coopBtnMat);
    coopButton1.position.set(950, 67, -35); 
    coopButton1.userData.baseY = 67;
    coopButton1.userData.box = new THREE.Box3().setFromObject(coopButton1);
    scene.add(coopButton1);

    coopButton2 = new THREE.Mesh(coopBtnGeo, coopBtnMat.clone());
    coopButton2.position.set(1024, 67, -44);
    coopButton2.userData.baseY = 67;
    coopButton2.userData.box = new THREE.Box3().setFromObject(coopButton2);
    scene.add(coopButton2);

    gltfLoader.load('models/3d_portal.glb', (gltf) => {
        portalModel3 = gltf.scene;
        portalModel3.position.set(980, 65.0, -63); 
        portalModel3.scale.set(0.5, 0.5, 0.5); 
        portalModel3.visible = false; 
        
        scene.add(portalModel3);
    });

    const elevBtnGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16); 
    const elevBtnMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    elevatorButton = new THREE.Mesh(elevBtnGeo, elevBtnMat);
    elevatorButton.position.set(990, 0.5, 77); 
    elevatorButton.userData.baseY = 0.5;
    elevatorButton.userData.box = new THREE.Box3().setFromObject(elevatorButton);
    scene.add(elevatorButton);

    elevatorButtonTop = new THREE.Mesh(elevBtnGeo, elevBtnMat.clone());
    elevatorButtonTop.position.set(990, 66.5, 72); 
    elevatorButtonTop.userData.baseY = 66.5;
    elevatorButtonTop.userData.box = new THREE.Box3().setFromObject(elevatorButtonTop);
    scene.add(elevatorButtonTop);

    elevatorPad = new THREE.Group();
    elevatorPad.position.set(990, ELEVATOR_START_Y, 83); 
    elevatorPad.userData.box = new THREE.Box3().setFromCenterAndSize(elevatorPad.position, new THREE.Vector3(4, 0.5, 4));
    scene.add(elevatorPad);
    colliders.push(elevatorPad); 

    const cloudPoints = [
        { start: { x: 970, y: 63, z: 21 }, end: { x: 955, y: 63, z: 10 } },    
        { start: { x: 991, y: 63, z: 15 }, end: { x: 1014, y: 63, z: -6 } },   
        { start: { x: 1014, y: 63, z: -25 }, end: { x: 1025, y: 63, z: -40 } },
        { start: { x: 983, y: 63, z: -5 }, end: { x: 983, y: 63, z: -35 } },   
        { start: { x: 945, y: 63, z: 0 }, end: { x: 948, y: 63, z: -30 } }     
    ];

    cloudPoints.forEach((pts) => {
        let cloudGroup = new THREE.Group();
        cloudGroup.position.set(pts.start.x, pts.start.y, pts.start.z); 
        
        cloudGroup.userData = {
            start: pts.start, end: pts.end, progress: 0, dir: 1, 
            box: new THREE.Box3().setFromCenterAndSize(cloudGroup.position, new THREE.Vector3(4, 0.5, 4))
        };
        
        scene.add(cloudGroup);
        colliders.push(cloudGroup);
        movingClouds.push(cloudGroup); 
    });

    gltfLoader.load('models/may.glb', (gltf) => {
        const cloudModel = gltf.scene;
        cloudModel.scale.set(1.5, 1.5, 1.5); 
        
        elevatorPad.add(cloudModel.clone());
        elevatorPad.userData.box.setFromObject(elevatorPad);

        movingClouds.forEach((cloudGroup) => {
            cloudGroup.add(cloudModel.clone());
            cloudGroup.userData.box.setFromObject(cloudGroup);
        });
    });

    gltfLoader.load('models/bird.glb', (gltf) => {
        birdModel = gltf.scene;
        birdModel.scale.set(1.5, 1.5, 1.5); 
        
        birdModel.userData.box = new THREE.Box3();

        if (gltf.animations && gltf.animations.length > 0) {
            birdMixer = new THREE.AnimationMixer(birdModel);
            const action = birdMixer.clipAction(gltf.animations[0]);
            action.play();
        }

        scene.add(birdModel);
    });
}

// 💡 HÀM ĐỒNG BỘ: Nhận lệnh từ Server để bật bẫy
export function syncMap3TrapOnline(trapId) {
    switch(trapId) {
        case 1: if (!isCarLocked1) isCarSummoned1 = true; break;
        case 2: if (!isCarLocked2) isCarSummoned2 = true; break;
        case 3: if (!isCarLocked3) isCarSummoned3 = true; break;
        case 4: if (!isCarLocked4) isCarSummoned4 = true; break;
        case 5: if (!isCarLocked5) isCarSummoned5 = true; break;
        case 6: if (!isCarLocked6) isCarSummoned6 = true; break;
        case 7: if (!isCarLocked7) isCarSummoned7 = true; break;
        case 8: if (!isCarLocked8) isCarSummoned8 = true; break;
        case 9: if (!isCarLocked9) isCarSummoned9 = true; break;
    }
}

export function resetMap3Traps() {
    isCarSummoned1 = isCarSummoned2 = isCarSummoned3 = isCarSummoned4 = isCarSummoned5 = isCarSummoned6 = isCarSummoned7 = isCarSummoned8 = isCarSummoned9 = false;
    
    // KHÔI PHỤC TRẠNG THÁI KHÓA CHO TẤT CẢ CÁC BẪY
    isCarLocked1 = isCarLocked2 = isCarLocked3 = isCarLocked4 = isCarLocked5 = isCarLocked6 = isCarLocked7 = isCarLocked8 = isCarLocked9 = false;

    wall8Timer = wall9Timer = 0;
    if (carModel1) { carModel1.position.set(991, 0.7, 20); carModel1.visible = false; }
    if (carModel2) { carModel2.position.set(988, 0.7, 30); carModel2.visible = false; }
    if (carModel3) { carModel3.position.set(988, 0.7, 20); carModel3.visible = false; }
    if (carModel4A) { carModel4A.position.set(988, 0.7, 50); carModel4A.visible = false; }
    if (carModel4B) { carModel4B.position.set(990, 0.7, 50); carModel4B.visible = false; }
    if (carModel5) { carModel5.position.set(989, 0.7, 10); carModel5.visible = false; }
    if (carModel6) { carModel6.position.set(991, 0.7, 60); carModel6.visible = false; }
    if (carModel7) { carModel7.position.set(1020, 0.7, 35); carModel7.visible = false; }
    if (carModel8) { carModel8.position.set(989, 0.7, 25); carModel8.visible = false; }
    if (carModel9) { carModel9.position.set(991, 0.7, 22); carModel9.visible = false; }
    if (wall8) wall8.position.y = -5;
    if (wall9) wall9.position.y = -5;
    [redButton1, redButton2, redButton3, redButton4, redButton5, redButton6, redButton7, redButton8, redButton9].forEach(btn => {
        if(btn) { btn.position.y = 0.5; btn.visible = false; }
    });
}

function checkCarAccident(car, player1, player2, p1Box, p2Box) {
    if (!car || !car.visible) return;
    car.userData.box.setFromObject(car); 
    
    if (p1Box.intersectsBox(car.userData.box)) { player1.object.position.copy(player1.respawnPoint || SAVE_POINT_1); player1.velocityY = 0; resetMap3Traps(); }
    if (p2Box.intersectsBox(car.userData.box)) { player2.object.position.copy(player2.respawnPoint || SAVE_POINT_1); player2.velocityY = 0; resetMap3Traps(); }
}

export function updateMap3(player1, player2, delta) {
    if (!player1.object || !player2.object) return {};
    
    // Mảng chứa ID các bẫy vừa được đạp để gửi lên server
    let triggeredTraps = [];

    if (flagMesh3) {
        const time = Date.now() * 0.003;
        const position = flagMesh3.geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            if (x > 0) { 
                const wave = Math.sin(x * 5 - time) * 0.1;
                position.setZ(i, wave);
            }
        }
        flagMesh3.geometry.attributes.position.needsUpdate = true;
    }

    function checkCheckpointsAndFall(p, playerName) {
        if (!p.respawnPoint || p.respawnPoint.x < 900) { 
            p.respawnPoint = SAVE_POINT_1.clone(); 
            p.currentCheckpointId = 0; 
        }

        if (p.object.position.distanceTo(SAVE_POINT_1) < 4.0) {
            if (p.currentCheckpointId !== 1) {
                p.respawnPoint.copy(SAVE_POINT_1);
                p.currentCheckpointId = 1;
            }
        }

        if (p.object.position.distanceTo(SAVE_POINT_2) < 5.0) {
            if (p.currentCheckpointId !== 2) {
                p.respawnPoint.copy(SAVE_POINT_2);
                p.currentCheckpointId = 2;
                
                if (flagMesh3 && flagMesh3.material) {
                    flagMesh3.material.color.setHex(0xffff00);
                    flagMesh3.material.emissive.setHex(0x555500);
                }
            }
        }

        if (p.object.position.y < FALL_LIMIT_Y || p.object.position.x < 500) {
            p.object.position.copy(p.respawnPoint);
            if (p.velocity) p.velocity.set(0, 0, 0);
        }
    }

    checkCheckpointsAndFall(player1, "Player 1");
    checkCheckpointsAndFall(player2, "Player 2");

    const p1Box = player1.getBox(player1.object.position);
    const p2Box = player2.getBox(player2.object.position);

    if (birdModel) {
        const oldX = birdModel.position.x;
        const oldZ = birdModel.position.z;

        birdAngle += BIRD_SPEED * delta;
        if (birdAngle > Math.PI * 2) birdAngle -= Math.PI * 2;

        birdModel.position.x = BIRD_CENTER_X + Math.cos(birdAngle) * BIRD_RADIUS;
        birdModel.position.z = BIRD_CENTER_Z + Math.sin(birdAngle) * BIRD_RADIUS;
        birdModel.position.y = BIRD_HEIGHT; 

        const deltaX = birdModel.position.x - oldX;
        const deltaZ = birdModel.position.z - oldZ;
        if (deltaX !== 0 || deltaZ !== 0) {
            birdModel.rotation.y = Math.atan2(deltaX, deltaZ); 
        }

        if (birdMixer) {
            birdMixer.update(delta);
        }

        birdModel.userData.box.setFromCenterAndSize(
            birdModel.position, 
            new THREE.Vector3(3, 3, 3) 
        );
        
        if (p1Box.intersectsBox(birdModel.userData.box)) {
            player1.object.position.copy(player1.respawnPoint || SAVE_POINT_1);
            player1.velocityY = 0;
        }
        if (p2Box.intersectsBox(birdModel.userData.box)) {
            player2.object.position.copy(player2.respawnPoint || SAVE_POINT_1);
            player2.velocityY = 0;
        }
    }

    if (coopButton1 && coopButton2 && portalModel3) {
        
        coopButton1.userData.box.setFromObject(coopButton1);
        coopButton2.userData.box.setFromObject(coopButton2);

        let p1OnBtn1 = p1Box.intersectsBox(coopButton1.userData.box);
        let p2OnBtn1 = p2Box.intersectsBox(coopButton1.userData.box);
        let p1OnBtn2 = p1Box.intersectsBox(coopButton2.userData.box);
        let p2OnBtn2 = p2Box.intersectsBox(coopButton2.userData.box);

        let isBtn1Pressed = p1OnBtn1 || p2OnBtn1;
        let isBtn2Pressed = p1OnBtn2 || p2OnBtn2;

        coopButton1.position.y = isBtn1Pressed ? coopButton1.userData.baseY - 0.4 : coopButton1.userData.baseY;
        coopButton1.material.color.setHex(isBtn1Pressed ? 0x00ff00 : 0x0000ff);
        coopButton1.material.emissive.setHex(isBtn1Pressed ? 0x005500 : 0x000055);

        coopButton2.position.y = isBtn2Pressed ? coopButton2.userData.baseY - 0.4 : coopButton2.userData.baseY;
        coopButton2.material.color.setHex(isBtn2Pressed ? 0x00ff00 : 0x0000ff);
        coopButton2.material.emissive.setHex(isBtn2Pressed ? 0x005500 : 0x000055);

        if (!isPortalActive && ((p1OnBtn1 && p2OnBtn2) || (p1OnBtn2 && p2OnBtn1))) {
            isPortalActive = true;
            portalModel3.visible = true; 
        }
    }

    movingClouds.forEach((cloudGroup) => {
        const data = cloudGroup.userData;
        const oldX = cloudGroup.position.x;
        const oldY = cloudGroup.position.y;
        const oldZ = cloudGroup.position.z;

        data.progress += data.dir * CLOUD_AUTO_SPEED * delta;
        if (data.progress >= 1) { data.progress = 1; data.dir = -1; }
        if (data.progress <= 0) { data.progress = 0; data.dir = 1; }

        cloudGroup.position.x = data.start.x + (data.end.x - data.start.x) * data.progress;
        cloudGroup.position.y = data.start.y + (data.end.y - data.start.y) * data.progress;
        cloudGroup.position.z = data.start.z + (data.end.z - data.start.z) * data.progress;
        data.box.setFromObject(cloudGroup);

        const deltaCloudX = cloudGroup.position.x - oldX;
        const deltaCloudY = cloudGroup.position.y - oldY;
        const deltaCloudZ = cloudGroup.position.z - oldZ;

        const cloudStandBox = new THREE.Box3().copy(data.box);
        cloudStandBox.max.y += 0.5; 

        if (p1Box.intersectsBox(cloudStandBox)) {
            player1.object.position.x += deltaCloudX;
            player1.object.position.y += deltaCloudY;
            player1.object.position.z += deltaCloudZ;
            if (deltaCloudY !== 0) player1.velocityY = 0;
            p1Box.setFromObject(player1.object);
        }
        if (p2Box.intersectsBox(cloudStandBox)) {
            player2.object.position.x += deltaCloudX;
            player2.object.position.y += deltaCloudY;
            player2.object.position.z += deltaCloudZ;
            if (deltaCloudY !== 0) player2.velocityY = 0;
            p2Box.setFromObject(player2.object);
        }
    });

    if (elevatorButton && elevatorButtonTop && elevatorPad) {
        let isElevatorCalled = p1Box.intersectsBox(elevatorButton.userData.box) || p2Box.intersectsBox(elevatorButton.userData.box) ||
                               p1Box.intersectsBox(elevatorButtonTop.userData.box) || p2Box.intersectsBox(elevatorButtonTop.userData.box);
        
        const oldElevatorY = elevatorPad.position.y;
        if (isElevatorCalled && elevatorPad.position.y < ELEVATOR_TARGET_Y) elevatorPad.position.y += ELEVATOR_SPEED * delta;
        else if (!isElevatorCalled && elevatorPad.position.y > ELEVATOR_START_Y) elevatorPad.position.y -= ELEVATOR_SPEED * delta;
        
        elevatorPad.userData.box.setFromObject(elevatorPad);
        const deltaElevatorY = elevatorPad.position.y - oldElevatorY;

        const padStandBox = new THREE.Box3().copy(elevatorPad.userData.box);
        padStandBox.max.y += 0.5; 
        if (p1Box.intersectsBox(padStandBox)) { player1.object.position.y += deltaElevatorY; player1.velocityY = 0; }
        if (p2Box.intersectsBox(padStandBox)) { player2.object.position.y += deltaElevatorY; player2.velocityY = 0; }
    }

    // =====================================
    // 🚗 LOGIC BẪY 1 LẦN DÙNG & BẮT SỰ KIỆN QUA MẠNG
    // =====================================
    if (redButton1 && !isCarSummoned1 && !isCarLocked1 && (p1Box.intersectsBox(redButton1.userData.box) || p2Box.intersectsBox(redButton1.userData.box))) {
        isCarSummoned1 = true; triggeredTraps.push(1);
    }
    if (isCarSummoned1 && carModel1) { 
        carModel1.visible = true; 
        carModel1.position.z -= CAR_SPEED * delta; 
        checkCarAccident(carModel1, player1, player2, p1Box, p2Box); 
        if(carModel1.position.z <= -40) { 
            carModel1.visible = false; 
            isCarSummoned1 = false; 
            isCarLocked1 = true; 
            carModel1.position.set(991, 0.7, 20); 
        } 
    }
    
    if (redButton2 && !isCarSummoned2 && !isCarLocked2 && (p1Box.intersectsBox(redButton2.userData.box) || p2Box.intersectsBox(redButton2.userData.box))) {
        isCarSummoned2 = true; triggeredTraps.push(2);
    }
    if (isCarSummoned2 && carModel2) { 
        carModel2.visible = true; 
        carModel2.position.z -= CAR_SPEED * delta; 
        checkCarAccident(carModel2, player1, player2, p1Box, p2Box); 
        if(carModel2.position.z <= -30) {
            carModel2.visible = false; 
            isCarSummoned2 = false; 
            isCarLocked2 = true; 
            carModel2.position.set(988, 0.7, 30); 
        } 
    }

    if (redButton3 && !isCarSummoned3 && !isCarLocked3 && (p1Box.intersectsBox(redButton3.userData.box) || p2Box.intersectsBox(redButton3.userData.box))) {
        isCarSummoned3 = true; triggeredTraps.push(3);
    }
    if (isCarSummoned3 && carModel3) { 
        carModel3.visible = true; 
        carModel3.position.z -= CAR_SPEED * delta; 
        checkCarAccident(carModel3, player1, player2, p1Box, p2Box); 
        if(carModel3.position.z <= -40) { 
            carModel3.visible = false; 
            isCarSummoned3 = false; 
            isCarLocked3 = true; 
            carModel3.position.set(988, 0.7, 20); 
        } 
    }

    if (redButton4 && !isCarSummoned4 && !isCarLocked4 && (p1Box.intersectsBox(redButton4.userData.box) || p2Box.intersectsBox(redButton4.userData.box))) {
        isCarSummoned4 = true; triggeredTraps.push(4);
    }
    if (isCarSummoned4 && carModel4A && carModel4B) {
        carModel4A.visible = carModel4B.visible = true;
        carModel4A.position.z -= CAR_SPEED * delta; 
        carModel4B.position.z -= CAR_SPEED * delta;
        checkCarAccident(carModel4A, player1, player2, p1Box, p2Box); 
        checkCarAccident(carModel4B, player1, player2, p1Box, p2Box);
        if(carModel4A.position.z <= -10) { 
            carModel4A.visible = carModel4B.visible = false; 
            isCarSummoned4 = false; 
            isCarLocked4 = true; 
            carModel4A.position.set(988, 0.7, 50); 
            carModel4B.position.set(990, 0.7, 50); 
        } 
    }

    if (redButton5 && !isCarSummoned5 && !isCarLocked5 && (p1Box.intersectsBox(redButton5.userData.box) || p2Box.intersectsBox(redButton5.userData.box))) {
        isCarSummoned5 = true; triggeredTraps.push(5);
    }
    if (isCarSummoned5 && carModel5) { 
        carModel5.visible = true; 
        carModel5.position.z -= CAR_SPEED * delta; 
        checkCarAccident(carModel5, player1, player2, p1Box, p2Box); 
        if(carModel5.position.z <= -50) { 
            carModel5.visible = false; 
            isCarSummoned5 = false; 
            isCarLocked5 = true; 
            carModel5.position.set(989, 0.7, 10); 
        } 
    }

    if (redButton6 && !isCarSummoned6 && !isCarLocked6 && (p1Box.intersectsBox(redButton6.userData.box) || p2Box.intersectsBox(redButton6.userData.box))) {
        isCarSummoned6 = true; triggeredTraps.push(6);
    }
    if (isCarSummoned6 && carModel6) { 
        carModel6.visible = true; 
        carModel6.position.z -= CAR_SPEED * delta; 
        checkCarAccident(carModel6, player1, player2, p1Box, p2Box); 
        if(carModel6.position.z <= 0) { 
            carModel6.visible = false; 
            isCarSummoned6 = false; 
            isCarLocked6 = true; 
            carModel6.position.set(991, 0.7, 60); 
        } 
    }

    if (redButton7 && !isCarSummoned7 && !isCarLocked7 && (p1Box.intersectsBox(redButton7.userData.box) || p2Box.intersectsBox(redButton7.userData.box))) {
        isCarSummoned7 = true; triggeredTraps.push(7);
    }
    if (isCarSummoned7 && carModel7) { 
        carModel7.visible = true; 
        carModel7.position.x -= CAR_SPEED * delta; 
        checkCarAccident(carModel7, player1, player2, p1Box, p2Box); 
        if(carModel7.position.x <= 960) { 
            carModel7.visible = false; 
            isCarSummoned7 = false; 
            isCarLocked7 = true; 
            carModel7.position.set(1020, 0.7, 35); 
        } 
    }

    if (redButton8 && !isCarSummoned8 && !isCarLocked8 && (p1Box.intersectsBox(redButton8.userData.box) || p2Box.intersectsBox(redButton8.userData.box))) {
        isCarSummoned8 = true; triggeredTraps.push(8);
    }
    if (isCarSummoned8) {
        wall8Timer += delta; 
        if (wall8Timer <= 3) { 
            if (wall8.position.y < 2) wall8.position.y += 15 * delta; 
        } else { 
            if (wall8.position.y > -5) wall8.position.y -= 10 * delta; 
        }
        if (carModel8) { 
            carModel8.visible = true; 
            carModel8.position.z += CAR_SPEED * delta; 
            checkCarAccident(carModel8, player1, player2, p1Box, p2Box); 
            if(carModel8.position.z >= 85) { 
                carModel8.visible = false; 
                isCarSummoned8 = false; 
                isCarLocked8 = true; 
                carModel8.position.set(989, 0.7, 25); 
                wall8Timer = 0; 
            }
        }
    }

    if (redButton9 && !isCarSummoned9 && !isCarLocked9 && (p1Box.intersectsBox(redButton9.userData.box) || p2Box.intersectsBox(redButton9.userData.box))) {
        isCarSummoned9 = true; triggeredTraps.push(9);
    }
    if (isCarSummoned9) {
        wall9Timer += delta; 
        if (wall9Timer <= 3) { 
            if (wall9.position.y < 2) wall9.position.y += 15 * delta; 
        } else { 
            if (wall9.position.y > -5) wall9.position.y -= 10 * delta; 
        }
        if (carModel9) { 
            carModel9.visible = true; 
            carModel9.position.z += CAR_SPEED * delta; 
            checkCarAccident(carModel9, player1, player2, p1Box, p2Box); 
            if(carModel9.position.z >= 82) { 
                carModel9.visible = false; 
                isCarSummoned9 = false; 
                isCarLocked9 = true; 
                carModel9.position.set(991, 0.7, 22); 
                wall9Timer = 0; 
            }
        }
    }
    
    // Trả về mảng bẫy để main.js gửi lên Server
    return { triggeredTraps };
}