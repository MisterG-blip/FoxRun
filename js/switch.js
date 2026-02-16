// ============================================================================
// SWITCH CLASS
// Kippschalter mit 2 Zuständen (off/on).
// Betätigung durch F-Taste wenn Spieler in der Nähe.
// Steuert Secret-Doors über ihre ID.
//
// LEVEL-JSON:
//   "switches": [
//     {
//       "id": "switch_1",        ← eindeutige ID
//       "x": 400, "y": 950,      ← Position
//       "targets": ["door_1"],   ← IDs der Secret-Doors die dieser Schalter steuert
//       "hint": "Ein alter Hebel..." ← optionaler Hinweis-Text beim Schnüffeln
//     }
//   ]
//
// ZUSTÄNDE:
//   isOn = false → Schalter unten / aus
//   isOn = true  → Schalter oben / an → targets werden geöffnet
//
// AUSSEHEN pro Welt (theme):
//   castle  → Steinhebel an der Wand
//   village → Holzhebel / Seilzug
//   forest  → Ast-Hebel / Rankenpfad
// ============================================================================

const SWITCH_INTERACT_DISTANCE = 60;

class Switch {
  constructor(data, theme = 'castle') {
    this.id      = data.id || 'switch';
    this.x       = data.x;
    this.y       = data.y;
    this.width   = 24;
    this.height  = 40;

    // Targets: string-Array (legacy) ODER Objekt-Array mit id + action
    // Legacy:  "targets": ["door_1", "door_2"]
    // Neu:     "targets": [
    //            { "id": "door_1",   "action": "open"   },
    //            { "id": "door_2",   "action": "close"  },
    //            { "id": "switch_2", "action": "toggle" }
    //          ]
    this.targets = (data.targets || []).map(t =>
      typeof t === 'string' ? { id: t, action: 'toggle' } : t
    );

    this.hint    = data.hint || null;
    this.theme   = theme;

    this.isOn           = false;
    this.playerNearby   = false;
    this.animProgress   = 0;
    this._processing    = false;  // Endlosschleifen-Schutz
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================
  update(playerX, playerY) {
    const dist      = Math.abs(playerX - (this.x + this.width / 2));
    this.playerNearby = dist < SWITCH_INTERACT_DISTANCE;

    // Sanfte Animation zwischen den Zuständen
    const target = this.isOn ? 1 : 0;
    this.animProgress += (target - this.animProgress) * 0.2;
  }

  // ==========================================================================
  // INTERAKTION (von game.js aufgerufen)
  // Gibt Hinweis-Text zurück wenn vorhanden.
  // ==========================================================================
  interact() {
    if (!this.playerNearby) return null;

    this.isOn = !this.isOn;
    console.log(`🔧 Schalter ${this.id} → ${this.isOn ? 'AN' : 'AUS'}`);

    return this.hint || (this.isOn ? '🔧 Schalter aktiviert!' : '🔧 Schalter deaktiviert.');
  }

  // ==========================================================================
  // DRAW
  // ==========================================================================
  draw(ctx) {
    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;
    const p = this.animProgress;   // 0=aus, 1=an

    ctx.save();

    switch (this.theme) {
      case 'village': this._drawVillage(ctx, x, y, w, h, p); break;
      case 'forest':  this._drawForest(ctx, x, y, w, h, p);  break;
      default:        this._drawCastle(ctx, x, y, w, h, p);  break;
    }

    // Interaktions-Hinweis
    if (this.playerNearby) {
      this._drawHint(ctx, x + w / 2, y - 14);
    }

    ctx.restore();
  }

  // ── Burg: Steinhebel ───────────────────────────────────────────────────────
  _drawCastle(ctx, x, y, w, h, p) {
    // Wandplatte
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Führungsschiene
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x + w/2 - 3, y + 6, 6, h - 12);

    // Hebelgriff — bewegt sich von unten (aus) nach oben (an)
    const gripY = y + (h - 16) - p * (h - 24);
    ctx.fillStyle = this.isOn ? '#e74c3c' : '#7f8c8d';
    ctx.fillRect(x + 4, gripY, w - 8, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 4, gripY, w - 8, 4);

    // Status-LED
    ctx.fillStyle = this.isOn ? '#2ecc71' : '#c0392b';
    ctx.beginPath();
    ctx.arc(x + w/2, y + h - 6, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Dorf: Holzhebel ────────────────────────────────────────────────────────
  _drawVillage(ctx, x, y, w, h, p) {
    // Holzpfosten
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(x + w/2 - 5, y, 10, h);
    ctx.fillStyle = '#654321';
    ctx.fillRect(x + w/2 - 5, y, 2, h);

    // Hebelarm — dreht sich um Mitte
    const cx    = x + w / 2;
    const cy    = y + h / 2;
    const angle = (-0.6 + p * 1.2);   // -0.6 rad (aus) bis +0.6 rad (an)
    const armL  = h * 0.45;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = '#a0522d';
    ctx.fillRect(-4, -armL, 8, armL * 2);
    // Griff
    ctx.fillStyle = '#deb887';
    ctx.fillRect(-6, -armL - 4, 12, 8);
    ctx.restore();

    // Drehpunkt
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Status
    ctx.fillStyle = this.isOn ? '#2ecc71' : '#c0392b';
    ctx.beginPath();
    ctx.arc(cx, y + h - 4, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Wald: Ast-Hebel ────────────────────────────────────────────────────────
  _drawForest(ctx, x, y, w, h, p) {
    // Felsblock als Basis
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(x, y + h - 14, w, 14);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x, y + h - 14, w, 3);

    // Ast-Hebel — wackelt
    const cx    = x + w / 2;
    const pivot = y + h - 14;
    const angle = (-0.5 + p * 1.0);
    const astL  = h * 0.75;

    ctx.save();
    ctx.translate(cx, pivot);
    ctx.rotate(angle);

    // Rauer Ast
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth   = 6;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -astL);
    ctx.stroke();

    // Knorren
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -astL * 0.4);
    ctx.lineTo(6, -astL * 0.5);
    ctx.stroke();

    // Moos am Griff
    ctx.fillStyle = this.isOn ? '#2ecc71' : '#795548';
    ctx.beginPath();
    ctx.arc(0, -astL, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── Interaktions-Hinweis ───────────────────────────────────────────────────
  _drawHint(ctx, cx, cy) {
    const pulse = 0.85 + Math.sin(Date.now() / 250) * 0.15;
    ctx.save();
    ctx.globalAlpha = pulse;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx - 20, cy - 14, 40, 22, 8);
    else ctx.rect(cx - 20, cy - 14, 40, 22);
    ctx.fill();

    ctx.fillStyle = '#f1c40f';
    ctx.font      = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🔧 F', cx, cy + 3);

    ctx.restore();
  }

  // ==========================================================================
  // HITBOX (für Kollisionsprüfung)
  // ==========================================================================
  getHitbox() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
}
