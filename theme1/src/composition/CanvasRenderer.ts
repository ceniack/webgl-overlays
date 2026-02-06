/**
 * CanvasRenderer - Core grid adapter for the 1920x1080 canvas overlay
 * Fetches layout JSON, configures CSS Grid container, creates cell wrappers,
 * and mounts components via ComponentComposer.
 */

import type { CanvasLayout, CanvasCell } from '../types/canvas';
import { ComponentComposer } from './ComponentComposer';
import { logger } from '../js/Logger';

const canvasLogger = logger.createChildLogger('CanvasRenderer');

/**
 * Scaffold HTML for each component type.
 * Each component expects specific DOM structure inside its container.
 * These scaffolds replicate what overlay.html provides, scoped per cell.
 */
const COMPONENT_SCAFFOLDS: Record<string, (cellId: string) => string> = {
  BroadcasterInfo: (cellId) => `
    <div class="section branding-section">
      <div class="section-header">
        <span class="live-indicator"></span>
        Live Now
      </div>
      <div class="section-content">
        <div class="profile-area">
          <div class="profile-image-container">
            <img class="profile-image" id="profile-image" src="" alt="">
            <span class="profile-fallback" id="profile-fallback"></span>
          </div>
          <div class="profile-info">
            <div class="profile-name" id="profile-name"></div>
            <div class="profile-link" id="profile-link"></div>
          </div>
        </div>
      </div>
    </div>`,

  CounterCarousel: (cellId) => `
    <div class="section counters-section">
      <div class="section-header">
        Stats
        <div class="carousel-indicators" id="carousel-indicators"></div>
      </div>
      <div class="section-content" id="stats-carousel-container"></div>
    </div>`,

  HealthMonitor: (cellId) => `
    <div class="section heart-rate-section">
      <div class="section-header">Vitals</div>
      <div class="section-content">
        <div id="heart-rate-monitor" class="heart-rate-container">
          <div class="heart-rate-graph">
            <div class="heart-rate-monitor">
              <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
                   width="200px" height="60px" viewBox="0 0 200 60">
                <polyline fill="none" stroke="var(--primary)" stroke-width="2"
                          stroke-miterlimit="10"
                          points="0,37 21,37 25,34 29,37 33,37 37,37 42,39 46,37 50,15 54,44 58,37 62,37 71,33 79,37 83,37 104,37 108,34 112,37 117,37 121,37 125,39 129,37 133,15 137,44 142,37 146,37 154,33 162,37 167,37 200,37"/>
              </svg>
              <div class="fade-in"></div>
              <div class="fade-out"></div>
            </div>
          </div>
          <div class="heart-rate-display">
            <div class="heart-rate-value" id="heart-rate-value">--</div>
            <div class="heart-rate-label">BPM</div>
          </div>
          <div class="heart-rate-status" id="heart-rate-status">Waiting for data...</div>
        </div>
      </div>
    </div>`,

  LatestEvent: (cellId) => `
    <div class="section latest-event-section">
      <div class="section-header">Latest Event</div>
      <div class="section-content"></div>
    </div>`,

  AlertFeed: (cellId) => `
    <div class="section alert-feed-section">
      <div class="section-header">Alerts</div>
      <div class="section-content alerts-overlay"></div>
    </div>`,

  Webcam: (cellId) => `
    <div class="section webcam-section">
      <div class="webcam-placeholder">
        <div class="webcam-placeholder-label">CAM</div>
      </div>
    </div>`,
};

/**
 * Maps component name to the CSS selector path used to find
 * the component's container element within a cell.
 */
const COMPONENT_SELECTORS: Record<string, string> = {
  BroadcasterInfo: '.branding-section',
  CounterCarousel: '.counters-section',
  HealthMonitor: '.heart-rate-section',
  LatestEvent: '.latest-event-section',
  AlertFeed: '.alert-feed-section',
  Webcam: '.webcam-section',
};

export class CanvasRenderer {
  private gridElement: HTMLElement;
  private layout: CanvasLayout | null = null;
  private composer: ComponentComposer;
  private layoutName: string;

  constructor(gridElement: HTMLElement, composer: ComponentComposer, layoutName = 'default-canvas') {
    this.gridElement = gridElement;
    this.composer = composer;
    this.layoutName = layoutName;
  }

  async initialize(): Promise<void> {
    canvasLogger.info(`Initializing canvas with layout: ${this.layoutName}`);

    // Fetch layout JSON
    this.layout = await this.fetchLayout(this.layoutName);
    if (!this.layout) {
      canvasLogger.error('Failed to load canvas layout');
      return;
    }

    // Configure CSS Grid custom properties
    this.configureGrid(this.layout);

    // Enable debug grid if requested
    this.setupDebugMode();

    // Build cells and mount components
    await this.buildCells(this.layout);

    canvasLogger.info(`Canvas initialized with ${this.layout.cells.length} cells`);
  }

  private async fetchLayout(name: string): Promise<CanvasLayout | null> {
    try {
      const response = await fetch(`/api/canvas-layout/${name}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json() as CanvasLayout;
    } catch (error) {
      canvasLogger.error(`Failed to fetch layout '${name}':`, error);
      return null;
    }
  }

  private configureGrid(layout: CanvasLayout): void {
    const { grid } = layout;
    this.gridElement.style.setProperty('--canvas-cols', String(grid.cols));
    this.gridElement.style.setProperty('--canvas-rows', String(grid.rows));
    if (grid.gap > 0) {
      this.gridElement.style.setProperty('--canvas-gap', `${grid.gap}px`);
    }
    canvasLogger.debug(`Grid configured: ${grid.cols}x${grid.rows}, gap: ${grid.gap}px`);
  }

  private setupDebugMode(): void {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'grid') {
      this.gridElement.classList.add('show-grid');
      canvasLogger.info('Debug grid mode enabled');
    }
  }

  private async buildCells(layout: CanvasLayout): Promise<void> {
    for (const cell of layout.cells) {
      try {
        await this.buildCell(cell);
      } catch (error) {
        canvasLogger.error(`Failed to build cell '${cell.id}':`, error);
      }
    }
  }

  private async buildCell(cell: CanvasCell): Promise<HTMLElement | null> {
    const scaffold = COMPONENT_SCAFFOLDS[cell.component];
    if (!scaffold) {
      canvasLogger.warn(`No scaffold defined for component '${cell.component}', skipping cell '${cell.id}'`);
      return null;
    }

    // Create the cell wrapper element
    const cellElement = document.createElement('div');
    cellElement.className = 'canvas-cell';
    cellElement.id = `canvas-cell-${cell.id}`;
    cellElement.setAttribute('data-component', cell.component);

    // Set CSS custom properties for grid placement (0-based JSON → 1-based CSS handled in CSS)
    cellElement.style.setProperty('--x', String(cell.x));
    cellElement.style.setProperty('--y', String(cell.y));
    cellElement.style.setProperty('--w', String(cell.w));
    cellElement.style.setProperty('--h', String(cell.h));
    if (cell.z !== undefined) {
      cellElement.style.setProperty('--z', String(cell.z));
    }
    if (cell.visible === false) {
      cellElement.setAttribute('data-visible', 'false');
    }

    // Add debug outline if in debug mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'grid') {
      cellElement.classList.add('show-outline');
    }

    // Create inner container with scaffold HTML
    const inner = document.createElement('div');
    inner.className = 'canvas-cell-inner';
    inner.innerHTML = scaffold(cell.id);
    cellElement.appendChild(inner);

    // Add cell to grid
    this.gridElement.appendChild(cellElement);

    // Find the component's container selector within this cell
    const selector = COMPONENT_SELECTORS[cell.component];
    if (!selector) {
      canvasLogger.warn(`No selector defined for component '${cell.component}'`);
      return cellElement;
    }

    const componentContainer = cellElement.querySelector(selector) as HTMLElement;
    if (!componentContainer) {
      canvasLogger.error(`Container '${selector}' not found in cell '${cell.id}'`);
      return cellElement;
    }

    // Mount the component via ComponentComposer
    try {
      const component = await this.composer.addComponent({
        name: cell.component,
        path: `#canvas-cell-${cell.id} ${selector}`,
        data: cell.config as any
      });
      await component.initialize();
      canvasLogger.debug(`Component '${cell.component}' mounted in cell '${cell.id}'`);
    } catch (error) {
      canvasLogger.error(`Failed to mount '${cell.component}' in cell '${cell.id}':`, error);
    }

    return cellElement;
  }

  /** Add a new cell to the canvas and mount its component */
  async addCell(cell: CanvasCell): Promise<HTMLElement | null> {
    if (!this.layout) {
      canvasLogger.error('Cannot add cell: no layout loaded');
      return null;
    }

    this.layout.cells.push(cell);

    try {
      const element = await this.buildCell(cell);
      canvasLogger.info(`Cell '${cell.id}' added (${cell.component})`);
      return element;
    } catch (error) {
      canvasLogger.error(`Failed to add cell '${cell.id}':`, error);
      // Remove from layout on failure
      this.layout.cells = this.layout.cells.filter(c => c.id !== cell.id);
      return null;
    }
  }

  /** Remove a cell from the canvas */
  removeCell(cellId: string): void {
    if (!this.layout) return;

    const el = document.getElementById(`canvas-cell-${cellId}`);
    if (el) {
      el.remove();
    }

    this.layout.cells = this.layout.cells.filter(c => c.id !== cellId);
    canvasLogger.info(`Cell '${cellId}' removed`);
  }

  /** Get the current layout data for debugging */
  getLayout(): CanvasLayout | null {
    return this.layout;
  }

  /** Print debug info to console */
  debug(): void {
    if (!this.layout) {
      canvasLogger.info('No layout loaded');
      return;
    }

    canvasLogger.info('=== Canvas Debug Info ===');
    canvasLogger.info(`Layout: ${this.layout.meta.name} v${this.layout.meta.version}`);
    canvasLogger.info(`Grid: ${this.layout.grid.cols}x${this.layout.grid.rows} (${this.layout.grid.width}x${this.layout.grid.height}px)`);
    canvasLogger.info(`Cells: ${this.layout.cells.length}`);
    for (const cell of this.layout.cells) {
      const vis = cell.visible !== false ? 'visible' : 'hidden';
      canvasLogger.info(`  - ${cell.id}: ${cell.component} at (${cell.x},${cell.y}) ${cell.w}x${cell.h} [${vis}]`);
    }
  }
}
