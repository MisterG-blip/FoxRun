// ============================================================================
// SAVE SYSTEM
// Verwaltet Spielfortschritt mit localStorage
// ============================================================================

class SaveSystem {
  constructor() {
    this.saveKey = 'foxrun_save_v1';
    this.defaultSave = {
      version: 1,
      currentLevel: 1,
      unlockedLevels: [1],      // Level 1 ist immer freigeschaltet
      unlockedWorlds: ['world1'], // Welt 1 ist immer freigeschaltet
      levelProgress: {}         // { levelId: { coins: 0, hasKey: false, completed: false } }
    };
  }

  // Lädt den Spielstand
  load() {
    try {
      const saveData = localStorage.getItem(this.saveKey);
      if (saveData) {
        const parsed = JSON.parse(saveData);
        console.log('💾 Spielstand geladen:', parsed);
        return parsed;
      }
    } catch (e) {
      console.error('❌ Fehler beim Laden:', e);
    }
    
    // Kein Spielstand vorhanden - erstelle neuen
    console.log('🆕 Neuer Spielstand erstellt');
    return { ...this.defaultSave };
  }

  // Speichert den Spielstand
  save(saveData) {
    try {
      localStorage.setItem(this.saveKey, JSON.stringify(saveData));
      console.log('💾 Spielstand gespeichert:', saveData);
      return true;
    } catch (e) {
      console.error('❌ Fehler beim Speichern:', e);
      return false;
    }
  }

  // Setzt Fortschritt für ein Level
  setLevelProgress(saveData, levelId, coins, hasKey, completed) {
    if (!saveData.levelProgress[levelId]) {
      saveData.levelProgress[levelId] = { coins: 0, hasKey: false, completed: false };
    }
    
    const progress = saveData.levelProgress[levelId];
    progress.coins = Math.max(progress.coins, coins);  // Behalte bestes Ergebnis
    progress.hasKey = progress.hasKey || hasKey;
    progress.completed = progress.completed || completed;
    
    // Berechne totalCoins aus allen Level-Fortschritten
    saveData.totalCoins = 0;
    Object.values(saveData.levelProgress).forEach(p => {
      saveData.totalCoins += p.coins || 0;
    });
    
    return saveData;
  }

  // Schaltet nächstes Level frei
  unlockNextLevel(saveData, currentLevelId) {
    const nextLevelId = currentLevelId + 1;
    if (!saveData.unlockedLevels.includes(nextLevelId)) {
      saveData.unlockedLevels.push(nextLevelId);
      console.log(`🔓 Level ${nextLevelId} freigeschaltet!`);
    }
    return saveData;
  }

  // Holt Fortschritt für ein Level
  getLevelProgress(saveData, levelId) {
    return saveData.levelProgress[levelId] || { coins: 0, hasKey: false, completed: false };
  }

  // Ist Level freigeschaltet?
  isLevelUnlocked(saveData, levelId) {
    return saveData.unlockedLevels.includes(levelId);
  }

  // Kompletten Spielstand löschen
  reset() {
    localStorage.removeItem(this.saveKey);
    console.log('🗑️ Spielstand gelöscht');
  }
}
