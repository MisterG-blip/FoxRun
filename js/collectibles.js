// ============================================================================
// COLLECTIBLES CLASSES
// Münzen, Schlüssel, Türen und Ziel
// ============================================================================

class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 24;
    this.collected = false;
    this.rotation = 0;
    this.scale = 1;
  }

  update() {
    this.rotation += 0.08;
    this.scale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
  }

  draw(ctx) {
    if (this.collected) return;
    
    ctx.save();
    ctx.translate(this.x + this.width/2, this.y + this.height/2);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);
    
    // Münze zeichnen
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffed4e';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0);
    
    ctx.restore();
  }

  checkCollision(player) {
    if (this.collected) return false;
    
    const hitbox = player.getHitbox();
    return hitbox.x < this.x + this.width &&
           hitbox.x + hitbox.width > this.x &&
           hitbox.y < this.y + this.height &&
           hitbox.y + hitbox.height > this.y;
  }
}

class Key {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 28;
    this.collected = false;
    this.bobOffset = 0;
    this.sparkle = 0;
  }

  update() {
    this.bobOffset = Math.sin(Date.now() * 0.004) * 6;
    this.sparkle = Math.sin(Date.now() * 0.008);
  }

  draw(ctx) {
    if (this.collected) return;
    
    const drawY = this.y + this.bobOffset;
    
    // Leucht-Effekt
    ctx.save();
    ctx.globalAlpha = 0.3 + this.sparkle * 0.2;
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(this.x + this.width/2, drawY + this.height/2, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Schlüssel Körper
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(this.x + 10, drawY + 4, 5, 18);
    
    // Schlüssel Kopf
    ctx.beginPath();
    ctx.arc(this.x + 12, drawY + 8, 7, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#0f3460';
    ctx.beginPath();
    ctx.arc(this.x + 12, drawY + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Schlüssel Zähne
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(this.x + 15, drawY + 15, 10, 4);
    ctx.fillRect(this.x + 15, drawY + 20, 6, 4);
  }

  checkCollision(player) {
    if (this.collected) return false;
    
    const hitbox = player.getHitbox();
    return hitbox.x < this.x + this.width &&
           hitbox.x + hitbox.width > this.x &&
           hitbox.y < this.y + this.height &&
           hitbox.y + hitbox.height > this.y;
  }
}

class Door {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.isOpen = false;
    this.openProgress = 0;
  }

  update() {
    if (this.isOpen && this.openProgress < 1) {
      this.openProgress += 0.05;
    }
  }

  draw(ctx) {
    if (this.isOpen && this.openProgress >= 1) {
      ctx.fillStyle = 'rgba(46, 204, 113, 0.2)';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      return;
    }
    
    const alpha = 1 - this.openProgress;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Tür Rahmen
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Tür Panel
    ctx.fillStyle = '#654321';
    ctx.fillRect(this.x + 6, this.y + 6, this.width - 12, this.height - 12);
    
    // Tür Muster
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x + 10, this.y + 10, this.width - 20, this.height - 20);
    
    // Schloss
    if (!this.isOpen) {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(this.x + this.width/2, this.y + this.height/2, 10, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#8b4513';
      ctx.beginPath();
      ctx.arc(this.x + this.width/2, this.y + this.height/2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

class Goal {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 50;
    this.height = 50;
    this.pulse = 0;
    this.wave = 0;
  }

  update() {
    this.pulse = Math.sin(Date.now() * 0.006) * 0.3 + 0.7;
    this.wave = Math.sin(Date.now() * 0.003) * 5;
  }

  draw(ctx) {
    ctx.save();
    
    // Leuchteffekt
    ctx.globalAlpha = this.pulse * 0.3;
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(this.x + 25, this.y + 25, 30, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1;
    
    // Flaggenmast
    ctx.fillStyle = '#34495e';
    ctx.fillRect(this.x + 8, this.y + 5, 6, 45);
    
    // Flagge
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(this.x + 14, this.y + 5);
    ctx.lineTo(this.x + 45, this.y + 15 + this.wave);
    ctx.lineTo(this.x + 14, this.y + 25);
    ctx.closePath();
    ctx.fill();
    
    // Häkchen auf Flagge
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x + 20, this.y + 15);
    ctx.lineTo(this.x + 25, this.y + 20);
    ctx.lineTo(this.x + 35, this.y + 10);
    ctx.stroke();
    
    ctx.restore();
  }

  checkCollision(player) {
    const hitbox = player.getHitbox();
    return hitbox.x < this.x + this.width &&
           hitbox.x + hitbox.width > this.x &&
           hitbox.y < this.y + this.height &&
           hitbox.y + hitbox.height > this.y;
  }
}

// ============================================================================
// SECRET DOOR
// Wand die durch einen Schalter geöffnet wird.
// Farblich unterschiedlich zur normalen Tür (blau statt braun).
//
// LEVEL-JSON:
//   "secretDoors": [
//     { "id": "door_1", "x": 800, "y": 900, "width": 40, "height": 200 }
//   ]
// ============================================================================
class SecretDoor {
  constructor(data, theme = 'castle') {
    this.id           = data.id;
    this.x            = data.x;
    this.y            = data.y;
    this.width        = data.width  || 40;
    this.height       = data.height || 100;
    this.theme        = theme;
    
    // Initial State Support
    const initialState = data.initialState || 'closed';
    this.isOpen       = (initialState === 'open');
    this.openProgress = this.isOpen ? 1 : 0;
    
    // Multi-Switch Puzzle: Tür öffnet nur wenn ALLE Schalter an sind
    this.requiresAll  = data.requiresAll || null;  // ["switch_1", "switch_2", ...]
  }

  update(switches) {
    // Normale Öffnungs-Animation
    if (this.isOpen && this.openProgress < 1) {
      this.openProgress = Math.min(1, this.openProgress + 0.04);
    }
    
    // Multi-Switch Puzzle: Prüfe ob alle required Schalter an sind
    if (this.requiresAll && switches) {
      const allOn = this.requiresAll.every(id => {
        const sw = switches.find(s => s.id === id);
        return sw && sw.isOn;
      });
      
      if (allOn && !this.isOpen) {
        this.open();
      } else if (!allOn && this.isOpen) {
        this.close();
      }
    } else if (!this.isOpen && this.openProgress < 1) {
      // Normal geschlossen: Animation zurücksetzen
      this.openProgress = Math.max(0, this.openProgress - 0.04);
    }
  }

  open() { 
    this.isOpen = true; 
  }
  
  close() {
    this.isOpen = false;
    this.openProgress = 0;
  }

  // Gibt Wall zurück solange nicht offen (für Kollision)
  getWall() {
    if (this.isOpen && this.openProgress >= 1) return null;
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  draw(ctx) {
    if (this.isOpen && this.openProgress >= 1) {
      ctx.fillStyle = 'rgba(52, 152, 219, 0.15)';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      return;
    }
    const alpha = 1 - this.openProgress;
    ctx.save();
    ctx.globalAlpha = alpha;
    switch (this.theme) {
      case 'village': this._drawVillage(ctx); break;
      case 'forest':  this._drawForest(ctx);  break;
      default:        this._drawCastle(ctx);  break;
    }
    ctx.restore();
  }

  _drawCastle(ctx) {
    const { x, y, width: w, height: h } = this;
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#1a252f';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.beginPath();
    ctx.arc(x + w/2, y + 4, w/2 - 4, Math.PI, 0);
    ctx.fill();
    // Geheimnis-Symbol (Auge)
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + h/2, w/4, h/8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(x + w/2, y + h/2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawVillage(ctx) {
    const { x, y, width: w, height: h } = this;
    const slats = Math.max(1, Math.floor(w / 8));
    for (let i = 0; i < slats; i++) {
      const sx = x + i * (w / slats);
      const sw = w / slats - 2;
      ctx.fillStyle = i % 2 === 0 ? '#2980b9' : '#2471a3';
      ctx.fillRect(sx, y + 10, sw, h - 10);
      ctx.fillStyle = '#1a5276';
      ctx.beginPath();
      ctx.moveTo(sx, y + 10);
      ctx.lineTo(sx + sw/2, y);
      ctx.lineTo(sx + sw, y + 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#1a5276';
    ctx.fillRect(x, y + h * 0.35, w, 6);
    ctx.fillRect(x, y + h * 0.65, w, 6);
  }

  _drawForest(ctx) {
    const { x, y, width: w, height: h } = this;
    ctx.fillStyle = '#1a3a4a';
    ctx.beginPath();
    ctx.moveTo(x + 4,     y + h);
    ctx.lineTo(x,         y + h * 0.3);
    ctx.lineTo(x + w*0.2, y);
    ctx.lineTo(x + w*0.8, y);
    ctx.lineTo(x + w,     y + h * 0.2);
    ctx.lineTo(x + w - 4, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a5276';
    ctx.fillRect(x + 4, y + 4, w - 8, 6);
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + w/2, y + h * 0.3);
    ctx.lineTo(x + w/2, y + h * 0.7);
    ctx.moveTo(x + w * 0.3, y + h * 0.5);
    ctx.lineTo(x + w * 0.7, y + h * 0.5);
    ctx.stroke();
  }

  checkCollision(player) {
    if (this.isOpen && this.openProgress >= 1) return false;
    const hb = player.getHitbox();
    return hb.x < this.x + this.width  &&
           hb.x + hb.width  > this.x   &&
           hb.y < this.y + this.height &&
           hb.y + hb.height > this.y;
  }
}
