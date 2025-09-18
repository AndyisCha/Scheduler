// src/components/TeacherEditor.tsx
// Teacher management and constraint editing

import React, { useState } from 'react';
import type { SchedulerSlot, TeacherConstraints, Day, Period } from '../types/scheduler';
import { DAYS } from '../types/scheduler';

interface TeacherEditorProps {
  slot: SchedulerSlot | null;
  onSlotUpdate: (updatedSlot: SchedulerSlot) => void;
}

export const TeacherEditor: React.FC<TeacherEditorProps> = ({ slot, onSlotUpdate }) => {
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherType, setNewTeacherType] = useState<'homeroomKorean' | 'foreign'>('homeroomKorean');

  if (!slot) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center">활성 슬롯을 선택해주세요.</p>
      </div>
    );
  }

  const addTeacher = () => {
    if (!newTeacherName.trim()) return;

    const updatedSlot = { ...slot };
    const teacherName = newTeacherName.trim();

    if (newTeacherType === 'homeroomKorean') {
      if (!updatedSlot.teachers.homeroomKoreanPool.includes(teacherName)) {
        updatedSlot.teachers.homeroomKoreanPool.push(teacherName);
      }
    } else {
      if (!updatedSlot.teachers.foreignPool.includes(teacherName)) {
        updatedSlot.teachers.foreignPool.push(teacherName);
      }
    }

    // Initialize constraints if not exist
    if (!updatedSlot.teachers.constraints[teacherName]) {
      updatedSlot.teachers.constraints[teacherName] = {};
    }

    onSlotUpdate(updatedSlot);
    setNewTeacherName('');
    setSelectedTeacher(teacherName);
  };

  const removeTeacher = (teacherName: string) => {
    if (!window.confirm(`정말로 ${teacherName} 교사를 삭제하시겠습니까?`)) return;

    const updatedSlot = { ...slot };
    updatedSlot.teachers.homeroomKoreanPool = updatedSlot.teachers.homeroomKoreanPool.filter(t => t !== teacherName);
    updatedSlot.teachers.foreignPool = updatedSlot.teachers.foreignPool.filter(t => t !== teacherName);
    delete updatedSlot.teachers.constraints[teacherName];

    if (selectedTeacher === teacherName) {
      setSelectedTeacher(null);
    }

    onSlotUpdate(updatedSlot);
  };

  const updateTeacherConstraints = (teacherName: string, constraints: TeacherConstraints) => {
    const updatedSlot = { ...slot };
    updatedSlot.teachers.constraints[teacherName] = constraints;
    onSlotUpdate(updatedSlot);
  };

  const updateGlobalOptions = (options: Partial<SchedulerSlot['globalOptions']>) => {
    const updatedSlot = { ...slot };
    updatedSlot.globalOptions = { ...updatedSlot.globalOptions, ...options };
    onSlotUpdate(updatedSlot);
  };

  // const allTeachers = [...slot.teachers.homeroomKoreanPool, ...slot.teachers.foreignPool];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">교사 관리 및 제약 조건 설정</h2>

      {/* Add new teacher */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-3">새 교사 추가</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTeacherName}
            onChange={(e) => setNewTeacherName(e.target.value)}
            placeholder="교사 이름"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && addTeacher()}
          />
          <select
            value={newTeacherType}
            onChange={(e) => setNewTeacherType(e.target.value as 'homeroomKorean' | 'foreign')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="homeroomKorean">홈룸/한국어</option>
            <option value="foreign">외국어</option>
          </select>
          <button
            onClick={addTeacher}
            disabled={!newTeacherName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            추가
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teacher list */}
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">교사 목록</h3>
          <div className="space-y-2">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">홈룸/한국어 교사</h4>
              <div className="space-y-1">
                {slot.teachers.homeroomKoreanPool.map((teacher) => (
                  <div
                    key={teacher}
                    className={`flex justify-between items-center p-2 border rounded cursor-pointer transition-colors ${
                      selectedTeacher === teacher ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTeacher(teacher)}
                  >
                    <span className="text-sm">{teacher}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTeacher(teacher);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">외국어 교사</h4>
              <div className="space-y-1">
                {slot.teachers.foreignPool.map((teacher) => (
                  <div
                    key={teacher}
                    className={`flex justify-between items-center p-2 border rounded cursor-pointer transition-colors ${
                      selectedTeacher === teacher ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTeacher(teacher)}
                  >
                    <span className="text-sm">{teacher}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTeacher(teacher);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Teacher constraints */}
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">교사별 제약 조건</h3>
          {selectedTeacher ? (
            <TeacherConstraintsForm
              teacherName={selectedTeacher}
              constraints={slot.teachers.constraints[selectedTeacher] || {}}
              onUpdate={(constraints) => updateTeacherConstraints(selectedTeacher, constraints)}
            />
          ) : (
            <p className="text-gray-500 text-sm">교사를 선택해주세요.</p>
          )}
        </div>

        {/* Global options */}
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">글로벌 옵션</h3>
          <GlobalOptionsForm
            options={slot.globalOptions}
            onUpdate={updateGlobalOptions}
          />
        </div>
      </div>
    </div>
  );
};

interface TeacherConstraintsFormProps {
  teacherName: string;
  constraints: TeacherConstraints;
  onUpdate: (constraints: TeacherConstraints) => void;
}

const TeacherConstraintsForm: React.FC<TeacherConstraintsFormProps> = ({
  teacherName,
  constraints,
  onUpdate,
}) => {
  const [unavailableSlots, setUnavailableSlots] = useState<Set<string>>(
    constraints.unavailable || new Set()
  );

  const toggleUnavailable = (day: Day, period: Period) => {
    const key = `${day}|${period}`;
    const newSet = new Set(unavailableSlots);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setUnavailableSlots(newSet);
    onUpdate({
      ...constraints,
      unavailable: newSet,
    });
  };

  const updateConstraint = <K extends keyof TeacherConstraints>(
    key: K,
    value: TeacherConstraints[K]
  ) => {
    onUpdate({
      ...constraints,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          교사: {teacherName}
        </label>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={constraints.homeroomDisabled || false}
            onChange={(e) => updateConstraint('homeroomDisabled', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">홈룸 배정 비활성화</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          최대 홈룸 수
        </label>
        <input
          type="number"
          min="0"
          value={constraints.maxHomerooms || ''}
          onChange={(e) => updateConstraint('maxHomerooms', e.target.value ? parseInt(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="제한 없음"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          불가능한 시간
        </label>
        <div className="grid grid-cols-3 gap-1">
          {DAYS.map((day) => (
            <div key={day} className="space-y-1">
              <div className="text-xs font-medium text-gray-600 text-center">{day}</div>
              {([1, 2, 3, 4, 5, 6, 7, 8] as Period[]).map((period) => {
                const key = `${day}|${period}`;
                const isUnavailable = unavailableSlots.has(key);
                return (
                  <button
                    key={period}
                    onClick={() => toggleUnavailable(day, period)}
                    className={`w-full h-6 text-xs rounded ${
                      isUnavailable
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {period}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface GlobalOptionsFormProps {
  options: SchedulerSlot['globalOptions'];
  onUpdate: (options: Partial<SchedulerSlot['globalOptions']>) => void;
}

const GlobalOptionsForm: React.FC<GlobalOptionsFormProps> = ({ options, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={options.includeHInK || false}
            onChange={(e) => onUpdate({ includeHInK: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-gray-700">홈룸을 한국어 후보에 포함</span>
        </label>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={options.preferOtherHForK || false}
            onChange={(e) => onUpdate({ preferOtherHForK: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-gray-700">다른 홈룸을 한국어로 선호</span>
        </label>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={options.disallowOwnHAsK || false}
            onChange={(e) => onUpdate({ disallowOwnHAsK: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-gray-700">자신의 클래스 한국어 금지</span>
        </label>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">라운드별 클래스 수</h4>
        <div className="space-y-2">
          {([1, 2, 3, 4] as const).map((round) => (
            <div key={round} className="flex items-center space-x-2">
              <label className="text-sm text-gray-600 w-8">R{round}:</label>
              <input
                type="number"
                min="0"
                max="10"
                value={options.roundClassCounts[round]}
                onChange={(e) =>
                  onUpdate({
                    roundClassCounts: {
                      ...options.roundClassCounts,
                      [round]: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
