import * as THREE from "three";
import { ColladaLoader } from "three/addons/loaders/ColladaLoader.js";

export class Player {
  constructor(scene, colliders, modelPath, keyMap, startPos, gamepadIndex = null, animConfig = null, isLocal = true) {
    this.scene = scene;
    this.colliders = colliders;
    this.isLocal = isLocal; 
    
    this.velocityY = 0;
    this.gravity = -0.003; 
    this.jumpForce = 0.09;
    this.isGrounded = false;
    this.keys = {};
    this.keysJustPressed = {}; 
    this.keyMap = keyMap; 
    this.gamepadIndex = gamepadIndex;
    this.gpInteractState = false; 
    this.gpFireState = false; 
    this.gpAttackState = false; 

    this.cameraAngleX = 0;
    this.cameraAngleY = 0.5; 

    this.loader = new ColladaLoader();
    this.object = null;
    this.spawnPoint = startPos.clone();
    this.respawnPoint = startPos.clone(); // 💡 Đảm bảo luôn có điểm hồi sinh
    this.boxSize = new THREE.Vector3(0.25, 1.05, 0.25); 
    this.boxOffset = new THREE.Vector3(0, 0.525, 0);    
    this.isControllingDevice = false; 
    this.isDead = false;

    this.mixer = null;
    this.animations = [];
    this.currentAction = null;
    this.currentAnimName = "";
    
    // 💡 BIẾN CHO KỸ NĂNG CHÉM 360
    this.attackCooldown = 0;
    this.damageTimer = 0;      
    this.attackAnimTimer = 0;  
    this.dealtDamage = false;
    this.vfxGroup = null;      
    this.justDamagedBoss = false; 
    
    // NỘI SUY MẠNG
    this.targetPosition = startPos.clone(); 
    this.targetRotationY = 0;
    this.remoteAnim = "Idle"; 

    const anims = animConfig || {
        idle: 'models/idle.dae',
        run: 'models/running.dae',
        jump: 'models/jump.dae'
    };

    this.loader.load(modelPath, (collada) => {
      this.object = collada.scene;
      this.object.scale.set(0.007, 0.007, 0.007); 
      this.object.position.copy(startPos);
      this.object.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(this.object);
      this.mixer = new THREE.AnimationMixer(this.object);

      this.loadAnimation('Idle', anims.idle, true); 
      this.loadAnimation('Run', anims.run, false); 
      this.loadAnimation('Jump', anims.jump, false); 
      this.loadAnimation('SpinAttack', 'models/Standing Melee Attack 360 Low.dae', false);
    });

    if (this.isLocal) {
        document.addEventListener("keydown", (e) => { 
            const key = e.key.toLowerCase();
            if (key === this.keyMap.attack) {
                if (!this.keys['attack']) this.keysJustPressed['attack'] = true;
                this.keys['attack'] = true;
            } else {
                if (!this.keys[key]) this.keysJustPressed[key] = true; 
                this.keys[key] = true; 
            }
        });
        document.addEventListener("keyup", (e) => { 
            const key = e.key.toLowerCase();
            if (key === this.keyMap.attack) this.keys['attack'] = false;
            else this.keys[key] = false; 
        });

        document.addEventListener("mousedown", (e) => {
            if (e.button === 0 && this.keyMap.attack === 'mouse0') {
                if (!this.keys['attack']) this.keysJustPressed['attack'] = true;
                this.keys['attack'] = true;
            }
        });
        document.addEventListener("mouseup", (e) => {
            if (e.button === 0 && this.keyMap.attack === 'mouse0') {
                this.keys['attack'] = false;
            }
        });
    }
  }

  justPressedInteract() {
      if (!this.isLocal) return false;
      const key = this.keyMap.interact;
      if (this.keysJustPressed[key]) {
          this.keysJustPressed[key] = false; 
          return true;
      }
      return false;
  }

  justPressedFire() {
      if (!this.isLocal) return false;
      if (this.keysJustPressed['fire']) {
          this.keysJustPressed['fire'] = false;
          return true;
      }
      return false;
  }

  justPressedAttack() {
      if (!this.isLocal) return false;
      if (this.keysJustPressed['attack']) {
          this.keysJustPressed['attack'] = false;
          return true;
      }
      return false;
  }

  checkGamepad() {
      if (!this.isLocal || this.gamepadIndex === null) return;
      const gamepads = navigator.getGamepads();
      const gp = gamepads[this.gamepadIndex];
      if (gp) {
          const dpadUp = gp.buttons[12] ? gp.buttons[12].pressed : false;
          const dpadDown = gp.buttons[13] ? gp.buttons[13].pressed : false;
          const dpadLeft = gp.buttons[14] ? gp.buttons[14].pressed : false;
          const dpadRight = gp.buttons[15] ? gp.buttons[15].pressed : false;

          this.keys[this.keyMap.forward] = gp.axes[1] < -0.2 || dpadUp;
          this.keys[this.keyMap.backward] = gp.axes[1] > 0.2 || dpadDown;
          this.keys[this.keyMap.left] = gp.axes[0] < -0.2 || dpadLeft;
          this.keys[this.keyMap.right] = gp.axes[0] > 0.2 || dpadRight;

          if (Math.abs(gp.axes[2]) > 0.15) this.cameraAngleX -= gp.axes[2] * 0.05;
          if (Math.abs(gp.axes[3]) > 0.15) { 
              this.cameraAngleY += gp.axes[3] * 0.03;
              this.cameraAngleY = Math.max(-0.2, Math.min(1.5, this.cameraAngleY));
          }
          
          this.keys[this.keyMap.jump] = gp.buttons[0] ? gp.buttons[0].pressed : false;
          
          const interactPressed = gp.buttons[2] ? gp.buttons[2].pressed : false;
          if (interactPressed && !this.gpInteractState) this.keysJustPressed[this.keyMap.interact] = true;
          this.gpInteractState = interactPressed;
          this.keys[this.keyMap.interact] = interactPressed;

          const firePressed = (gp.buttons[7] && gp.buttons[7].pressed) || (gp.buttons[5] && gp.buttons[5].pressed);
          if (firePressed && !this.gpFireState) {
              this.keysJustPressed['fire'] = true;
          }
          this.gpFireState = firePressed;

          const attackPressed = gp.buttons[1] ? gp.buttons[1].pressed : false;
          if (attackPressed && !this.gpAttackState) this.keysJustPressed['attack'] = true;
          this.gpAttackState = attackPressed;
          this.keys['attack'] = attackPressed;
      }
  }

  loadAnimation(animName, animPath, autoPlay) {
      const animLoader = new ColladaLoader();
      animLoader.load(animPath, (animCollada) => {
          let clip = (animCollada.animations && animCollada.animations.length > 0) ? animCollada.animations[0] : 
                     (animCollada.scene && animCollada.scene.animations && animCollada.scene.animations.length > 0) ? animCollada.scene.animations[0] : null;
          if (clip && animCollada.scene) {
              const uuidToName = {};
              animCollada.scene.traverse(node => { if (node.uuid && node.name) uuidToName[node.uuid] = node.name; });
              clip.tracks.forEach(track => {
                  let parts = track.name.split('.');
                  let realBoneName = uuidToName[parts[0]] || parts[0];
                  let cleanTrackName = realBoneName.replace(/^.*?(mixamorig)/, 'mixamorig').replace(/[:_]/g, '');
                  if(this.object) {
                      this.object.traverse(bone => {
                          if (bone.isBone) {
                              let cleanBoneName = bone.name.replace(/^.*?(mixamorig)/, 'mixamorig').replace(/[:_]/g, '');
                              if (cleanBoneName === cleanTrackName) track.name = bone.name + '.' + parts[1];
                          }
                      });
                  }
              });
              clip.name = animName; 
              this.animations.push(clip); 
              if (autoPlay) this.playAnimation(animName);
          }
      });
  }

  playAnimation(name) {
      if (!this.mixer || this.animations.length === 0 || this.currentAnimName === name) return;
      const clip = THREE.AnimationClip.findByName(this.animations, name);
      if (clip) {
          const action = this.mixer.clipAction(clip);
          if (this.currentAction) this.currentAction.fadeOut(0.2); 
          action.reset().fadeIn(0.2).play(); 
          this.currentAction = action;
          this.currentAnimName = name;
      }
  }

  updateAnimation(delta) { if (this.mixer) this.mixer.update(delta); }

  getBox(pos) {
    const center = pos.clone().add(this.boxOffset);
    return new THREE.Box3().setFromCenterAndSize(center, this.boxSize.clone());
  }

  checkCollision(pos) {
    if (!this.object) return false;
    const box = this.getBox(pos);
    const currentWorldPos = new THREE.Vector3();
    
    for (let obj of this.colliders) {
      if (obj === this.object) continue;
      
      obj.getWorldPosition(currentWorldPos);
      
      if (!obj.userData.box || !obj.userData.lastPos) {
          obj.userData.box = new THREE.Box3().setFromObject(obj);
          obj.userData.lastPos = currentWorldPos.clone();
      } else {
          if (!currentWorldPos.equals(obj.userData.lastPos)) {
              obj.userData.box.setFromObject(obj);
              obj.userData.lastPos.copy(currentWorldPos);
          }
      }
      if (box.intersectsBox(obj.userData.box)) return true;
    }
    return false;
  }

  updateCameraOrbit(camera) {
    if (!this.object) return;
    const targetLookAt = this.object.position.clone().add(new THREE.Vector3(0, 1, 0));
    const radius = 4; 
    const camX = this.object.position.x + radius * Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY);
    const camY = this.object.position.y + 1 + radius * Math.sin(this.cameraAngleY);
    const camZ = this.object.position.z + radius * Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY);
    camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.15); 
    camera.lookAt(targetLookAt);
  }

  syncNetworkData(x, y, z, rotationY, animName) {
      this.targetPosition.set(x, y, z);
      this.targetRotationY = rotationY;
      this.remoteAnim = animName;
  }

  initVFX() {
      if (this.vfxGroup) return;
      this.vfxGroup = new THREE.Group();
      this.scene.add(this.vfxGroup);

      const groundGeo = new THREE.RingGeometry(0.5, 3.5, 32);
      const groundMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false });
      this.groundRing = new THREE.Mesh(groundGeo, groundMat);
      this.groundRing.rotation.x = -Math.PI / 2;
      this.vfxGroup.add(this.groundRing);

      const slashGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.3, 32, 1, true, 0, Math.PI * 1.2); 
      this.slashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false });
      this.slashMesh = new THREE.Mesh(slashGeo, this.slashMat);
      this.slashMesh.position.y = 1.0; 
      this.vfxGroup.add(this.slashMesh);

      this.vfxGroup.visible = false;
  }

  updateBossAttack(delta, boss) {
      if (!boss || boss.isDead || !boss.bossArenaTriggered || !this.object || this.isDead) {
          if (this.vfxGroup) this.vfxGroup.visible = false;
          return;
      }

      this.initVFX();

      if (this.attackCooldown > 0) this.attackCooldown -= delta;
      if (this.attackAnimTimer > 0) this.attackAnimTimer -= delta;

      let isAttacking = false;
      if (this.isLocal) {
          if (this.justPressedAttack() && this.attackCooldown <= 0 && this.damageTimer <= 0) {
              isAttacking = true;
          }
      } else {
          if (this.remoteAnim === 'SpinAttack' && this.attackAnimTimer <= 0) {
              isAttacking = true;
          }
      }

      if (isAttacking) {
          if (this.isLocal) this.attackCooldown = 3.0; 
          this.damageTimer = 0.5;
          this.attackAnimTimer = 1.5;
          this.dealtDamage = false;

          this.vfxGroup.visible = true;
          this.slashMesh.scale.set(0.1, 1, 0.1); 
          this.groundRing.scale.set(0.1, 0.1, 0.1);
          this.slashMat.opacity = 0.9;
          this.slashMat.color.setHex(0x00ffff); 
          this.groundRing.material.color.setHex(0x00ffff);
      }

      if (this.damageTimer > 0) {
          this.damageTimer -= delta;
          
          this.vfxGroup.position.copy(this.object.position);
          this.vfxGroup.position.y += 0.1; 

          this.slashMesh.rotation.y -= delta * 15; 
          this.slashMesh.scale.x = THREE.MathUtils.lerp(this.slashMesh.scale.x, 1.2, 0.1);
          this.slashMesh.scale.z = THREE.MathUtils.lerp(this.slashMesh.scale.z, 1.2, 0.1);
          this.groundRing.scale.x = THREE.MathUtils.lerp(this.groundRing.scale.x, 1.0, 0.1);
          this.groundRing.scale.y = THREE.MathUtils.lerp(this.groundRing.scale.y, 1.0, 0.1);
          
          this.slashMat.opacity = (this.damageTimer / 0.5);

          if (!this.dealtDamage && boss && boss.model) {
              if (this.object.position.distanceTo(boss.model.position) <= 3.5) {
                  
                  if (this.isLocal) {
                      boss.takeDamage(2);
                      this.justDamagedBoss = true; 
                  }
                  
                  this.dealtDamage = true;
                  
                  this.slashMat.color.setHex(0x00ff00); 
                  this.groundRing.material.color.setHex(0x00ff00);
              }
          }

          if (this.damageTimer <= 0) {
              this.vfxGroup.visible = false;
          }
      }
  }

  update(camera) {
    if (!this.object) return;
    
    if (this.mixer && !this.currentAction && this.animations.length > 0) this.playAnimation('Idle');

    const speed = 0.07; 
    let isMoving = false; 

    if (this.isLocal) {
        this.checkGamepad();
        const moveDir = new THREE.Vector3(0, 0, 0);

        // 💡 SỬA LỖI 1: Nếu chết thì bất động, không cho bấm phím di chuyển
        if (!this.isControllingDevice && !this.isDead) {
            const forward = new THREE.Vector3();
            camera.getWorldDirection(forward);
            forward.y = 0; forward.normalize();
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

            if (this.keys[this.keyMap.forward]) moveDir.add(forward);
            if (this.keys[this.keyMap.backward]) moveDir.sub(forward);
            if (this.keys[this.keyMap.left]) moveDir.sub(right); 
            if (this.keys[this.keyMap.right]) moveDir.add(right);

            if (moveDir.length() > 0) {
              isMoving = true; moveDir.normalize();
              this.object.rotation.y = Math.atan2(moveDir.x, moveDir.z); 
              
              const nextPos = this.object.position.clone().add(moveDir.multiplyScalar(speed));
              if (!this.checkCollision(nextPos)) {
                  this.object.position.x = nextPos.x; this.object.position.z = nextPos.z;
              } else {
                  const stepUpPos = nextPos.clone(); stepUpPos.y += 0.35;
                  if (!this.checkCollision(stepUpPos)) {
                      this.object.position.x = nextPos.x; this.object.position.z = nextPos.z;
                      this.object.position.y += 0.35; 
                  }
              }
            }
            if (this.keys[this.keyMap.jump] && this.isGrounded) { this.velocityY = this.jumpForce; this.isGrounded = false; }
        }

        // 💡 SỬA LỖI 2: Nếu chết thì TẮT TRỌNG LỰC, không cho rơi xuống vực âm -15
        if (!this.isDead) {
            this.velocityY += this.gravity;
            const nextPosY = this.object.position.clone(); nextPosY.y += this.velocityY;
            if (!this.checkCollision(nextPosY)) {
                this.object.position.y = nextPosY.y; this.isGrounded = false;
            } else {
                if (this.velocityY < 0) this.isGrounded = true;
                this.velocityY = 0;
            }

            // Nếu lỡ rơi vực thì về điểm Save
            if (this.object.position.y < -15) { 
                this.object.position.copy(this.respawnPoint || this.spawnPoint); 
                this.velocityY = 0; 
            }
        }
        
        this.updateCameraOrbit(camera);
        
    } else {
        const distToTarget = this.object.position.distanceTo(this.targetPosition);

        if (distToTarget > 2.0) {
            this.object.position.copy(this.targetPosition);
        } else if (distToTarget > 0.01) {
            this.object.position.lerp(this.targetPosition, 0.3);
            isMoving = true; 
        }

        const diffAngle = this.targetRotationY - this.object.rotation.y;
        if (diffAngle > Math.PI) this.object.rotation.y += Math.PI * 2;
        else if (diffAngle < -Math.PI) this.object.rotation.y -= Math.PI * 2;
        
        this.object.rotation.y += (this.targetRotationY - this.object.rotation.y) * 0.2;
    }

    if (this.animations.length > 0) {
        if (this.isLocal) {
            if (this.attackAnimTimer > 0) {
                this.playAnimation('SpinAttack');
            } 
            else if (!this.isGrounded && !this.isDead) { // 💡 Tránh rớt lúc chết
                this.playAnimation('Jump');
            } 
            else if (isMoving) {
                this.playAnimation('Run'); 
            } 
            else {
                this.playAnimation('Idle');
            }
        } else {
            if (this.remoteAnim === 'SpinAttack') {
                this.playAnimation('SpinAttack');
            }
            else if (this.remoteAnim === 'Jump') {
                this.playAnimation('Jump');
            } else {
                if (isMoving) this.playAnimation('Run');
                else this.playAnimation('Idle');
            }
        }
    }
  }
}