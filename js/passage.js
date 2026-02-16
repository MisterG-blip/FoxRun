// ============================================================================
// PASSAGE CLASS
// Unsichtbare Durchgangswand mit Schnüffel-Hinweis und Tile-Überlagerung.
//
// VERHALTEN:
//   - Keine Kollision → Spieler kann durchlaufen
//   - Sieht aus wie normale Wand (gleiche Tile-Textur)
//   - In der Nähe + F drücken → Hinweis "Du riechst etwas Seltsames..."
//     (nur solange der versteckte Bereich noch nicht entdeckt wurde)
//   - hiddenArea: Rechteck das mit Tile-Textur überlagert wird
//     → sieht aus wie ein dicker Mauerblock
//     → blendet sanft aus sobald Spieler die Passage betritt
//     → bleibt offen für diese Sitzung
//
// LEVEL-JSON:
//   "passages": [
//     {
//       "id": "passage_1",
//       "x": 300, "y": 960,
//       "width": 20, "height": 80,
//       "sniffHint": "Du riechst etwas Seltsames...",
//       "hiddenArea": { "x": 80, "y": 900, "width": 240, "height": 200 }
//     }
//   ]
// ============================================================================

const PASSAGE_SNIFF_RADIUS = 250;

class Passage {
  constructor(data) {
    this.id        = data.id || 'passage';
    this.x         = data.x;
    this.y         = data.y;
    this.width     = data.width  || 20;
    this.height    = data.height || 80;
    this.sniffHint = data.sniffHint || 'Du riechst etwas Seltsames...';

    // Versteckter Bereich der überlagert wird
    this.hiddenArea = data.hiddenArea || null;

    // Zustand
    this.discovered     = false;   // true sobald Spieler reingegangen ist
    this.fogAlpha       = 1.0;     // 1 = voll verdeckt, 0 = sichtbar
    this.playerNearby   = false;
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================
  update(playerX, playerY, playerHitbox) {
    // Nähe prüfen (für Schnüffel-Hinweis)
    const cx   = this.x + this.width  / 2;
    const cy   = this.y + this.height / 2;
    const dist = Math.abs(playerX - cx);
    this.playerNearby = !this.discovered && dist < PASSAGE_SNIFF_RADIUS;

    // Entdeckung prüfen: Spieler-Hitbox überschneidet Passage
    if (!this.discovered && playerHitbox) {
      const inPassage =
        playerHitbox.x < this.x + this.width  &&
        playerHitbox.x + playerHitbox.width  > this.x &&
        playerHitbox.y < this.y + this.height &&
        playerHitbox.y + playerHitbox.height > this.y;

      if (inPassage) {
        this.discovered = true;
        console.log(`🔍 Passage "${this.id}" entdeckt!`);
      }
    }

    // Fog sanft ausblenden nach Entdeckung
    if (this.discovered && this.fogAlpha > 0) {
      this.fogAlpha = Math.max(0, this.fogAlpha - 0.03);
    }
  }

  // ==========================================================================
  // DRAW
  // Zeichnet NUR die Tile-Überlagerung (hiddenArea).
  // Die Passage selbst ist unsichtbar — sie liegt über einer normalen Wand.
  // ==========================================================================
  draw(ctx, bgRenderer) {
    if (!this.hiddenArea || this.fogAlpha <= 0) return;

    const { x, y, width: w, height: h } = this.hiddenArea;

    ctx.save();
    ctx.globalAlpha = this.fogAlpha;

    // Tile-Textur als Überlagerung — sieht aus wie Mauerwerk
    if (bgRenderer) {
      // wall.x/wall.y als absolute Position für stabile Varianten
      bgRenderer.drawTile(ctx, 'wall', x, y, w, h, x, y);
    } else {
      // Fallback: dunkelgraue Füllung
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(x, y, w, h);
    }

    ctx.restore();
  }

  // Schnüffel-Hinweis zurückgeben (von game.js aufgerufen)
  sniff() {
    if (!this.playerNearby || this.discovered) return null;
    return this.sniffHint;
  }
}
