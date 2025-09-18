import React from 'react';
import { Card } from './Card';
import type { TeacherConstraint } from '../../engine/types';

interface ConstraintsCardProps {
  constraints: Record<string, TeacherConstraint>;
  onUpdateConstraint: (teacherName: string, constraint: Partial<TeacherConstraint>) => void;
}

export const ConstraintsCard: React.FC<ConstraintsCardProps> = ({
  constraints,
  onUpdateConstraint
}) => {
  // const { t } = useTranslation();

  const days = ['월', '수', '금'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  const handleUnavailableChange = (teacherName: string, period: number, checked: boolean) => {
    const constraint = constraints[teacherName];
    if (!constraint) return;

    let newUnavailable = [...constraint.unavailablePeriods];
    
    if (checked) {
      if (!newUnavailable.includes(period)) {
        newUnavailable.push(period);
      }
    } else {
      newUnavailable = newUnavailable.filter(p => p !== period);
    }

    onUpdateConstraint(teacherName, { unavailablePeriods: newUnavailable });
  };

  const isUnavailable = (teacherName: string, period: number) => {
    const constraint = constraints[teacherName];
    return constraint?.unavailablePeriods.includes(period) || false;
  };

  const constraintEntries = Object.entries(constraints);

  return (
    <Card title="제약조건">
      <div className="space-y-6">
        {constraintEntries.length === 0 ? (
          <p className="text-sm text-tertiary text-center py-8">
            제약조건이 없습니다
          </p>
        ) : (
          constraintEntries.map(([teacherName, constraint]) => (
            <div key={teacherName} className="border border-primary rounded-lg p-4 bg-secondary">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-primary">{teacherName}</h4>
                <span className="text-sm text-tertiary">교사</span>
              </div>

              {/* Homeroom Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={constraint.homeroomDisabled}
                      onChange={(e) => onUpdateConstraint(teacherName, { 
                        homeroomDisabled: e.target.checked 
                      })}
                      className="rounded border-primary text-accent-primary focus:ring-accent-primary"
                    />
                    <span className="text-sm text-primary">담임 불가</span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-primary mb-1">
                    최대 담임 수
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={constraint.maxHomerooms || 0}
                    onChange={(e) => onUpdateConstraint(teacherName, { 
                      maxHomerooms: parseInt(e.target.value) || 0 
                    })}
                    className="w-20 px-2 py-1 border border-primary rounded bg-secondary text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  />
                </div>
              </div>

              {/* Unavailable Periods */}
              <div>
                <h5 className="text-sm font-medium text-primary mb-3">
                  불가능한 교시
                </h5>
                <div className="grid grid-cols-3 gap-2">
                  {days.map((day) => (
                    <div key={day} className="space-y-1">
                      <div className="text-xs font-medium text-tertiary text-center">
                        {day}
                      </div>
                      {periods.map((period) => (
                        <label key={`${day}-${period}`} className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isUnavailable(teacherName, period)}
                            onChange={(e) => handleUnavailableChange(
                              teacherName, 
                              period, 
                              e.target.checked
                            )}
                            className="rounded border-primary text-accent-error focus:ring-accent-error"
                          />
                          <span className="ml-1 text-xs text-primary">{period}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};


