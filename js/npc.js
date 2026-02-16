// ============================================================================
// NPC CLASS
// Roter Fuchs (_r Sprites) – kann patrouillieren oder stehen.
// Erkennt wenn der Spieler in der Nähe ist → löst Dialog / Rätsel aus.
// ============================================================================
//
// LEVEL-JSON EINBINDUNG:
//
//   "npcs": [
//     {
//       "id": "fox_guard",          ← eindeutige ID (für Rätsel-Logik)
//       "x": 500,                   ← Startposition
//       "y": 960,
//       "behavior": "patrol",       ← "patrol" | "idle" | "sit"
//       "patrolLeft":  400,         ← Wendepunkt links  (nur bei patrol)
//       "patrolRight": 700,         ← Wendepunkt rechts (nur bei patrol)
//       "speed": 1.5,               ← Laufgeschwindigkeit (optional, default 1.5)
//       "dialog": [                 ← Texte die beim Schnüffeln erscheinen
//         "Hast du den Schlüssel?",
//         "Dann komm rein!"
//       ]
//     }
//   ]
//
// DIALOG AUSLÖSEN:
//   Spieler drückt F (sniff) in der Nähe des NPC
//   → game.js ruft npc.interact() auf
//   → gibt nächste Dialog-Zeile zurück
//
// ANIMATION-MAPPING:
//   _r Sprites = roter Fuchs, gleiche Frame-Daten wie Spieler-Fox
// ============================================================================

// Animations-Definitionen für den roten Fuchs (_r Sprites)
// Gleiche Frame-Daten wie ANIMATIONS in config.js – nur andere Bild-Dateien
const NPC_ANIMATIONS = {
  idle: {
    spriteSheet: 'assets/sprites/fox/standing_r.png',
    frameCount: 7,  frameWidth: 78, frameHeight: 64, frameDelay: 120, loop: true
  },
  walk: {
    spriteSheet: 'assets/sprites/fox/walk_r.png',
    frameCount: 11, frameWidth: 78, frameHeight: 64, frameDelay: 90,  loop: true
  },
  run: {
    spriteSheet: 'assets/sprites/fox/run_r.png',
    frameCount: 7,  frameWidth: 78, frameHeight: 64, frameDelay: 70,  loop: true
  },
  sit: {
    spriteSheet: 'assets/sprites/fox/standsit_r.png',
    frameCount: 4,  frameWidth: 64, frameHeight: 64, frameDelay: 150, loop: false
  },
  sniff: {
    spriteSheet: 'assets/sprites/fox/sniff_r.png',
    frameCount: 19, frameWidth: 64, frameHeight: 64, frameDelay: 80,  loop: true
  },
  hurt: {
    spriteSheet: 'assets/sprites/fox/hurt_r.png',
    frameCount: 1,  frameWidth: 78, frameHeight: 64, frameDelay: 100, loop: false
  }
};

// Wie nah muss der Spieler sein damit Interaktion möglich ist (Pixel)
const NPC_INTERACT_DISTANCE = 80;

// ============================================================================

class NPC {
  constructor(data) {
    // Position & Identität
    this.id       = data.id || 'npc';
    this.x        = data.x;
    this.y        = data.y;

    // Hitbox – identisch mit Spieler-Hitbox
    this.hitbox = { offsetX: 18, offsetY: 12, width: 40, height: 48 };

    // Draw-Größe
    this.drawWidth  = 78;
    this.drawHeight = 64;

    // Verhalten
    this.behavior     = data.behavior || 'idle';   // 'patrol' | 'idle' | 'sit'
    this.patrolLeft   = data.patrolLeft  ?? (this.x - 100);
    this.patrolRight  = data.patrolRight ?? (this.x + 100);
    this.speed        = data.speed ?? 1.5;
    this.facingRight  = true;

    // Dialog
    this.dialog       = data.dialog || [];
    this.dialogIndex  = 0;

    // Zustände
    this.isGrounded   = false;
    this.velocityY    = 0;
    this.gravity      = 0.5;

    // Interaktion
    this.playerNearby     = false;   // Spieler ist in Reichweite
    this.showInteractHint = false;   // 🐾-Symbol über NPC anzeigen
    this.isInteracting    = false;   // Dialog läuft gerade

    // Animation
    this.currentAnimation = 'idle';
    this.frameIndex       = 0;
    this.frameTimer       = 0;
    this.animationLocked  = false;

    // Sprites laden
    this.sprites = {};
    this._loadSprites();
  }

  // ==========================================================================
  // SPRITES LADEN
  // ==========================================================================
  _loadSprites() {
    for (const [name, cfg] of Object.entries(NPC_ANIMATIONS)) {
      const img = new Image();
      img.src = cfg.spriteSheet;
      img.onerror = () => console.warn(`⚠️ NPC-Sprite fehlt: ${cfg.spriteSheet}`);
      this.sprites[name] = img;
    }
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================
  update(deltaTime, walls, playerX, playerY) {
    // ── Gravitation ──────────────────────────────────────────────────────────
    if (!this.isGrounded) {
      this.velocityY += this.gravity;
      this.y += this.velocityY;
    }

    // Boden-Kollision (vereinfacht – nur nach unten)
    this.isGrounded = false;
    for (const wall of walls) {
      const hb = this.getHitbox();
      if (
        hb.x < wall.x + wall.width  &&
        hb.x + hb.width > wall.x    &&
        hb.y + hb.height >= wall.y  &&
        hb.y + hb.height <= wall.y + wall.height + Math.abs(this.velocityY) + 2
      ) {
        this.y        = wall.y - this.drawHeight + this.hitbox.offsetY;
        this.velocityY = 0;
        this.isGrounded = true;
        break;
      }
    }

    // ── Verhalten ────────────────────────────────────────────────────────────
    if (!this.isInteracting) {
      switch (this.behavior) {
        case 'patrol': this._updatePatrol(deltaTime); break;
        case 'sit':    this._setAnim('sit');           break;
        default:       this._setAnim('idle');          break;
      }
    }

    // ── Spieler-Nähe prüfen ──────────────────────────────────────────────────
    const dist = Math.abs(playerX - (this.x + this.drawWidth / 2));
    this.playerNearby     = dist < NPC_INTERACT_DISTANCE;
    this.showInteractHint = this.playerNearby && this.dialog.length > 0;

    // ── Animation Frame ──────────────────────────────────────────────────────
    const anim = NPC_ANIMATIONS[this.currentAnimation];
    this.frameTimer += deltaTime;
    if (this.frameTimer >= anim.frameDelay) {
      this.frameTimer = 0;
      this.frameIndex++;
      if (this.frameIndex >= anim.frameCount) {
        if (anim.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex    = anim.frameCount - 1;
          this.animationLocked = false;
          // Nach nicht-loopender Anim: zurück zu idle
          if (this.isInteracting) {
            this._setAnim('idle');
          }
        }
      }
    }
  }

  _updatePatrol(deltaTime) {
    if (this.facingRight) {
      this.x += this.speed;
      if (this.x >= this.patrolRight) { this.facingRight = false; }
      this._setAnim('walk');
    } else {
      this.x -= this.speed;
      if (this.x <= this.patrolLeft)  { this.facingRight = true; }
      this._setAnim('walk');
    }
  }

  _setAnim(name) {
    if (this.animationLocked) return;
    if (this.currentAnimation === name) return;
    if (!NPC_ANIMATIONS[name]) return;

    this.currentAnimation = name;
    this.frameIndex       = 0;
    this.frameTimer       = 0;
    this.drawWidth        = NPC_ANIMATIONS[name].frameWidth;
    this.drawHeight       = NPC_ANIMATIONS[name].frameHeight;
  }

  // ==========================================================================
  // INTERAKTION (von game.js aufgerufen wenn Spieler F drückt)
  // ==========================================================================

  /**
   * Gibt die nächste Dialog-Zeile zurück, oder null wenn kein Dialog.
   * game.js zeigt den Text dann in der Message-Box an.
   *
   * Beispiel in game.js:
   *   if (input.sniff && !player.lastSniffState) {
   *     const nearNpc = this.level.getNearestNpc(player.x, player.y);
   *     if (nearNpc) {
   *       const line = nearNpc.interact();
   *       if (line) this.showMessage(line, 3000);
   *     } else {
   *       // normales Schnüffeln
   *       player.setAnimation('sniff');
   *     }
   *   }
   */
  interact() {
    if (!this.playerNearby) return null;
    if (this.dialog.length === 0) return null;

    // Sniff-Animation abspielen
    this.isInteracting   = true;
    this.animationLocked = false;
    this._setAnim('sniff');
    this.animationLocked = true;

    // Nächste Dialog-Zeile
    const line = this.dialog[this.dialogIndex];
    this.dialogIndex = (this.dialogIndex + 1) % this.dialog.length;

    // Nach letzter Zeile: Animation wieder freigeben
    if (this.dialogIndex === 0) {
      setTimeout(() => {
        this.isInteracting   = false;
        this.animationLocked = false;
      }, 1200);
    }

    return line;
  }

  // ==========================================================================
  // DRAW
  // ==========================================================================
  draw(ctx) {
    const anim   = NPC_ANIMATIONS[this.currentAnimation];
    const sprite = this.sprites[this.currentAnimation];

    // Fallback
    if (!sprite || !sprite.complete) {
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(this.x, this.y, this.drawWidth, this.drawHeight);
      return;
    }

    ctx.save();

    if (this.facingRight) {
      ctx.drawImage(
        sprite,
        this.frameIndex * anim.frameWidth, 0,
        anim.frameWidth, anim.frameHeight,
        this.x, this.y,
        this.drawWidth, this.drawHeight
      );
    } else {
      ctx.translate(this.x + this.drawWidth, this.y);
      ctx.scale(-1, 1);
      ctx.drawImage(
        sprite,
        this.frameIndex * anim.frameWidth, 0,
        anim.frameWidth, anim.frameHeight,
        0, 0,
        this.drawWidth, this.drawHeight
      );
    }

    ctx.restore();

    // Interaktions-Hinweis über dem NPC
    if (this.showInteractHint) {
      this._drawInteractHint(ctx);
    }

    // Debug
    if (typeof DEBUG_MODE !== 'undefined' && DEBUG_MODE) {
      const hb = this.getHitbox();
      ctx.strokeStyle = 'red';
      ctx.lineWidth   = 2;
      ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
      ctx.fillStyle = 'white';
      ctx.font      = '10px Arial';
      ctx.fillText(this.id, hb.x, hb.y - 4);
    }
  }

  _drawInteractHint(ctx) {
    const cx = this.x + this.drawWidth / 2;
    const cy = this.y - 18;

    // Pulsierender Kreis
    const pulse = 0.85 + Math.sin(Date.now() / 250) * 0.15;
    ctx.save();
    ctx.globalAlpha = pulse;

    // Hintergrund-Blase
    ctx.fillStyle   = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect?.(cx - 20, cy - 14, 40, 22, 8) ?? ctx.rect(cx - 20, cy - 14, 40, 22);
    ctx.fill();

    // Text
    ctx.fillStyle = '#f1c40f';
    ctx.font      = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🐾 F', cx, cy + 3);

    ctx.restore();
  }

  // ==========================================================================
  // HITBOX
  // ==========================================================================
  getHitbox() {
    return {
      x:      this.x      + this.hitbox.offsetX,
      y:      this.y      + this.hitbox.offsetY,
      width:  this.hitbox.width,
      height: this.hitbox.height
    };
  }
}
