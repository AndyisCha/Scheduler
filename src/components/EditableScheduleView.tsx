import React, { useState } from 'react';
import { AccessibleTabs } from './a11y/AccessibleTabs';
import { EditableScheduleTable } from './EditableScheduleTable';
import type { ManualEditSession } from '../services/manualEditsService';
import type { MWFScheduleResult, TTScheduleResult } from '../engine/types';

interface EditableScheduleViewProps {
  mwfResult?: MWFScheduleResult;
  ttResult?: TTScheduleResult;
  snapshotId: string;
  onScheduleSaved?: (newSnapshotId: string) => void;
}

export const EditableScheduleView: React.FC<EditableScheduleViewProps> = ({
  mwfResult,
  ttResult,
  snapshotId,
  onScheduleSaved
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');
  const [editSession, setEditSession] = useState<ManualEditSession | null>(null);

  const handleEditSessionChange = (session: ManualEditSession) => {
    setEditSession(session);
  };

  const handleSave = async (newSnapshotId: string) => {
    try {
      // Refresh the page or update the parent component
      onScheduleSaved?.(newSnapshotId);
      
      // Show success message
      setActiveTab('view');
    } catch (error) {
      console.error('Error after saving:', error);
    }
  };


  const renderViewMode = () => {
    return (
      <div className="space-y-6">
        {mwfResult && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              MWF 스케줄 (월, 수, 금)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      교시
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      월요일
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      수요일
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      금요일
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {Array.from({ length: 8 }, (_, periodIndex) => {
                    const period = periodIndex + 1;
                    return (
                      <tr key={period}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {period}교시
                        </td>
                        {['월', '수', '금'].map(day => {
                          const assignment = mwfResult[day]?.[period];
                          return (
                            <td key={`${day}-${period}`} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {assignment && !Array.isArray(assignment) ? (
                                <div>
                                  <div className="font-medium">{assignment.teacher}</div>
                                  <div className="text-xs text-gray-500">
                                    {assignment.role} • {assignment.classId}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">미배정</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {ttResult && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              TT 스케줄 (화, 목)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      교시
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      화요일
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      목요일
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {Array.from({ length: 6 }, (_, periodIndex) => {
                    const period = periodIndex + 1;
                    return (
                      <tr key={period}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {period}교시
                        </td>
                        {['화', '목'].map(day => {
                          const assignment = ttResult[day]?.[period];
                          return (
                            <td key={`${day}-${period}`} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {assignment && !Array.isArray(assignment) ? (
                                <div>
                                  <div className="font-medium">{assignment.teacher}</div>
                                  <div className="text-xs text-gray-500">
                                    {assignment.role} • {assignment.classId}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">미배정</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEditMode = () => {
    return (
      <div className="space-y-6">
        {mwfResult && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              MWF 스케줄 편집 (월, 수, 금)
            </h3>
            <EditableScheduleTable
              scheduleData={mwfResult}
              scheduleType="MWF"
              snapshotId={snapshotId}
              onEditSessionChange={handleEditSessionChange}
              onSave={handleSave}
            />
          </div>
        )}

        {ttResult && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              TT 스케줄 편집 (화, 목)
            </h3>
            <EditableScheduleTable
              scheduleData={ttResult}
              scheduleType="TT"
              snapshotId={snapshotId}
              onEditSessionChange={handleEditSessionChange}
              onSave={handleSave}
            />
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    {
      id: 'view',
      label: '보기 모드',
      content: renderViewMode()
    },
    {
      id: 'edit',
      label: '편집 모드',
      content: renderEditMode()
    }
  ];

  return (
    <div className="editable-schedule-view">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          스케줄 관리
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          스케줄을 확인하고 필요시 수동으로 편집할 수 있습니다.
        </p>
      </div>

      <AccessibleTabs
        tabs={tabs}
        defaultActiveTab={activeTab}
        aria-label="스케줄 보기 및 편집 옵션"
        className="bg-white dark:bg-gray-800 rounded-lg shadow"
      />

      {/* Edit Session Status */}
      {editSession && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            편집 세션 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">세션명:</span>
              <div className="text-gray-900 dark:text-white">{editSession.session_name}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">편집 횟수:</span>
              <div className="text-gray-900 dark:text-white">{editSession.edits.length}개</div>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">상태:</span>
              <div className={`${
                editSession.validation_result.canSave 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {editSession.validation_result.canSave ? '저장 가능' : '저장 불가'}
              </div>
            </div>
          </div>
          
          {editSession.validation_result.conflicts.length > 0 && (
            <div className="mt-4">
              <span className="font-medium text-gray-700 dark:text-gray-300">충돌:</span>
              <div className="text-red-600 dark:text-red-400">
                {editSession.validation_result.conflicts.length}개
              </div>
            </div>
          )}
          
          {editSession.validation_result.warnings.length > 0 && (
            <div className="mt-4">
              <span className="font-medium text-gray-700 dark:text-gray-300">경고:</span>
              <div className="text-yellow-600 dark:text-yellow-400">
                {editSession.validation_result.warnings.length}개
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
