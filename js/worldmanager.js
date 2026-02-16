// ============================================================================
// WORLD MANAGER
// Verwaltet Welt-Kategorien (z.B. Burg, Dorf, Wald)
// ============================================================================

class WorldManager {
  constructor() {
    this.worlds = {};
    this.loadWorlds();
  }

  loadWorlds() {
    // Welt 1: Die alte Burg (Level 1-10)
    this.worlds['world1'] = {
      id: 'world1',
      name: '🏰 Die alte Burg',
      description: 'Erkunde die geheimnisvollen Kammern der alten Burg',
      theme: 'castle',
      levelRange: [1, 10],
      color: '#8b4513',
      unlocked: true,
      
      background: {
        sky: {
          src: 'assets/background/castle/sky.jpg',
          parallax: 0.0
        },
        far: {
          src: 'assets/background/castle/far.png',
          parallax: 0.2,
          drawHeight: 600,    // ← wie hoch es gezeichnet wird
          anchorBottom: true,  // ← an Unterkante des Canvas ausrichten
        },
        mid: {
          src: 'assets/background/castle/mid.png',
          parallax: 0.5,
          drawHeight: 600,
          anchorBottom: true,          
        },
        foreground:{
          src: 'assets/background/castle/fore.png',
          parallax: 1.2,
          drawHeight: 600,
          anchorBottom: true,
          opacity: 0.75
        },
      },
      
      // ── TILES ────────────────────────────────────────────────────────────
      // TODO: Sobald Assets fertig → Hex-Farbe durch Pfad ersetzen.
      // Pfade immer mit Forward-Slash, auch auf Windows!
      // Größe: 40×40px (= TILE_SIZE), wird als Pattern gekachelt.
      tileStyle: {
        ground:   '#654321',  // → 'assets/tilesets/castle/ground.png'
        platform: '#8b6914',  // → 'assets/tilesets/castle/platform.png'
        wall:     '#5a4a3a'   // → 'assets/tilesets/castle/wall.png'
      }
    };

    // Welt 2: Das friedliche Dorf (Level 11-20)
    this.worlds['world2'] = {
      id: 'world2',
      name: '🏘️ Das friedliche Dorf',
      description: 'Suche im Dorf nach Hinweisen zu deinem Freund',
      theme: 'village',
      levelRange: [11, 20],
      color: '#228b22',
      unlocked: false,  // Wird freigeschaltet nach Welt 1
      
      background: {
        sky: {
          src: 'assets/background/village/sky.jpg',
          parallax: 0.0
        },
        far: {
          src: 'assets/background/village/far.png',
          parallax: 0.2,
          drawHeight: 600,    // ← wie hoch es gezeichnet wird
          anchorBottom: true,  // ← an Unterkante des Canvas ausrichten
        },
        mid: {
          src: 'assets/background/village/mid.png',
          parallax: 0.5,
          drawHeight: 600,
          anchorBottom: true,          
        },
        foreground:{
          src: 'assets/background/village/fore.png',
          parallax: 1.2,
          drawHeight: 600,
          anchorBottom: true,
          opacity: 0.75
        },
      },
      
      // ── TILES ────────────────────────────────────────────────────────────
      tileStyle: {
        ground:   '#8b4513',  // → 'assets/tilesets/village/ground.png'
        platform: '#deb887',  // → 'assets/tilesets/village/platform.png'
        wall:     '#a0522d'   // → 'assets/tilesets/village/wall.png'
      }
    };

    // Welt 3: Der dunkle Wald (Level 21-30) - Gesperrt
    this.worlds['world3'] = {
      id: 'world3',
      name: '🌲 Der dunkle Wald',
      description: 'Wage dich in den mysteriösen Wald',
      theme: 'forest',
      levelRange: [21, 30],
      color: '#2d5016',
      unlocked: false,
      
      background: {
        sky: {
          src: 'assets/background/forest/sky.jpg',
          parallax: 0.0
        },
        far: {
          src: 'assets/background/forest/far.png',
          parallax: 0.2,
          drawHeight: 600,    // ← wie hoch es gezeichnet wird
          anchorBottom: true,  // ← an Unterkante des Canvas ausrichten
        },
        mid: {
          src: 'assets/background/forest/mid.png',
          parallax: 0.5,
          drawHeight: 600,
          anchorBottom: true,          
        },
        foreground:{
          src: 'assets/background/forest/fore.png',
          parallax: 1.2,
          drawHeight: 600,
          anchorBottom: true,
          opacity: 0.75
        },
      },
      
      // ── TILES ────────────────────────────────────────────────────────────
      tileStyle: {
        ground:   '#2d5016',  // → 'assets/tilesets/forest/ground.png'
        platform: '#4a7c59',  // → 'assets/tilesets/forest/platform.png'
        wall:     '#1e3a1a'   // → 'assets/tilesets/forest/wall.png'
      }
    };

    console.log(`🌍 ${Object.keys(this.worlds).length} Welten geladen`);
  }

  getWorld(worldId) {
    return this.worlds[worldId] || null;
  }

  getWorldByLevelId(levelId) {
    for (let worldId in this.worlds) {
      const world = this.worlds[worldId];
      if (levelId >= world.levelRange[0] && levelId <= world.levelRange[1]) {
        return world;
      }
    }
    return null;
  }

  getAllWorlds() {
    return Object.values(this.worlds);
  }

  isWorldUnlocked(worldId, saveData) {
    const world = this.worlds[worldId];
    if (!world) return false;
    
    // Erste Welt immer freigeschaltet
    if (world.id === 'world1') return true;
    
    // Prüfe ob vorherige Welt abgeschlossen
    const worldIds = Object.keys(this.worlds).sort();
    const currentIndex = worldIds.indexOf(worldId);
    if (currentIndex === 0) return true;
    
    const previousWorldId = worldIds[currentIndex - 1];
    const previousWorld = this.worlds[previousWorldId];
    
    // Prüfe ob letztes Level der vorherigen Welt abgeschlossen
    const lastLevelId = previousWorld.levelRange[1];
    const progress = saveData.levelProgress[lastLevelId];
    
    return progress && progress.completed && progress.hasKey;
  }

  unlockWorld(worldId, saveData) {
    if (!saveData.unlockedWorlds) {
      saveData.unlockedWorlds = ['world1'];
    }
    
    if (!saveData.unlockedWorlds.includes(worldId)) {
      saveData.unlockedWorlds.push(worldId);
      console.log(`🔓 Welt ${worldId} freigeschaltet!`);
    }
    
    return saveData;
  }
}
