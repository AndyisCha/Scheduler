import React, { useState } from 'react';
import { Card } from './ui/Card';

export const DatabasePerformanceGuide: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    {
      id: 'indexes',
      title: '인덱스 최적화',
      icon: '📊',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">필수 인덱스</h4>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
{`-- generated_schedules 테이블 인덱스
CREATE INDEX CONCURRENTLY idx_generated_schedules_slot_id 
ON generated_schedules (slot_id);

CREATE INDEX CONCURRENTLY idx_generated_schedules_created_at 
ON generated_schedules (created_at DESC);

CREATE INDEX CONCURRENTLY idx_generated_schedules_schedule_type 
ON generated_schedules (schedule_type);

CREATE INDEX CONCURRENTLY idx_generated_schedules_created_by 
ON generated_schedules (created_by);

-- 복합 인덱스 (성능 최적화)
CREATE INDEX CONCURRENTLY idx_generated_schedules_composite 
ON generated_schedules (slot_id, schedule_type, created_at DESC);`}
              </pre>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">슬롯 관련 인덱스</h4>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
{`-- slots 테이블 인덱스
CREATE INDEX CONCURRENTLY idx_slots_created_by 
ON slots (created_by);

CREATE INDEX CONCURRENTLY idx_slots_created_at 
ON slots (created_at DESC);

-- manual_edits 테이블 인덱스
CREATE INDEX CONCURRENTLY idx_manual_edits_snapshot_id 
ON manual_edits (snapshot_id);

CREATE INDEX CONCURRENTLY idx_manual_edits_edited_by 
ON manual_edits (edited_by);`}
              </pre>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'monitoring',
      title: '느린 쿼리 모니터링',
      icon: '⚡',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">pg_stat_statements 활성화</h4>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
{`-- postgresql.conf 설정
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = 'all'

-- 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 느린 쿼리 조회
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE mean_time > 1000  -- 1초 이상
ORDER BY mean_time DESC
LIMIT 10;`}
              </pre>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">쿼리 성능 분석</h4>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
{`-- EXPLAIN ANALYZE 사용 예시
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) 
SELECT * FROM generated_schedules 
WHERE slot_id = 'uuid-here' 
ORDER BY created_at DESC 
LIMIT 10;

-- 인덱스 사용 여부 확인
EXPLAIN (ANALYZE, BUFFERS) 
SELECT s.*, gs.created_at as generated_at
FROM slots s
JOIN generated_schedules gs ON s.id = gs.slot_id
WHERE s.created_by = 'user-id'
ORDER BY gs.created_at DESC;`}
              </pre>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'maintenance',
      title: '데이터베이스 유지보수',
      icon: '🔧',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">정기적인 VACUUM 및 ANALYZE</h4>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
{`-- 자동 VACUUM 설정 (postgresql.conf)
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min

-- 수동 정리 (필요시)
VACUUM ANALYZE generated_schedules;
VACUUM ANALYZE slots;
VACUUM ANALYZE manual_edits;

-- 통계 정보 업데이트
ANALYZE generated_schedules;
ANALYZE slots;`}
              </pre>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">오래된 데이터 아카이브</h4>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
{`-- 90일 이상 된 메트릭스 아카이브
CREATE TABLE generated_schedules_archive (
  LIKE generated_schedules INCLUDING ALL
);

-- 오래된 데이터 이동
INSERT INTO generated_schedules_archive 
SELECT * FROM generated_schedules 
WHERE created_at < NOW() - INTERVAL '90 days';

-- 원본에서 삭제
DELETE FROM generated_schedules 
WHERE created_at < NOW() - INTERVAL '90 days';`}
              </pre>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'optimization',
      title: '쿼리 최적화 팁',
      icon: '🚀',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">효율적인 쿼리 작성</h4>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">✅ 좋은 예시</div>
                <pre className="text-xs text-green-700 dark:text-green-300">
{`-- 인덱스 활용
SELECT * FROM generated_schedules 
WHERE slot_id = $1 AND schedule_type = $2
ORDER BY created_at DESC LIMIT 10;`}
                </pre>
              </div>
              
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">❌ 피해야 할 예시</div>
                <pre className="text-xs text-red-700 dark:text-red-300">
{`-- 전체 테이블 스캔 유발
SELECT * FROM generated_schedules 
WHERE created_at > '2024-01-01'
ORDER BY created_at DESC;`}
                </pre>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">페이지네이션 최적화</h4>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
{`-- 커서 기반 페이지네이션 (권장)
SELECT * FROM generated_schedules 
WHERE slot_id = $1 
  AND created_at < $2  -- 마지막 레코드의 created_at
ORDER BY created_at DESC 
LIMIT 20;

-- OFFSET 기반 페이지네이션 (비권장 - 느림)
SELECT * FROM generated_schedules 
WHERE slot_id = $1 
ORDER BY created_at DESC 
LIMIT 20 OFFSET $2;`}
              </pre>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        데이터베이스 성능 최적화 가이드
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        애플리케이션 성능을 향상시키기 위한 데이터베이스 최적화 방법을 안내합니다.
      </p>

      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{section.icon}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {section.title}
                </span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  expandedSection === section.id ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSection === section.id && (
              <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                <div className="pt-4">
                  {section.content}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="flex items-start space-x-3">
          <span className="text-blue-600 dark:text-blue-400 text-xl">💡</span>
          <div>
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              추가 권장사항
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• 정기적인 쿼리 성능 모니터링 및 분석</li>
              <li>• 데이터베이스 연결 풀 크기 최적화</li>
              <li>• Supabase 대시보드에서 쿼리 성능 메트릭 확인</li>
              <li>• 프로덕션 환경에서 인덱스 생성 시 CONCURRENTLY 옵션 사용</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
};
