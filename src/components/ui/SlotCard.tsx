import React, { memo } from 'react';
import { Card } from './Card';
import type { SlotConfig } from '../../engine/types';
import type { UnifiedSlotConfig } from '../../services/unifiedSlotService';

interface SlotCardProps {
  slot: SlotConfig | UnifiedSlotConfig;
  onEdit: (slotId: string) => void;
  onDelete: (slotId: string) => void;
  isActive?: boolean;
}

const SlotCardComponent: React.FC<SlotCardProps> = ({
  slot,
  onEdit,
  onDelete,
  isActive = false
}) => {
  // const { t } = useTranslation();
  
  console.log('🎴 SlotCard rendered for:', slot.name, 'isActive:', isActive);

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

  // UnifiedSlotConfig와 SlotConfig 모두 지원하기 위한 헬퍼 함수들
  const getTeachers = () => {
    if ('teachers' in slot) {
      console.log('📋 SlotCard - Using direct teachers:', slot.teachers);
      return slot.teachers;
    }
    // SlotConfig의 경우 slot_data.teachers 사용
    const slotDataTeachers = (slot as any).slot_data?.teachers || { homeroomKoreanPool: [], foreignPool: [] };
    console.log('📋 SlotCard - Using slot_data.teachers:', slotDataTeachers);
    return slotDataTeachers;
  };

  const getCreatedAt = () => {
    return slot.createdAt || (slot as any).created_at;
  };

  const getUpdatedAt = () => {
    return slot.updatedAt || (slot as any).updated_at;
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
        <div className="flex justify-between items-center">
          <span>한국어 교사:</span>
          <span className="font-medium px-2 py-1 rounded-full text-sm" style={{
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            border: '1px solid #bbdefb'
          }}>
            {(() => {
              const teachers = getTeachers();
              const count = teachers.homeroomKoreanPool?.length || 0;
              console.log('📋 SlotCard - Homeroom Korean count:', count, 'teachers:', teachers.homeroomKoreanPool);
              return `${count}명`;
            })()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>외국어 교사:</span>
          <span className="font-medium px-2 py-1 rounded-full text-sm" style={{
            backgroundColor: '#e8f5e8',
            color: '#2e7d32',
            border: '1px solid #c8e6c9'
          }}>
            {(() => {
              const teachers = getTeachers();
              const count = teachers.foreignPool?.length || 0;
              console.log('📋 SlotCard - Foreign count:', count, 'teachers:', teachers.foreignPool);
              return `${count}명`;
            })()}
          </span>
        </div>
        <div className="flex justify-between">
          <span>생성일:</span>
          <span>{formatDate(getCreatedAt())}</span>
        </div>
        <div className="flex justify-between">
          <span>수정일:</span>
          <span>{formatDate(getUpdatedAt())}</span>
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

export const SlotCard = memo(SlotCardComponent);


