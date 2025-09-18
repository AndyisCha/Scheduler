// src/components/SlotManager.tsx
// Slot management UI component

import React, { useState, useEffect } from 'react';
import type { SlotConfig } from '../types/scheduler';
import { slotManager } from '../store/slots';
import { useTranslation } from '../store/i18n';

interface SlotManagerProps {
  onSlotChange?: (slot: SlotConfig | null) => void;
}

export const SlotManager: React.FC<SlotManagerProps> = ({ onSlotChange }) => {
  const { t } = useTranslation();
  const [slots, setSlots] = useState<SlotConfig[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newSlotName, setNewSlotName] = useState('');

  const loadSlots = () => {
    const allSlots = slotManager.getAllSlots();
    const activeId = slotManager.getActiveSlotId();
    setSlots(allSlots);
    setActiveSlotId(activeId);
  };

  useEffect(() => {
    slotManager.initializeWithDefault();
    loadSlots();
  }, []);

  useEffect(() => {
    const activeSlot = slotManager.getActiveSlot();
    onSlotChange?.(activeSlot);
  }, [activeSlotId, onSlotChange]);

  const handleCreateSlot = () => {
    if (!newSlotName.trim()) return;

    const defaultSlot = {
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

    const newConfig = slotManager.createSlot(newSlotName.trim(), defaultSlot);
    slotManager.setActiveSlot(newConfig.id);
    setNewSlotName('');
    setIsCreating(false);
    loadSlots();
  };

  const handleSelectSlot = (id: string) => {
    slotManager.setActiveSlot(id);
    loadSlots();
  };

  const handleDeleteSlot = (id: string) => {
    if (window.confirm('정말로 이 슬롯을 삭제하시겠습니까?')) {
      slotManager.deleteSlot(id);
      loadSlots();
    }
  };

  const activeSlot = slotManager.getActiveSlot();

  return (
    <div className="bg-primary rounded-lg shadow-theme-md p-lg transition-theme">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-primary">{t('slotManager.title')}</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="btn-primary px-4 py-2 rounded-lg transition-theme"
        >
          {t('slotManager.createNew')}
        </button>
      </div>

      {/* Create new slot form */}
      {isCreating && (
        <div className="mb-4 p-4 border border-primary rounded-lg bg-secondary transition-theme">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSlotName}
              onChange={(e) => setNewSlotName(e.target.value)}
              placeholder={t('slotManager.slotNamePlaceholder')}
              className="input-theme flex-1 px-3 py-2 rounded-lg"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateSlot()}
            />
            <button
              onClick={handleCreateSlot}
              disabled={!newSlotName.trim()}
              className="px-4 py-2 bg-accent-success text-white rounded-lg hover:opacity-80 disabled:opacity-50 transition-theme"
            >
              {t('slotManager.create')}
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewSlotName('');
              }}
              className="btn-secondary px-4 py-2 rounded-lg transition-theme"
            >
              {t('slotManager.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Active slot display */}
      {activeSlot && (
        <div className="mb-4 p-4 bg-secondary border border-primary rounded-lg transition-theme">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-primary">{t('slotManager.activeSlot')}</h3>
              <p className="text-accent-primary">{activeSlot.name}</p>
              <p className="text-sm text-secondary">
                {t('slotManager.createdDate')}: {activeSlot.createdAt.toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-accent-primary">
                {t('slotManager.teacherPool')}: {activeSlot.slot.teachers.homeroomKoreanPool.length + activeSlot.slot.teachers.foreignPool.length}명
              </p>
              <p className="text-sm text-accent-primary">
                {t('slotManager.updatedDate')}: {activeSlot.updatedAt.toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Slots list */}
      <div className="space-y-2">
        {slots.length === 0 ? (
          <p className="text-tertiary text-center py-4">{t('slotManager.noSlots')}</p>
        ) : (
          slots.map((slot) => (
            <div
              key={slot.id}
              className={`flex justify-between items-center p-3 border rounded-lg cursor-pointer transition-theme ${
                slot.id === activeSlotId
                  ? 'border-accent-primary bg-secondary'
                  : 'border-primary hover:border-secondary'
              }`}
              onClick={() => handleSelectSlot(slot.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-primary">{slot.name}</h3>
                  {slot.id === activeSlotId && (
                    <span className="px-2 py-1 text-xs bg-accent-primary text-white rounded-full">
                      {t('slotManager.active')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-secondary">
                  {t('slotManager.teachers')}: {slot.slot.teachers.homeroomKoreanPool.length + slot.slot.teachers.foreignPool.length}명 | 
                  {t('slotManager.updated')}: {slot.updatedAt.toLocaleDateString('ko-KR')}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSlot(slot.id);
                }}
                className="px-3 py-1 text-sm bg-accent-error text-white rounded hover:opacity-80 transition-theme"
              >
                {t('common.delete')}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
