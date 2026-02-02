import type { EventType, EventMap, EventHandler } from '../types/events';
import { logger } from './Logger';

const eventLogger = logger.createChildLogger('EventBus');

class StreamOverlayEventBus {
  private listeners: Map<EventType, Set<EventHandler<any>>> = new Map();
  private eventHistory: Array<{ type: EventType; data: any; timestamp: number }> = [];
  private maxHistorySize: number = 100;

  on<T extends EventType>(eventType: T, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(handler);
    eventLogger.debug(`Listener registered for event: ${eventType}`);

    return () => this.off(eventType, handler);
  }

  off<T extends EventType>(eventType: T, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      eventLogger.debug(`Listener removed for event: ${eventType}`);
      
      if (handlers.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  emit<T extends EventType>(eventType: T, data: EventMap[T]): void {
    eventLogger.debug(`Event emitted: ${eventType}`, data);

    this.addToHistory(eventType, data);

    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          eventLogger.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    } else {
      eventLogger.debug(`No listeners for event: ${eventType}`);
    }
  }

  once<T extends EventType>(eventType: T, handler: EventHandler<T>): () => void {
    const wrappedHandler = (data: EventMap[T]) => {
      handler(data);
      this.off(eventType, wrappedHandler as EventHandler<T>);
    };

    return this.on(eventType, wrappedHandler as EventHandler<T>);
  }

  private addToHistory(eventType: EventType, data: any): void {
    this.eventHistory.push({
      type: eventType,
      data,
      timestamp: Date.now()
    });

    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  getEventHistory(eventType?: EventType): Array<{ type: EventType; data: any; timestamp: number }> {
    if (eventType) {
      return this.eventHistory.filter(event => event.type === eventType);
    }
    return [...this.eventHistory];
  }

  clearEventHistory(): void {
    this.eventHistory = [];
    eventLogger.debug('Event history cleared');
  }

  getListenerCount(eventType?: EventType): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size || 0;
    }
    
    let total = 0;
    this.listeners.forEach(handlers => {
      total += handlers.size;
    });
    return total;
  }

  getAllEventTypes(): EventType[] {
    return Array.from(this.listeners.keys());
  }

  clear(): void {
    this.listeners.clear();
    this.clearEventHistory();
    eventLogger.info('EventBus cleared');
  }
}

export const eventBus = new StreamOverlayEventBus();

if (typeof window !== 'undefined') {
  (window as any).eventBus = eventBus;
  
  (window as any).debugEventBus = () => {
    eventLogger.group('EventBus Debug Info');
    eventLogger.info(`Total listeners: ${eventBus.getListenerCount()}`);
    eventLogger.info(`Event types: ${eventBus.getAllEventTypes().join(', ')}`);
    eventLogger.info(`Event history size: ${eventBus.getEventHistory().length}`);
    
    eventBus.getAllEventTypes().forEach(type => {
      eventLogger.info(`  ${type}: ${eventBus.getListenerCount(type)} listeners`);
    });
    
    eventLogger.groupEnd();
  };
}
