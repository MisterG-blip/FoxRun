// ============================================================================
// CONDITION PUZZLE
// Einheitliches Puzzle-System mit zwei Syntaxen:
// 1. Einfache Regeln: { from, to, action }
// 2. Condition-DSL: { when, then }
// ============================================================================

class ConditionPuzzle {
  constructor(switchesById, secretDoors, puzzleData) {
    this.switchesById = switchesById;
    this.secretDoors = secretDoors;
    this.conditions = [];
    this.solvedWhen = puzzleData.solvedWhen || 'allOn';
    this.onSolved = puzzleData.onSolved || {};
    this.wasSolved = false;
    
    // Unterstützt beide Syntaxen
    if (puzzleData.rules) {
      // Alt: Regel-Syntax → in Conditions umwandeln
      this.conditions = this._convertRulesToConditions(puzzleData.rules);
      console.log(`🧩 Puzzle geladen: ${puzzleData.rules.length} Regeln (konvertiert zu Conditions)`);
    } else if (puzzleData.conditions) {
      // Neu: Native Condition-Syntax
      this.conditions = puzzleData.conditions;
      console.log(`🧩 Puzzle geladen: ${puzzleData.conditions.length} Conditions`);
    }
    
    console.log(`🎯 Ziel: ${this.solvedWhen}`);
  }

  // Konvertiert alte Regel-Syntax zu Conditions
  _convertRulesToConditions(rules) {
    return rules.map(rule => ({
      when: `${rule.from}:on`,
      then: { [rule.to]: rule.action }
    }));
  }

  // Spieler hat einen Schalter betätigt
  onPlayerToggle(triggeredSwitch) {
    console.log(`🔘 Spieler toggled ${triggeredSwitch.id} → ${triggeredSwitch.isOn ? 'AN' : 'AUS'}`);
    this.evaluate();
    this.checkSolved();
  }

  // Evaluiert alle Conditions und führt Actions aus
  evaluate() {
    const MAX_ITERATIONS = 10;
    let iterations = 0;
    let changed = true;

    while (changed && iterations < MAX_ITERATIONS) {
      changed = false;
      iterations++;

      for (const condition of this.conditions) {
        if (this._evaluateWhen(condition.when)) {
          const hadChanges = this._executeThen(condition.then);
          if (hadChanges) changed = true;
        }
      }
    }

    if (iterations >= MAX_ITERATIONS) {
      console.warn(`⚠️ Condition-Loop erreichte Max-Iterationen`);
    }
  }

  // Prüft eine when-Bedingung
  _evaluateWhen(whenStr) {
    // Spezial-Keywords
    if (whenStr === 'allOn') {
      return Object.values(this.switchesById).every(sw => sw.isOn);
    }
    if (whenStr === 'allOff') {
      return Object.values(this.switchesById).every(sw => !sw.isOn);
    }
    if (whenStr === 'anyOn') {
      return Object.values(this.switchesById).some(sw => sw.isOn);
    }

    // Parse: "s1:on && s2:off || s3:on"
    // Einfacher Parser (ohne Klammern, L-R Evaluation)
    
    // Ersetze Tokens durch Werte
    let expr = whenStr;
    
    // Ersetze switch:state durch true/false
    const switchPattern = /(\w+):(on|off)/g;
    expr = expr.replace(switchPattern, (match, switchId, state) => {
      const sw = this.switchesById[switchId];
      if (!sw) {
        console.warn(`⚠️ Schalter "${switchId}" nicht gefunden in Condition`);
        return 'false';
      }
      const isOn = sw.isOn;
      const wantOn = state === 'on';
      return (isOn === wantOn) ? 'true' : 'false';
    });

    // Ersetze Operatoren
    expr = expr.replace(/&&/g, ' && ').replace(/\|\|/g, ' || ').replace(/!/g, '!');

    // Evaluiere
    try {
      // Security: nur true/false/&&/||/! erlaubt
      if (/[^true\sfalse&|!()]/.test(expr)) {
        console.error(`⚠️ Ungültige Condition: "${whenStr}" → "${expr}"`);
        return false;
      }
      return eval(expr);
    } catch (e) {
      console.error(`⚠️ Condition-Fehler: "${whenStr}"`, e);
      return false;
    }
  }

  // Führt then-Actions aus
  _executeThen(thenObj) {
    let hadChanges = false;

    for (const [targetId, action] of Object.entries(thenObj)) {
      if (targetId === 'message') {
        // Hier wird die Meldung ausgegeben, z.B. HUD, Tooltip oder Konsole
        console.log(`💬 PUZZLE-MELDUNG: ${action}`);
        if (this.onMessage) this.onMessage(action); // optional Callback
        continue;
      }
            
      // Schalter?   
      const sw = this.switchesById[targetId];
      if (sw) {
        const oldState = sw.isOn;
        
        switch (action) {
          case 'on':
            if (!sw.isOn) {
              sw.isOn = true;
              sw.animProgress = 0;
              hadChanges = true;
              console.log(`  → ${targetId} AN gesetzt`);
            }
            break;
          
          case 'off':
            if (sw.isOn) {
              sw.isOn = false;
              sw.animProgress = 0;
              hadChanges = true;
              console.log(`  → ${targetId} AUS gesetzt`);
            }
            break;
          
          case 'toggle':
            sw.isOn = !sw.isOn;
            sw.animProgress = 0;
            hadChanges = true;
            console.log(`  → ${targetId} getoggled`);
            break;
        }
        continue;
      }

      // Tür?
      const door = this.secretDoors.find(d => d.id === targetId);
      if (door) {
        switch (action) {
          case 'open':
            if (!door.isOpen) {
              door.open();
              console.log(`  → Tür ${targetId} geöffnet`);
            }
            break;
          
          case 'close':
            if (door.isOpen) {
              door.isOpen = false;
              door.openProgress = 0;
              console.log(`  → Tür ${targetId} geschlossen`);
            }
            break;
          
          case 'toggle':
            if (door.isOpen) {
              door.isOpen = false;
              door.openProgress = 0;
            } else {
              door.open();
            }
            console.log(`  → Tür ${targetId} getoggled`);
            break;
        }
      }
    }

    return hadChanges;
  }

  // Prüft ob Puzzle gelöst ist
  checkSolved() {
    let isSolved = false;

    const allSwitches = Object.values(this.switchesById);

    switch (this.solvedWhen) {
      case 'allOn':
        isSolved = allSwitches.every(sw => sw.isOn);
        break;

      case 'allOff':
        isSolved = allSwitches.every(sw => !sw.isOn);
        break;

      case 'anyOn':
        isSolved = allSwitches.some(sw => sw.isOn);
        break;

      default:
        // Custom Condition
        isSolved = this._evaluateWhen(this.solvedWhen);
    }

    if (isSolved && !this.wasSolved) {
      console.log(`🎉 PUZZLE GELÖST!`);
      this.wasSolved = true;
      this.triggerSolvedEvents();
    } else if (!isSolved && this.wasSolved) {
      console.log(`⚠️ Puzzle nicht mehr gelöst`);
      this.wasSolved = false;
    }

    return isSolved;
  }

  // Führt onSolved Events aus
  triggerSolvedEvents() {
    // Türen öffnen
    if (this.onSolved.openDoors) {
      for (const doorId of this.onSolved.openDoors) {
        const door = this.secretDoors.find(d => d.id === doorId);
        if (door && !door.isOpen) {
          door.open();
          console.log(`🚪 Tür ${doorId} durch Puzzle geöffnet`);
        }
      }
    }

    // Einzelne Tür (alt)
    if (this.onSolved.openDoor) {
      const door = this.secretDoors.find(d => d.id === this.onSolved.openDoor);
      if (door && !door.isOpen) {
        door.open();
        console.log(`🚪 Tür ${this.onSolved.openDoor} durch Puzzle geöffnet`);
      }
    }
  }

  isSolved() {
    return this.wasSolved;
  }
}
