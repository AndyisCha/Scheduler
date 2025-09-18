import React, { useState, useEffect } from 'react';
import { AccessibleTable, AccessibleTableHeader, AccessibleTableCell, AccessibleTableRow } from './a11y/AccessibleTable';
import { AccessibleButton } from './a11y/AccessibleButton';
import { manualEditsService, type ManualEditSession, type EditConflict } from '../services/manualEditsService';
import type { Assignment } from '../engine/types';

// Define TTAssignment as an alias for Assignment since they're the same type
type TTAssignment = Assignment;
import { useToast } from './Toast/ToastProvider';
import type { MWFScheduleResult, TTScheduleResult } from '../engine/types';

interface EditableScheduleTableProps {
  scheduleData: MWFScheduleResult | TTScheduleResult;
  scheduleType: 'MWF' | 'TT';
  snapshotId: string;
  onEditSessionChange?: (session: ManualEditSession) => void;
  onSave?: (newSnapshotId: string) => void;
}

interface DragState {
  isDragging: boolean;
  draggedFrom: { day: string; period: number } | null;
  draggedTo: { day: string; period: number } | null;
  draggedData: Assignment | TTAssignment | null;
}

interface EditCellProps {
  day: string;
  period: number;
  assignment: Assignment | TTAssignment | null;
  conflicts: EditConflict[];
  onEdit: (day: string, period: number, newValue: Assignment | TTAssignment | null) => void;
  onDragStart: (day: string, period: number, data: Assignment | TTAssignment | null) => void;
  onDragEnd: () => void;
  onDrop: (day: string, period: number) => void;
  dragState: DragState;
  isEditMode: boolean;
}

const EditCell: React.FC<EditCellProps> = ({
  day,
  period,
  assignment,
  conflicts,
  onEdit,
  onDragStart,
  onDrop,
  dragState,
  isEditMode
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const cellConflicts = conflicts.filter(c => 
    c.affected_cells.some(ac => ac.day === day && ac.period === period)
  );

  const hasError = cellConflicts.some(c => c.severity === 'error');
  const hasWarning = cellConflicts.some(c => c.severity === 'warning');

  const formatAssignment = (assignment: Assignment | TTAssignment | null) => {
    if (!assignment) return '미배정';
    
    const parts = [];
    if (assignment.teacher) parts.push(assignment.teacher);
    if (assignment.role) {
      const roleMap = { 'H': '담임', 'K': '한국어', 'F': '외국어', 'EXAM': '감독' };
      parts.push(`(${roleMap[assignment.role as keyof typeof roleMap] || assignment.role})`);
    }
    if (assignment.classId) parts.push(`[${assignment.classId}]`);
    if (assignment.time) parts.push(assignment.time);
    
    return parts.join(' ');
  };

  const handleClick = () => {
    if (!isEditMode) return;
    setIsEditing(true);
    setEditValue(formatAssignment(assignment));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue('');
    }
  };

  const handleSave = () => {
    if (editValue.trim() === '미배정' || editValue.trim() === '') {
      onEdit(day, period, null);
    } else {
      // Parse the edit value - this is a simplified parser
      // In a real implementation, you'd want a more sophisticated parser
      const parts = editValue.split(' ');
      const newAssignment: Assignment | TTAssignment = {
        teacher: parts[0] || '',
        role: (parts[1]?.replace(/[()]/g, '') as 'H' | 'K' | 'F' | 'EXAM') || 'H',
        classId: parts[2]?.replace(/[\[\]]/g, '') || '',
        time: parts.slice(3).join(' ') || '',
        round: 1, // Default round
        period: period as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 // Current period
      };
      onEdit(day, period, newAssignment);
    }
    setIsEditing(false);
    setEditValue('');
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(day, period, assignment);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isEditMode) return;
    onDrop(day, period);
  };

  const getCellClassName = () => {
    let className = 'px-4 py-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors';
    
    if (hasError) {
      className += ' bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700';
    } else if (hasWarning) {
      className += ' bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700';
    } else if (assignment) {
      className += ' bg-blue-50 dark:bg-blue-900';
    } else {
      className += ' bg-gray-50 dark:bg-gray-800';
    }

    if (isEditMode) {
      className += ' hover:bg-blue-100 dark:hover:bg-blue-800';
    }

    if (dragState.isDragging && dragState.draggedTo?.day === day && dragState.draggedTo?.period === period) {
      className += ' bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700';
    }

    return className;
  };

  return (
    <AccessibleTableCell
      className={getCellClassName()}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      draggable={isEditMode && !!assignment}
      role="gridcell"
      tabIndex={isEditMode ? 0 : -1}
    >
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      ) : (
        <div className="text-sm">
          <div className="font-medium">{formatAssignment(assignment)}</div>
          {cellConflicts.length > 0 && (
            <div className="mt-1 text-xs">
              {cellConflicts.map((conflict, index) => (
                <div
                  key={index}
                  className={`${
                    conflict.severity === 'error' 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}
                >
                  {conflict.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AccessibleTableCell>
  );
};

export const EditableScheduleTable: React.FC<EditableScheduleTableProps> = ({
  scheduleData,
  scheduleType,
  snapshotId,
  onEditSessionChange,
  onSave
}) => {
  const { showToast } = useToast();
  
  const [editSession, setEditSession] = useState<ManualEditSession | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedFrom: null,
    draggedTo: null,
    draggedData: null
  });

  const days = scheduleType === 'MWF' ? ['월', '수', '금'] : ['화', '목'];
  const maxPeriods = scheduleType === 'MWF' ? 8 : 6;

  useEffect(() => {
    initializeEditSession();
  }, [snapshotId]);

  const initializeEditSession = async () => {
    try {
      const session = await manualEditsService.startEditSession(
        snapshotId,
        `Manual Edit - ${new Date().toLocaleString()}`,
        scheduleData
      );
      setEditSession(session);
      onEditSessionChange?.(session);
    } catch (error) {
      showToast({
        type: 'error',
        title: '오류',
        message: '편집 세션을 초기화하는 중 오류가 발생했습니다.'
      });
    }
  };

  const handleEdit = async (day: string, period: number, newValue: Assignment | TTAssignment | null) => {
    if (!editSession) return;

    setLoading(true);
    try {
      const result = await manualEditsService.applyEdit(
        editSession.id,
        day,
        period,
        newValue
      );

      if (result.success) {
        // Update local session state
        const updatedSession = { ...editSession };
        updatedSession.validation_result = {
          isValid: result.conflicts.length === 0,
          conflicts: result.conflicts,
          warnings: result.warnings,
          canSave: result.conflicts.filter(c => c.severity === 'error').length === 0
        };
        
        setEditSession(updatedSession);
        onEditSessionChange?.(updatedSession);

        if (result.conflicts.length > 0) {
          showToast({
            type: 'warning',
            title: '충돌 감지',
            message: `${result.conflicts.length}개의 충돌이 발견되었습니다.`
          });
        }
      } else {
        showToast({
          type: 'error',
          title: '편집 실패',
          message: '편집을 적용할 수 없습니다.'
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: '오류',
        message: '편집을 저장하는 중 오류가 발생했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (day: string, period: number, data: Assignment | TTAssignment | null) => {
    setDragState({
      isDragging: true,
      draggedFrom: { day, period },
      draggedTo: null,
      draggedData: data
    });
  };

  const handleDragEnd = () => {
    setDragState({
      isDragging: false,
      draggedFrom: null,
      draggedTo: null,
      draggedData: null
    });
  };

  const handleDrop = async (day: string, period: number) => {
    if (!dragState.draggedFrom || !dragState.draggedData) return;

    // Swap the assignments
    await handleEdit(day, period, dragState.draggedData);
    await handleEdit(dragState.draggedFrom.day, dragState.draggedFrom.period, null);

    handleDragEnd();
  };

  const handleSave = async () => {
    if (!editSession) return;

    setLoading(true);
    try {
      const result = await manualEditsService.saveEditedSchedule(editSession.id);

      if (result.success) {
        showToast({
          type: 'success',
          title: '저장 완료',
          message: result.message
        });
        onSave?.(result.newSnapshotId!);
        setIsEditMode(false);
      } else {
        showToast({
          type: 'error',
          title: '저장 실패',
          message: result.message
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: '오류',
        message: '편집된 스케줄을 저장하는 중 오류가 발생했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentValue = (day: string, period: number): Assignment | TTAssignment | null => {
    if (!editSession) {
      const originalValue = scheduleData[day]?.[period];
      if (Array.isArray(originalValue)) {
        return originalValue[0] || null;
      }
      return originalValue || null;
    }

    // Find the most recent edit for this cell
    const cellEdit = editSession.edits
      .filter(edit => edit.day === day && edit.period === period)
      .sort((a, b) => new Date(b.edited_at).getTime() - new Date(a.edited_at).getTime())[0];

    if (cellEdit) {
      return cellEdit.new_value;
    }

    const originalValue = scheduleData[day]?.[period];
    if (Array.isArray(originalValue)) {
      return originalValue[0] || null;
    }
    return originalValue || null;
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (!isEditMode) {
      showToast({
        type: 'info',
        title: '편집 모드',
        message: '편집 모드가 활성화되었습니다. 셀을 클릭하여 편집하거나 드래그하여 이동할 수 있습니다.'
      });
    }
  };

  return (
    <div className="editable-schedule-table">
      {/* Controls */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <AccessibleButton
            onClick={toggleEditMode}
            variant={isEditMode ? 'danger' : 'primary'}
            className="px-4 py-2"
          >
            {isEditMode ? '편집 모드 종료' : '편집 모드 시작'}
          </AccessibleButton>
          
          {isEditMode && (
            <AccessibleButton
              onClick={handleSave}
              disabled={loading || !editSession?.validation_result.canSave}
              variant="primary"
              className="px-4 py-2"
            >
              {loading ? '저장 중...' : '저장'}
            </AccessibleButton>
          )}
        </div>

        {editSession && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            편집 횟수: {editSession.edits.length} | 
            충돌: {editSession.validation_result.conflicts.length} | 
            경고: {editSession.validation_result.warnings.length}
          </div>
        )}
      </div>

      {/* Conflict Summary */}
      {editSession && editSession.validation_result.conflicts.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            충돌 및 경고
          </h3>
          <div className="space-y-2">
            {editSession.validation_result.conflicts.map((conflict, index) => (
              <div
                key={index}
                className={`text-sm ${
                  conflict.severity === 'error' 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}
              >
                <strong>{conflict.severity === 'error' ? '오류' : '경고'}:</strong> {conflict.message}
                {conflict.suggested_fixes && (
                  <div className="mt-1 ml-4">
                    <div className="text-xs text-gray-600 dark:text-gray-400">제안된 해결책:</div>
                    {conflict.suggested_fixes.map((fix, fixIndex) => (
                      <div key={fixIndex} className="text-xs ml-2">
                        • {fix.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Table */}
      <div className="overflow-x-auto">
        <AccessibleTable
          caption={`${scheduleType} 스케줄 편집 테이블`}
          className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
        >
          <thead className="bg-gray-50 dark:bg-gray-700">
            <AccessibleTableRow>
              <AccessibleTableHeader scope="col" className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                교시
              </AccessibleTableHeader>
              {days.map(day => (
                <AccessibleTableHeader key={day} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {day}요일
                </AccessibleTableHeader>
              ))}
            </AccessibleTableRow>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: maxPeriods }, (_, periodIndex) => {
              const period = periodIndex + 1;
              return (
                <AccessibleTableRow key={period}>
                  <AccessibleTableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {period}교시
                  </AccessibleTableCell>
                  {days.map(day => (
                    <EditCell
                      key={`${day}-${period}`}
                      day={day}
                      period={period}
                      assignment={getCurrentValue(day, period)}
                      conflicts={editSession?.validation_result.conflicts || []}
                      onEdit={handleEdit}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop}
                      dragState={dragState}
                      isEditMode={isEditMode}
                    />
                  ))}
                </AccessibleTableRow>
              );
            })}
          </tbody>
        </AccessibleTable>
      </div>

      {/* Edit Instructions */}
      {isEditMode && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
            편집 방법
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• 셀을 클릭하여 직접 편집할 수 있습니다</li>
            <li>• 배정된 셀을 드래그하여 다른 위치로 이동할 수 있습니다</li>
            <li>• 빈 셀로 드래그하면 배정이 이동됩니다</li>
            <li>• 충돌이 있는 경우 빨간색으로 표시됩니다</li>
            <li>• 경고가 있는 경우 노란색으로 표시됩니다</li>
          </ul>
        </div>
      )}
    </div>
  );
};
