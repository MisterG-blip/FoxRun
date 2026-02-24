// ============================================================================
// GAME CONFIGURATION
// Hier alle Einstellungen für Animationen, Hitbox und Konstanten
// ============================================================================

// Canvas Größe
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TILE_SIZE = 40;

// Debug Modus (true = zeigt Hitboxen an)
const DEBUG_MODE = false;

// ============================================================================
// ANIMATIONEN KONFIGURATION
// Hier für jede Animation die Sprite-Eigenschaften definieren
// ============================================================================
const ANIMATIONS = {
  idle: {
    spriteSheet: 'assets/sprites/fox/standing.png',
    frameCount: 7,
    frameWidth: 78,
    frameHeight: 64,
    frameDelay: 100,
    loop: true
  },
  walk: {
    spriteSheet: 'assets/sprites/fox/walk.png',
    frameCount: 11,
    frameWidth: 78,
    frameHeight: 64,
    frameDelay: 80,
    loop: true
  },
  run: {
    spriteSheet: 'assets/sprites/fox/run.png',
    frameCount: 7,
    frameWidth: 78,
    frameHeight: 64,
    frameDelay: 70,
    loop: true
  },
  crouch: {
    spriteSheet: 'assets/sprites/fox/crouch.png',
    frameCount: 8,
    frameWidth: 78,
    frameHeight: 64,
    frameDelay: 100,
    loop: true
  },
  falling: {
    spriteSheet: 'assets/sprites/fox/landing.png',
    frameCount: 9,
    frameWidth: 78,
    frameHeight: 64,
    frameDelay: 60,
    loop: true
  },
  pounce: {
    spriteSheet: 'assets/sprites/fox/pounce.png',
    frameCount: 9,
    frameWidth: 78,
    frameHeight: 64,
    frameDelay: 50,
    loop: false
  },
  standing: {
    spriteSheet: 'assets/sprites/fox/standing.png',
    frameCount: 7,
    frameWidth: 78,
    frameHeight: 64,
    frameDelay: 120,
    loop: true
  },
  sniff: {
    spriteSheet: 'assets/sprites/fox/sniff.png',
    frameCount: 19,
    frameWidth: 64,
    frameHeight: 64,
    frameDelay: 80,
    loop: true
  },
  standsit: {
    spriteSheet: 'assets/sprites/fox/standsit.png',
    frameCount: 4,
    frameWidth: 64,
    frameHeight: 64,
    frameDelay: 150,
    loop: false
  },
  transitionsit: {
    spriteSheet: 'assets/sprites/fox/transitionsit.png',
    frameCount: 19,
    frameWidth: 78,
    frameHeight: 64,
    frameDelay: 60,
    loop: false
  },
  hang: {
    spriteSheet: 'assets/sprites/fox/hang.png',
    frameCount: 5,
    frameWidth: 64,
    frameHeight: 96,
    frameDelay: 100,
    loop: true
  },
  hurt: {
    spriteSheet: 'assets/sprites/fox/hurt.png',
    frameCount: 1,
    frameWidth: 78,
    frameHeight: 64,
    frameDelay: 100,
    loop: false
  },
  dead: {
    spriteSheet: 'assets/sprites/fox/dead.png',
    frameCount: 8,
    frameWidth: 64,
    frameHeight: 64,
    frameDelay: 150,
    loop: false
  }
};

// ============================================================================
// SPIELER PHYSIK
// ============================================================================
const PLAYER_CONFIG = {
  speed: 3.5,        // Laufgeschwindigkeit
  jumpPower: 13,     // Sprungkraft
  gravity: 0.6,      // Schwerkraft
  friction: 0.85     // Reibung (0-1, kleiner = mehr Reibung)
};

// ============================================================================
// FARBFILTER-PROGRESSION
// Freigeschaltet durch gesammelte Taler (bestes Ergebnis pro Level, dauerhaft)
// 10 Welten × 3 Level × 3 Taler = 90 Taler max → alle 10 einen Filter
// ============================================================================
const COIN_FILTERS = [
  {
    id: 'amber',
    name: 'Bernstein',
    threshold: 10,
    // canvas composite: 'source-atop' mit fillStyle-Farbe über dem Sprite
    color: 'rgba(255, 160, 30, 0.35)',
    composite: 'source-atop',
    animated: false
  },
  {
    id: 'copper',
    name: 'Kupfer',
    threshold: 20,
    color: 'rgba(180, 80, 40, 0.35)',
    composite: 'source-atop',
    animated: false
  },
  {
    id: 'emerald',
    name: 'Smaragd',
    threshold: 30,
    color: 'rgba(30, 180, 80, 0.35)',
    composite: 'source-atop',
    animated: false
  },
  {
    id: 'sapphire',
    name: 'Saphir',
    threshold: 40,
    color: 'rgba(30, 100, 220, 0.35)',
    composite: 'source-atop',
    animated: false
  },
  {
    id: 'amethyst',
    name: 'Amethyst',
    threshold: 50,
    color: 'rgba(150, 50, 200, 0.35)',
    composite: 'source-atop',
    animated: false
  },
  {
    id: 'ruby',
    name: 'Rubin',
    threshold: 60,
    color: 'rgba(200, 20, 50, 0.38)',
    composite: 'source-atop',
    animated: false
  },
  {
    id: 'moonstone',
    name: 'Mondstein',
    threshold: 70,
    color: 'rgba(200, 220, 255, 0.40)',
    composite: 'source-atop',
    animated: false
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    threshold: 80,
    color: 'rgba(20, 10, 40, 0.45)',
    composite: 'source-atop',
    animated: false,
    // Zusätzlich: Glitzer-Partikel über dem Fuchs
    glitter: true
  },
  {
    id: 'rainbow',
    name: '✨ Regenbogen',
    threshold: 90,
    color: null,          // wird animiert berechnet
    composite: 'source-atop',
    animated: true        // hue rotiert mit der Zeit
  }
];
