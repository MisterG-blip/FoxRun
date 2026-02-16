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
      unlockedLevels: [1],
      unlockedWorlds: ['world1'],
      levelProgress: {},  // { levelId: { coins, hasKey, completed, secretFound } }
      totalCoins: 0,      // Summe aller gesammelten Münzen (bestes Ergebnis pro Level)
      activeFilter: null  // z.B. 'amber', 'rainbow' etc.
    };
  }

  load() {
    try {
      const saveData = localStorage.getItem(this.saveKey);
      if (saveData) {
        const parsed = JSON.parse(saveData);
        // Fehlende Felder ergänzen (Rückwärtskompatibilität)
        if (parsed.totalCoins === undefined) parsed.totalCoins = 0;
        if (parsed.activeFilter === undefined) parsed.activeFilter = null;
        return parsed;
      }
    } catch (e) {
      console.error('❌ Fehler beim Laden:', e);
    }
    return { ...this.defaultSave };
  }

  save(saveData) {
    try {
      localStorage.setItem(this.saveKey, JSON.stringify(saveData));
      return true;
    } catch (e) {
      console.error('❌ Fehler beim Speichern:', e);
      return false;
    }
  }

  setLevelProgress(saveData, levelId, coins, hasKey, completed, secretFound = false) {
    if (!saveData.levelProgress[levelId]) {
      saveData.levelProgress[levelId] = { coins: 0, hasKey: false, completed: false, secretFound: false };
    }
    const p = saveData.levelProgress[levelId];
    const oldCoins = p.coins;
    p.coins       = Math.max(p.coins, coins);
    p.hasKey      = p.hasKey || hasKey;
    p.completed   = p.completed || completed;
    p.secretFound = p.secretFound || secretFound;

    // totalCoins: nur Differenz zum bisherigen Bestwert addieren
    saveData.totalCoins = (saveData.totalCoins || 0) + (p.coins - oldCoins);

    return saveData;
  }

  unlockNextLevel(saveData, currentLevelId) {
    const nextLevelId = currentLevelId + 1;
    if (!saveData.unlockedLevels.includes(nextLevelId)) {
      saveData.unlockedLevels.push(nextLevelId);
    }
    return saveData;
  }

  getLevelProgress(saveData, levelId) {
    return saveData.levelProgress[levelId] ||
      { coins: 0, hasKey: false, completed: false, secretFound: false };
  }

  isLevelUnlocked(saveData, levelId) {
    return saveData.unlockedLevels.includes(levelId);
  }

  // Welche Filter sind bei X Talern freigeschaltet?
  getUnlockedFilters(totalCoins) {
    return COIN_FILTERS.filter(f => totalCoins >= f.threshold);
  }

  reset() {
    localStorage.removeItem(this.saveKey);
  }
}
