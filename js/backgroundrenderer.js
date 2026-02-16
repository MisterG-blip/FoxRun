// ============================================================================
// BACKGROUND RENDERER v2
// ============================================================================
//
// LAYER-SYSTEM (hinten → vorne):
//   sky        parallax 0.0  → statisch, füllt ganzen Canvas
//   far        parallax 0.2  → ferne Berge/Gebäude, horizontal gekachelt
//   mid        parallax 0.5  → mittlere Elemente, horizontal gekachelt
//   [gameplay]              → wird von level.js/game.js gerendert
//   foreground parallax 1.2  → vordere Elemente, semi-transparent
//
// WORLDMANAGER-KONFIGURATION:
//   Jeder Layer akzeptiert ENTWEDER:
//     src: 'assets/background/castle/sky.jpg'  → lädt echtes PNG/JPG
//     gradient: ['#top', '#bottom']            → Canvas-Farbverlauf
//     color: '#rrggbb'  +  type: 'mountains'   → Canvas-Fallback
//   Parallax-Wert und Opacity sind immer optional (Defaults s.u.)
//
// TILE-SYSTEM (für Wände, Boden, Plattformen):
//   tileStyle im WorldManager:
//     ground/platform/wall: '#rrggbb'          → einfarbiger Canvas-Tile
//     ground/platform/wall: 'assets/tiles/…'  → echtes PNG (gekachelt)
//   Gezeichnet wird via: backgroundRenderer.drawTile(ctx, type, x, y, w, h)
//   Aufgerufen von level.js für jede Wall.
//
// ZUKÜNFTIGE ASSETS (Boden-Parts, Balken, Deko):
//   → decorations[] im Level-JSON  (type, x, y, width, height)
//   → backgroundRenderer.drawDecoration(ctx, type, x, y)
//   → Bilder in assets/decorations/<world>/<type>.png
// ============================================================================

class BackgroundRenderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx    = ctx;

    this.currentWorld  = null;
    this.startCameraY  = 0;   // Kamera-Y beim Level-Start → Referenz für Y-Parallax

    // Gecachte drawables pro Layer-Name
    this.layers = { sky: null, far: null, mid: null, foreground: null };

    // Gecachte Tile-Drawables pro Typ
    this.tiles = { ground: null, platform: null, wall: null };
  }

  // ==========================================================================
  // ÖFFENTLICHE API
  // ==========================================================================

  /** Welt wechseln – lädt alle Layer und Tiles */
  setWorld(world) {
    if (!world) return;
    this.currentWorld = world;

    // Reset
    this.layers = { sky: null, far: null, mid: null, foreground: null };
    this.tiles  = { ground: null, platform: null, wall: null };

    const bg = world.background || {};
    // Standard-Größen pro Layer: [breite, höhe]
    const sizes = { sky: [800, 600], far: [2400, 600], mid: [1920, 600], foreground: [800, 600] };

    for (const [name, cfg] of Object.entries(bg)) {
      if (!cfg) continue;
      const [w, h] = sizes[name] || [800, 600];
      this.layers[name] = this._loadDrawable(cfg, name, w, h);
    }

    const ts    = world.tileStyle || {};
    const theme = world.theme || 'castle';
    for (const [type, val] of Object.entries(ts)) {
      this.tiles[type] = this._loadTile(val, type, theme);
    }

    // Decoration-Assets laden wenn definiert
    if (world.decorations) {
      this._loadDecorations(world.decorations);
    } else {
      this.decorationImages = {};
    }
  }

  /** Muss beim Level-Start aufgerufen werden – setzt Y-Referenzpunkt */
  startLevel(cameraY) {
    this.startCameraY = cameraY;
  }

  /** Rendert Sky, Far, Mid – VOR dem Gameplay */
  render(cameraX, cameraY, levelWidth, levelHeight) {
    if (!this.currentWorld) return;
    const bg      = this.currentWorld.background || {};
    const groundY = levelHeight ?? this.canvas.height;

    this._drawLayer('sky', bg.sky, cameraX, cameraY, groundY);
    this._drawLayer('far', bg.far, cameraX, cameraY, groundY);
    this._drawLayer('mid', bg.mid, cameraX, cameraY, groundY);
  }

  /** Rendert Foreground – NACH dem Gameplay */
  renderForeground(cameraX, cameraY, levelHeight) {
    if (!this.currentWorld) return;
    const bg      = this.currentWorld.background || {};
    const groundY = levelHeight ?? this.canvas.height;
    if (bg.foreground) this._drawLayer('foreground', bg.foreground, cameraX, cameraY, groundY);
  }

  // ==========================================================================
  // TILE SYSTEM
  // ==========================================================================

  /**
   * Zeichnet eine Wall, Plattform oder Boden-Fläche mit dem Welt-Tileset.
   *
   * TILESET-FORMAT (eine PNG-Datei pro Typ, Varianten nebeneinander):
   *
   *   ground.png:    [ Var 0 ][ Var 1 ][ Var 2 ][ Var 3 ]
   *                  ←40px→   ←40px→   ←40px→   ←40px→
   *                  Gesamtbreite = variantCount × TILE_SIZE
   *
   *   Höhe: immer TILE_SIZE (40px)
   *   Breite: beliebig viele Varianten × TILE_SIZE
   *
   * RANDOMISIERUNG:
   *   Pro Tile-Zelle (40×40px) wird beim Rendern eine zufällige Variante
   *   gewählt. Die Zufälligkeit ist deterministisch per Position (x, y) —
   *   dasselbe Tile sieht bei jedem Frame gleich aus, aber andere Positionen
   *   sehen anders aus. Kein Flackern, kein extra Speicher.
   *
   *   Formel: variant = (x * 7 + y * 13) % variantCount
   *   Die Primzahlen 7 und 13 sorgen für gute Verteilung ohne echten Zufall.
   *
   * SOLANGE NUR 1 VARIANTE:
   *   variantCount = 1 → immer variant = 0 → kein sichtbarer Unterschied.
   *   Einfach mehr Varianten ins PNG packen wenn fertig.
   */
  drawTile(ctx, type, x, y, width, height, wallX = x, wallY = y) {
    const tile = this.tiles[type] || this.tiles['ground'];
    const TILE  = typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 40;

    if (tile && tile.ready && tile.image) {
      const img          = tile.image;
      const imgW         = img.naturalWidth  || img.width  || TILE;
      const imgH         = img.naturalHeight || img.height || TILE;
      const variantCount = Math.max(1, Math.floor(imgW / TILE));

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.clip();

      for (let row = 0; row < Math.ceil(height / TILE); row++) {
        for (let col = 0; col < Math.ceil(width / TILE); col++) {

          // Variante aus ABSOLUTER Level-Position berechnen (nicht Canvas-Position!)
          // → Muster bleibt stabil auf der Wand, egal wo die Kamera steht
          const absCol   = Math.floor(wallX / TILE) + col;
          const absRow   = Math.floor(wallY / TILE) + row;
          const variant  = (absCol * 7 + absRow * 13) % variantCount;
          const srcX     = variant * TILE;

          const destX    = x + col * TILE;
          const destY    = y + row * TILE;
          const destW    = Math.min(TILE, x + width  - destX);
          const destH    = Math.min(TILE, y + height - destY);

          if (destW > 0 && destH > 0) {
            ctx.drawImage(img, srcX, 0, TILE, imgH, destX, destY, destW, destH);
          }
        }
      }

      ctx.restore();

    } else {
      ctx.fillStyle = '#34495e';
      ctx.fillRect(x, y, width, height);
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x, y, width, height);
  }

  // ==========================================================================
  // DECORATION SYSTEM
  // Bilder auf Wände und Plattformen legen
  // ==========================================================================

  /**
   * Lädt Decoration-Assets für eine Welt vor.
   * Wird von setWorld() automatisch aufgerufen wenn world.decorations definiert ist.
   *
   * world.decorations = {
   *   torch:  'assets/decorations/castle/torch.png',
   *   banner: 'assets/decorations/castle/banner.png',
   *   bush:   'assets/decorations/village/bush.png'
   * }
   */
  _loadDecorations(decorationDefs) {
    this.decorationImages = {};
    for (const [type, src] of Object.entries(decorationDefs)) {
      const entry = { image: null, ready: false };
      const img = new Image();
      img.onload  = () => { entry.image = img; entry.ready = true;
                            console.log(`✅ Decoration "${type}" geladen`); };
      img.onerror = () => { entry.ready = false;
                            console.warn(`⚠️  Decoration "${type}" nicht gefunden: ${src}`); };
      img.src = src;
      this.decorationImages[type] = entry;
    }
  }

  /**
   * Zeichnet eine einzelne Decoration.
   * Aufruf aus level.js draw():
   *   bgRenderer.drawDecoration(ctx, 'torch', x, y, 32, 64)
   *
   * x/y = Weltkoordinaten (ohne Camera-Offset – den macht level.js per ctx.translate)
   * width/height optional – wenn nicht angegeben: Originalgröße
   */
  drawDecoration(ctx, type, x, y, width = null, height = null) {
    if (!this.decorationImages) return;
    const entry = this.decorationImages[type];
    if (!entry || !entry.ready || !entry.image) return;

    const img = entry.image;
    const w = width  ?? img.naturalWidth  ?? 32;
    const h = height ?? img.naturalHeight ?? 32;
    ctx.drawImage(img, x, y, w, h);
  }

  // ==========================================================================
  // INTERN: LADEN
  // ==========================================================================

  /** Gibt ein Drawable-Objekt zurück { image, ready } */
  _loadDrawable(cfg, layerName, fallbackW, fallbackH) {
    const drawable = { image: null, ready: false };

    if (cfg.src) {
      // ── PNG/JPG laden ──────────────────────────────────────────────────
      const img = new Image();
      img.onload = () => {
        drawable.image = img;
        drawable.ready = true;
        console.log(`✅ Layer "${layerName}" geladen: ${cfg.src}`);
      };
      img.onerror = () => {
        console.warn(`⚠️  Layer "${layerName}" nicht gefunden (${cfg.src}) → Canvas-Fallback`);
        drawable.image = this._makeCanvasFallback(cfg, layerName, fallbackW, fallbackH);
        drawable.ready = true;
      };
      img.src = cfg.src;
    } else {
      // ── Sofort Canvas-Fallback ─────────────────────────────────────────
      drawable.image = this._makeCanvasFallback(cfg, layerName, fallbackW, fallbackH);
      drawable.ready = true;
    }

    return drawable;
  }

  _loadTile(colorOrPath, tileType = 'ground', theme = 'castle') {
    const drawable = { image: null, ready: false };
    const TILE = typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 40;

    const isPng = typeof colorOrPath === 'string' && colorOrPath.includes('/');

    if (isPng) {
      const img = new Image();
      img.onload = () => { drawable.image = img; drawable.ready = true; };
      img.onerror = () => {
        drawable.image = this._makeColorTile(colorOrPath, TILE, tileType, theme);
        drawable.ready = true;
      };
      img.src = colorOrPath;
    } else {
      drawable.image = this._makeColorTile(colorOrPath, TILE, tileType, theme);
      drawable.ready = true;
    }

    return drawable;
  }

  // ==========================================================================
  // INTERN: RENDERN
  // ==========================================================================

  /**
   * LAYER-VERHALTEN:
   *
   *   sky        → ganzen Canvas füllen, kein Versatz
   *   far / mid  → feste Y-Position (Unterkante = Canvas-Unterkante), nur X-Parallax
   *   foreground → X- und Y-Parallax, Unterkante folgt Levelboden
   */
  _drawLayer(name, cfg, cameraX, cameraY, groundY) {
    if (!cfg) return;
    const drawable = this.layers[name];
    if (!drawable || !drawable.ready || !drawable.image) return;

    const defaults = { sky: 0.0, far: 0.2, mid: 0.5, foreground: 1.2 };
    const parallax = cfg.parallax != null ? cfg.parallax : defaults[name] ?? 0.2;
    const opacity  = cfg.opacity  != null ? cfg.opacity  : 1.0;

    const img     = drawable.image;
    const imgNatW = img.naturalWidth  || img.width  || this.canvas.width;
    const imgNatH = img.naturalHeight || img.height || this.canvas.height;
    const imgH    = cfg.drawHeight ?? this.canvas.height;
    const imgW    = imgH * (imgNatW / imgNatH);

    const cw = this.canvas.width;
    const ch = this.canvas.height;

    this.ctx.save();
    if (opacity < 1) this.ctx.globalAlpha = opacity;

    if (name === 'sky') {
      // Sky: immer ganzen Canvas füllen, kein Versatz
      this.ctx.drawImage(img, 0, 0, cw, ch);

    } else if (name === 'foreground') {
      // Foreground Y: relativ zur Kamera-Bewegung seit Level-Start.
      // deltaY = 0 beim Start → Unterkante sitzt exakt am Levelboden.
      // Erst wenn die Kamera sich nach oben bewegt, scrollt der Foreground mit.
      const deltaY  = cameraY - this.startCameraY;
      const offsetX = -cameraX * parallax;
      const offsetY = groundY - this.startCameraY - deltaY * 1.0 - imgH;
      const startX  = ((offsetX % imgW) - imgW);
      for (let x = startX; x < cw + imgW; x += imgW) {
        this.ctx.drawImage(img, x, offsetY, imgW, imgH);
      }

    } else {
      // far / mid: X-Parallax wie gehabt.
      // Y: relativ zur Kamera-Bewegung seit Level-Start, mit Parallax-Faktor.
      // deltaY = 0 beim Start → Unterkante sitzt exakt am Canvas-Boden.
      const deltaY  = cameraY - this.startCameraY;
      const offsetX = -cameraX * parallax;
      const offsetY = (this.canvas.height - imgH) - deltaY * parallax;
      const startX  = ((offsetX % imgW) - imgW);
      for (let x = startX; x < cw + imgW; x += imgW) {
        this.ctx.drawImage(img, x, offsetY, imgW, imgH);
      }
    }

    this.ctx.restore();
  }

  // ==========================================================================
  // INTERN: CANVAS-FALLBACKS
  // ==========================================================================

  _makeCanvasFallback(cfg, layerName, w, h) {
    const c   = document.createElement('canvas');
    c.width   = w;
    c.height  = h;
    const ctx = c.getContext('2d');

    if (layerName === 'sky') {
      this._fallbackSky(ctx, cfg, w, h);
    } else {
      const color = cfg.color || '#556677';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      switch (cfg.type) {
        case 'mountains':   this._fallbackMountains(ctx, w, h, color); break;
        case 'hills':       this._fallbackHills(ctx, w, h, color);     break;
        case 'castle':      this._fallbackCastle(ctx, w, h, color);    break;
        case 'trees':       this._fallbackTrees(ctx, w, h, color);     break;
        case 'trees-front': this._fallbackTreesFront(ctx, w, h, color);break;
        case 'grass':       this._fallbackGrass(ctx, w, h, color);     break;
      }
    }
    return c;
  }

  _makeColorTile(color, size, tileType = 'ground', theme = 'castle') {
    // Dispatcher: wählt die richtige Zeichen-Methode nach Welt + Typ
    // Jede Methode erzeugt 4 Varianten nebeneinander (size*4 × size)
    switch (theme) {
      case 'village':
        switch (tileType) {
          case 'platform': return this._tileBoardVillage(color, size);
          case 'wall':     return this._tilePalisadeVillage(color, size);
          default:         return this._tileSandVillage(color, size);
        }
      case 'forest':
        switch (tileType) {
          case 'platform': return this._tileBranchForest(color, size);
          case 'wall':     return this._tileFieldstoneForest(color, size);
          default:         return this._tileDirtForest(color, size);
        }
      default: // castle
        return this._tileMasonryCastle(color, size, tileType);
    }
  }

  // ==========================================================================
  // BURG-TILES
  // ==========================================================================

  _tileMasonryCastle(color, size, tileType) {
    // Mauerwerk mit T-Fugen — 4 Varianten nebeneinander
    const variants   = 4;
    const c          = document.createElement('canvas');
    c.width          = size * variants;
    c.height         = size;
    const ctx        = c.getContext('2d');
    const base       = color || '#654321';
    const stoneH     = size / 2;
    const stoneW     = size * 0.75;
    const fugeW      = 1.5;

    for (let v = 0; v < variants; v++) {
      const ox = v * size;
      ctx.fillStyle = base;
      ctx.fillRect(ox, 0, size, size);

      // Helligkeits-Variation
      const bright = [0, 0.04, -0.03, 0.06][v];
      if (bright !== 0) {
        ctx.fillStyle = bright > 0 ? `rgba(255,255,255,${bright})` : `rgba(0,0,0,${-bright})`;
        ctx.fillRect(ox, 0, size, size);
      }

      // Mauerwerk-Reihen mit T-Fuge
      for (let row = 0; row < 2; row++) {
        const rowY = row * stoneH;
        const shift = (row % 2 === 0) ? 0 : stoneW * 0.5;

        // Horizontale Fuge
        if (row > 0) {
          ctx.fillStyle = this._darken(base, 28);
          ctx.fillRect(ox, rowY, size, fugeW);
        }
        // Vertikale Fugen
        for (let sx = shift; sx < size + stoneW; sx += stoneW) {
          const fx = ox + sx - stoneW / 2;
          if (fx > ox && fx < ox + size) {
            ctx.fillStyle = this._darken(base, 28);
            ctx.fillRect(fx, rowY, fugeW, stoneH);
          }
        }
        // Oberkanten-Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        for (let sx = shift; sx < size + stoneW; sx += stoneW) {
          const stoneX = ox + sx - stoneW / 2 + fugeW;
          const w = Math.min(stoneW - fugeW * 2, ox + size - stoneX);
          if (w > 2) ctx.fillRect(stoneX, rowY + fugeW, w, 3);
        }
        // Riss bei Variante 3
        if (v === 3) {
          ctx.strokeStyle = this._darken(base, 20);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(ox + size * 0.3, rowY + stoneH * 0.3);
          ctx.lineTo(ox + size * 0.35, rowY + stoneH * 0.55);
          ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(ox, 0, size, 2);
    }
    return c;
  }

  // ==========================================================================
  // DORF-TILES
  // ==========================================================================

  _tileSandVillage(color, size) {
    // Sand-Boden: körnige Textur, wellige Oberkante
    const variants = 4;
    const c = document.createElement('canvas');
    c.width = size * variants; c.height = size;
    const ctx = c.getContext('2d');
    const base = color || '#c2a05a';

    for (let v = 0; v < variants; v++) {
      const ox = v * size;
      // Basis Sand
      ctx.fillStyle = base;
      ctx.fillRect(ox, 0, size, size);

      // Sand-Körner (kleine Punkte in leicht anderen Farben)
      const grains = [
        [0.15,0.25], [0.55,0.15], [0.35,0.65], [0.75,0.45],
        [0.25,0.80], [0.65,0.70], [0.85,0.30], [0.45,0.50]
      ];
      grains.forEach(([rx, ry], i) => {
        const gx = ox + rx * size + (v * 3 + i) % 5;
        const gy = ry * size;
        ctx.fillStyle = (i % 2 === 0)
          ? this._lighten(base, 15)
          : this._darken(base, 12);
        ctx.fillRect(gx, gy, 2, 2);
      });

      // Oberkante: wellig, etwas heller (trockener Sand)
      ctx.fillStyle = this._lighten(base, 20);
      ctx.fillRect(ox, 0, size, 4);
      // Leichte Wellen-Linie
      ctx.strokeStyle = this._lighten(base, 30);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < size; x += 4) {
        const wave = Math.sin((x + v * 8) * 0.4) * 1.5;
        x === 0
          ? ctx.moveTo(ox + x, 2 + wave)
          : ctx.lineTo(ox + x, 2 + wave);
      }
      ctx.stroke();
    }
    return c;
  }

  _tileBoardVillage(color, size) {
    // Holzbretter (Plattform): horizontale Maserung, Nägel
    const variants = 4;
    const c = document.createElement('canvas');
    c.width = size * variants; c.height = size;
    const ctx = c.getContext('2d');
    const base = color || '#a0522d';

    for (let v = 0; v < variants; v++) {
      const ox = v * size;
      ctx.fillStyle = base;
      ctx.fillRect(ox, 0, size, size);

      // Bretter-Trennlinien (horizontal — Bretter liegen nebeneinander)
      const boardH = size / 2;
      ctx.fillStyle = this._darken(base, 20);
      ctx.fillRect(ox, boardH - 1, size, 2);

      // Maserung — horizontale Linien
      for (let row = 0; row < 2; row++) {
        const ry = row * boardH;
        const lines = [0.25, 0.5, 0.75];
        lines.forEach(frac => {
          ctx.strokeStyle = (v % 2 === 0)
            ? this._darken(base, 10)
            : this._lighten(base, 8);
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(ox, ry + boardH * frac);
          ctx.lineTo(ox + size, ry + boardH * frac);
          ctx.stroke();
        });
        // Nagel
        const nailX = ox + (v % 2 === 0 ? size * 0.2 : size * 0.8);
        const nailY = ry + boardH * 0.5;
        ctx.fillStyle = this._darken(base, 35);
        ctx.beginPath();
        ctx.arc(nailX, nailY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(nailX - 0.5, nailY - 0.5, 1, 0, Math.PI * 2);
        ctx.fill();
      }
      // Oberkante aufhellen
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(ox, 0, size, 3);
    }
    return c;
  }

  _tilePalisadeVillage(color, size) {
    // Palisaden-Zaun: senkrechte Holzpfähle mit Spitzen
    const variants = 4;
    const c = document.createElement('canvas');
    c.width = size * variants; c.height = size;
    const ctx = c.getContext('2d');
    const base = color || '#8b6914';

    for (let v = 0; v < variants; v++) {
      const ox = v * size;
      ctx.fillStyle = this._darken(base, 15);
      ctx.fillRect(ox, 0, size, size);

      // 2 Pfähle pro Tile
      const pfahlW = size * 0.38;
      const gap    = (size - pfahlW * 2) / 3;

      for (let p = 0; p < 2; p++) {
        const px = ox + gap + p * (pfahlW + gap);
        // Pfahl-Körper
        const pColor = (v + p) % 2 === 0
          ? base
          : this._lighten(base, 8);
        ctx.fillStyle = pColor;
        ctx.fillRect(px, size * 0.15, pfahlW, size * 0.85);
        // Spitze (Dreieck)
        ctx.fillStyle = this._lighten(pColor, 10);
        ctx.beginPath();
        ctx.moveTo(px,              size * 0.15);
        ctx.lineTo(px + pfahlW / 2, 0);
        ctx.lineTo(px + pfahlW,     size * 0.15);
        ctx.closePath();
        ctx.fill();
        // Maserung
        ctx.strokeStyle = this._darken(pColor, 12);
        ctx.lineWidth = 0.6;
        [0.3, 0.55, 0.75].forEach(frac => {
          ctx.beginPath();
          ctx.moveTo(px + 2, size * frac);
          ctx.lineTo(px + pfahlW - 2, size * frac);
          ctx.stroke();
        });
        // Nagel / Verbindung
        ctx.fillStyle = this._darken(base, 40);
        ctx.fillRect(px, size * 0.2, pfahlW, 3);
      }
    }
    return c;
  }

  // ==========================================================================
  // WALD-TILES
  // ==========================================================================

  _tileDirtForest(color, size) {
    // Waldboden: dunkle Erde, Wurzeln, Moos
    const variants = 4;
    const c = document.createElement('canvas');
    c.width = size * variants; c.height = size;
    const ctx = c.getContext('2d');
    const base = color || '#3d2b1f';

    for (let v = 0; v < variants; v++) {
      const ox = v * size;
      ctx.fillStyle = base;
      ctx.fillRect(ox, 0, size, size);

      // Erde-Körnung
      for (let i = 0; i < 8; i++) {
        const gx = ox + ((v * 7 + i * 13) % size);
        const gy = 6 + (i * 5) % (size - 6);
        ctx.fillStyle = i % 3 === 0
          ? this._lighten(base, 12)
          : this._darken(base, 8);
        ctx.fillRect(gx, gy, 3, 2);
      }

      // Moos-Oberkante
      ctx.fillStyle = '#2d5a1b';
      ctx.fillRect(ox, 0, size, 5);
      // Moos-Grashalme
      ctx.strokeStyle = '#3a7a22';
      ctx.lineWidth = 1;
      for (let x = 2; x < size; x += 5) {
        const h = 3 + (x * 3 + v) % 4;
        ctx.beginPath();
        ctx.moveTo(ox + x, 5);
        ctx.lineTo(ox + x + (v % 2 === 0 ? 1 : -1), 5 - h);
        ctx.stroke();
      }

      // Wurzel bei Varianten 1 und 3
      if (v === 1 || v === 3) {
        ctx.strokeStyle = this._darken(base, 5);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ox + size * 0.2, size * 0.4);
        ctx.quadraticCurveTo(
          ox + size * 0.5, size * 0.3,
          ox + size * 0.8, size * 0.5
        );
        ctx.stroke();
      }
    }
    return c;
  }

  _tileBranchForest(color, size) {
    // Ast-Plattform: rohe Baumstücke, Rinde, Moos
    const variants = 4;
    const c = document.createElement('canvas');
    c.width = size * variants; c.height = size;
    const ctx = c.getContext('2d');
    const base = color || '#5d4037';

    for (let v = 0; v < variants; v++) {
      const ox = v * size;

      // Holz-Körper
      ctx.fillStyle = base;
      ctx.fillRect(ox, 0, size, size);

      // Rinden-Textur: unregelmäßige vertikale Streifen
      const stripeCount = 3 + v % 2;
      for (let s = 0; s < stripeCount; s++) {
        const sx = ox + (s * size / stripeCount) + (v * 2) % 6;
        ctx.fillStyle = s % 2 === 0
          ? this._darken(base, 15)
          : this._lighten(base, 8);
        ctx.fillRect(sx, 0, size / stripeCount * 0.4, size);
      }

      // Jahresringe-Andeutung an der Schnittfläche (Variante 0 und 2)
      if (v === 0 || v === 2) {
        ctx.strokeStyle = this._darken(base, 20);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(ox + size * 0.15, size / 2, size * 0.1, size * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Moos oben
      ctx.fillStyle = '#2d5a1b';
      ctx.fillRect(ox, 0, size, 4);
      ctx.fillStyle = '#4a8a2a';
      for (let x = 0; x < size; x += 6) {
        if ((x + v) % 3 !== 0) {
          ctx.fillRect(ox + x, 0, 4, 3);
        }
      }

      // Knorren
      if (v === 1 || v === 3) {
        ctx.fillStyle = this._darken(base, 25);
        ctx.beginPath();
        ctx.ellipse(ox + size * 0.7, size * 0.5, 5, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Oberkante aufhellen
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(ox, 0, size, 2);
    }
    return c;
  }

  _tileFieldstoneForest(color, size) {
    // Feldstein-Mauer: unregelmäßige Steine, Moos in Fugen
    const variants = 4;
    const c = document.createElement('canvas');
    c.width = size * variants; c.height = size;
    const ctx = c.getContext('2d');
    const base = color || '#4a4a4a';

    // Feldstein-Layout: 3 Steine pro Tile in unregelmäßiger Anordnung
    // Jede Variante hat leicht andere Steingrößen
    const layouts = [
      [ {x:0.0,y:0.0,w:0.6,h:0.5}, {x:0.6,y:0.0,w:0.4,h:0.5}, {x:0.0,y:0.5,w:1.0,h:0.5} ],
      [ {x:0.0,y:0.0,w:1.0,h:0.45},{x:0.0,y:0.45,w:0.45,h:0.55},{x:0.45,y:0.45,w:0.55,h:0.55} ],
      [ {x:0.0,y:0.0,w:0.5,h:0.6}, {x:0.5,y:0.0,w:0.5,h:0.4}, {x:0.0,y:0.6,w:1.0,h:0.4} ],
      [ {x:0.0,y:0.0,w:0.4,h:0.5}, {x:0.4,y:0.0,w:0.6,h:0.5}, {x:0.0,y:0.5,w:1.0,h:0.5} ],
    ];
    const fugeColor  = this._darken(base, 25);
    const mossColor  = '#3a5a2a';
    const fugeW      = 2;

    for (let v = 0; v < variants; v++) {
      const ox = v * size;
      // Fuge-Hintergrund
      ctx.fillStyle = fugeColor;
      ctx.fillRect(ox, 0, size, size);

      for (let [i, stone] of layouts[v].entries()) {
        const sx = ox + stone.x * size + fugeW;
        const sy = stone.y * size + fugeW;
        const sw = stone.w * size - fugeW * 2;
        const sh = stone.h * size - fugeW * 2;

        // Stein-Farbe leicht variieren
        const stoneColor = i % 3 === 0
          ? this._lighten(base, 10)
          : i % 3 === 1 ? base : this._darken(base, 8);
        ctx.fillStyle = stoneColor;
        ctx.fillRect(sx, sy, sw, sh);

        // Oberkante aufhellen
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(sx, sy, sw, 3);

        // Moos in Fugen (zufällig je nach Variante)
        if ((v + i) % 2 === 0) {
          ctx.fillStyle = mossColor;
          ctx.fillRect(sx, sy + sh - 2, sw * 0.4, 3);
        }
      }
    }
    return c;
  }

  // ── Fallback-Zeichenmethoden ────────────────────────────────────────────

  _fallbackSky(ctx, cfg, w, h) {
    // Unterstützt sowohl gradient: ['#top','#bot'] als auch color: '#...'
    if (cfg.gradient && cfg.gradient.length >= 2) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, cfg.gradient[0]);
      g.addColorStop(1, cfg.gradient[1]);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = cfg.color || '#87CEEB';
    }
    ctx.fillRect(0, 0, w, h);

    const topColor = (cfg.gradient && cfg.gradient[0]) || cfg.color || '#87CEEB';
    if (this._brightness(topColor) > 100) {
      // Wolken
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      [[80,80],[230,50],[420,90],[610,55],[740,100]].forEach(([x,y]) => this._cloud(ctx,x,y));
    } else {
      // Sterne
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 50; i++) {
        const s = Math.random() > 0.85 ? 2 : 1;
        ctx.fillRect(Math.random()*w, Math.random()*h*0.8, s, s);
      }
    }
  }

  _cloud(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x,      y, 18, 0, Math.PI*2);
    ctx.arc(x+22,   y, 26, 0, Math.PI*2);
    ctx.arc(x+46,   y, 18, 0, Math.PI*2);
    ctx.fill();
  }

  _fallbackMountains(ctx, w, h, base) {
    // Hintere Bergkette
    ctx.fillStyle = this._darken(base, 18);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w*0.12, h*0.38); ctx.lineTo(w*0.28, h*0.58);
    ctx.lineTo(w*0.45, h*0.22); ctx.lineTo(w*0.62, h*0.52);
    ctx.lineTo(w*0.78, h*0.28); ctx.lineTo(w*0.92, h*0.50);
    ctx.lineTo(w, h*0.45); ctx.lineTo(w, h);
    ctx.fill();
    // Schnee
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    [[w*0.12,h*0.38],[w*0.45,h*0.22],[w*0.78,h*0.28]].forEach(([px,py])=>{
      ctx.beginPath();
      ctx.moveTo(px,py);
      ctx.lineTo(px-16,py+25); ctx.lineTo(px+16,py+25);
      ctx.fill();
    });
  }

  _fallbackHills(ctx, w, h, base) {
    ctx.fillStyle = this._darken(base, 12);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc((w/4)*i + w/8, h+10, w/4.2, 0, Math.PI, true);
      ctx.fill();
    }
  }

  _fallbackCastle(ctx, w, h, base) {
    const dark = this._darken(base, 28);
    for (let x = 0; x < w; x += 130) {
      ctx.fillStyle = dark;
      ctx.fillRect(x, h*0.52, 110, h*0.48);
      for (let z = x; z < x+110; z += 22) {
        ctx.fillRect(z, h*0.44, 13, h*0.08);
      }
      ctx.fillStyle = 'rgba(255,220,80,0.45)';
      ctx.fillRect(x+45, h*0.60, 18, 26);
    }
  }

  _fallbackTrees(ctx, w, h, base) {
    for (let x = 20; x < w; x += 95) {
      ctx.fillStyle = this._darken(base, 42);
      ctx.fillRect(x+37, h*0.56, 14, h*0.44);
      ctx.fillStyle = this._darken(base, 26);
      ctx.beginPath(); ctx.moveTo(x+44,h*0.27); ctx.lineTo(x,h*0.63); ctx.lineTo(x+88,h*0.63); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+44,h*0.12); ctx.lineTo(x+10,h*0.46); ctx.lineTo(x+78,h*0.46); ctx.fill();
    }
  }

  _fallbackTreesFront(ctx, w, h, base) {
    for (let x = -20; x < w+20; x += 75) {
      ctx.fillStyle = this._darken(base, 50);
      ctx.fillRect(x+30, h*0.45, 15, h*0.55);
      ctx.fillStyle = this._darken(base, 36);
      ctx.beginPath(); ctx.moveTo(x+38,h*0.15); ctx.lineTo(x-8,h*0.63); ctx.lineTo(x+84,h*0.63); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+38,h*0.0);  ctx.lineTo(x+5, h*0.40); ctx.lineTo(x+71,h*0.40); ctx.fill();
    }
  }

  _fallbackGrass(ctx, w, h, base) {
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 7) {
      const gh = 12 + Math.random()*22;
      ctx.strokeStyle = Math.random() > 0.4 ? this._lighten(base,20) : this._darken(base,8);
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + (Math.random()*6-3), h - gh);
      ctx.stroke();
    }
  }

  // ── Farb-Hilfsmethoden ──────────────────────────────────────────────────

  _brightness(hex) {
    hex = (hex||'').replace('#','');
    if (hex.length < 6) return 128;
    return (parseInt(hex.substr(0,2),16) + parseInt(hex.substr(2,2),16) + parseInt(hex.substr(4,2),16)) / 3;
  }

  _darken(hex, n) {
    hex = (hex||'000000').replace('#','');
    const ch = (i) => Math.max(0, parseInt(hex.substr(i,2),16) - n).toString(16).padStart(2,'0');
    return `#${ch(0)}${ch(2)}${ch(4)}`;
  }

  _lighten(hex, n) {
    hex = (hex||'000000').replace('#','');
    const ch = (i) => Math.min(255, parseInt(hex.substr(i,2),16) + n).toString(16).padStart(2,'0');
    return `#${ch(0)}${ch(2)}${ch(4)}`;
  }
}
