// ============================================================================
// UI MANAGER
// Verwaltet Result Screen, Level Select und World Select
// ============================================================================

class UIManager {
  constructor(game) {
    this.game = game;
    this.setupResultScreen();
    this.setupLevelSelect();
    this.setupWorldSelect();
    this.setupFilterOverlay();
  }

  // Helper: Touch-friendly Event Listener (click + touchend)
  addTouchClick(element, callback) {
    element.addEventListener('click', callback);
    element.addEventListener('touchend', (e) => {
      e.preventDefault();
      callback();
    }, { passive: false });
  }

  // ========================================================================
  // WORLD SELECT SCREEN (NEU!)
  // ========================================================================
  setupWorldSelect() {
    let worldSelectScreen = document.getElementById('worldSelectScreen');
    if (!worldSelectScreen) {
      worldSelectScreen = document.createElement('div');
      worldSelectScreen.id = 'worldSelectScreen';
      worldSelectScreen.className = 'screen';
      document.getElementById('gameContainer').appendChild(worldSelectScreen);
    }
    
    worldSelectScreen.innerHTML = `
      <div class="screen-content">
        <h1>🦊 Fuchs-Versteckspiel</h1>
        <p class="story-text">Wähle eine Welt aus!</p>
        
        <div id="worldGrid" class="world-grid"></div>
      </div>
    `;
  }

  showWorldSelect() {
    const worldGrid = document.getElementById('worldGrid');
    worldGrid.innerHTML = '';
    
    const saveData = this.game.saveSystem.load();
    const allWorlds = this.game.worldManager.getAllWorlds();
    
    for (let world of allWorlds) {
      const isUnlocked = this.game.worldManager.isWorldUnlocked(world.id, saveData);
      
      const worldCard = document.createElement('div');
      worldCard.className = `world-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      worldCard.style.borderColor = world.color;
      
      if (isUnlocked) {
        // Fortschritt berechnen
        const levels = this.game.levelLoader.getLevelsForWorld(world.id);
        const completed = levels.filter(l => {
          const progress = saveData.levelProgress[l.id];
          return progress && progress.completed;
        }).length;
        
        worldCard.innerHTML = `
          <div class="world-icon" style="background: ${world.color};">${world.name.charAt(0)}</div>
          <div class="world-name">${world.name}</div>
          <div class="world-description">${world.description}</div>
          <div class="world-progress">${completed}/${levels.length} Level</div>
        `;
        
        this.addTouchClick(worldCard, () => {
          this.showLevelSelect(world.id);
        });
      } else {
        worldCard.innerHTML = `
          <div class="world-icon locked-icon">🔒</div>
          <div class="world-name">Gesperrt</div>
          <div class="world-description">Schließe die vorherige Welt ab</div>
        `;
      }
      
      worldGrid.appendChild(worldCard);
    }
    
    document.getElementById('worldSelectScreen').classList.add('show');
    this.hideLevelSelect();
    this.hideResultScreen();
  }

  hideWorldSelect() {
    document.getElementById('worldSelectScreen').classList.remove('show');
  }

  // ========================================================================
  // RESULT SCREEN
  // ========================================================================
  setupResultScreen() {
    let resultScreen = document.getElementById('resultScreen');
    if (!resultScreen) {
      resultScreen = document.createElement('div');
      resultScreen.id = 'resultScreen';
      resultScreen.className = 'screen';
      document.getElementById('gameContainer').appendChild(resultScreen);
    }

    resultScreen.innerHTML = `
      <div class="screen-content">
        <h1 id="resultTitle">Level Geschafft!</h1>
        <div id="resultStory" class="story-text"></div>

        <div class="result-stats">
          <div class="stat-item">
            <span class="stat-icon">🪙</span>
            <span>Taler: <span id="resultCoins">0</span>/<span id="resultTotalCoins">3</span></span>
          </div>
          <div class="stat-item">
            <span class="stat-icon">🔑</span>
            <span>Schlüssel: <span id="resultKey">Nein</span></span>
          </div>
          <div class="stat-item" id="resultSecretRow">
            <span class="stat-icon" id="resultSecretIcon">🔍</span>
            <span id="resultSecretText">Kein Geheimnis</span>
          </div>
          <div class="stat-item" id="resultTotalRow">
            <span class="stat-icon">💰</span>
            <span>Taler gesamt: <span id="resultTotalCoinsAll">0</span>/90</span>
          </div>
        </div>

        <div id="resultNewFilter" class="new-filter-banner" style="display:none"></div>

        <div class="result-buttons">
          <button id="btnRetry"     class="game-button">🔄 Nochmal</button>
          <button id="btnNextLevel" class="game-button primary">➡️ Weiter</button>
          <button id="btnBackToWorlds" class="game-button">🌍 Welten</button>
        </div>
      </div>
    `;

    this.addTouchClick(document.getElementById('btnRetry'), () => {
      this.game.retryLevel();
    });
    this.addTouchClick(document.getElementById('btnNextLevel'), () => {
      this.game.nextLevel();
    });
    this.addTouchClick(document.getElementById('btnBackToWorlds'), () => {
      this.showWorldSelect();
    });
  }

  showResultScreen(levelData, coins, hasKey, hasPassage, secretFound, totalCoins = 0, newFilter = null, discoveredSecrets = 0, totalSecrets = 0) {
    const resultScreen = document.getElementById('resultScreen');
    const totalInLevel = levelData.coins?.length || 3;

    // Falls totalCoins nicht übergeben wurde, berechne es aus saveData
    if (totalCoins === 0) {
      const saveData = this.game.saveSystem.load();
      Object.values(saveData.levelProgress).forEach(progress => {
        totalCoins += progress.coins || 0;
      });
    }

    document.getElementById('resultTitle').textContent = `${levelData.name} — Geschafft!`;
    document.getElementById('resultCoins').textContent = coins;
    document.getElementById('resultTotalCoins').textContent = totalInLevel;
    document.getElementById('resultKey').textContent = hasKey ? 'Ja ✅' : 'Nein ❌';
    document.getElementById('resultTotalCoinsAll').textContent = totalCoins;

    // Story
    document.getElementById('resultStory').textContent = hasKey
      ? 'Gut gemacht! Du hast den Schlüssel gefunden!'
      : 'Level geschafft, aber du kannst noch mehr entdecken!';

    // Geheimnis-Zeile mit Fortschritt
    const secretRow  = document.getElementById('resultSecretRow');
    const secretIcon = document.getElementById('resultSecretIcon');
    const secretText = document.getElementById('resultSecretText');

    if (!hasPassage) {
      secretRow.style.opacity = '0.4';
      secretIcon.textContent  = '—';
      secretText.textContent  = 'Kein Geheimnis in diesem Level';
    } else if (secretFound) {
      secretRow.style.opacity = '1';
      secretIcon.textContent  = '🔍';
      secretText.innerHTML    = `<strong>Alle Geheimnisse entdeckt!</strong> ✅ (${totalSecrets}/${totalSecrets})`;
    } else {
      secretRow.style.opacity = '1';
      secretIcon.textContent  = '❓';
      secretText.innerHTML    = `Geheimnisse <em>unvollständig</em> — ${discoveredSecrets}/${totalSecrets} entdeckt`;
    }

    // Neuer Filter freigeschaltet?
    const filterBanner = document.getElementById('resultNewFilter');
    if (newFilter && totalCoins >= newFilter.threshold &&
        totalCoins - coins < newFilter.threshold) {
      // Schwelle wurde in diesem Level überschritten
      filterBanner.style.display = 'block';
      filterBanner.innerHTML =
        `🎉 Neuer Filter freigeschaltet: <strong>${newFilter.name}</strong>`;
    } else {
      filterBanner.style.display = 'none';
    }

    // Next-Button
    const btnNext     = document.getElementById('btnNextLevel');
    const hasNextLevel = this.game.levelLoader.getLevel(levelData.id + 1) !== null;
    btnNext.style.display = hasNextLevel ? 'inline-block' : 'none';
    btnNext.disabled      = !hasKey;

    resultScreen.classList.add('show');
  }

  hideResultScreen() {
    document.getElementById('resultScreen').classList.remove('show');
  }

  // ========================================================================
  // LEVEL SELECT SCREEN
  // ========================================================================
  setupLevelSelect() {
    let levelSelectScreen = document.getElementById('levelSelectScreen');
    if (!levelSelectScreen) {
      levelSelectScreen = document.createElement('div');
      levelSelectScreen.id = 'levelSelectScreen';
      levelSelectScreen.className = 'screen';
      document.getElementById('gameContainer').appendChild(levelSelectScreen);
    }
    
    levelSelectScreen.innerHTML = `
      <div class="screen-content">
        <h1 id="levelSelectTitle">Level auswählen</h1>
        
        <div id="levelGrid" class="level-grid"></div>
        
        <div class="result-buttons">
          <button id="btnBackToWorldSelect" class="game-button">⬅️ Zurück zu Welten</button>
          <button id="btnResetSave" class="game-button danger">🗑️ Fortschritt löschen</button>
        </div>
      </div>
    `;

    this.addTouchClick(document.getElementById('btnBackToWorldSelect'), () => {
      this.showWorldSelect();
    });

    this.addTouchClick(document.getElementById('btnResetSave'), () => {
      if (confirm('Wirklich den gesamten Fortschritt löschen?')) {
        this.game.saveSystem.reset();
        location.reload();
      }
    });
  }

  showLevelSelect(worldId = null) {
    const levelGrid = document.getElementById('levelGrid');
    levelGrid.innerHTML = '';
    
    const saveData = this.game.saveSystem.load();
    
    let levels;
    if (worldId) {
      levels = this.game.levelLoader.getLevelsForWorld(worldId);
      const world = this.game.worldManager.getWorld(worldId);
      document.getElementById('levelSelectTitle').textContent = world.name;
    } else {
      const allLevelIds = this.game.levelLoader.getAllLevelIds();
      levels = allLevelIds.map(id => this.game.levelLoader.getLevel(id));
      document.getElementById('levelSelectTitle').textContent = 'Alle Level';
    }
    
    for (let levelData of levels) {
      const isUnlocked = this.game.saveSystem.isLevelUnlocked(saveData, levelData.id);
      const levelCard  = document.createElement('div');
      levelCard.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      
      if (isUnlocked) {
        const progress    = this.game.saveSystem.getLevelProgress(saveData, levelData.id);
        const hasPassage  = !!(levelData.passages && levelData.passages.length > 0);
        const secretIcon  = !hasPassage ? ''
          : progress.secretFound ? '🔍'
          : progress.completed   ? '❓'
          : '';

        levelCard.innerHTML = `
          <div class="level-number">Level ${levelData.id}</div>
          <div class="level-name">${levelData.name}</div>
          <div class="level-progress">
            <span>🪙 ${progress.coins}/${levelData.coins?.length || 3}</span>
            <span>🔑 ${progress.hasKey ? '✅' : '❌'}</span>
            ${secretIcon ? `<span title="${progress.secretFound ? 'Geheimnis gefunden' : 'Geheimnis verpasst'}">${secretIcon}</span>` : ''}
          </div>
        `;
        
        this.addTouchClick(levelCard, () => {
          this.game.loadLevel(levelData.id);
        });
      } else {
        levelCard.innerHTML = `
          <div class="level-number">Level ${levelData.id}</div>
          <div class="level-name">🔒 Gesperrt</div>
        `;
      }
      
      levelGrid.appendChild(levelCard);
    }
    
    document.getElementById('levelSelectScreen').classList.add('show');
    document.getElementById('worldSelectScreen').classList.remove('show');
    document.getElementById('resultScreen').classList.remove('show');
  }

  hideLevelSelect() {
    document.getElementById('levelSelectScreen').classList.remove('show');
  }

  // ========================================================================
  // FILTER OVERLAY
  // ========================================================================
  setupFilterOverlay() {
    // Filter-Button neben Mute-Button
    const filterBtn = document.createElement('button');
    filterBtn.id        = 'filterBtn';
    filterBtn.title     = 'Farbfilter';
    filterBtn.textContent = '🦊';
    document.getElementById('gameContainer').appendChild(filterBtn);

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'filterOverlay';
    overlay.innerHTML = `
      <div id="filterOverlayContent">
        <h3>🦊 Farbfilter</h3>
        <p id="filterCoinsInfo"></p>
        <div id="filterGrid"></div>
        <button id="filterClose" class="game-button">Schließen</button>
      </div>
    `;
    document.getElementById('gameContainer').appendChild(overlay);

    filterBtn.addEventListener('click', () => this.showFilterOverlay());
    this.addTouchClick(document.getElementById('filterClose'), () => {
      overlay.classList.remove('show');
    });
  }

  showFilterOverlay() {
    const saveData   = this.game.saveSystem.load();
    
    // Berechne totalCoins aus levelProgress (nicht aus gespeichertem Wert!)
    let total = 0;
    Object.values(saveData.levelProgress).forEach(progress => {
      total += progress.coins || 0;
    });
    
    const unlocked   = COIN_FILTERS.filter(f => total >= f.threshold);
    const activeId   = saveData.activeFilter;

    document.getElementById('filterCoinsInfo').textContent =
      `${total}/90 Taler gesammelt — ${unlocked.length} von ${COIN_FILTERS.length} Filtern freigeschaltet`;

    const grid = document.getElementById('filterGrid');
    grid.innerHTML = '';

    // "Kein Filter" Option
    const noneCard = document.createElement('div');
    noneCard.className = `filter-card ${!activeId ? 'active' : ''}`;
    noneCard.innerHTML = `<div class="filter-preview" style="background:#654321"></div><span>Normal</span>`;
    this.addTouchClick(noneCard, () => this._setFilter(null));
    grid.appendChild(noneCard);

    // Alle Filter
    for (const f of COIN_FILTERS) {
      const isUnlocked = total >= f.threshold;
      const card = document.createElement('div');
      card.className = `filter-card ${isUnlocked ? '' : 'locked'} ${activeId === f.id ? 'active' : ''}`;

      const previewBg = f.animated
        ? 'linear-gradient(90deg,red,orange,yellow,green,blue,violet)'
        : f.color?.replace(/[\d.]+\)$/, '0.8)') || '#333';

      card.innerHTML = `
        <div class="filter-preview" style="background:${previewBg}"></div>
        <span>${isUnlocked ? f.name : `🔒 ${f.threshold}🪙`}</span>
      `;
      if (isUnlocked) {
        this.addTouchClick(card, () => this._setFilter(f.id));
      }
      grid.appendChild(card);
    }

    document.getElementById('filterOverlay').classList.add('show');
  }

  _setFilter(filterId) {
    const saveData = this.game.saveSystem.load();
    saveData.activeFilter = filterId;
    this.game.saveSystem.save(saveData);

    if (this.game.player) {
      this.game.player.activeFilter = filterId
        ? COIN_FILTERS.find(f => f.id === filterId) || null
        : null;
    }

    // Aktiv-Klasse aktualisieren
    document.querySelectorAll('.filter-card').forEach(c => c.classList.remove('active'));
    const cards = document.querySelectorAll('.filter-card');
    // erste Karte = "Normal"
    if (!filterId) {
      cards[0]?.classList.add('active');
    } else {
      const idx = COIN_FILTERS.findIndex(f => f.id === filterId);
      if (idx >= 0) cards[idx + 1]?.classList.add('active');
    }
  }
}
