# 🦊 Fox Run - Multi-Level System

## 📖 Story
Ein Fuchs sucht seinen Freund beim Versteckspiel! Durchsuche verschiedene Orte und sammle Hinweise (Münzen und Schlüssel), um deinen Freund zu finden.

## 🎮 Spielablauf

### 1. Level-Auswahl
- **Level 1** ist immer freigeschaltet
- Weitere Level werden freigeschaltet, wenn du **alle 3 Münzen + Schlüssel** sammelst
- Fortschritt wird automatisch gespeichert

### 2. Im Level
- Sammle **3 Münzen** 🪙
- Finde den **Schlüssel** 🔑
- Der Schlüssel öffnet die Tür
- Erreiche das **Ziel** 🏁

### 3. Result Screen
Zeigt an:
- Gesammelte Münzen (x/3)
- Schlüssel gefunden? (Ja/Nein)
- **"Weiter"** nur wenn alles gesammelt
- **"Nochmal"** um das Level zu wiederholen
- **"Level-Auswahl"** zurück zum Menü

## 🏗️ Technische Architektur

### Neue Dateien

```
js/
├── savesystem.js      # localStorage Verwaltung
├── levelmanager.js    # Level-Definitionen & Verwaltung
└── uimanager.js       # Result Screen & Level Select
```

### Dateistruktur

```javascript
// SaveSystem - Spielstand in localStorage
{
  version: 1,
  currentLevel: 1,
  unlockedLevels: [1, 2],
  levelProgress: {
    1: { coins: 3, hasKey: true, completed: true },
    2: { coins: 2, hasKey: false, completed: false }
  }
}

// LevelManager - Level-Definition
{
  id: 1,
  name: "Das Versteck im Garten",
  story: "...",
  width: 1600,    // Level größer als Canvas!
  height: 1200,
  walls: [...],   // Plattformen & Hindernisse
  coins: [{x, y}, {x, y}, {x, y}],  // Genau 3!
  key: {x, y},
  door: {x, y, width, height},
  goal: {x, y},
  playerStart: {x, y}
}
```

## 🎬 Kamera-System

Level sind **größer als der Bildschirm** (z.B. 1600x1200 statt 800x600).

**Kamera folgt dem Spieler:**
```javascript
// Smooth Camera mit Lerp
cameraX += (playerX - cameraX) * 0.1
cameraY += (playerY - cameraY) * 0.1

// Begrenzt auf Level-Grenzen
cameraX = clamp(0, levelWidth - canvasWidth)
cameraY = clamp(0, levelHeight - canvasHeight)
```

**Beim Zeichnen:**
```javascript
// Alle Objekte mit Kamera-Offset zeichnen
ctx.drawImage(sprite, x - cameraX, y - cameraY)
```

## 📝 Neues Level hinzufügen

### In `levelmanager.js`:

```javascript
this.levels[4] = {
  id: 4,
  name: "Neues Level",
  story: "Beschreibung...",
  width: 2000,
  height: 1500,
  requiredCoins: 3,
  requiredKey: true,
  
  walls: [
    // Level-Geometrie
  ],
  
  coins: [
    {x: 100, y: 200},
    {x: 300, y: 400},
    {x: 500, y: 600}
  ],
  
  key: {x: 700, y: 800},
  door: {x: 900, y: 1000, width: 50, height: 200},
  goal: {x: 1100, y: 1200},
  playerStart: {x: 50, y: 100}
};
```

### Level-Design Tipps:

1. **Level-Größe**: Mindestens 1.5x Canvas-Größe
2. **Boundaries**: Immer Top, Bottom, Left, Right Wände
3. **Coins**: Genau 3 Stück!
4. **Schwierigkeit**: 
   - Level 1: Einfach, Tutorial
   - Level 2: Mittelschwer
   - Level 3: Herausfordernd (Double Jump nötig)

## 🔧 Game Flow

```
Start
  ↓
Level Select Screen
  ↓
Level laden (loadLevel)
  ↓
Spielen...
  ↓
Ziel erreicht (completeLevel)
  ↓
Fortschritt speichern
  ↓
Result Screen
  ↓
[Weiter] / [Nochmal] / [Level-Auswahl]
```

## 💾 Fortschritt löschen

Im Level-Select Screen:
- Button **"Fortschritt löschen"**
- Sicherheitsabfrage
- Lädt Seite neu

Oder manuell:
```javascript
localStorage.removeItem('foxrun_save_v1');
location.reload();
```

## 🐛 Debug-Tipps

### Aktiviere Debug-Modus:
```javascript
// config.js
const DEBUG_MODE = true;
```

Zeigt:
- Hitboxen (grün)
- Sprünge verbleibend
- Ground Status
- Velocity Y

### Console-Befehle:
```javascript
// Aktueller Spielstand
console.log(game.saveSystem.load());

// Alle Level anzeigen
console.log(game.levelManager.levels);

// Level direkt laden
game.loadLevel(2);

// Fortschritt zurücksetzen
game.saveSystem.reset();
```

## 🎨 UI Anpassungen

### Result Screen Style ändern:
`css/style.css` → `.result-stats`, `.game-button`

### Level Cards Style:
`css/style.css` → `.level-card`, `.level-grid`

## 📊 Level-Statistiken

**Level 1**: "Das Versteck im Garten"
- Größe: 1600x1200
- Schwierigkeit: ⭐ Einfach
- Features: Tunnel zum Kriechen

**Level 2**: "Der dunkle Keller"
- Größe: 2000x1400
- Schwierigkeit: ⭐⭐ Mittel
- Features: Treppen-Effekt

**Level 3**: "Das hohe Baumhaus"
- Größe: 1800x1600
- Schwierigkeit: ⭐⭐⭐ Schwer
- Features: Vertikales Klettern, Double Jump nötig

## ✅ Checkliste für neue Features

- [ ] Neue Animationen hinzufügen? → `config.js` + `player.js`
- [ ] Neues Collectible? → `collectibles.js` + `level.js`
- [ ] Neue Mechanik? → `player.js`
- [ ] Neues Level? → `levelmanager.js`
- [ ] UI ändern? → `uimanager.js` + `style.css`
- [ ] Save-Format ändern? → `savesystem.js` + Version erhöhen!

## 🚀 Nächste Schritte

Mögliche Erweiterungen:
1. **Mehr Level** (Level 4, 5, 6...)
2. **Power-Ups** (Speed Boost, Triple Jump)
3. **Feinde** (bewegende Hindernisse)
4. **Timer** (Zeitlimit pro Level)
5. **Achievements** (Alle Münzen in unter 60s)
6. **Leaderboard** (localStorage oder API)
7. **Sound Effects** (Jump, Coin, Key, Complete)
8. **Musik** (Pro Level unterschiedlich)

Viel Spaß beim Entwickeln! 🦊✨
