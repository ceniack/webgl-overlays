/**
 * Canvas Editor — drag-and-drop visual editor for 1920x1080 canvas overlay
 * Plain JS, runs outside Vite bundle. Depends on interact.js and window.canvasRenderer.
 */

(function () {
  'use strict';

  // --- Constants ---
  var CELL_SIZE = 40;  // 1920/48
  var GRID_COLS = 48;
  var GRID_ROWS = 27;

  // Read layout name from URL query param (survives page reloads)
  function getLayoutFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('canvasLayout') || 'default-canvas';
  }

  function setLayoutInURL(name) {
    var url = new URL(window.location);
    url.searchParams.set('canvasLayout', name);
    window.history.replaceState(null, '', url);
  }

  var AVAILABLE_COMPONENTS = [
    { name: 'BroadcasterInfo', label: 'Broadcaster Info', description: 'Profile display with live indicator', defaultW: 20, defaultH: 5 },
    { name: 'CounterCarousel', label: 'Counter Carousel', description: 'Rotating stat counters', defaultW: 12, defaultH: 5 },
    { name: 'HealthMonitor', label: 'Health Monitor', description: 'Heart rate / ECG waveform', defaultW: 14, defaultH: 5 },
    { name: 'LatestEvent', label: 'Latest Event', description: 'Latest follower/sub/cheer display', defaultW: 10, defaultH: 3 },
    { name: 'AlertFeed', label: 'Alert Feed', description: 'Multi-alert notification stack', defaultW: 12, defaultH: 8 },
    { name: 'Webcam', label: 'Webcam', description: 'Camera feed placeholder (transparent)', defaultW: 12, defaultH: 8 }
  ];

  // --- State ---
  var selectedCell = null;
  var currentLayoutName = getLayoutFromURL();
  var cellCounter = 0;

  // --- Helpers ---
  function $(id) { return document.getElementById(id); }

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  function getCellVars(el) {
    var s = el.style;
    return {
      x: parseInt(s.getPropertyValue('--x')) || 0,
      y: parseInt(s.getPropertyValue('--y')) || 0,
      w: parseInt(s.getPropertyValue('--w')) || 1,
      h: parseInt(s.getPropertyValue('--h')) || 1,
      z: parseInt(s.getPropertyValue('--z')) || 1
    };
  }

  function setCellVar(el, name, value) {
    el.style.setProperty('--' + name, String(value));
  }

  // --- Scale canvas to fit viewport ---
  function fitCanvasToViewport() {
    var viewport = $('editor-viewport');
    var grid = $('canvas-grid');
    if (!viewport || !grid) return;

    var vw = viewport.clientWidth;
    var vh = viewport.clientHeight;
    var scale = Math.min(vw / 1920, vh / 1080) * 0.92;
    grid.style.transform = 'scale(' + scale + ')';
    grid.style.transformOrigin = 'center center';
  }

  // --- interact.js wiring ---
  function makeInteractive(cellEl) {
    cellEl.classList.add('editor-cell');

    // Add label badge
    var comp = cellEl.getAttribute('data-component') || '?';
    var label = document.createElement('div');
    label.className = 'editor-cell-label';
    label.textContent = comp;
    cellEl.appendChild(label);

    // Calculate the current scale factor from the canvas transform
    function getScale() {
      var grid = $('canvas-grid');
      if (!grid) return 1;
      var transform = window.getComputedStyle(grid).transform;
      if (!transform || transform === 'none') return 1;
      // matrix(a, b, c, d, tx, ty) — a is the scaleX
      var match = transform.match(/matrix\(([^,]+)/);
      return match ? parseFloat(match[1]) : 1;
    }

    cellEl._wasDragged = false;

    interact(cellEl)
      .draggable({
        listeners: {
          start: function () {
            cellEl._wasDragged = false;
            cellEl.classList.add('editor-dragging');
          },
          move: function (event) {
            var scale = getScale();
            var vars = getCellVars(cellEl);

            // Accumulate sub-cell pixel movement
            var accX = (cellEl._dragAccX || 0) + event.dx / scale;
            var accY = (cellEl._dragAccY || 0) + event.dy / scale;

            var dCols = Math.round(accX / CELL_SIZE);
            var dRows = Math.round(accY / CELL_SIZE);

            if (dCols !== 0 || dRows !== 0) {
              cellEl._wasDragged = true;
              var newX = clamp(vars.x + dCols, 0, GRID_COLS - vars.w);
              var newY = clamp(vars.y + dRows, 0, GRID_ROWS - vars.h);
              setCellVar(cellEl, 'x', newX);
              setCellVar(cellEl, 'y', newY);
              // Subtract consumed pixels
              accX -= dCols * CELL_SIZE;
              accY -= dRows * CELL_SIZE;
            }

            cellEl._dragAccX = accX;
            cellEl._dragAccY = accY;
          },
          end: function () {
            cellEl.classList.remove('editor-dragging');
            cellEl._dragAccX = 0;
            cellEl._dragAccY = 0;
            syncCellToSelection(cellEl);
          }
        }
      })
      .resizable({
        edges: { bottom: true, right: true },
        listeners: {
          start: function () {
            cellEl.classList.add('editor-resizing');
          },
          move: function (event) {
            var scale = getScale();
            var vars = getCellVars(cellEl);

            var newW = Math.max(1, Math.round(event.rect.width / scale / CELL_SIZE));
            var newH = Math.max(1, Math.round(event.rect.height / scale / CELL_SIZE));

            // Clamp to grid bounds
            newW = clamp(newW, 1, GRID_COLS - vars.x);
            newH = clamp(newH, 1, GRID_ROWS - vars.y);

            setCellVar(cellEl, 'w', newW);
            setCellVar(cellEl, 'h', newH);
          },
          end: function () {
            cellEl.classList.remove('editor-resizing');
            syncCellToSelection(cellEl);
          }
        }
      });

    // Click to select (but not on drag)
    cellEl.addEventListener('click', function (e) {
      if (!cellEl._wasDragged) {
        selectCell(cellEl);
      }
    });
  }

  // --- Selection ---
  function selectCell(cellEl) {
    deselectAll();
    selectedCell = cellEl;
    cellEl.classList.add('editor-selected');
    updatePropertiesPanel(cellEl);
    $('editor-properties').classList.add('open');
  }

  function deselectAll() {
    if (selectedCell) {
      selectedCell.classList.remove('editor-selected');
    }
    selectedCell = null;
    $('editor-properties').classList.remove('open');
  }

  function syncCellToSelection(cellEl) {
    if (selectedCell === cellEl) {
      updatePropertiesPanel(cellEl);
    }
  }

  // --- Properties Panel ---
  function updatePropertiesPanel(cellEl) {
    var vars = getCellVars(cellEl);
    var cellId = cellEl.id.replace('canvas-cell-', '');
    var comp = cellEl.getAttribute('data-component') || '';
    var visible = cellEl.getAttribute('data-visible') !== 'false';

    $('prop-id').value = cellId;
    $('prop-component').value = comp;
    $('prop-x').value = vars.x;
    $('prop-y').value = vars.y;
    $('prop-w').value = vars.w;
    $('prop-h').value = vars.h;
    $('prop-z').value = vars.z;
    $('prop-visible').checked = visible;
  }

  function applyPropertyChange() {
    if (!selectedCell) return;

    var x = clamp(parseInt($('prop-x').value) || 0, 0, GRID_COLS - 1);
    var y = clamp(parseInt($('prop-y').value) || 0, 0, GRID_ROWS - 1);
    var w = clamp(parseInt($('prop-w').value) || 1, 1, GRID_COLS - x);
    var h = clamp(parseInt($('prop-h').value) || 1, 1, GRID_ROWS - y);
    var z = clamp(parseInt($('prop-z').value) || 1, 0, 100);
    var visible = $('prop-visible').checked;

    setCellVar(selectedCell, 'x', x);
    setCellVar(selectedCell, 'y', y);
    setCellVar(selectedCell, 'w', w);
    setCellVar(selectedCell, 'h', h);
    setCellVar(selectedCell, 'z', z);

    if (visible) {
      selectedCell.removeAttribute('data-visible');
      selectedCell.style.display = '';
    } else {
      selectedCell.setAttribute('data-visible', 'false');
      // In editor, show hidden cells dimmed instead of display:none
      selectedCell.style.display = '';
      selectedCell.style.opacity = '0.3';
    }

    // Sync back cleaned values
    $('prop-x').value = x;
    $('prop-y').value = y;
    $('prop-w').value = w;
    $('prop-h').value = h;
    $('prop-z').value = z;
  }

  // --- Add / Delete cells ---
  function addCell(componentName) {
    var def = AVAILABLE_COMPONENTS.find(function (c) { return c.name === componentName; });
    if (!def) return;

    cellCounter++;
    var cellId = componentName.toLowerCase() + '-' + cellCounter;

    var cell = {
      id: cellId,
      component: componentName,
      x: 0,
      y: 0,
      w: def.defaultW,
      h: def.defaultH,
      z: 1,
      visible: true
    };

    var renderer = window.canvasRenderer;
    if (!renderer) {
      console.error('canvasRenderer not available');
      return;
    }

    renderer.addCell(cell).then(function (el) {
      if (el) {
        // Override display:none from data-visible CSS rule (canvas-editor shows all cells)
        el.style.display = '';
        makeInteractive(el);
        selectCell(el);
      }
    });
  }

  function deleteSelectedCell() {
    if (!selectedCell) return;

    var cellId = selectedCell.id.replace('canvas-cell-', '');

    // Unset interact.js
    interact(selectedCell).unset();

    var renderer = window.canvasRenderer;
    if (renderer) {
      renderer.removeCell(cellId);
    } else {
      selectedCell.remove();
    }

    selectedCell = null;
    $('editor-properties').classList.remove('open');
  }

  // --- Build layout JSON from DOM ---
  function buildLayoutJSON() {
    var cells = [];
    var cellEls = document.querySelectorAll('#canvas-grid .canvas-cell');

    cellEls.forEach(function (el) {
      var vars = getCellVars(el);
      var cellId = el.id.replace('canvas-cell-', '');
      var comp = el.getAttribute('data-component') || '';
      var visible = el.getAttribute('data-visible') !== 'false';

      cells.push({
        id: cellId,
        component: comp,
        x: vars.x,
        y: vars.y,
        w: vars.w,
        h: vars.h,
        z: vars.z,
        visible: visible
      });
    });

    return {
      meta: {
        name: currentLayoutName,
        version: 1,
        description: 'Layout created with Canvas Editor'
      },
      grid: {
        cols: GRID_COLS,
        rows: GRID_ROWS,
        width: 1920,
        height: 1080,
        gap: 0
      },
      ultrawide: null,
      cells: cells
    };
  }

  // --- Save / Load ---
  function saveLayout(name) {
    var json = buildLayoutJSON();
    json.meta.name = name;

    fetch('/api/canvas-layout/' + encodeURIComponent(name), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.success) {
        currentLayoutName = name;
        setLayoutInURL(name);
        console.log('Layout saved:', name);
        loadLayoutList();
      } else {
        alert('Save failed: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(function (err) {
      alert('Save error: ' + err.message);
    });
  }

  function deleteLayout(name) {
    fetch('/api/canvas-layout/' + encodeURIComponent(name), { method: 'DELETE' })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.success) {
        console.log('Layout deleted:', name);
        var url = new URL(window.location);
        url.searchParams.set('canvasLayout', 'default-canvas');
        window.location.href = url.toString();
      } else {
        alert('Delete failed: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(function (err) {
      alert('Delete error: ' + err.message);
    });
  }

  function loadLayoutList() {
    fetch('/api/canvas-layouts')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var sel = $('layout-selector');
      sel.innerHTML = '';
      (data.layouts || []).forEach(function (name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === currentLayoutName) opt.selected = true;
        sel.appendChild(opt);
      });
    });
  }

  // --- Palette ---
  function buildPalette() {
    var list = $('palette-list');
    AVAILABLE_COMPONENTS.forEach(function (comp) {
      var card = document.createElement('div');
      card.className = 'palette-card';
      card.innerHTML =
        '<div class="palette-card-name">' + comp.label + '</div>' +
        '<div class="palette-card-desc">' + comp.description + '</div>' +
        '<div class="palette-card-size">' + comp.defaultW + '×' + comp.defaultH + ' cells</div>';
      card.addEventListener('click', function () {
        addCell(comp.name);
      });
      list.appendChild(card);
    });
  }

  // --- Grid toggle ---
  function toggleGrid() {
    var grid = $('canvas-grid');
    if (grid) {
      grid.classList.toggle('show-grid');
    }
  }

  // --- Wire toolbar ---
  function wireToolbar() {
    $('btn-grid-toggle').addEventListener('click', toggleGrid);

    $('btn-add-component').addEventListener('click', function () {
      $('editor-palette').classList.toggle('open');
    });

    $('btn-close-palette').addEventListener('click', function () {
      $('editor-palette').classList.remove('open');
    });

    $('btn-close-properties').addEventListener('click', function () {
      deselectAll();
    });

    $('btn-save').addEventListener('click', function () {
      saveLayout(currentLayoutName);
    });

    $('btn-save-as').addEventListener('click', function () {
      var name = prompt('Layout name:', 'my-layout');
      if (name && /^[a-zA-Z0-9_-]+$/.test(name)) {
        saveLayout(name);
      } else if (name) {
        alert('Invalid name. Use only letters, numbers, hyphens, and underscores.');
      }
    });

    $('btn-delete-layout').addEventListener('click', function () {
      if (currentLayoutName === 'default-canvas') {
        alert('Cannot delete the default-canvas layout.');
        return;
      }
      if (confirm('Delete layout "' + currentLayoutName + '"?')) {
        deleteLayout(currentLayoutName);
      }
    });

    $('btn-delete-cell').addEventListener('click', function () {
      deleteSelectedCell();
    });

    // Layout selector change — navigate with canvasLayout param so it persists
    $('layout-selector').addEventListener('change', function () {
      var name = this.value;
      if (name !== currentLayoutName) {
        var url = new URL(window.location);
        url.searchParams.set('canvasLayout', name);
        window.location.href = url.toString();
      }
    });

    // Property inputs
    ['prop-x', 'prop-y', 'prop-w', 'prop-h', 'prop-z'].forEach(function (id) {
      $(id).addEventListener('change', applyPropertyChange);
    });
    $('prop-visible').addEventListener('change', applyPropertyChange);

    // Click on empty canvas area to deselect
    $('editor-viewport').addEventListener('mousedown', function (e) {
      if (e.target === $('editor-viewport') || e.target === $('canvas-grid')) {
        deselectAll();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Delete' && selectedCell && document.activeElement.tagName !== 'INPUT') {
        deleteSelectedCell();
      }
      if (e.key === 'Escape') {
        deselectAll();
        $('editor-palette').classList.remove('open');
      }
    });
  }

  // --- Initialize ---
  function init() {
    console.log('[Canvas Editor] Initializing...');

    // Make existing cells interactive
    var cells = document.querySelectorAll('#canvas-grid .canvas-cell');
    cells.forEach(function (cell) {
      // Override display:none for hidden cells in editor mode
      cell.style.display = '';
      if (cell.getAttribute('data-visible') === 'false') {
        cell.style.opacity = '0.3';
      }
      makeInteractive(cell);
    });

    // Count existing cells for unique ID generation
    cellCounter = cells.length;

    // Build palette
    buildPalette();

    // Wire toolbar buttons
    wireToolbar();

    // Load layout list
    loadLayoutList();

    // Fit canvas to viewport
    fitCanvasToViewport();
    window.addEventListener('resize', fitCanvasToViewport);

    // Enable grid lines by default in editor
    var grid = $('canvas-grid');
    if (grid) {
      grid.classList.add('show-grid');
    }

    console.log('[Canvas Editor] Ready — ' + cells.length + ' cells loaded');
  }

  // Wait for streamoverlay:ready (fired after CanvasRenderer has built all cells)
  window.addEventListener('streamoverlay:ready', function () {
    // Small delay so DOM is fully settled
    setTimeout(init, 100);
  });
})();
