import * as THREE from 'three';
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ColladaLoader } from "three/addons/loaders/ColladaLoader.js"; 
import { Boss } from './boss.js'; 

export let button1, button2, barrier, fireZone;
export let fireSparks = [];
export let fireLightLite = null;

export let map4Skybox = null; 
export let finalBoss = null; 
export let flagCloth = null; 

const barrierBaseY = 3; 

// ==========================================
// 📍 ĐIỂM LƯU (SAVE POINT) & GIỚI HẠN RƠI
// ==========================================
const SAVE_POINT_1 = new THREE.Vector3(476, 2, 505);
const SAVE_POINT_2 = new THREE.Vector3(490, 1, 472); 
const FALL_LIMIT_Y = -8; 

// --- DỮ LIỆU CỦA ZOMBIE ---
export let zombieData = {
    model: null,
    mixer: null,
    actions: {},       
    activeAction: null,
    state: 'idle',     
    speed: 1.7,        
    agroRange: 10,     
    attackRange: 2,  
    isDead: false,
    health: 3,         
    spawnPos: new THREE.Vector3(502, 0.1, 488),
    attackTimer: 0,
    hasHit: false,
    currentTarget: null
};

// --- DỮ LIỆU ĐẠI BÁC ---
export let cannonData = {
    model: null,       
    barrel: null,
    bulletModel: null,     
    bullets: [],
    isControlled: false,
    lastFireTime: 0,
    cooldown: 3000,    
    pos: new THREE.Vector3(495, 0.5, 502) 
};

let activeCannonPlayer = null; 
let cannonJustReleased = false;

// --- HÀM CHUYỂN ĐỔI ANIMATION ---
function setZombieAnim(newState) {
    if (zombieData.state === newState || zombieData.state === 'die') return;
    const nextAction = zombieData.actions[newState];
    if (!nextAction) return; 
    if (zombieData.activeAction) zombieData.activeAction.fadeOut(0.2); 
    nextAction.reset().fadeIn(0.2).play(); 
    zombieData.activeAction = nextAction;
    zombieData.state = newState;
}

export function loadMap4(scene, colliders) {
    // -------------------------------------------------------------
    // 🌌 TẢI SKYBOX RIÊNG CHO MAP 4
    // -------------------------------------------------------------
    const cubeLoader = new THREE.CubeTextureLoader();
    cubeLoader.setPath('models/skyboxmap4/'); 
    
    map4Skybox = cubeLoader.load([
        'px.jpg', 'nx.jpg', 
        'py.jpg', 'ny.jpg', 
        'pz.jpg', 'nz.jpg'
    ], (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace; 
    });

    const map4Group = new THREE.Group();
    map4Group.position.set(510, 0, 500); 
    scene.add(map4Group);

    const gltfLoader = new GLTFLoader();
    
    gltfLoader.load('models/map4.glb', (gltf) => {
        const mapModel = gltf.scene;
        mapModel.scale.set(2, 2, 2); 
        
        let map4Material = null; 

        mapModel.traverse((child) => {
            if (child.isMesh) {
                // 💡 BẬT ĐỔ BÓNG CHO MAP 4
                child.castShadow = true; 
                child.receiveShadow = true; 
                
                child.geometry.computeBoundingBox();
                const size = new THREE.Vector3();
                child.geometry.boundingBox.getSize(size);
                if (size.x > 0.5 || size.y > 0.5 || size.z > 0.5) {
                    child.userData.box = new THREE.Box3().setFromObject(child);
                    colliders.push(child);
                }
                if (!map4Material) map4Material = child.material;
            }
        });
        map4Group.add(mapModel);

        const cannonGroup = new THREE.Group();
        cannonGroup.position.copy(cannonData.pos);
        scene.add(cannonGroup);

        gltfLoader.load('models/daibac.glb', (gltfCannon) => {
            const daibacModel = gltfCannon.scene;
            
            daibacModel.scale.set(1.5, 1.5, 1.5); 
            daibacModel.position.y = -0.5; 
            daibacModel.rotation.y = -Math.PI / 2; 
            
            const cannonMat = new THREE.MeshStandardMaterial({ color: 0x442222, emissive: 0xff0000, emissiveIntensity: 0.5 });
            
            daibacModel.traverse((child) => {
                if (child.isMesh) {
                    // 💡 BẬT ĐỔ BÓNG CHO ĐẠI BÁC
                    child.castShadow = true; 
                    child.receiveShadow = true;
                    child.material = cannonMat; 
                }
            });
            cannonGroup.add(daibacModel);
            cannonData.model = daibacModel;

            cannonData.barrel = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.3, 0.3), 
                new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            cannonData.barrel.position.set(0, 0.05, 0);
            cannonData.barrel.rotation.y = Math.PI;
            cannonData.barrel.visible = false; 
            cannonGroup.add(cannonData.barrel); 
        });

        gltfLoader.load('models/dan.glb', (gltfDan) => {
            const danModel = gltfDan.scene;
            danModel.scale.set(1, 1, 1); 
            danModel.traverse((child) => {
                if (child.isMesh) {
                    // 💡 BẬT ĐỔ BÓNG CHO ĐẠN ĐẠI BÁC
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (map4Material) child.material = map4Material;
                }
            });
            cannonData.bulletModel = danModel;
        });

        const fireGeo = new THREE.BoxGeometry(18, 0.3, 20); 
        const fireMat = new THREE.MeshStandardMaterial({
            color: 0xff3300, emissive: 0xff1100, emissiveIntensity: 1, transparent: true, opacity: 0.8
        });
        fireZone = new THREE.Mesh(fireGeo, fireMat);
        fireZone.position.set(477, 0.15, 483); 
        fireZone.userData.box = new THREE.Box3().setFromObject(fireZone);
        scene.add(fireZone);

        const sparkGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });

        for (let i = 0; i < 50; i++) { 
            const spark = new THREE.Mesh(sparkGeo, sparkMat.clone()); 
            spark.position.set(
                475 + (Math.random() - 0.5) * 14, 
                0.15 + Math.random() * 2,
                485 + (Math.random() - 0.5) * 15  
            );
            spark.userData = {
                speedY: 1.5 + Math.random() * 2,
                life: Math.random()
            };
            scene.add(spark);
            fireSparks.push(spark);
        }

        fireLightLite = new THREE.PointLight(0xff5500, 350, 35);
        fireLightLite.position.set(475, 1.5, 485);
        fireLightLite.castShadow = false; 
        scene.add(fireLightLite);

        gltfLoader.load('models/key.glb', (gltfKey) => {
            const keyModel = gltfKey.scene;
            keyModel.scale.set(1, 1, 1); 
            const goldMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffd700, emissive: 0x443300, metalness: 0.8, roughness: 0.2        
            });
            keyModel.traverse((child) => {
                if (child.isMesh) { 
                    // 💡 BẬT ĐỔ BÓNG CHO CHÌA KHÓA
                    child.castShadow = true; 
                    child.receiveShadow = true; 
                    child.material = goldMaterial; 
                }
            });
            button1 = keyModel.clone(); button1.position.set(475, 0.5, 520); button1.userData = { isCollected: false }; scene.add(button1);
            button2 = keyModel.clone(); button2.position.set(448, 0.5, 466); button2.userData = { isCollected: false }; scene.add(button2);
        });
    });

    const daeLoader = new ColladaLoader();
    daeLoader.load('models/zombieidle.dae', (collada) => {
        const zModel = collada.scene;
        zModel.scale.set(0.015, 0.015, 0.015);
        zModel.position.copy(zombieData.spawnPos); 
        zModel.traverse((child) => { 
            if (child.isMesh) { 
                // 💡 BẬT ĐỔ BÓNG CHO ZOMBIE
                child.castShadow = true; 
                child.receiveShadow = true; 
            } 
        });
        scene.add(zModel);
        zombieData.model = zModel;
        zombieData.mixer = new THREE.AnimationMixer(zModel);
        const baseClip = collada.animations[0];
        const idleAction = zombieData.mixer.clipAction(baseClip);
        zombieData.actions['idle'] = idleAction;
        idleAction.play();
        zombieData.activeAction = idleAction;

        const animFiles = [
            { name: 'run', path: 'models/zombierun.dae' }, { name: 'attack', path: 'models/zombieattack.dae' }, { name: 'die', path: 'models/zombiedie.dae' }
        ];
        animFiles.forEach(file => {
            daeLoader.load(file.path, (animCollada) => {
                const clip = animCollada.animations[0];
                if (baseClip && clip.tracks.length === baseClip.tracks.length) {
                    for (let i = 0; i < clip.tracks.length; i++) clip.tracks[i].name = baseClip.tracks[i].name;
                } else { clip.tracks.forEach(track => track.name = track.name.replace(/^.*?\//, '')); }
                const action = zombieData.mixer.clipAction(clip);
                if (file.name === 'die') { action.setLoop(THREE.LoopOnce); action.clampWhenFinished = true; }
                zombieData.actions[file.name] = action;
            });
        });
    });

    barrier = new THREE.Mesh(new THREE.BoxGeometry(4, 7, 0.5), new THREE.MeshStandardMaterial({ color: 0x444444 }));
    barrier.position.set(490.5, 1, 474); 
    // 💡 BẬT ĐỔ BÓNG CHO RÀO CHẮN
    barrier.castShadow = true;
    barrier.receiveShadow = true;
    barrier.userData.box = new THREE.Box3().setFromObject(barrier);
    scene.add(barrier);
    colliders.push(barrier); 

    finalBoss = new Boss(scene, new THREE.Vector3(490, 1, 450), colliders);

    const flagGroup = new THREE.Group();
    flagGroup.position.copy(SAVE_POINT_2);
    scene.add(flagGroup);

    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1; 
    // 💡 BẬT ĐỔ BÓNG CHO CỘT CỜ
    pole.castShadow = true;
    pole.receiveShadow = true;
    flagGroup.add(pole);

    const clothGeo = new THREE.PlaneGeometry(1.8, 1);
    const clothMat = new THREE.MeshStandardMaterial({ 
        color: 0xff0000, 
        side: THREE.DoubleSide
    });
    flagCloth = new THREE.Mesh(clothGeo, clothMat);
    flagCloth.position.set(1, 2.5, 0); 
    // 💡 BẬT ĐỔ BÓNG CHO VẢI CỜ
    flagCloth.castShadow = true;
    flagCloth.receiveShadow = true;
    flagGroup.add(flagCloth);
}

function fireCannon(scene) {
    const now = Date.now();
    if (now - cannonData.lastFireTime < cannonData.cooldown) return; 
    if (!cannonData.bulletModel) return;

    cannonData.lastFireTime = now;
    console.log("🚀 BÙM! Khai hỏa!");

    const bullet = cannonData.bulletModel.clone();
    const barrelWorldPos = new THREE.Vector3();
    cannonData.barrel.getWorldPosition(barrelWorldPos);
    bullet.position.copy(barrelWorldPos);

    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(cannonData.barrel.getWorldQuaternion(new THREE.Quaternion()));
    bullet.quaternion.copy(cannonData.barrel.getWorldQuaternion(new THREE.Quaternion()));

    bullet.userData = { velocity: direction.multiplyScalar(10), life: 10 }; 
    scene.add(bullet);
    cannonData.bullets.push(bullet);
}

export function tryFire(scene) {
    if (cannonData.isControlled) fireCannon(scene);
}

export function syncCannonOnline(isControlling) {
    cannonData.isControlled = isControlling;
    if (cannonData.model) {
        const color = isControlling ? 0x00ff00 : 0xff0000;
        cannonData.model.traverse((child) => {
            if (child.isMesh && child.material) child.material.emissive.setHex(color);
        });
    }
}

// HÀM ĐỒNG BỘ ZOMBIE TỪ MẠNG (DÀNH CHO MÁY CLIENT)
export function syncZombieOnline(data) {
    if (!zombieData.model) return;
    
    zombieData.model.position.copy(data.position);
    zombieData.model.quaternion.copy(data.quaternion);
    zombieData.health = data.health;
    
    if (data.isDead && !zombieData.isDead) {
        zombieData.isDead = true;
        setZombieAnim('die');
    } else if (!zombieData.isDead) {
        setZombieAnim(data.state);
    }
}

export function updateMap4(player1, player2, delta = 0.016, scene, isHost = true) {
    if (!barrier || !player1.object || !player2.object) return {};
    
    cannonJustReleased = false; 

    // ----------------------------------------
    // 🛡️ LOGIC LƯU ĐIỂM VÀ RƠI VỰC
    // ----------------------------------------
    function checkCheckpointsAndFall(p) {
        if (!p.respawnPoint) {
            p.respawnPoint = SAVE_POINT_1.clone();
        }
        
        if (p.object.position.distanceTo(SAVE_POINT_1) < 4.0) {
            p.respawnPoint.copy(SAVE_POINT_1);
        }

        if (p.object.position.distanceTo(SAVE_POINT_2) < 2.0) {
            p.respawnPoint.copy(SAVE_POINT_2);
            if (flagCloth) {
                flagCloth.material.color.setHex(0x00ff00); 
            }
        }

        if (p.object.position.y < FALL_LIMIT_Y) {
            p.object.position.copy(p.respawnPoint);
            if (p.velocity) p.velocity.set(0, 0, 0);
        }
    }
    checkCheckpointsAndFall(player1);
    checkCheckpointsAndFall(player2);

    // ----------------------------------------
    // 🔥 LOGIC BÃI LỬA 
    // ----------------------------------------
    if (fireZone) {
        fireZone.material.opacity = 0.6 + Math.random() * 0.4;
        if (fireSparks.length > 0) {
            fireSparks.forEach(spark => {
                spark.position.y += spark.userData.speedY * delta;
                spark.userData.life += delta * 1.5;
                const scale = Math.max(0, 1 - spark.userData.life);
                spark.scale.set(scale, scale, scale);
                spark.material.opacity = 1 - spark.userData.life;
                if (spark.userData.life > 0.6) spark.material.color.setHex(0xff0000);
                else if (spark.userData.life > 0.3) spark.material.color.setHex(0xff5500);
                else spark.material.color.setHex(0xffaa00);
                if (spark.userData.life >= 1) {
                    spark.userData.life = 0;
                    spark.position.set(475 + (Math.random() - 0.5) * 14, 0.15, 485 + (Math.random() - 0.5) * 15);
                }
            });
        }
        if (fireLightLite) fireLightLite.intensity = 300 + Math.random() * 100;

        const p1Box = player1.getBox(player1.object.position);
        const p2Box = player2.getBox(player2.object.position);

        if (p1Box.intersectsBox(fireZone.userData.box)) {
            player1.object.position.copy(player1.respawnPoint || SAVE_POINT_1);
            if (player1.velocity) player1.velocity.set(0, 0, 0);
            player1.velocityY = 0; 
        }

        if (p2Box.intersectsBox(fireZone.userData.box)) {
            player2.object.position.copy(player2.respawnPoint || SAVE_POINT_1);
            if (player2.velocity) player2.velocity.set(0, 0, 0);
            player2.velocityY = 0; 
        }
    }

    // ----------------------------------------
    // 💣 BẬT/TẮT ĐIỀU KHIỂN ĐẠI BÁC
    // ----------------------------------------
    function checkCannonInteraction(p) {
        const distToCannon = p.object.position.distanceTo(cannonData.pos);
        if (distToCannon < 4 && p.justPressedInteract()) {
            
            if (activeCannonPlayer && activeCannonPlayer !== p) return;

            cannonData.isControlled = !cannonData.isControlled;
            p.isControllingDevice = cannonData.isControlled; 
            
            activeCannonPlayer = p.isControllingDevice ? p : null;
            if (!activeCannonPlayer) cannonJustReleased = true; 
            
            if (cannonData.model) {
                const color = activeCannonPlayer ? 0x00ff00 : 0xff0000;
                cannonData.model.traverse((child) => {
                    if (child.isMesh && child.material) child.material.emissive.setHex(color);
                });
            }
        }
    }
    
    checkCannonInteraction(player1);
    checkCannonInteraction(player2);

    if (scene) {
        for (let i = cannonData.bullets.length - 1; i >= 0; i--) {
            const b = cannonData.bullets[i];
            b.position.add(b.userData.velocity.clone().multiplyScalar(delta));
            b.userData.life -= delta;

            if (isHost && zombieData.model && !zombieData.isDead) {
                if (b.position.distanceTo(zombieData.model.position) < 2.5) { 
                    zombieData.health--;
                    scene.remove(b);
                    cannonData.bullets.splice(i, 1);

                    if (zombieData.health <= 0) {
                        zombieData.isDead = true;
                        setZombieAnim('die');
                    }
                    continue;
                }
            }
            
            if (finalBoss && !finalBoss.isDead && finalBoss.model) {
                if (b.position.distanceTo(finalBoss.model.position) < 4.0) { 
                    finalBoss.takeDamage(10); 
                    scene.remove(b);
                    cannonData.bullets.splice(i, 1);
                    continue;
                }
            }
            
            if (b.userData.life <= 0) {
                scene.remove(b);
                cannonData.bullets.splice(i, 1);
            }
        }
    }

    if (finalBoss) {
        finalBoss.update(delta, player1, player2);
        player1.updateBossAttack(delta, finalBoss);
        player2.updateBossAttack(delta, finalBoss);
    }
    
    // ----------------------------------------
    // 🧠 AI CỦA ZOMBIE 
    // ----------------------------------------
    if (zombieData.model) {
        if (zombieData.mixer) zombieData.mixer.update(delta);

        if (isHost && !zombieData.isDead) {
            const zPos = zombieData.model.position;
            const p1Pos = player1.object.position;
            const p2Pos = player2.object.position;
            const d1 = zPos.distanceTo(p1Pos);
            const d2 = zPos.distanceTo(p2Pos);

            let target = null; let minDist = Infinity;
            if (d1 < zombieData.agroRange) { target = player1; minDist = d1; }
            if (d2 < zombieData.agroRange && d2 < minDist) { target = player2; minDist = d2; }

            if (zombieData.state === 'attack') {
                zombieData.attackTimer += delta;
                
                const hitTime = 0.8; 
                const animTime = 1.5; 

                if (zombieData.attackTimer >= hitTime && !zombieData.hasHit && zombieData.currentTarget) {
                    let cTarget = zombieData.currentTarget;
                    
                    if (zPos.distanceTo(cTarget.object.position) < zombieData.attackRange + 1.5) {
                        cTarget.object.position.copy(cTarget.respawnPoint || SAVE_POINT_1);
                        if (cTarget.velocity) cTarget.velocity.set(0, 0, 0);
                        cTarget.velocityY = 0;
                        if (cTarget.isControllingDevice) {
                            cTarget.isControllingDevice = false;
                            cannonData.isControlled = false;
                        }
                    }
                    zombieData.hasHit = true; 
                }

                if (zombieData.attackTimer >= animTime) {
                    zombieData.state = 'evaluating'; 
                }

            } else {
                if (target) {
                    const targetPos = new THREE.Vector3(target.object.position.x, zPos.y, target.object.position.z);
                    zombieData.model.lookAt(targetPos);
                    
                    if (minDist > zombieData.attackRange) {
                        setZombieAnim('run'); 
                        zombieData.model.translateZ(zombieData.speed * delta);
                    } else { 
                        setZombieAnim('attack'); 
                        zombieData.attackTimer = 0; 
                        zombieData.hasHit = false;  
                        zombieData.currentTarget = target; 
                    }
                } else {
                    const distToSpawn = zPos.distanceTo(zombieData.spawnPos);
                    if (distToSpawn > 0.5) { 
                        const homePos = new THREE.Vector3(zombieData.spawnPos.x, zPos.y, zombieData.spawnPos.z);
                        zombieData.model.lookAt(homePos);
                        setZombieAnim('run'); 
                        zombieData.model.translateZ(zombieData.speed * delta);
                    } else { setZombieAnim('idle'); }
                }
            }
        }
    }

    // ----------------------------------------
    // 🔑 HỆ THỐNG NHẶT CHÌA KHÓA
    // ----------------------------------------
    const pickupRadius = 1.5; 
    if (button1 && !button1.userData.isCollected && button1.parent) {
        button1.rotation.y += delta; 
        if (player1.object.position.distanceTo(button1.position) < pickupRadius || player2.object.position.distanceTo(button1.position) < pickupRadius) {
            button1.userData.isCollected = true; scene.remove(button1); 
        }
    }
    if (button2 && !button2.userData.isCollected && button2.parent) {
        button2.rotation.y += delta; 
        if (player1.object.position.distanceTo(button2.position) < pickupRadius || player2.object.position.distanceTo(button2.position) < pickupRadius) {
            button2.userData.isCollected = true; scene.remove(button2);
        }
    }

    // ----------------------------------------
    // ⛩️ ĐIỀU KIỆN MỞ RÀO CHẮN
    // ----------------------------------------
    const hasAllKeys = (button1 && button1.userData.isCollected) && (button2 && button2.userData.isCollected);
    if (hasAllKeys && zombieData.isDead) {
        if (barrier.position.y > -5) {
            barrier.position.y -= 0.05;
            barrier.userData.box.setFromObject(barrier);
        }
    }

    // Trích xuất Data của Zombie để Host trả về cho Network
    let zombieSyncData = null;
    if (isHost && zombieData.model) {
        zombieSyncData = {
            position: zombieData.model.position.clone(),
            quaternion: zombieData.model.quaternion.clone(), 
            state: zombieData.state,
            health: zombieData.health,
            isDead: zombieData.isDead
        };
    }

    return { cannonJustReleased, zombieSyncData };
}