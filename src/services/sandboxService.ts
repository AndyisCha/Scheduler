import { supabase } from '../lib/supabase';
import type { GlobalOptions, TeacherConstraint, FixedHomerooms } from '../engine/types';

export interface SandboxData {
  slots: Array<{
    name: string;
    description: string;
    dayGroup: 'MWF' | 'TT';
    teachers: {
      homeroomKoreanPool: string[];
      foreignPool: string[];
    };
    teacherConstraints: Record<string, TeacherConstraint>;
    fixedHomerooms: FixedHomerooms;
    globalOptions: GlobalOptions;
  }>;
  schedules: Array<{
    slotId: string;
    name: string;
    description: string;
    scheduleType: 'MWF' | 'TT';
    data: any;
  }>;
}

class SandboxService {
  private seededSlots: string[] = [];
  private seededSchedules: string[] = [];

  /**
   * Generate comprehensive demo data
   */
  generateDemoData(): SandboxData {
    return {
      slots: [
        {
          name: "Demo MWF Slot - 2024년 1학기",
          description: "월수금 스케줄 데모 데이터 - 3학년 4개반",
          dayGroup: 'MWF',
          teachers: {
            homeroomKoreanPool: [
              '김담임', '이담임', '박담임', '최담임',
              '정한국어', '한국어선생님', '김국어'
            ],
            foreignPool: [
              'John Smith', 'Sarah Johnson', 'Michael Brown',
              'Emily Davis', 'David Wilson'
            ]
          },
          teacherConstraints: {
            '김담임': {
              teacherName: '김담임',
              unavailablePeriods: [1, 5], // 1교시, 5교시 불가
              homeroomDisabled: false,
              maxHomerooms: 2
            },
            '이담임': {
              teacherName: '이담임',
              unavailablePeriods: [2, 6], // 2교시, 6교시 불가
              homeroomDisabled: false,
              maxHomerooms: 2
            },
            '박담임': {
              teacherName: '박담임',
              unavailablePeriods: [3], // 3교시 불가
              homeroomDisabled: false,
              maxHomerooms: 1
            },
            'John Smith': {
              teacherName: 'John Smith',
              unavailablePeriods: [1, 2], // 1, 2교시 불가
              homeroomDisabled: true, // 담임 불가
              maxHomerooms: 0
            }
          },
          fixedHomerooms: {
            'R1C1': '김담임',
            'R1C2': '이담임',
            'R1C3': '박담임',
            'R1C4': '최담임'
          },
          globalOptions: {
            roundClassCounts: { 1: 4, 2: 4, 3: 4, 4: 4 },
            includeHInK: true,
            preferOtherHForK: true,
            disallowOwnHAsK: true
          }
        },
        {
          name: "Demo TT Slot - 2024년 1학기",
          description: "화목 스케줄 데모 데이터 - 2학년 3개반",
          dayGroup: 'TT',
          teachers: {
            homeroomKoreanPool: [
              '강담임', '윤담임', '조담임',
              '한국어선생님2', '김국어2'
            ],
            foreignPool: [
              'Jessica Lee', 'Robert Kim', 'Lisa Park',
              'Tom Anderson'
            ]
          },
          teacherConstraints: {
            '강담임': {
              teacherName: '강담임',
              unavailablePeriods: [4, 5],
              homeroomDisabled: false,
              maxHomerooms: 2
            },
            '윤담임': {
              teacherName: '윤담임',
              unavailablePeriods: [1],
              homeroomDisabled: false,
              maxHomerooms: 1
            },
            'Jessica Lee': {
              teacherName: 'Jessica Lee',
              unavailablePeriods: [2, 3],
              homeroomDisabled: true,
              maxHomerooms: 0
            }
          },
          fixedHomerooms: {
            'R2C1': '강담임',
            'R2C2': '윤담임',
            'R2C3': '조담임'
          },
          globalOptions: {
            roundClassCounts: { 1: 3, 2: 3 },
            includeHInK: true,
            preferOtherHForK: false,
            disallowOwnHAsK: true
          }
        },
        {
          name: "Demo Complex Slot - 2024년 2학기",
          description: "복잡한 제약조건이 있는 데모 데이터 - 4학년 6개반",
          dayGroup: 'MWF',
          teachers: {
            homeroomKoreanPool: [
              '서담임', '신담임', '오담임', '유담임', '노담임', '임담임',
              '한국어전문', '국어교사1', '국어교사2'
            ],
            foreignPool: [
              'James Taylor', 'Maria Garcia', 'Kevin Chen',
              'Anna Thompson', 'Ryan Murphy', 'Sophie Martin'
            ]
          },
          teacherConstraints: {
            '서담임': {
              teacherName: '서담임',
              unavailablePeriods: [1, 2, 7, 8],
              homeroomDisabled: false,
              maxHomerooms: 3
            },
            '신담임': {
              teacherName: '신담임',
              unavailablePeriods: [3, 4],
              homeroomDisabled: false,
              maxHomerooms: 2
            },
            'James Taylor': {
              teacherName: 'James Taylor',
              unavailablePeriods: [5, 6, 7, 8],
              homeroomDisabled: true,
              maxHomerooms: 0
            },
            'Maria Garcia': {
              teacherName: 'Maria Garcia',
              unavailablePeriods: [1, 2, 3],
              homeroomDisabled: true,
              maxHomerooms: 0
            }
          },
          fixedHomerooms: {
            'R4C1': '서담임',
            'R4C2': '신담임',
            'R4C3': '오담임',
            'R4C4': '유담임',
            'R4C5': '노담임',
            'R4C6': '임담임'
          },
          globalOptions: {
            roundClassCounts: { 1: 6, 2: 6, 3: 6, 4: 6 },
            includeHInK: true,
            preferOtherHForK: true,
            disallowOwnHAsK: true
          }
        }
      ],
      schedules: [
        {
          slotId: '', // Will be filled when slot is created
          name: "Demo MWF Schedule - Generated",
          description: "자동 생성된 MWF 스케줄 데모",
          scheduleType: 'MWF',
          data: {
            classSummary: {
              'R1C1': {
                '월': [
                  {
                    teacher: '김담임',
                    role: 'H',
                    classId: 'R1C1',
                    round: 1,
                    period: 3,
                    time: '15:15-16:00',
                    isExam: false
                  }
                ],
                '수': [
                  {
                    teacher: '김담임',
                    role: 'H',
                    classId: 'R1C1',
                    round: 2,
                    period: 2,
                    time: '14:20-15:05',
                    isExam: false
                  }
                ],
                '금': [
                  {
                    teacher: '김담임',
                    role: 'H',
                    classId: 'R1C1',
                    round: 3,
                    period: 4,
                    time: '16:10-16:55',
                    isExam: false
                  }
                ]
              }
            },
            teacherSummary: {
              '김담임': {
                '월': [
                  {
                    teacher: '김담임',
                    role: 'H',
                    classId: 'R1C1',
                    round: 1,
                    period: 3,
                    time: '15:15-16:00',
                    isExam: false
                  }
                ],
                '수': [
                  {
                    teacher: '김담임',
                    role: 'H',
                    classId: 'R1C1',
                    round: 2,
                    period: 2,
                    time: '14:20-15:05',
                    isExam: false
                  }
                ],
                '금': [
                  {
                    teacher: '김담임',
                    role: 'H',
                    classId: 'R1C1',
                    round: 3,
                    period: 4,
                    time: '16:10-16:55',
                    isExam: false
                  }
                ]
              }
            },
            dayGrid: {
              '월': {
                1: [], 2: [], 3: [
                  {
                    teacher: '김담임',
                    role: 'H',
                    classId: 'R1C1',
                    round: 1,
                    period: 3,
                    time: '15:15-16:00',
                    isExam: false
                  }
                ], 4: [], 5: [], 6: [], 7: [], 8: []
              },
              '수': {
                1: [], 2: [
                  {
                    teacher: '김담임',
                    role: 'H',
                    classId: 'R1C1',
                    round: 2,
                    period: 2,
                    time: '14:20-15:05',
                    isExam: false
                  }
                ], 3: [], 4: [], 5: [], 6: [], 7: [], 8: []
              },
              '금': {
                1: [], 2: [], 3: [], 4: [
                  {
                    teacher: '김담임',
                    role: 'H',
                    classId: 'R1C1',
                    round: 3,
                    period: 4,
                    time: '16:10-16:55',
                    isExam: false
                  }
                ], 5: [], 6: [], 7: [], 8: []
              }
            },
            warnings: [
              {
                type: 'constraint_violation',
                message: '김담임 교사의 1교시 제약조건 위반',
                severity: 'warning'
              }
            ],
            metrics: {
              generationTimeMs: 245,
              totalAssignments: 12,
              assignedCount: 10,
              unassignedCount: 2,
              warningsCount: 1,
              teachersCount: 12,
              classesCount: 4
            }
          }
        }
      ]
    };
  }

  /**
   * Seed demo data into the database
   */
  async seedDemoData(): Promise<{
    success: boolean;
    message: string;
    seededSlots: string[];
    seededSchedules: string[];
  }> {
    try {
      const demoData = this.generateDemoData();
      this.seededSlots = [];
      this.seededSchedules = [];

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      // Create slots
      for (const slotData of demoData.slots) {
        const { data: slot, error: slotError } = await supabase
          .from('slots')
          .insert({
            name: slotData.name,
            description: slotData.description,
            day_group: slotData.dayGroup,
            created_by: user.id,
            owner_id: user.id
          })
          .select()
          .single();

        if (slotError) {
          throw new Error(`슬롯 생성 실패: ${slotError.message}`);
        }

        this.seededSlots.push(slot.id);

        // Create slot teachers
        const teacherInserts = [
          ...slotData.teachers.homeroomKoreanPool.map(teacherName => ({
            slot_id: slot.id,
            teacher_name: teacherName,
            kind: 'H_K_POOL'
          })),
          ...slotData.teachers.foreignPool.map(teacherName => ({
            slot_id: slot.id,
            teacher_name: teacherName,
            kind: 'FOREIGN'
          }))
        ];

        const { error: teachersError } = await supabase
          .from('slot_teachers')
          .insert(teacherInserts);

        if (teachersError) {
          throw new Error(`교사 풀 생성 실패: ${teachersError.message}`);
        }

        // Create teacher constraints
        const constraintInserts = Object.entries(slotData.teacherConstraints).map(([teacherName, constraint]) => ({
          slot_id: slot.id,
          teacher_name: teacherName,
          homeroom_disabled: constraint.homeroomDisabled,
          max_homerooms: constraint.maxHomerooms || 0,
          unavailable: constraint.unavailablePeriods.map(period => `월|${period}`) // Simplified for demo
        }));

        if (constraintInserts.length > 0) {
          const { error: constraintsError } = await supabase
            .from('teacher_constraints')
            .insert(constraintInserts);

          if (constraintsError) {
            throw new Error(`교사 제약조건 생성 실패: ${constraintsError.message}`);
          }
        }

        // Create fixed homerooms
        const fixedHomeroomInserts = Object.entries(slotData.fixedHomerooms).map(([classId, teacherName]) => ({
          slot_id: slot.id,
          class_id: classId,
          teacher_name: teacherName
        }));

        if (fixedHomeroomInserts.length > 0) {
          const { error: fixedHomeroomsError } = await supabase
            .from('fixed_homerooms')
            .insert(fixedHomeroomInserts);

          if (fixedHomeroomsError) {
            throw new Error(`고정 담임 생성 실패: ${fixedHomeroomsError.message}`);
          }
        }

        // Create global options
        const { error: globalOptionsError } = await supabase
          .from('global_options')
          .insert({
            slot_id: slot.id,
            key: 'global_config',
            value: {
              round_class_counts: slotData.globalOptions.roundClassCounts,
              include_h_in_k: slotData.globalOptions.includeHInK,
              prefer_other_h_for_k: slotData.globalOptions.preferOtherHForK,
              disallow_own_h_as_k: slotData.globalOptions.disallowOwnHAsK
            }
          });

        if (globalOptionsError) {
          throw new Error(`글로벌 옵션 생성 실패: ${globalOptionsError.message}`);
        }
      }

      // Create demo schedules
      for (const scheduleData of demoData.schedules) {
        if (this.seededSlots.length > 0) {
          const slotId = this.seededSlots[0]; // Use first slot for demo schedule
          
          const { data: schedule, error: scheduleError } = await supabase
            .from('generated_schedules')
            .insert({
              slot_id: slotId,
              name: scheduleData.name,
              description: scheduleData.description,
              schedule_type: scheduleData.scheduleType,
              result: scheduleData.data,
              created_by: user.id
            })
            .select()
            .single();

          if (scheduleError) {
            throw new Error(`스케줄 생성 실패: ${scheduleError.message}`);
          }

          this.seededSchedules.push(schedule.id);
        }
      }

      return {
        success: true,
        message: `데모 데이터가 성공적으로 생성되었습니다. 슬롯 ${this.seededSlots.length}개, 스케줄 ${this.seededSchedules.length}개가 생성되었습니다.`,
        seededSlots: this.seededSlots,
        seededSchedules: this.seededSchedules
      };

    } catch (error) {
      console.error('데모 데이터 생성 실패:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '데모 데이터 생성 중 오류가 발생했습니다.',
        seededSlots: [],
        seededSchedules: []
      };
    }
  }

  /**
   * Reset all seeded data
   */
  async resetSeededData(): Promise<{
    success: boolean;
    message: string;
    deletedCount: {
      schedules: number;
      slots: number;
    };
  }> {
    try {
      let deletedSchedules = 0;
      let deletedSlots = 0;

      // Delete generated schedules first (due to foreign key constraints)
      if (this.seededSchedules.length > 0) {
        const { error: schedulesError } = await supabase
          .from('generated_schedules')
          .delete()
          .in('id', this.seededSchedules);

        if (schedulesError) {
          throw new Error(`스케줄 삭제 실패: ${schedulesError.message}`);
        }

        deletedSchedules = this.seededSchedules.length;
        this.seededSchedules = [];
      }

      // Delete slots and cascade delete related data
      if (this.seededSlots.length > 0) {
        // Delete in reverse order of creation to handle dependencies
        const { error: slotsError } = await supabase
          .from('slots')
          .delete()
          .in('id', this.seededSlots);

        if (slotsError) {
          throw new Error(`슬롯 삭제 실패: ${slotsError.message}`);
        }

        deletedSlots = this.seededSlots.length;
        this.seededSlots = [];
      }

      return {
        success: true,
        message: `데모 데이터가 성공적으로 초기화되었습니다. 슬롯 ${deletedSlots}개, 스케줄 ${deletedSchedules}개가 삭제되었습니다.`,
        deletedCount: {
          schedules: deletedSchedules,
          slots: deletedSlots
        }
      };

    } catch (error) {
      console.error('데모 데이터 초기화 실패:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '데모 데이터 초기화 중 오류가 발생했습니다.',
        deletedCount: {
          schedules: 0,
          slots: 0
        }
      };
    }
  }

  /**
   * Get current seeded data status
   */
  getSeededDataStatus(): {
    hasSeededData: boolean;
    seededSlots: string[];
    seededSchedules: string[];
  } {
    return {
      hasSeededData: this.seededSlots.length > 0 || this.seededSchedules.length > 0,
      seededSlots: [...this.seededSlots],
      seededSchedules: [...this.seededSchedules]
    };
  }

  /**
   * Check if there's any seeded data in the database
   */
  async checkExistingSeededData(): Promise<{
    hasExistingSeededData: boolean;
    existingSlots: number;
    existingSchedules: number;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          hasExistingSeededData: false,
          existingSlots: 0,
          existingSchedules: 0
        };
      }

      // Check for demo slots (slots with "Demo" in name)
      const { data: demoSlots } = await supabase
        .from('slots')
        .select('id')
        .ilike('name', '%Demo%')
        .eq('created_by', user.id);

      // Check for demo schedules
      const { data: demoSchedules } = await supabase
        .from('generated_schedules')
        .select('id')
        .ilike('name', '%Demo%')
        .eq('created_by', user.id);

      return {
        hasExistingSeededData: (demoSlots?.length || 0) > 0 || (demoSchedules?.length || 0) > 0,
        existingSlots: demoSlots?.length || 0,
        existingSchedules: demoSchedules?.length || 0
      };

    } catch (error) {
      console.error('기존 데모 데이터 확인 실패:', error);
      return {
        hasExistingSeededData: false,
        existingSlots: 0,
        existingSchedules: 0
      };
    }
  }
}

export const sandboxService = new SandboxService();
