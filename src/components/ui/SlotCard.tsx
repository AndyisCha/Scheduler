import React from 'react';
import { Card } from './Card';
import type { SlotConfig } from '../../engine/types';

interface SlotCardProps {
  slot: SlotConfig;
  onEdit: (slotId: string) => void;
  onDelete: (slotId: string) => void;
  isActive?: boolean;
}

export const SlotCard: React.FC<SlotCardProps> = ({
  slot,
  onEdit,
  onDelete,
  isActive = false
}) => {
  // const { t } = useTranslation();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card 
      className={`hover:shadow-md transition-all duration-200 ${
        isActive ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      title={slot.name}
      actions={
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(slot.id)}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            aria-label="편집"
          >
            편집
          </button>
          <button
            onClick={() => onDelete(slot.id)}
            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            aria-label="삭제"
          >
            삭제
          </button>
        </div>
      }
    >
      {slot.description && (
        <p className="text-sm text-secondary mb-4">{slot.description}</p>
      )}

      <div className="space-y-2 text-sm text-secondary">
        <div className="flex justify-between">
          <span>요일 그룹:</span>
          <span className="font-medium">{slot.dayGroup}</span>
        </div>
        <div className="flex justify-between">
          <span>한국어 교사:</span>
          <span className="font-medium">{slot.teachers.homeroomKoreanPool.length}명</span>
        </div>
        <div className="flex justify-between">
          <span>외국어 교사:</span>
          <span className="font-medium">{slot.teachers.foreignPool.length}명</span>
        </div>
        <div className="flex justify-between">
          <span>생성일:</span>
          <span>{formatDate(slot.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>수정일:</span>
          <span>{formatDate(slot.updatedAt)}</span>
        </div>
      </div>

      {isActive && (
        <div className="mt-4 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md">
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            활성
          </span>
        </div>
      )}
    </Card>
  );
};


