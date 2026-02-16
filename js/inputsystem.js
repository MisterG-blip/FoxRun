// ============================================================================
// INPUT SYSTEM
// Einheitliches Input-System für Keyboard & Touch
// ============================================================================

class InputSystem {
  constructor() {
    // Zentrale Input-Flags (Quelle egal!)
    this.state = {
      moveLeft:  false,
      moveRight: false,
      jump:      false,
      crouch:    false,
      interact:  false,
      sniff:     false   // F-Taste / 🐾-Button
    };
    
    // Touch-Tracking
    this.activeTouches = new Map();
    
    this.setupKeyboard();
    this.setupTouch();
  }

  // ========================================================================
  // KEYBOARD INPUT
  // ========================================================================
  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      switch(e.key.toLowerCase()) {
        case 'a':
        case 'arrowleft':
          this.state.moveLeft = true;
          break;
        case 'd':
        case 'arrowright':
          this.state.moveRight = true;
          break;
        case 'w':
        case 'arrowup':
        case ' ':
        case 'spacebar':
          this.state.jump = true;
          e.preventDefault();
          break;
        case 's':
        case 'arrowdown':
        case 'c':
          this.state.crouch = true;
          break;
        case 'e':
        case 'enter':
          this.state.interact = true;
          e.preventDefault();
          break;
        case 'f':
          this.state.sniff = true;
          break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch(e.key.toLowerCase()) {
        case 'a':
        case 'arrowleft':
          this.state.moveLeft = false;
          break;
        case 'd':
        case 'arrowright':
          this.state.moveRight = false;
          break;
        case 'w':
        case 'arrowup':
        case ' ':
        case 'spacebar':
          this.state.jump = false;
          break;
        case 's':
        case 'arrowdown':
        case 'c':
          this.state.crouch = false;
          break;
        case 'e':
        case 'enter':
          this.state.interact = false;
          break;
        case 'f':
          this.state.sniff = false;
          break;
      }
    });
  }

  // ========================================================================
  // TOUCH INPUT (Mobile)
  // ========================================================================
  setupTouch() {
    // Touch Controls Buttons
    const setupButton = (id, action) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleTouchAction(action, true);
      }, { passive: false });
      
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.handleTouchAction(action, false);
      }, { passive: false });
      
      btn.addEventListener('touchcancel', (e) => {
        this.handleTouchAction(action, false);
      });
    };

    // D-Pad Buttons
    document.querySelectorAll('#touchDpad .touch-btn').forEach(btn => {
      const action = btn.dataset.action;
      if (action) {
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.handleTouchAction(action === 'down' ? 'crouch' : action, true);
        }, { passive: false });
        
        btn.addEventListener('touchend', (e) => {
          e.preventDefault();
          this.handleTouchAction(action === 'down' ? 'crouch' : action, false);
        }, { passive: false });
        
        btn.addEventListener('touchcancel', (e) => {
          this.handleTouchAction(action === 'down' ? 'crouch' : action, false);
        });
      }
    });

    // Action Buttons
    setupButton('touchJump', 'jump');
    setupButton('touchInteract', 'sniff');
  }

  handleTouchAction(action, pressed) {
    switch(action) {
      case 'left':
        this.state.moveLeft = pressed;
        break;
      case 'right':
        this.state.moveRight = pressed;
        break;
      case 'jump':
        this.state.jump = pressed;
        break;
      case 'crouch':
        this.state.crouch = pressed;
        break;
      case 'interact':
        this.state.interact = pressed;
        break;
      case 'sniff':
        this.state.sniff = pressed;
        break;
    }
  }

  // ========================================================================
  // TOUCH BUTTONS UI
  // ========================================================================
  createTouchButtons() {
    // Check if already exists
    if (document.getElementById('touchControls')) return;
    
    const container = document.createElement('div');
    container.id = 'touchControls';
    container.className = 'touch-controls';
    
    container.innerHTML = `
      <div class="touch-dpad">
        <button class="touch-btn touch-left"  data-action="left">◀</button>
        <button class="touch-btn touch-right" data-action="right">▶</button>
      </div>
      <div class="touch-actions">
        <button class="touch-btn touch-crouch" data-action="crouch">↓</button>
        <button class="touch-btn touch-sniff"  data-action="sniff">🐾</button>
        <button class="touch-btn touch-jump"   data-action="jump">↑</button>
      </div>
    `;
    
    document.getElementById('gameContainer').appendChild(container);
    
    // Hide on desktop, show on touch devices
    if (!('ontouchstart' in window)) {
      container.style.display = 'none';
    }
    
    return container;
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================
  
  // Prüft ob Taste gerade gedrückt wurde (für einmalige Aktionen)
  isPressed(action) {
    return this.state[action];
  }

  // Reset all inputs (z.B. bei Pause)
  reset() {
    for (let key in this.state) {
      this.state[key] = false;
    }
    this.activeTouches.clear();
  }
}
