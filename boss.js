import * as THREE from 'three';
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

export class Boss {
    constructor(scene, spawnPos = new THREE.Vector3(490, 1, 450), colliders = []) {
        this.scene = scene;
        this.colliders = colliders;
        this.position = spawnPos.clone(); 
        
        this.maxHealth = 20;
        this.health = this.maxHealth;
        this.isDead = false;
        
        this.state = 'idle'; 
        this.speed = 0; 
        
        this.attackRange = 4.0;   
        this.punchRange = 1.5;    
        this.aggroRange = 40.0; 
        
        this.dashTimer = 0;   
        this.attackTimer = 0; 
        this.punchTimer = 0;  
        
        this.kickCooldown = 0;    
        
        this.flairCooldown = 15.0; 
        this.flairTimer = 0;      
        this.flairWave1 = false;  
        this.flairWave2 = false;  

        this.runslowCooldown = 20.0; 
        this.runslowTimer = 0;       
        
        this.bullets = [];
        this.bossArenaTriggered = false; 
        this.isThemePlaying = false; 

        this.model = null;
        this.mixer = null;
        this.animations = {};
        this.currentAction = null;
        this.box = new THREE.Box3();
        
        this.debugBox = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2)), 0xff0000);
        this.scene.add(this.debugBox);
        this.debugBox.visible = false; 

        // 💡 KHỞI TẠO ÂM THANH
        this.initAudio();
        
        this.initUI();
        this.initArena(); 
        this.loadBoss();
    }

    // ==========================================
    // 💡 HỆ THỐNG ÂM THANH BOSS
    // ==========================================
    initAudio() {
        this.bossTheme = new Audio('models/bosstheme.mp3');
        this.bossTheme.loop = true;
        this.bossTheme.volume = 0.5;

        this.bossKickSingle = new Audio('models/bosskick.mp3');
        this.bossKickSingle.volume = 1.0;

        this.bossKickLoop = new Audio('models/bosskick.mp3');
        this.bossKickLoop.loop = true;
        this.bossKickLoop.volume = 1.0;
    }

    playTheme() {
        if (window.isMusicOn && !this.isThemePlaying) {
            // Tắt nhạc nền cũ của game
            if (window.bgMusic) window.bgMusic.pause();
            
            this.bossTheme.currentTime = 0;
            this.bossTheme.play().catch(()=>{});
            this.isThemePlaying = true;
        }
    }

    stopTheme() {
        if (this.isThemePlaying) {
            this.bossTheme.pause();
            this.isThemePlaying = false;
            
            // Bật lại nhạc nền game
            if (window.isMusicOn && window.bgMusic) {
                window.bgMusic.play().catch(()=>{});
            }
        }
    }

    playSingleKick() {
        if (window.isSFXOn !== false) {
            this.bossKickSingle.currentTime = 0;
            this.bossKickSingle.play().catch(()=>{});
        }
    }

    startLoopKick() {
        if (window.isSFXOn !== false && this.bossKickLoop.paused) {
            this.bossKickLoop.currentTime = 0;
            this.bossKickLoop.play().catch(()=>{});
        }
    }

    stopLoopKick() {
        if (!this.bossKickLoop.paused) {
            this.bossKickLoop.pause();
        }
    }

    // ==========================================
    // 💡 TẠO GIAO DIỆN (UI)
    // ==========================================
    initUI() {
        if (!document.getElementById('bossHealthContainer')) {
            this.healthContainer = document.createElement('div');
            this.healthContainer.id = 'bossHealthContainer';
            this.healthContainer.style.position = 'absolute';
            this.healthContainer.style.top = '20px';
            this.healthContainer.style.left = '50%';
            this.healthContainer.style.transform = 'translateX(-50%)';
            this.healthContainer.style.width = '400px';
            this.healthContainer.style.height = '25px';
            this.healthContainer.style.backgroundColor = '#222';
            this.healthContainer.style.border = '3px solid #000';
            this.healthContainer.style.borderRadius = '5px';
            this.healthContainer.style.display = 'none'; 
            this.healthContainer.style.zIndex = '1000';
            this.healthContainer.style.boxShadow = '0px 0px 10px rgba(255, 0, 0, 0.5)';

            this.healthBar = document.createElement('div');
            this.healthBar.style.width = '100%';
            this.healthBar.style.height = '100%';
            this.healthBar.style.backgroundColor = '#ff0000';
            this.healthBar.style.transition = 'width 0.2s ease-out';

            const bossName = document.createElement('div');
            bossName.innerText = "SHEN"; 
            bossName.style.position = 'absolute';
            bossName.style.top = '-22px';
            bossName.style.left = '50%';
            bossName.style.transform = 'translateX(-50%)';
            bossName.style.color = '#fff';
            bossName.style.fontFamily = 'Arial, sans-serif';
            bossName.style.fontWeight = 'bold';
            bossName.style.fontSize = '18px';
            bossName.style.textShadow = '1px 1px 2px #000';

            this.healthContainer.appendChild(this.healthBar);
            this.healthContainer.appendChild(bossName);
            document.body.appendChild(this.healthContainer);
        } else {
            this.healthContainer = document.getElementById('bossHealthContainer');
            this.healthBar = this.healthContainer.children[0];
        }

        if (!document.getElementById('deathScreenP1')) {
            this.deathScreenP1 = this.createHalfDeathScreen('deathScreenP1', 'left');
            this.p1CountdownText = this.deathScreenP1.children[1];
        } else {
            this.deathScreenP1 = document.getElementById('deathScreenP1');
            this.p1CountdownText = this.deathScreenP1.children[1];
        }

        if (!document.getElementById('deathScreenP2')) {
            this.deathScreenP2 = this.createHalfDeathScreen('deathScreenP2', 'right');
            this.p2CountdownText = this.deathScreenP2.children[1];
        } else {
            this.deathScreenP2 = document.getElementById('deathScreenP2');
            this.p2CountdownText = this.deathScreenP2.children[1];
        }

        if (!document.getElementById('endGameScreen')) {
            this.endGameScreen = document.createElement('div');
            this.endGameScreen.id = 'endGameScreen';
            this.endGameScreen.style.position = 'fixed';
            this.endGameScreen.style.top = '0';
            this.endGameScreen.style.left = '0';
            this.endGameScreen.style.width = '100vw';
            this.endGameScreen.style.height = '100vh';
            this.endGameScreen.style.backgroundColor = '#000000'; 
            this.endGameScreen.style.display = 'none'; 
            this.endGameScreen.style.flexDirection = 'column';
            this.endGameScreen.style.justifyContent = 'center';
            this.endGameScreen.style.alignItems = 'center';
            this.endGameScreen.style.zIndex = '9999'; 

            const endText = document.createElement('h1');
            endText.innerText = "END GAME";
            endText.style.color = '#ff0000';
            endText.style.fontSize = '100px';
            endText.style.fontFamily = 'Arial, sans-serif';
            endText.style.margin = '0';
            endText.style.textShadow = '0px 0px 20px #ff0000'; 

            this.endGameScreen.appendChild(endText);
            document.body.appendChild(this.endGameScreen);
        } else {
            this.endGameScreen = document.getElementById('endGameScreen');
        }
    }

    createHalfDeathScreen(id, side) {
        const screen = document.createElement('div');
        screen.id = id;
        screen.style.position = 'fixed';
        screen.style.top = '0';
        screen.style[side] = '0'; 
        screen.style.width = '50vw'; 
        screen.style.height = '100vh';
        screen.style.backgroundColor = '#000000';
        screen.style.display = 'none'; 
        screen.style.flexDirection = 'column';
        screen.style.justifyContent = 'center';
        screen.style.alignItems = 'center';
        screen.style.zIndex = '2000';
        screen.style.fontFamily = 'Arial, sans-serif';

        const deathText = document.createElement('h1');
        deathText.innerText = "BẠN ĐÃ TỬ TRẬN";
        deathText.style.color = '#ff3333';
        deathText.style.fontSize = '40px';
        deathText.style.margin = '0 0 20px 0';
        deathText.style.textShadow = '2px 2px 5px #ff0000'; 

        const countdownText = document.createElement('h2');
        countdownText.innerText = "Hồi sinh sau: 5";
        countdownText.style.color = '#fff';
        countdownText.style.fontSize = '25px';
        countdownText.style.margin = '0';

        screen.appendChild(deathText);
        screen.appendChild(countdownText);
        document.body.appendChild(screen);

        return screen;
    }

    // ==========================================
    // 💡 KHỞI TẠO NÚT BẤM VÀ TƯỜNG (ARENA)
    // ==========================================
    initArena() {
        const btnGeo = new THREE.BoxGeometry(1.5, 0.2, 1.5);
        const btnMat = new THREE.MeshStandardMaterial({ color: 0xff0000 }); 

        this.bossButton1 = new THREE.Mesh(btnGeo, btnMat.clone());
        this.bossButton1.position.set(488, 0.1, 469);
        this.bossButton1.userData.box = new THREE.Box3().setFromObject(this.bossButton1);
        this.scene.add(this.bossButton1);

        this.bossButton2 = new THREE.Mesh(btnGeo, btnMat.clone());
        this.bossButton2.position.set(493, 0.1, 469);
        this.bossButton2.userData.box = new THREE.Box3().setFromObject(this.bossButton2);
        this.scene.add(this.bossButton2);

        const wallGeo = new THREE.BoxGeometry(5, 6, 1);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });

        this.bossFrontWall = new THREE.Mesh(wallGeo, wallMat);
        this.bossFrontWall.position.set(490, 3, 464);
        this.bossFrontWall.userData.box = new THREE.Box3().setFromObject(this.bossFrontWall);
        this.scene.add(this.bossFrontWall);
        if (this.colliders) this.colliders.push(this.bossFrontWall);

        const backWallGeo = new THREE.BoxGeometry(5, 6, 2); 
        this.bossBackWall = new THREE.Mesh(backWallGeo, wallMat);
        this.bossBackWall.position.set(490, -6, 476); 
        this.bossBackWall.userData.box = new THREE.Box3().setFromObject(this.bossBackWall);
        this.scene.add(this.bossBackWall);
        if (this.colliders) this.colliders.push(this.bossBackWall);
    }

    // ==========================================
    // 💡 NẠP MODEL BOSS
    // ==========================================
    loadBoss() {
        const loader = new FBXLoader();
        
        loader.load('models/Run.fbx', (fbx) => {
            this.model = fbx;
            
            this.model.scale.set(0.01, 0.01, 0.01); 
            this.model.position.copy(this.position);
            this.model.position.y -= 1.2; 
            
            this.model.visible = false; 

            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    if (child.material) {
                        const fixMaterial = (mat) => {
                            mat.transparent = false;
                            mat.depthWrite = true;
                            if (mat.color) mat.color.setHex(0xffffff);
                            if (mat.specular) mat.specular.setHex(0x000000);
                            if (mat.shininess !== undefined) mat.shininess = 0;
                        };
                        if (Array.isArray(child.material)) child.material.forEach(fixMaterial);
                        else fixMaterial(child.material);
                    }
                }
            });

            this.scene.add(this.model);
            this.mixer = new THREE.AnimationMixer(this.model);

            if (fbx.animations && fbx.animations.length > 0) {
                const clip = fbx.animations[0];
                clip.tracks = clip.tracks.filter(track => !track.name.includes('.position'));
                
                const runAction = this.mixer.clipAction(clip);
                this.animations['run'] = runAction;
            }

            this.box.setFromObject(this.model);
            
            this.loadExtraAnimationFBX('runslow', 'models/Runslow.fbx');
            this.loadExtraAnimationFBX('attack', 'models/Hurricane Kick.fbx', false);
            this.loadExtraAnimationFBX('flair', 'models/Flair.fbx', false);
            this.loadExtraAnimationFBX('punch', 'models/Stabbing.fbx', false);
            
        }, undefined, (error) => {
            console.error("🔥 Lỗi tải model Run.fbx:", error);
        });
    }

    loadExtraAnimationFBX(name, path, isOnce = false) {
        const loader = new FBXLoader();
        loader.load(path, (fbx) => {
            if (!this.model || !fbx.animations || fbx.animations.length === 0) return;

            const clip = fbx.animations[0];
            clip.tracks = clip.tracks.filter(track => !track.name.includes('.position'));
            
            clip.tracks.forEach(track => {
                const parts = track.name.split('.');
                if (parts.length === 2) {
                    const cleanTrackName = parts[0].replace(/^.*?(mixamorig)/, 'mixamorig');
                    
                    let foundBoneName = null;
                    this.model.traverse(bone => {
                        if (bone.isBone && !foundBoneName) {
                            if (bone.name.endsWith(cleanTrackName)) {
                                foundBoneName = bone.name;
                            }
                        }
                    });
                    
                    if (foundBoneName) {
                        track.name = foundBoneName + '.' + parts[1];
                    }
                }
            });

            clip.name = name; 
            const action = this.mixer.clipAction(clip);
            
            if (isOnce || name === 'die') {
                action.setLoop(THREE.LoopOnce);
                action.clampWhenFinished = true;
            }
            
            this.animations[name] = action;
        });
    }

    playAnimation(name, fadeTime = 0.3) {
        const nextAction = this.animations[name];
        if (!nextAction || this.currentAction === nextAction) return;
        
        if (this.currentAction) {
            this.currentAction.fadeOut(fadeTime);
        }
        
        nextAction.reset().fadeIn(fadeTime).play();
        this.currentAction = nextAction;
    }
    
    stopAnimation(fadeTime = 0.3) {
        if (this.currentAction) {
            this.currentAction.fadeOut(fadeTime);
            this.currentAction = null;
        }
    }

    killPlayer(p) {
        if (!p || p.isDead) return;
        p.isDead = true;
        p.deathTimer = 5.0; 
        if (p.object) {
            p.object.visible = false; 
            p.object.position.set(0, -1000, 0); 
            if (p.velocity) p.velocity.set(0, 0, 0);
        }
    }

    // ==========================================
    // 💡 HÀM ĐỔI MÀU BOSS (DÙNG ĐỂ NHẤP NHÁY)
    // ==========================================
   setBossColor(hexColor) {
        if (!this.model) return;
        this.model.traverse((child) => {
            if (child.isMesh && child.material) {
                const fixColor = (mat) => {
                    if (mat.color) mat.color.setHex(hexColor);
                    if (mat.emissive) {
                        if (hexColor === 0xffffff) {
                            mat.emissive.setHex(0x000000); 
                        } else {
                            mat.emissive.setHex(hexColor); 
                        }
                    }
                    mat.needsUpdate = true; 
                };
                
                if (Array.isArray(child.material)) child.material.forEach(fixColor);
                else fixColor(child.material);
            }
        });
    }

    // ==========================================
    // 💡 XỬ LÝ NHẬN SÁT THƯƠNG
    // ==========================================
    takeDamage(damage) {
        if (this.isDead) return; 

        this.health -= damage;
        
        let hpPercent = (this.health / this.maxHealth) * 100;
        if (hpPercent < 0) hpPercent = 0;
        if (this.healthBar) this.healthBar.style.width = hpPercent + '%';

        this.setBossColor(0xff0000); 
        if (this.flashTimeout) clearTimeout(this.flashTimeout);
        this.flashTimeout = setTimeout(() => {
            if (this.model && !this.isDead) this.setBossColor(0xffffff);
        }, 150);

        if (this.health <= 0) {
            this.isDead = true;
            this.state = 'die';
            this.speed = 0;
            
            // 💡 Tắt toàn bộ âm thanh khi Boss chết
            this.stopLoopKick();
            this.stopTheme();

            if (this.healthContainer) this.healthContainer.style.display = 'none'; 
            
            this.bossArenaTriggered = false;
            this.setBossColor(0xffffff);

            if (this.endGameTimeout) clearTimeout(this.endGameTimeout);
            this.endGameTimeout = setTimeout(() => {
                if (this.isDead && this.endGameScreen) {
                    this.endGameScreen.style.display = 'flex';
                }
            }, 3000); 
        }
    }

    // ==========================================
    // 💡 RESET BOSS & ARENA
    // ==========================================
    resetBoss() {
        this.bossArenaTriggered = false; 
        
        // 💡 Dừng nhạc Boss, bật lại nhạc Game
        this.stopTheme();
        this.stopLoopKick();

        this.health = this.maxHealth;
        this.isDead = false;
        this.state = 'idle';
        this.speed = 0;
        this.model.position.copy(this.position); 
        this.model.position.y -= 1.2; 
        
        this.flairCooldown = 15.0;
        this.kickCooldown = 0;
        
        this.runslowCooldown = 20.0;
        this.runslowTimer = 0;
        
        this.bullets.forEach(b => this.scene.remove(b.mesh));
        this.bullets = [];
        
        this.stopAnimation();
        
        if (this.healthBar) this.healthBar.style.width = '100%';
        if (this.healthContainer) this.healthContainer.style.display = 'none'; 
        
        if (this.endGameScreen) this.endGameScreen.style.display = 'none';
        if (this.endGameTimeout) clearTimeout(this.endGameTimeout);
        if (this.flashTimeout) clearTimeout(this.flashTimeout);
        this.setBossColor(0xffffff); 
    }

    spawnBullets() {
        const numBullets = 12; 
        const bulletSpeed = 13.0; 
        
        for (let i = 0; i < numBullets; i++) {
            const angle = (i / numBullets) * Math.PI * 2;
            const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();

            const geo = new THREE.SphereGeometry(0.21, 8, 8); 
            const mat = new THREE.MeshBasicMaterial({ color: 0xff3300 }); 
            const bullet = new THREE.Mesh(geo, mat);

            bullet.position.copy(this.model.position).add(new THREE.Vector3(0, 1.5, 0));
            this.scene.add(bullet);
            
            this.bullets.push({
                mesh: bullet,
                velocity: dir.multiplyScalar(bulletSpeed),
                life: 3.0 
            });
        }
    }

    update(delta, player1, player2) {
        if (!this.model) return;
        if (this.mixer) this.mixer.update(delta);

        // --------------------------------------------------
        // 💡 1. CẬP NHẬT HỒI SINH
        // --------------------------------------------------
        if (player1) {
            if (player1.isDead) {
                player1.deathTimer -= delta;
                if (this.deathScreenP1) {
                    this.deathScreenP1.style.display = 'flex';
                    this.p1CountdownText.innerText = `Hồi sinh sau: ${Math.ceil(player1.deathTimer)}`;
                }
                if (player1.deathTimer <= 0) {
                    player1.isDead = false;
                    if (player1.object) {
                        player1.object.visible = true; 
                        player1.object.position.copy(player1.respawnPoint || new THREE.Vector3(476, 2, 505)); 
                    }
                }
            } else {
                if (this.deathScreenP1) this.deathScreenP1.style.display = 'none';
            }
        }

        if (player2) {
            if (player2.isDead) {
                player2.deathTimer -= delta;
                if (this.deathScreenP2) {
                    this.deathScreenP2.style.display = 'flex';
                    this.p2CountdownText.innerText = `Hồi sinh sau: ${Math.ceil(player2.deathTimer)}`;
                }
                if (player2.deathTimer <= 0) {
                    player2.isDead = false;
                    if (player2.object) {
                        player2.object.visible = true; 
                        player2.object.position.copy(player2.respawnPoint || new THREE.Vector3(476, 2, 505)); 
                    }
                }
            } else {
                if (this.deathScreenP2) this.deathScreenP2.style.display = 'none';
            }
        }

        // --------------------------------------------------
        // 💡 2. KIỂM TRA QUÉT SẠCH (WIPE OUT) & RESET
        // --------------------------------------------------
        let p1Dead = !player1 || player1.isDead;
        let p2Dead = !player2 || player2.isDead;
        
        if (p1Dead && p2Dead && (player1 || player2)) { 
            this.resetBoss();
            
            [player1, player2].forEach(p => {
                if (p && p.isDead) {
                    p.isDead = false;
                    p.deathTimer = 0;
                    if (p.object) {
                        p.object.visible = true;
                        p.object.position.copy(p.respawnPoint || new THREE.Vector3(476, 2, 505));
                        if (p.velocity) p.velocity.set(0, 0, 0);
                    }
                }
            });

            if (this.deathScreenP1) this.deathScreenP1.style.display = 'none';
            if (this.deathScreenP2) this.deathScreenP2.style.display = 'none';
            return; 
        }

        if (this.bossArenaTriggered && player1 && player2 && player1.object && player2.object) {
            const p1AtSave = player1.object.position.distanceTo(new THREE.Vector3(476, 2, 505)) < 5;
            const p2AtSave = player2.object.position.distanceTo(new THREE.Vector3(476, 2, 505)) < 5;
            if (p1AtSave && p2AtSave) this.resetBoss();
        }

        // --------------------------------------------------
        // 💡 3. XỬ LÝ ĐẠN BAY CỦA BOSS
        // --------------------------------------------------
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            b.life -= delta;
            b.mesh.position.add(b.velocity.clone().multiplyScalar(delta));

            let hitPlayer = false;
            [player1, player2].forEach(p => {
                if (p && p.object && !p.isDead && !hitPlayer) {
                    const playerHitboxCenter = p.object.position.clone();
                    playerHitboxCenter.y += 1.0; 

                    if (b.mesh.position.distanceTo(playerHitboxCenter) < 1.2) { 
                        this.killPlayer(p);
                        hitPlayer = true;
                    }
                }
            });

            if (b.life <= 0 || hitPlayer) {
                this.scene.remove(b.mesh);
                this.bullets.splice(i, 1);
            }
        }

        // --------------------------------------------------
        // 💡 4. ĐIỀU KHIỂN CỬA, NÚT BẤM VÀ ARENA
        // --------------------------------------------------
        if (player1 && player1.object && player2 && player2.object && !this.isDead) {
            const p1Feet = player1.getBox(player1.object.position);
            const p2Feet = player2.getBox(player2.object.position);

            const btn1Box = this.bossButton1.userData.box.clone().expandByScalar(0.5);
            const btn2Box = this.bossButton2.userData.box.clone().expandByScalar(0.5);

            let p1OnBtn1 = p1Feet.intersectsBox(btn1Box);
            let p2OnBtn1 = p2Feet.intersectsBox(btn1Box);
            let p1OnBtn2 = p1Feet.intersectsBox(btn2Box);
            let p2OnBtn2 = p2Feet.intersectsBox(btn2Box);

            let isBtn1Pressed = p1OnBtn1 || p2OnBtn1;
            let isBtn2Pressed = p1OnBtn2 || p2OnBtn2;

            this.bossButton1.material.color.setHex(isBtn1Pressed ? 0x00ff00 : 0xff0000);
            this.bossButton2.material.color.setHex(isBtn2Pressed ? 0x00ff00 : 0xff0000);

            if (isBtn1Pressed && isBtn2Pressed && !this.bossArenaTriggered) {
                this.bossArenaTriggered = true;
                
                // 💡 Bật nhạc Boss Theme khi vào Đấu trường
                this.playTheme();
            }
        }

        if (this.bossArenaTriggered) {
            if (this.bossFrontWall.position.y > -6) {
                this.bossFrontWall.position.y -= delta * 5;
                this.bossFrontWall.userData.box.setFromObject(this.bossFrontWall);
            }
            if (this.bossBackWall.position.y < 3) {
                this.bossBackWall.position.y += delta * 5;
                this.bossBackWall.userData.box.setFromObject(this.bossBackWall);
            }
            if (this.model && !this.model.visible && !this.isDead) this.model.visible = true;
        } else {
            if (this.bossFrontWall.position.y < 3) {
                this.bossFrontWall.position.y += delta * 5;
                this.bossFrontWall.userData.box.setFromObject(this.bossFrontWall);
            }
            if (this.bossBackWall.position.y > -6) {
                this.bossBackWall.position.y -= delta * 5;
                this.bossBackWall.userData.box.setFromObject(this.bossBackWall);
            }
            if (this.model && this.model.visible) {
                this.model.visible = false;
            }
            if (this.healthContainer) this.healthContainer.style.display = 'none';
            return; 
        }

        // --------------------------------------------------
        // 💡 5. AI TÌM VÀ ĐÁNH MỤC TIÊU
        // --------------------------------------------------
        if (this.isDead) return;

        let target = null;
        let minDist = Infinity;

        if (player1 && player1.object && !player1.isDead) {
            const d1 = this.model.position.distanceTo(player1.object.position);
            if (d1 < minDist) { minDist = d1; target = player1; }
        }

        if (player2 && player2.object && !player2.isDead) {
            const d2 = this.model.position.distanceTo(player2.object.position);
            if (d2 < minDist) { minDist = d2; target = player2; }
        }

        if (this.healthContainer && !this.isDead) {
            this.healthContainer.style.display = 'block';
        }

        if (minDist > this.aggroRange || !target) {
            this.state = 'idle';
            this.speed = 0;
            this.stopAnimation(); 
            this.stopLoopKick(); // 💡 Dừng âm thanh xoay nếu mục tiêu ra xa
            return;
        }

        if (this.state !== 'flair') this.flairCooldown -= delta;
        this.kickCooldown -= delta;

        if (this.runslowTimer <= 0) {
            this.runslowCooldown -= delta;
        } else {
            this.runslowTimer -= delta;
        }

        if (target) {
            const targetPos = new THREE.Vector3(target.object.position.x, this.model.position.y, target.object.position.z);
            
            if (this.runslowCooldown <= 0 && this.state !== 'flair' && this.state !== 'attack' && this.state !== 'punch') {
                this.runslowTimer = 4.0;     
                this.runslowCooldown = 20.0; 
            }

            if (this.flairCooldown <= 0 && this.state !== 'flair' && this.state !== 'attack' && this.state !== 'punch') {
                this.state = 'flair';
                this.speed = 0; 
                this.flairTimer = 5.0;     
                this.flairCooldown = 15.0; 
                this.flairWave1 = false;
                this.flairWave2 = false;
                
                this.model.lookAt(targetPos);
                this.playAnimation('flair', 0.2);
            }

            if (this.state === 'flair') {
                this.flairTimer -= delta;
                
                if (this.flairTimer <= 3.0 && !this.flairWave1) {
                    this.spawnBullets();
                    this.flairWave1 = true;
                }
                
                if (this.flairTimer <= 1.0 && !this.flairWave2) {
                    this.spawnBullets();
                    this.flairWave2 = true;
                }

                if (this.flairTimer <= 0) {
                    this.state = 'idle'; 
                }
            }
            else if (this.state === 'attack') {
                this.attackTimer -= delta;
                
                // 💡 Gọi âm thanh Đá Xoay vòng lặp
                this.startLoopKick();

                if (this.dashTimer > 0) {
                    this.dashTimer -= delta;
                    this.model.translateZ(this.speed * delta);
                }
                
                if (this.attackTimer < 1.4 && minDist < 2.5) {
                    this.killPlayer(target);
                }

                if (this.attackTimer <= 0) {
                    this.state = 'idle'; 
                    this.stopLoopKick(); // 💡 Dừng âm thanh khi hết chiêu
                }
            } 
            else if (this.state === 'punch') {
                this.punchTimer -= delta;
                
                if (this.punchTimer < 0.6 && minDist < 2.0) {
                    this.killPlayer(target);
                }

                if (this.punchTimer <= 0) {
                    this.state = 'idle';
                }
            }
            else {
                this.model.lookAt(targetPos);

                if (minDist <= this.attackRange && this.kickCooldown <= 0) {
                    this.state = 'attack';
                    this.playAnimation('attack', 0.1); 
                    
                    this.speed = 4.0; 
                    this.dashTimer = 0.6; 
                    this.attackTimer = 1.8; 
                    
                    this.kickCooldown = 6.0; 
                } 
                else if (minDist <= this.punchRange) {
                    this.state = 'punch';
                    this.playAnimation('punch', 0.1);
                    
                    // 💡 Gọi âm thanh Đá Đơn (Stabbing) 1 lần
                    this.playSingleKick();
                    
                    this.speed = 0; 
                    this.punchTimer = 1.0; 
                } 
                else if (this.runslowTimer > 0) {
                    this.state = 'runslow';
                    this.speed = 1.4; 
                    this.playAnimation('runslow');
                    this.model.translateZ(this.speed * delta);
                } 
                else {
                    this.state = 'run';
                    this.speed = 2.8; 
                    this.playAnimation('run');
                    this.model.translateZ(this.speed * delta);
                }
            }
        }
    }
}