// ============================================================================
// MAIN GAME LOGIC
// ============================================================================

class Game {
  constructor() {
    // Canvas Setup
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    // Systeme
    this.inputSystem = new InputSystem();
    this.worldManager = new WorldManager();
    this.levelLoader = new LevelLoader(this.worldManager);
    this.saveSystem = new SaveSystem();
    this.backgroundRenderer = new BackgroundRenderer(this.canvas, this.ctx);
    this.uiManager = new UIManager(this);
    this.audio = new AudioSystem();

    // Mute-Button
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
      muteBtn.textContent = this.audio.isMuted() ? '🔇' : '🔊';
      muteBtn.addEventListener('click', () => this.audio.toggleMute());
    }

    // Spielzustand
    this.player = null;
    this.level = null;
    this.currentLevelId = null;
    this.currentWorld = null;
    this.coinsCollected = 0;
    this.keysCollected = 0;

    // Kamera
    this.cameraX = 0;
    this.cameraY = 0;

    // Timing
    this.lastTime = 0;
    
    // Level geladen?
    this.levelsLoaded = false;

    this.setupInputHandlers();
    this.setupCanvasScaling();
  }

  setupCanvasScaling() {
    const scaleCanvas = () => {
      const container = document.getElementById('gameContainer');
      const canvas = this.canvas;
      
      const scaleX = container.clientWidth / CANVAS_WIDTH;
      const scaleY = container.clientHeight / CANVAS_HEIGHT;
      const scale = Math.min(scaleX, scaleY);
      
      canvas.style.transform = `scale(${scale})`;
      canvas.style.transformOrigin = 'top left';
      
      // Container muss die skalierte Canvas-Größe aufnehmen
      // Zentriere Canvas im Container wenn Platz übrig ist
      const scaledWidth = CANVAS_WIDTH * scale;
      const scaledHeight = CANVAS_HEIGHT * scale;
      const offsetX = (container.clientWidth - scaledWidth) / 2;
      const offsetY = (container.clientHeight - scaledHeight) / 2;
      
      canvas.style.marginLeft = `${offsetX}px`;
      canvas.style.marginTop = `${offsetY}px`;
    };

    // Initial + bei Resize
    scaleCanvas();
    window.addEventListener('resize', scaleCanvas);
    // Für Mobile: auch bei Orientation Change
    window.addEventListener('orientationchange', () => {
      setTimeout(scaleCanvas, 100);
    });
  }

  async initialize() {
    console.log('🦊 Fox Run Game startet...');
    
    // Zeige Loading-Nachricht
    this.showMessage('⏳ Lade Level...', 0);

    // Lade alle Level aus JSON-Dateien
    const success = await this.levelLoader.loadAllLevels();
    
    if (!success || Object.keys(this.levelLoader.levels).length === 0) {
      this.showMessage('❌ Fehler beim Laden der Level!<br>Prüfe die Console für Details.', 0);
      console.error('Keine Level geladen! Überprüfe:');
      console.error('1. Sind die JSON-Dateien im levels/ Ordner?');
      console.error('2. Ist der Server/Localhost gestartet? (file:// funktioniert nicht!)');
      return false;
    }

    this.levelsLoaded = true;
    console.log('✅ Alle Level geladen!');
    
    // Verstecke Loading-Nachricht
    document.getElementById('message').classList.remove('show');

    // Zeige Welt-Auswahl
    this.uiManager.showWorldSelect();
    
    return true;
  }

  setupInputHandlers() {
    document.getElementById('restartButton').addEventListener('click', () => {
      this.retryLevel();
    });
  }

  // ========================================================================
  // LEVEL LOADING
  // ========================================================================
  loadLevel(levelId) {
    console.log(`📂 Lade Level ${levelId}...`);
    
    const levelData = this.levelLoader.getLevel(levelId);
    if (!levelData) {
      console.error(`❌ Level ${levelId} nicht gefunden!`);
      this.showMessage(`Level ${levelId} konnte nicht geladen werden!`, 3000);
      return;
    }
    
    // Welt ermitteln
    const world = this.worldManager.getWorldByLevelId(levelId);
    if (!world) {
      console.error(`❌ Welt für Level ${levelId} nicht gefunden!`);
      return;
    }
    
    // Welt setzen (lädt Hintergründe)
    this.currentWorld = world;
    this.backgroundRenderer.setWorld(world);

    // Musik für diese Welt starten
    this.audio.playMusic(world.theme || world.id);
    
    // Level erstellen
    this.level = new Level(levelData, world, this.backgroundRenderer);
    this.currentLevelId = levelId;
    
    // Player erstellen
    this.player = new Player(
      levelData.playerStart.x,
      levelData.playerStart.y
    );

    // Aktiven Filter aus Save laden
    const saveData = this.saveSystem.load();
    const filterId = saveData.activeFilter;
    if (filterId) {
      this.player.activeFilter = COIN_FILTERS.find(f => f.id === filterId) || null;
    }

    // Kamera initial setzen (damit startCameraY korrekt ist)
    this.cameraX = Math.max(0, Math.min(
      this.player.x - CANVAS_WIDTH  / 2,
      this.level.width  - CANVAS_WIDTH
    ));
    this.cameraY = Math.max(0, Math.min(
      this.player.y - CANVAS_HEIGHT / 2,
      this.level.height - CANVAS_HEIGHT
    ));

    // Y-Referenzpunkt für Foreground-Parallax setzen
    this.backgroundRenderer.startLevel(this.cameraY);
    
    // Stats zurücksetzen
    this.coinsCollected = 0;
    this.keysCollected = 0;
    
    // UI verstecken
    this.uiManager.hideWorldSelect();
    this.uiManager.hideLevelSelect();
    this.uiManager.hideResultScreen();
    document.getElementById('message').classList.remove('show');
    
    // HUD aktualisieren
    this.updateHUD();
    
    // Level-Info
    this.showMessage(
      `${world.name}<br>${levelData.name}<br><small>${levelData.story}</small>`,
      3000
    );
    
    console.log(`✅ Level ${levelId} geladen!`);
  }

  retryLevel() {
    if (this.currentLevelId) {
      this.loadLevel(this.currentLevelId);
    }
  }

  nextLevel() {
    if (this.currentLevelId) {
      const nextId = this.currentLevelId + 1;
      if (this.levelLoader.getLevel(nextId)) {
        this.loadLevel(nextId);
      }
    }
  }

  // ========================================================================
  // GAME LOOP
  // ========================================================================
  handleInput() {
    if (!this.player) return;
    
    const input = this.inputSystem.state;
    
    // Kriechen mit Decken-Check
    const wasCrouching = this.player.isCrouching;
    
    if (!input.crouch && wasCrouching) {
      // Spieler will aufstehen — prüfen ob Platz ist
      const activeWalls = this.level.getActiveWalls();
      if (this.player.canStandUp(activeWalls)) {
        this.player.isCrouching = false;
      } else {
        // Decke zu niedrig — kriechen bleibt erzwungen
        this.player.isCrouching = true;
      }
    } else {
      this.player.isCrouching = input.crouch;
    }
    
    // Bewegung
    if (input.moveLeft) {
      this.player.velocityX = -this.player.speed;
      this.player.facingRight = false;
    } else if (input.moveRight) {
      this.player.velocityX = this.player.speed;
      this.player.facingRight = true;
    }
    
    // Springen
    if (input.jump && !this.player.lastJumpState) {
      if (this.player.jump()) {
        this.audio.playSound('jump');
      }
    }
    this.player.lastJumpState = input.jump;
    
    // Interagieren (E/Enter) – für spätere NPC-Dialoge etc.
    if (input.interact && !this.player.lastInteractState) {
      // Platzhalter für zukünftige Interaktionen
    }
    this.player.lastInteractState = input.interact;

    // Schnüffeln (F / 🐾-Button)
    // Erst prüfen ob NPC in der Nähe → Dialog starten
    // Sonst: normales Schnüffeln des Spielers
    if (input.sniff && !this.player.lastSniffState) {
      const playerCX = this.player.x + this.player.drawWidth / 2;

      // Priorität: Schalter > Passage > NPC > normales Schnüffeln
      const nearSwitch  = this.level.getNearestSwitch(playerCX, this.player.y);
      const nearPassage = !nearSwitch && this.level.getNearestPassage(playerCX, this.player.y);
      const nearNpc     = !nearSwitch && !nearPassage &&
                          this.level.getNearestNpc(playerCX, this.player.y);

      if (nearSwitch) {
        const msg = this.level.activateSwitch(nearSwitch);
        if (msg) this.showMessage(msg, 2000);
        this.audio.playSound('switch');
      } else if (nearPassage) {
        const hint = nearPassage.sniff();
        if (hint) this.showMessage(`🐾 ${hint}`, 2500);
        this.audio.playSound('sniff');
      } else if (nearNpc) {
        const line = nearNpc.interact();
        if (line) this.showMessage(`💬 ${line}`, 3000);
      } else if (this.player.isGrounded && !this.player.animationLocked) {
        this.player.setAnimation('sniff');
        this.player.animationLocked = true;
        this.audio.playSound('sniff');
        setTimeout(() => { this.player.animationLocked = false; }, 800);
      }
    }
    this.player.lastSniffState = input.sniff;
  }

  checkCollectibles() {
    if (!this.player || !this.level) return;
    
    let itemPickedUp = false;
    
    // Münzen
    for (let coin of this.level.coins) {
      if (coin.checkCollision(this.player)) {
        if (!coin.collected) {
          coin.collected = true;
          this.coinsCollected++;
          this.updateHUD();
          this.audio.playSound('coin');
          itemPickedUp = true;
        }
      }
    }
    
    // Schlüssel
    for (let key of this.level.keys) {
      if (key.checkCollision(this.player)) {
        if (!key.collected) {
          key.collected = true;
          this.keysCollected++;
          this.updateHUD();
          this.audio.playSound('key');
          itemPickedUp = true;
          
          for (let door of this.level.doors) {
            door.isOpen = true;
            this.audio.playSound('door');
          }
        }
      }
    }
    
    // Ziel
    if (this.level.goal && this.level.goal.checkCollision(this.player)) {
      if (this.keysCollected > 0) {
        this.completeLevel();
      } else {
        this.showMessage('🔑 Du brauchst den Schlüssel!', 2000);
      }
    }
  }

  completeLevel() {
    const levelData  = this.levelLoader.getLevel(this.currentLevelId);
    const hasAllCoins = this.coinsCollected >= (levelData.coins?.length || 3);
    const hasKey      = this.keysCollected > 0;

    // Geheimnisse: war eine Passage im Level und wurde sie entdeckt?
    const hasPassage     = this.level.passages.length > 0;
    const secretFound    = this.level.passages.some(p => p.discovered);

    // Fortschritt speichern
    let saveData = this.saveSystem.load();
    saveData = this.saveSystem.setLevelProgress(
      saveData,
      this.currentLevelId,
      this.coinsCollected,
      hasKey,
      true,
      secretFound
    );

    // Nächstes Level freischalten + Welt-Übergang prüfen
    if (hasKey) {
      saveData = this.saveSystem.unlockNextLevel(saveData, this.currentLevelId);

      const levelsInCurrentWorld = this.levelLoader
        .getLevelsForWorld(this.currentWorld.id)
        .map(l => l.id)
        .sort((a, b) => a - b);

      const isLastLevelOfWorld =
        levelsInCurrentWorld[levelsInCurrentWorld.length - 1] === this.currentLevelId;

      if (isLastLevelOfWorld) {
        const allWorlds = this.worldManager.getAllWorlds();
        const currentWorldIndex = allWorlds.findIndex(w => w.id === this.currentWorld.id);
        const nextWorld = allWorlds[currentWorldIndex + 1];
        if (nextWorld) {
          saveData = this.worldManager.unlockWorld(nextWorld.id, saveData);
        }
      }
    }

    this.saveSystem.save(saveData);

    // Neuen Filter prüfen und anzeigen
    const newFilter = this._checkNewFilter(saveData.totalCoins);

    // Result Screen
    this.uiManager.showResultScreen(
      levelData,
      this.coinsCollected,
      hasKey,
      hasPassage,
      secretFound,
      saveData.totalCoins,
      newFilter
    );
  }

  // Prüft ob durch neue Taler ein Filter freigeschaltet wurde
  _checkNewFilter(totalCoins) {
    const unlocked = COIN_FILTERS.filter(f => totalCoins >= f.threshold);
    return unlocked.length > 0 ? unlocked[unlocked.length - 1] : null;
  }

  updateHUD() {
    document.getElementById('coinCount').textContent = this.coinsCollected;
    document.getElementById('totalCoins').textContent = 3;
    document.getElementById('keyCount').textContent = this.keysCollected;
  }

  showMessage(text, duration = 0) {
    document.getElementById('messageText').innerHTML = text;
    const msg = document.getElementById('message');
    msg.classList.add('show');
    
    if (duration > 0) {
      setTimeout(() => {
        msg.classList.remove('show');
      }, duration);
    }
  }

  // ========================================================================
  // CAMERA
  // ========================================================================
  updateCamera() {
    if (!this.player || !this.level) return;
    
    const targetX = this.player.x - CANVAS_WIDTH / 2;
    const targetY = this.player.y - CANVAS_HEIGHT / 2;
    
    this.cameraX += (targetX - this.cameraX) * 0.1;
    this.cameraY += (targetY - this.cameraY) * 0.1;
    
    this.cameraX = Math.max(0, Math.min(this.cameraX, this.level.width - CANVAS_WIDTH));
    this.cameraY = Math.max(0, Math.min(this.cameraY, this.level.height - CANVAS_HEIGHT));
  }

  // ========================================================================
  // RENDERING
  // ========================================================================
  update(deltaTime) {
    if (!this.player || !this.level) return;
    
    this.handleInput();
    this.level.update();
    this.level.updateNpcs(deltaTime, this.player.x + 20, this.player.y);
    this.level.updateSwitches(this.player.x + 20, this.player.y);
    this.level.updatePassages(
      this.player.x + 20,
      this.player.y,
      this.player.getHitbox()
    );
    
    const activeWalls = this.level.getActiveWalls();
    const wasGrounded = this.player.isGrounded;
    this.player.update(deltaTime, activeWalls);

    // Landungs-Sound: war in der Luft, jetzt geerdet
    if (!wasGrounded && this.player.isGrounded) {
      this.audio.playSound('land');
    }

    // Passage entdeckt → Sound
    for (const p of this.level.passages) {
      if (p.discovered && p.fogAlpha > 0 && p.fogAlpha < 0.97) {
        if (!p._discoverSoundPlayed) {
          p._discoverSoundPlayed = true;
          this.audio.playSound('discover');
        }
      }
    }

    this.updateCamera();
    this.checkCollectibles();
  }

  draw() {
    if (!this.player || !this.level) return;
    
    // 1. Backgrounds (Parallax)
    this.backgroundRenderer.render(
      this.cameraX,
      this.cameraY,
      this.level.width,
      this.level.height
    );
    
    // 2. Level (mit Kamera)
    this.level.draw(this.ctx, this.cameraX, this.cameraY);
    
    // 3. Player (mit Kamera)
    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);
    this.player.draw(this.ctx);
    this.ctx.restore();
    
    // 4. Foreground (optional, über allem)
    this.backgroundRenderer.renderForeground(this.cameraX, this.cameraY, this.level.height);
  }

  gameLoop(timestamp) {
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.draw();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  async start() {
    const initialized = await this.initialize();
    if (initialized) {
      console.log('🦊 Fox Run Game gestartet!');
      this.gameLoop(0);
    }
  }
}
// Start wird vom Splash Screen in index.html ausgelöst
