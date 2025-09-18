import React, { useState } from 'react';
import { Card } from './Card';

interface TeacherPoolCardProps {
  teachers: string[];
  onAddTeacher: (name: string) => void;
  onRemoveTeacher: (name: string) => void;
  title: string;
  role: 'homeroomKorean' | 'foreign';
}

export const TeacherPoolCard: React.FC<TeacherPoolCardProps> = ({
  teachers,
  onAddTeacher,
  onRemoveTeacher,
  title,
  role
}) => {
  // const { t } = useTranslation();
  const [newTeacherName, setNewTeacherName] = useState('');

  const getRoleLabel = (roleType: 'homeroomKorean' | 'foreign') => {
    switch (roleType) {
      case 'homeroomKorean': return "한국어/담임";
      case 'foreign': return "외국어";
      default: return roleType;
    }
  };

  const getRoleColor = (roleType: 'homeroomKorean' | 'foreign') => {
    switch (roleType) {
      case 'homeroomKorean': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'foreign': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeacherName.trim()) {
      onAddTeacher(newTeacherName.trim());
      setNewTeacherName('');
    }
  };

  return (
    <Card 
      title={title}
      actions={
        <span className={`
          px-3 py-1 rounded-full text-sm font-medium
          ${getRoleColor(role)}
        `}>
          {getRoleLabel(role)}
        </span>
      }
    >
      {/* Add Teacher Form */}
      <form onSubmit={handleAddTeacher} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTeacherName}
            onChange={(e) => setNewTeacherName(e.target.value)}
            placeholder="교사 이름을 입력하세요"
            className="flex-1 px-3 py-2 border border-primary rounded-md bg-secondary text-primary placeholder-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
          <button
            type="submit"
            disabled={!newTeacherName.trim()}
            className="px-4 py-2 bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 disabled:bg-tertiary disabled:cursor-not-allowed transition-colors"
          >
            추가
          </button>
        </div>
      </form>

      {/* Teachers List */}
      <div className="space-y-2">
        {teachers.length === 0 ? (
          <p className="text-sm text-tertiary text-center py-4">
            교사가 없습니다
          </p>
        ) : (
          teachers.map((teacher) => (
            <div
              key={teacher}
              className="flex items-center justify-between p-3 bg-secondary border border-primary rounded-md"
            >
              <span className="text-primary font-medium">{teacher}</span>
              <button
                onClick={() => onRemoveTeacher(teacher)}
                className="px-2 py-1 text-sm text-accent-error hover:text-accent-error/80 hover:bg-accent-error/10 rounded transition-colors"
                aria-label="제거"
              >
                제거
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 text-sm text-tertiary">
        총 교사: {teachers.length}명
      </div>
    </Card>
  );
};


