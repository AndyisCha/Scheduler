// src/store/slots.ts
// Slot management with localStorage persistence

import type { SlotConfig, SchedulerSlot } from '../types/scheduler';

const STORAGE_KEY = 'scheduler-slots';
const ACTIVE_SLOT_KEY = 'scheduler-active-slot';

export class SlotManager {
  private slots: Map<string, SlotConfig> = new Map();
  private activeSlotId: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const slotsData = localStorage.getItem(STORAGE_KEY);
      if (slotsData) {
        const parsed = JSON.parse(slotsData);
        this.slots = new Map(parsed.map((config: any) => [
          config.id,
          {
            ...config,
            createdAt: new Date(config.createdAt),
            updatedAt: new Date(config.updatedAt),
          }
        ]));
      }

      const activeSlotId = localStorage.getItem(ACTIVE_SLOT_KEY);
      if (activeSlotId && this.slots.has(activeSlotId)) {
        this.activeSlotId = activeSlotId;
      }
    } catch (error) {
      console.error('Failed to load slots from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const slotsArray = Array.from(this.slots.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slotsArray));
      
      if (this.activeSlotId) {
        localStorage.setItem(ACTIVE_SLOT_KEY, this.activeSlotId);
      } else {
        localStorage.removeItem(ACTIVE_SLOT_KEY);
      }
    } catch (error) {
      console.error('Failed to save slots to storage:', error);
    }
  }

  createSlot(name: string, slot: SchedulerSlot): SlotConfig {
    const id = `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const config: SlotConfig = {
      id,
      name,
      slot,
      createdAt: now,
      updatedAt: now,
    };

    this.slots.set(id, config);
    this.saveToStorage();
    return config;
  }

  updateSlot(id: string, updates: Partial<Pick<SlotConfig, 'name' | 'slot'>>): SlotConfig | null {
    const config = this.slots.get(id);
    if (!config) return null;

    const updatedConfig: SlotConfig = {
      ...config,
      ...updates,
      updatedAt: new Date(),
    };

    this.slots.set(id, updatedConfig);
    this.saveToStorage();
    return updatedConfig;
  }

  deleteSlot(id: string): boolean {
    if (!this.slots.has(id)) return false;
    
    this.slots.delete(id);
    
    if (this.activeSlotId === id) {
      this.activeSlotId = null;
    }
    
    this.saveToStorage();
    return true;
  }

  getSlot(id: string): SlotConfig | null {
    return this.slots.get(id) || null;
  }

  getAllSlots(): SlotConfig[] {
    return Array.from(this.slots.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  setActiveSlot(id: string): boolean {
    if (!this.slots.has(id)) return false;
    this.activeSlotId = id;
    this.saveToStorage();
    return true;
  }

  getActiveSlot(): SlotConfig | null {
    if (!this.activeSlotId) return null;
    return this.slots.get(this.activeSlotId) || null;
  }

  getActiveSlotId(): string | null {
    return this.activeSlotId;
  }

  clearActiveSlot(): void {
    this.activeSlotId = null;
    this.saveToStorage();
  }

  // Initialize with default slot if none exists
  initializeWithDefault(): void {
    if (this.slots.size === 0) {
      const defaultSlot: SchedulerSlot = {
        teachers: {
          homeroomKoreanPool: [],
          foreignPool: [],
          constraints: {},
        },
        globalOptions: {
          roundClassCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
          includeHInK: true,
          preferOtherHForK: false,
          disallowOwnHAsK: true
        },
      };

      const defaultConfig = this.createSlot('기본 슬롯', defaultSlot);
      this.setActiveSlot(defaultConfig.id);
    }
  }
}

// Singleton instance
export const slotManager = new SlotManager();
