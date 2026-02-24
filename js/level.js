// ============================================================================
// LEVEL DESIGN
// Lädt Level-Daten dynamisch mit Welt-Theme
// ============================================================================

class Level {
  constructor(levelData, world, backgroundRenderer) {
    this.id = levelData.id;
    this.name = levelData.name;
    this.story = levelData.story;
    this.width = levelData.width;
    this.height = levelData.height;
    this.playerStart = levelData.playerStart;
    this.world = world;
    this.bgRenderer = backgroundRenderer;  // für drawTile()
    
    this.walls = [];
    this.coins = [];
    this.keys = [];
    this.doors = [];
    this.switches     = [];
    this.switchesById = {};
    // Angeblich bruach ichd as nicht, weil die Sachen
    //this.secretDoors  = [];
    //this.passages     = [];
    //for (const sw of this.switches) {
    //  this.switchesById[sw.id] = sw;
    //}

    this.goal = null;
    
    this.loadFromData(levelData);
  }

  loadFromData(data) {
    // Walls
    this.walls = data.walls.map(w => ({...w}));
    
    // Coins
    this.coins = data.coins.map(c => new Coin(c.x, c.y));
    
    // Key
    if (data.key) {
      this.keys.push(new Key(data.key.x, data.key.y));
    }
    
    // Door
    if (data.door) {
      this.doors.push(new Door(data.door.x, data.door.y, data.door.width, data.door.height));
    }
    
    // Goal
    if (data.goal) {
      this.goal = new Goal(data.goal.x, data.goal.y);
    }

    // NPCs
    this.npcs = (data.npcs || []).map(npcData => new NPC(npcData));

    // Switches (Kippschalter)
    const theme = this.world?.theme || 'castle';
    this.switches = (data.switches || []).map(s => new Switch(s, theme));

    // Secret Doors (durch Schalter steuerbar)
    this.secretDoors = (data.secretDoors || []).map(d => new SecretDoor(d, theme));

    // Passages (unsichtbare Durchgänge mit Fog-Überlagerung)
    this.passages = (data.passages || []).map(p => new Passage(p));

    // Decorations – optionales Array im Level-JSON:
    // "decorations": [
    //   { "type": "torch",  "x": 300, "y": 980, "width": 24, "height": 48 },
    //   { "type": "banner", "x": 600, "y": 920, "width": 32, "height": 64 }
    // ]
    this.decorations = data.decorations || [];

    //Hier wird dei Puzzel Logik aufgerufen
    this.switchesById = {};
    for (const sw of this.switches) {
      this.switchesById[sw.id] = sw;
    }

    this.puzzle = null;

    if (data.puzzle) {
      this.puzzle = new ConditionPuzzle(
        this.switchesById, 
        this.secretDoors, 
        data.puzzle
      );
    }
  }

  update() {
    for (let coin of this.coins) {
      coin.update();
    }
    
    for (let key of this.keys) {
      key.update();
    }
    
    for (let door of this.doors) {
      door.update();
    }

    for (let sd of this.secretDoors) {
      sd.update();
    }
    
    if (this.goal) {
      this.goal.update();
    }
  }

  // NPCs updaten – brauchen Spieler-Position für Nähe-Prüfung
  updateNpcs(deltaTime, playerX, playerY) {
    const activeWalls = this.getActiveWalls();
    for (const npc of this.npcs) {
      npc.update(deltaTime, activeWalls, playerX, playerY);
    }
  }

  // Switches updaten
  updateSwitches(playerX, playerY) {
    for (const sw of this.switches) {
      sw.update(playerX, playerY);
    }
  }

  // Passages updaten — brauchen Hitbox für Entdeckungs-Prüfung
  updatePassages(playerX, playerY, playerHitbox) {
    for (const p of this.passages) {
      p.update(playerX, playerY, playerHitbox);
    }
  }

  // Secret Doors updaten — Multi-Switch Puzzle Logik
  updateSecretDoors() {
    for (const door of this.secretDoors) {
      // requiresAll Puzzle (altes System, weiterhin unterstützt)
      if (door.requiresAll && !this.puzzle) {
        const allOn = door.requiresAll.every(id => {
          const sw = this.switches.find(s => s.id === id);
          return sw && sw.isOn;
        });
        if (allOn && !door.isOpen) {
          door.open();
        } else if (!allOn && door.isOpen) {
          door.close();
        }
      }     
      door.update(this.switches);
    }
  }


  // Nächste unentdeckte Passage in Schnüffel-Reichweite
  getNearestPassage(playerX, playerY) {
    for (const p of this.passages) {
      if (p.playerNearby) return p;
    }
    return null;
  }

  // Nächsten Switch in Reichweite zurückgeben
  getNearestSwitch(playerX, playerY) {
    for (const sw of this.switches) {
      if (sw.playerNearby) return sw;
    }
    return null;
  }

  // Switch betätigen (nur Player-Toggle, keine Rekursion)
  activateSwitch(sw) {
    const msg = sw.interact();
     
     // Puzzle informieren (wenn vorhanden)
     if (this.puzzle) {
       this.puzzle.onPlayerToggle(sw);
       
      // onSolved Events ausführen
      if (this.puzzle.isSolved() && this.puzzle.onSolved.openDoors) {
        for (const doorId of this.puzzle.onSolved.openDoors) {
          const door = this.secretDoors.find(d => d.id === doorId);
          if (door && !door.isOpen) {
            door.open();
            console.log(`🚪 Tür ${doorId} durch Puzzle geöffnet`);
          }
        }
      }
      } else {
        // Alte Logik für einzelne Schalter ohne Puzzle
        for (const target of sw.targets) {
          const { id, action } = target;
         
          const door = this.secretDoors.find(d => d.id === id);
          if (door) {
            if      (action === 'open')   door.open();
            else if (action === 'close')  { door.isOpen = false; door.openProgress = 0; }
            else {  // toggle
              if (door.isOpen) { door.isOpen = false; door.openProgress = 0; }
              else door.open();
            }
          }
        }
      }
    return msg;
  }

  // Nächsten NPC in Reichweite zurückgeben (für Sniff-Interaktion)
  getNearestNpc(playerX, playerY) {
    let nearest = null;
    let minDist = NPC_INTERACT_DISTANCE;
    for (const npc of this.npcs) {
      const dist = Math.abs(playerX - (npc.x + npc.drawWidth / 2));
      if (dist < minDist) {
        minDist = dist;
        nearest = npc;
      }
    }
    return nearest;
  }

  draw(ctx, cameraX, cameraY) {
    for (let wall of this.walls) {
      // Offene Türen überspringen
      let isDoor = false;
      for (let door of this.doors) {
        if (wall.x === door.x && wall.y === door.y &&
            door.isOpen && door.openProgress >= 1) {
          isDoor = true; break;
        }
      }
      if (isDoor) continue;

      const wx = wall.x - cameraX;
      const wy = wall.y - cameraY;

      // Tile-Typ bestimmen: Boden (flache Wände), Wand (hohe, schmale), Platform
      let tileType = 'ground';
      if (wall.type === 'wall' || (wall.height > wall.width && wall.height > 60)) {
        tileType = 'wall';
      } else if (wall.type === 'platform' || wall.height <= 25) {
        tileType = 'platform';
      }

      if (this.bgRenderer) {
        // wall.x / wall.y = absolute Level-Position → für stabile Varianten-Berechnung
        this.bgRenderer.drawTile(ctx, tileType, wx, wy, wall.width, wall.height, wall.x, wall.y);
      } else {
        // Absoluter Fallback
        ctx.fillStyle = '#34495e';
        ctx.fillRect(wx, wy, wall.width, wall.height);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, wall.width, wall.height);
      }
    }

    // Decorations (über Wänden, unter Collectibles)
    // Jedes Decoration-Objekt im JSON: { type, x, y, width?, height? }
    if (this.decorations.length > 0 && this.bgRenderer) {
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      for (const deco of this.decorations) {
        this.bgRenderer.drawDecoration(ctx, deco.type, deco.x, deco.y, deco.width, deco.height);
      }
      ctx.restore();
    }

    // Collectibles
    for (let coin of this.coins) {
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      coin.draw(ctx);
      ctx.restore();
    }
    
    for (let key of this.keys) {
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      key.draw(ctx);
      ctx.restore();
    }
    
    for (let door of this.doors) {
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      door.draw(ctx);
      ctx.restore();
    }
    
    if (this.goal) {
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      this.goal.draw(ctx);
      ctx.restore();
    }

    // NPCs
    for (const npc of this.npcs) {
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      npc.draw(ctx);
      ctx.restore();
    }

    // Secret Doors (vor Switches damit Schalter drüber liegt)
    for (const sd of this.secretDoors) {
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      sd.draw(ctx);
      ctx.restore();
    }

    // Switches
    for (const sw of this.switches) {
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      sw.draw(ctx);
      ctx.restore();
    }

    // Passage-Überlagerungen — GANZ ZULETZT, über allem
    // Verdeckt Münzen, NPCs, Schalter im versteckten Bereich
    // bis der Spieler die Passage betritt
    for (const p of this.passages) {
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      p.draw(ctx, this.bgRenderer);
      ctx.restore();
    }
  }

  getActiveWalls() {
    let activeWalls = [];
    
    for (let wall of this.walls) {
      let isOpenDoor = false;
      
      for (let door of this.doors) {
        if (wall.x === door.x && wall.y === door.y && 
            door.isOpen && door.openProgress >= 1) {
          isOpenDoor = true;
          break;
        }
      }
      
      if (!isOpenDoor) {
        activeWalls.push(wall);
      }
    }

    // Secret Doors als Wände einbeziehen (solange nicht offen)
    for (const sd of this.secretDoors) {
      const wall = sd.getWall();
      if (wall) activeWalls.push(wall);
    }
    
    return activeWalls;
  }
}
