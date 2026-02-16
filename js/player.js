// ============================================================================
// PLAYER CLASS
// Verwaltet alle Spieler-Logik: Bewegung, Animation, Kollision
// ============================================================================

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    
    // WICHTIG: Draw-Größe (variiert mit Animation)
    this.drawWidth = 78;
    this.drawHeight = 64;
    
    // WICHTIG: Feste Hitbox (konstant über alle Animationen!)
    this.hitbox = {
      offsetX: 18,
      offsetY: 12,
      width: 40,
      height: 48
    };
    
    // Physik
    this.velocityX = 0;
    this.velocityY = 0;
    this.speed = PLAYER_CONFIG.speed;
    this.jumpPower = PLAYER_CONFIG.jumpPower;
    this.gravity = PLAYER_CONFIG.gravity;
    this.friction = PLAYER_CONFIG.friction;
    
    // Zustände
    this.isGrounded = false;
    this.groundedBuffer = 0;      // ✅ WICHTIG: Verhindert Flackern!
    this.groundedBufferMax = 3;   // Frames die "grounded" nachhalten
    this.isCrouching = false;
    this.facingRight = true;      // ✅ PNGs schauen nach RECHTS
    this.isJumping = false;

    // Farbfilter (wird von game.js gesetzt)
    this.activeFilter = null;   // Objekt aus COIN_FILTERS oder null
    this._glitterParticles = [];

    // Kriechen-Zustand (für Decken-Check)
    this.wantToStand = false;    // Spieler versucht aufzustehen
    
    // Input State Tracking (verhindert Button-Spam)
    this.lastJumpState     = false;
    this.lastInteractState = false;
    this.lastSniffState    = false;
    
    // Double Jump System
    this.jumpsRemaining = 2;
    this.maxJumps = 2;
    
    // Für saubere Kollisionsprüfung
    this.previousY = y;
    
    // Animation
    this.currentAnimation = 'idle';
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.animationLocked = false;
    
    // Sprites laden
    this.sprites = {};
    this.spritesLoaded = 0;
    this.totalSprites = 0;
    this.loadSprites();
  }

  loadSprites() {
    this.totalSprites = Object.keys(ANIMATIONS).length;
    
    for (let animName in ANIMATIONS) {
      const img = new Image();
      img.src = ANIMATIONS[animName].spriteSheet;
      img.onload = () => {
        this.spritesLoaded++;
        if (this.spritesLoaded === this.totalSprites) {
          console.log('✅ Alle Sprites geladen!');
        }
      };
      img.onerror = () => {
        console.warn(`❌ Sprite nicht gefunden: ${ANIMATIONS[animName].spriteSheet}`);
        this.spritesLoaded++;
      };
      this.sprites[animName] = img;
    }
  }

  setAnimation(animName) {
    // Nicht-loopende Animationen nicht unterbrechen
    if (this.animationLocked && ANIMATIONS[animName].loop === false) return;
    
    if (this.currentAnimation !== animName && ANIMATIONS[animName]) {
      this.currentAnimation = animName;
      this.frameIndex = 0;
      this.frameTimer = 0;
      
      // NUR Draw-Dimensionen aktualisieren (NICHT Hitbox!)
      this.drawWidth = ANIMATIONS[animName].frameWidth;
      this.drawHeight = ANIMATIONS[animName].frameHeight;
      
      // Nicht-loopende Animationen sperren
      if (!ANIMATIONS[animName].loop) {
        this.animationLocked = true;
      }
    }
  }

  jump() {
    if (this.jumpsRemaining > 0) {
      this.velocityY = -this.jumpPower;
      this.jumpsRemaining--;
      this.isJumping = true;
      this.groundedBuffer = 0;  // ✅ Puffer reset beim Springen
      return true;
    }
    return false;
  }

  // Prüft ob Platz über dem Spieler ist (für Aufstehen aus Kriechen)
  canStandUp(walls) {
    const baseOffsetX = 18;
    const baseOffsetY = 12;
    const baseWidth   = 40;
    const baseHeight  = 48;

    // Volle Hitbox simulieren
    const fullHitbox = {
      x: this.x + baseOffsetX,
      y: this.y + baseOffsetY,
      width: baseWidth,
      height: baseHeight
    };

    // Kollision mit Wänden prüfen
    for (const wall of walls) {
      if (this.isColliding(fullHitbox, wall)) {
        return false;  // Decke blockiert
      }
    }
    return true;  // Platz vorhanden
  }

  update(deltaTime, walls) {
    const anim = ANIMATIONS[this.currentAnimation];
    
    // ========================================================================
    // ANIMATION FRAME UPDATE
    // ========================================================================
    this.frameTimer += deltaTime;
    if (this.frameTimer >= anim.frameDelay) {
      this.frameTimer = 0;
      this.frameIndex++;
      
      if (this.frameIndex >= anim.frameCount) {
        if (anim.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = anim.frameCount - 1;
          this.animationLocked = false;
        }
      }
    }

    // ========================================================================
    // PHYSIK UPDATE
    // ========================================================================
    
    // 1. Previous Y Position speichern
    this.previousY = this.y;
    
    // 2. Gravity nur wenn nicht am Boden
    if (!this.isGrounded) {
      this.velocityY += this.gravity;
    }
    
    // 3. HORIZONTAL Bewegung & Kollision
    // Kriechen: Geschwindigkeit halbiert
    if (this.isCrouching && Math.abs(this.velocityX) > 0) {
      this.velocityX *= 0.5;
    }
    
    this.x += this.velocityX;
    this.checkWallCollisionX(walls);
    
    // 4. VERTIKAL Bewegung & Kollision
    this.y += this.velocityY;
    const wasGrounded = this.isGrounded;
    this.checkFloorCollisionY(walls);
    
    // 5. Grounded Buffer System (verhindert Flackern!)
    if (this.isGrounded) {
      this.groundedBuffer = this.groundedBufferMax;
    } else {
      if (this.groundedBuffer > 0) {
        this.groundedBuffer--;
        this.isGrounded = true;  // ✅ Noch als grounded behandeln!
      }
    }
    
    // WICHTIG: Keine Canvas-Grenzen mehr hier!
    // Level-Grenzen werden durch Wände definiert

    // ========================================================================
    // ANIMATIONS-STATE-MACHINE
    // ========================================================================
    if (!this.animationLocked) {
      if (this.isGrounded) {
        // Am Boden
        if (this.isCrouching) {
          this.setAnimation('crouch');
        } else if (Math.abs(this.velocityX) > 2) {
          this.setAnimation('run');
        } else if (Math.abs(this.velocityX) > 0.5) {
          this.setAnimation('walk');
        } else {
          this.setAnimation('idle');
        }
      } else {
        // In der Luft
        if (this.velocityY < -2) {
          this.setAnimation('pounce');
        } else if (this.velocityY > 1) {
          this.setAnimation('falling');
        }
      }
    } else {
      // Locked Animation (z.B. sniff)
      // Wenn gerade gelandet und pounce läuft -> abbrechen
      if (this.isGrounded && this.currentAnimation === 'pounce') {
        this.animationLocked = false;
        this.setAnimation('idle');
      }
    }

    // 8. Reibung
    this.velocityX *= this.friction;
  }

  // ========================================================================
  // HORIZONTALE KOLLISION (NUR X!)
  // ========================================================================
  checkWallCollisionX(walls) {
    let hitbox = this.getHitbox();
    
    for (let wall of walls) {
      if (this.isColliding(hitbox, wall)) {
        // NUR X korrigieren
        if (this.velocityX > 0) {
          // Nach rechts
          this.x = wall.x - this.hitbox.width - this.hitbox.offsetX;
        } else if (this.velocityX < 0) {
          // Nach links
          this.x = wall.x + wall.width - this.hitbox.offsetX;
        }
        this.velocityX = 0;
        
        // Hitbox neu berechnen
        hitbox = this.getHitbox();
        break;  // ✅ Eine Korrektur pro Frame
      }
    }
  }

  // ========================================================================
  // VERTIKALE KOLLISION (NUR Y!)
  // ========================================================================
  checkFloorCollisionY(walls) {
    let hitbox = this.getHitbox();
    const previousBottom = this.previousY + this.hitbox.offsetY + this.hitbox.height;
    const currentBottom = hitbox.y + hitbox.height;
    
    this.isGrounded = false;  // Reset (wird ggf. wieder true)
    
    for (let wall of walls) {
      if (this.isColliding(hitbox, wall)) {
        const wallTop = wall.y;
        const wallBottom = wall.y + wall.height;
        
        // BODEN: von oben auf Plattform fallen
        if (this.velocityY > 0 && previousBottom <= wallTop + 2) {  // +2 = Toleranz
          // Auf Plattform landen
          this.y = wallTop - this.hitbox.height - this.hitbox.offsetY;
          
          // Snap-Toleranz (gegen Float-Drift)
          const targetY = wallTop - this.hitbox.height - this.hitbox.offsetY;
          if (Math.abs(this.y - targetY) < 2) {
            this.y = targetY;
          }
          
          this.velocityY = 0;
          this.isGrounded = true;
          this.isJumping = false;
          this.jumpsRemaining = this.maxJumps;  // Jumps zurücksetzen
          
          hitbox = this.getHitbox();
          break;
        }
        
        // DECKE: von unten gegen Decke
        else if (this.velocityY < 0) {
          this.y = wallBottom - this.hitbox.offsetY;
          this.velocityY = 0;
          
          hitbox = this.getHitbox();
          break;
        }
      }
    }
  }

  getHitbox() {
    // Basis-Hitbox (stehend)
    const baseOffsetX = 18;
    const baseOffsetY = 12;
    const baseWidth   = 40;
    const baseHeight  = 48;

    if (this.isCrouching) {
      // Kriechen: Hitbox 35% kleiner, schrumpft nach OBEN
      const crouchHeight = baseHeight * 0.65;
      const heightDiff   = baseHeight - crouchHeight;
      
      return {
        x: this.x + baseOffsetX,
        y: this.y + baseOffsetY + heightDiff,  // verschoben nach unten
        width: baseWidth,
        height: crouchHeight
      };
    }

    return {
      x: this.x + baseOffsetX,
      y: this.y + baseOffsetY,
      width: baseWidth,
      height: baseHeight
    };
  }

  isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  draw(ctx) {
    const anim = ANIMATIONS[this.currentAnimation];
    const sprite = this.sprites[this.currentAnimation];
    
    // Fallback wenn Sprite nicht geladen
    if (!sprite || !sprite.complete) {
      ctx.fillStyle = '#ff6b35';
      ctx.fillRect(this.x, this.y, this.drawWidth, this.drawHeight);
      return;
    }

    ctx.save();
    
    // ✅ PNGs schauen nach RECHTS
    // facingRight=true  -> normal (rechts)
    // facingRight=false -> flip (links)
    if (this.facingRight) {
      // Nach rechts - normal
      ctx.drawImage(
        sprite,
        this.frameIndex * anim.frameWidth, 0,
        anim.frameWidth, anim.frameHeight,
        this.x, this.y,
        this.drawWidth, this.drawHeight
      );
    } else {
      // Nach links - spiegeln
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

    // ── Farbfilter ──────────────────────────────────────────────────────────
    if (this.activeFilter) {
      const f = this.activeFilter;

      // CSS Filter statt Overlay — respektiert Transparenz + Transform automatisch
      ctx.save();

      let filterStr = '';
      if (f.animated) {
        // Regenbogen: Hue rotiert
        const hue = (Date.now() / 20) % 360;
        filterStr = `hue-rotate(${hue}deg) saturate(1.5) brightness(1.1)`;
      } else {
        // Statische Filter je nach ID
        switch (f.id) {
          case 'amber':
            filterStr = 'sepia(0.6) saturate(1.4) hue-rotate(-10deg) brightness(1.05)';
            break;
          case 'copper':
            filterStr = 'sepia(0.8) saturate(1.3) hue-rotate(10deg) brightness(0.95)';
            break;
          case 'emerald':
            filterStr = 'hue-rotate(90deg) saturate(1.5) brightness(0.9)';
            break;
          case 'sapphire':
            filterStr = 'hue-rotate(200deg) saturate(1.6) brightness(0.95)';
            break;
          case 'amethyst':
            filterStr = 'hue-rotate(270deg) saturate(1.5) brightness(1.0)';
            break;
          case 'ruby':
            filterStr = 'hue-rotate(340deg) saturate(1.7) brightness(1.0)';
            break;
          case 'moonstone':
            filterStr = 'brightness(1.3) saturate(0.5) contrast(1.1)';
            break;
          case 'obsidian':
            filterStr = 'brightness(0.35) contrast(1.5) saturate(0.8)';
            break;
          default:
            filterStr = f.color ? `sepia(0.5) saturate(1.3)` : '';
        }
      }

      if (filterStr) {
        ctx.filter = filterStr;
        // Sprite nochmal zeichnen mit Filter
        if (this.facingRight) {
          ctx.drawImage(sprite,
            this.frameIndex * anim.frameWidth, 0, anim.frameWidth, anim.frameHeight,
            this.x, this.y, this.drawWidth, this.drawHeight);
        } else {
          ctx.translate(this.x + this.drawWidth, this.y);
          ctx.scale(-1, 1);
          ctx.drawImage(sprite,
            this.frameIndex * anim.frameWidth, 0, anim.frameWidth, anim.frameHeight,
            0, 0, this.drawWidth, this.drawHeight);
        }
        ctx.filter = 'none';
      }

      ctx.restore();

      // Obsidian: Glitzer-Partikel (bleibt wie gehabt)
      if (f.glitter) {
        if (Math.random() < 0.3) {
          this._glitterParticles.push({
            x: this.x + Math.random() * this.drawWidth,
            y: this.y + Math.random() * this.drawHeight,
            size: 1 + Math.random() * 2,
            life: 1.0,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.5 - Math.random() * 0.5
          });
        }
        this._glitterParticles = this._glitterParticles.filter(p => p.life > 0);
        for (const p of this._glitterParticles) {
          ctx.save();
          ctx.globalAlpha = p.life * 0.9;
          ctx.fillStyle = p.life > 0.6
            ? `rgba(180, 140, 255, ${p.life})`
            : `rgba(255, 255, 255, ${p.life})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          p.x   += p.vx;
          p.y   += p.vy;
          p.life -= 0.04;
        }
      }
    }

    // Debug
    if (DEBUG_MODE) {
      const hitbox = this.getHitbox();
      
      // Hitbox
      ctx.strokeStyle = 'lime';
      ctx.lineWidth = 2;
      ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
      
      // Info
      ctx.fillStyle = 'white';
      ctx.font = '12px Arial';
      ctx.fillText(`Jumps: ${this.jumpsRemaining}/${this.maxJumps}`, hitbox.x, hitbox.y - 15);
      ctx.fillText(`Ground: ${this.isGrounded} (buf: ${this.groundedBuffer})`, hitbox.x, hitbox.y - 5);
      ctx.fillText(`VelY: ${this.velocityY.toFixed(1)}`, hitbox.x, hitbox.y + hitbox.height + 15);
    }
  }
}
