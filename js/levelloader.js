// ============================================================================
// LEVEL LOADER
// Lädt Level-Daten aus JSON-Dateien
// ============================================================================

class LevelLoader {
  constructor(worldManager) {
    this.worldManager = worldManager;
    this.levels = {};
    this.isLoaded = false;
  }

  // Lädt alle Level für alle Welten
  async loadAllLevels() {
    console.log('📦 Lade Level-Dateien...');
    
    // Mapping: Ordner-Name → World-ID → Level-Nummern
    // WICHTIG: Ordner heißen world_1, world_2, etc.
    //          aber worldId in JSON ist world1, world2, etc.
    const levelStructure = [
      { folder: 'world_1', worldId: 'world1', levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      { folder: 'world_2', worldId: 'world2', levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      { folder: 'world_3', worldId: 'world3', levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
    ];
    
    let loadedCount = 0;
    let failedCount = 0;
    
    for (const worldConfig of levelStructure) {
      console.log(`📂 Lade Welt: ${worldConfig.folder} (worldId: ${worldConfig.worldId})`);
      
      for (const levelNum of worldConfig.levels) {
        // Versuche verschiedene Dateinamen-Formate
        const possiblePaths = [
          `levels/${worldConfig.folder}/level_${levelNum}.json`,
          `levels/${worldConfig.folder}/level${levelNum}.json`
        ];
        
        let loaded = false;
        for (const path of possiblePaths) {
          try {
            const response = await fetch(path);
            if (!response.ok) continue;
            
            const levelData = await response.json();
            
            // Validierung: Prüfe ob worldId übereinstimmt
            if (levelData.worldId !== worldConfig.worldId) {
              console.warn(`⚠️ WorldId Mismatch in ${path}: erwartet "${worldConfig.worldId}", gefunden "${levelData.worldId}"`);
              console.warn(`   → Korrigiere worldId auf "${worldConfig.worldId}"`);
              levelData.worldId = worldConfig.worldId;
            }
            
            // Verwende die ID aus der JSON-Datei
            this.levels[levelData.id] = levelData;
            loadedCount++;
            loaded = true;
            console.log(`   ✅ Level ${levelData.id}: ${levelData.name}`);
            break;
          } catch (err) {
            // Versuche nächsten Pfad
            continue;
          }
        }
        
        if (!loaded) {
          failedCount++;
          console.warn(`   ❌ Level ${levelNum} nicht gefunden in ${worldConfig.folder}`);
        }
      }
    }
    
    this.isLoaded = true;
    
    if (loadedCount === 0) {
      console.error('❌ KEINE Level geladen!');
      console.error('Mögliche Ursachen:');
      console.error('1. Läuft nicht auf Localhost (file:// funktioniert nicht!)');
      console.error('2. levels/ Ordner fehlt oder ist leer');
      console.error('3. JSON-Dateien haben Syntax-Fehler');
      return false;
    }
    
    console.log(`📦 ${loadedCount} Level erfolgreich geladen${failedCount > 0 ? ` (${failedCount} fehlgeschlagen)` : ''}`);
    console.log(`📊 Geladene Level-IDs:`, Object.keys(this.levels).map(id => parseInt(id)).sort((a,b) => a-b));
    
    return true;
  }

  getLevel(levelId) {
    return this.levels[levelId] || null;
  }

  getAllLevelIds() {
    return Object.keys(this.levels).map(id => parseInt(id)).sort((a, b) => a - b);
  }

  getLevelsForWorld(worldId) {
    const levels = Object.values(this.levels).filter(level => level.worldId === worldId);
    console.log(`🔍 getLevelsForWorld("${worldId}"):`, levels.length, 'Level gefunden');
    return levels;
  }
}
