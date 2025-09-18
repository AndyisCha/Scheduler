import React, { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18next';
import { useToast } from '../Toast/ToastProvider';

interface TeacherConstraint {
  id: string;
  teacherName: string;
  homeroomDisabled: boolean;
  maxHomerooms: number;
  unavailable: string[];
}

interface TeacherConstraintsFormProps {
  teachers: Array<{ id: string; name: string; role: 'H' | 'K' | 'F' }>;
  constraints: TeacherConstraint[];
  onConstraintsUpdate: (constraints: TeacherConstraint[]) => void;
  onSave?: (constraints: TeacherConstraint[]) => Promise<void>;
}

export const TeacherConstraintsForm: React.FC<TeacherConstraintsFormProps> = ({
  teachers,
  constraints,
  onConstraintsUpdate,
  onSave
}) => {
  // const { t } = useTranslation();
  const toast = useToast();
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [editingConstraint, setEditingConstraint] = useState<TeacherConstraint | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const days = ['월', '수', '금', '화', '목'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  // Initialize constraint for selected teacher
  useEffect(() => {
    if (selectedTeacher && !editingConstraint) {
      const existingConstraint = constraints.find(c => c.teacherName === selectedTeacher);
      if (existingConstraint) {
        setEditingConstraint({ ...existingConstraint });
      } else {
        setEditingConstraint({
          id: `temp_${Date.now()}`,
          teacherName: selectedTeacher,
          homeroomDisabled: false,
          maxHomerooms: 0,
          unavailable: []
        });
      }
    }
  }, [selectedTeacher, constraints, editingConstraint]);

  const handleConstraintChange = (field: keyof TeacherConstraint, value: any) => {
    if (editingConstraint) {
      setEditingConstraint({
        ...editingConstraint,
        [field]: value
      });
    }
  };

  const handleUnavailableToggle = (day: string, period: number) => {
    if (!editingConstraint) return;

    const slotKey = `${day}|${period}`;
    const newUnavailable = editingConstraint.unavailable.includes(slotKey)
      ? editingConstraint.unavailable.filter(slot => slot !== slotKey)
      : [...editingConstraint.unavailable, slotKey];

    handleConstraintChange('unavailable', newUnavailable);
  };

  const handleSaveConstraint = async () => {
    if (!editingConstraint || !selectedTeacher) return;

    try {
      setIsSaving(true);
      
      const updatedConstraints = constraints.filter(c => c.teacherName !== selectedTeacher);
      updatedConstraints.push(editingConstraint);
      
      onConstraintsUpdate(updatedConstraints);
      
      if (onSave) {
        await onSave(updatedConstraints);
      }
      
      toast.showToast({
        type: 'success',
        title: '제약조건 저장 완료',
        message: `${selectedTeacher} 교사의 제약조건이 저장되었습니다`
      });
      setSelectedTeacher('');
      setEditingConstraint(null);
    } catch (error) {
      toast.showToast({
        type: 'error',
        title: '제약조건 저장 실패',
        message: '제약조건 저장에 실패했습니다'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setSelectedTeacher('');
    setEditingConstraint(null);
  };

  const isUnavailable = (day: string, period: number) => {
    return editingConstraint?.unavailable.includes(`${day}|${period}`) || false;
  };


  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-primary">교사 제약조건 설정</h3>
        <div className="text-sm text-secondary">
          총 {teachers.length}명의 교사
        </div>
      </div>

      {/* Teacher Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-primary mb-2">
          교사 선택
        </label>
        <select
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">교사를 선택하세요</option>
          {teachers.map(teacher => (
            <option key={teacher.id} value={teacher.name}>
              {teacher.name} ({teacher.role === 'H' ? '담임' : teacher.role === 'K' ? '한국어' : '외국어'})
            </option>
          ))}
        </select>
      </div>

      {/* Constraint Form */}
      {editingConstraint && (
        <div className="space-y-6">
          <div className="p-4 bg-background border border-border rounded-lg">
            <h4 className="font-medium text-primary mb-4">
              {selectedTeacher} 교사 제약조건
            </h4>

            {/* Homeroom Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={editingConstraint.homeroomDisabled}
                    onChange={(e) => handleConstraintChange('homeroomDisabled', e.target.checked)}
                    className="rounded border-border text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-primary">담임 불가</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-primary">
                  최대 담임 수
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={editingConstraint.maxHomerooms}
                  onChange={(e) => handleConstraintChange('maxHomerooms', parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border border-border rounded bg-background text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Unavailable Periods */}
            <div>
              <h5 className="text-sm font-medium text-primary mb-3">
                수업 불가 교시
              </h5>
              <div className="grid grid-cols-5 gap-2">
                {days.map((day) => (
                  <div key={day} className="space-y-1">
                    <div className="text-xs font-medium text-secondary text-center">
                      {day}
                    </div>
                    {periods.map((period) => (
                      <label key={`${day}-${period}`} className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isUnavailable(day, period)}
                          onChange={() => handleUnavailableToggle(day, period)}
                          className="rounded border-border text-red-600 focus:ring-red-500"
                        />
                        <span className="ml-1 text-xs text-primary">{period}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveConstraint}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Constraints Summary */}
      {constraints.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-primary mb-3">설정된 제약조건</h4>
          <div className="space-y-2">
            {constraints.map(constraint => (
              <div key={constraint.id} className="flex items-center justify-between p-2 bg-background border border-border rounded">
                <span className="text-sm text-primary">{constraint.teacherName}</span>
                <div className="flex items-center gap-2 text-xs text-secondary">
                  {constraint.homeroomDisabled && <span className="px-2 py-1 bg-red-100 text-red-800 rounded">담임불가</span>}
                  <span>최대담임: {constraint.maxHomerooms}</span>
                  <span>불가교시: {constraint.unavailable.length}개</span>
                  <button
                    onClick={() => setSelectedTeacher(constraint.teacherName)}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                  >
                    편집
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


