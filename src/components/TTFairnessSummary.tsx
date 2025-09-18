// TT Fairness Summary table

interface TTFairnessSummaryProps {
  fairness: {
    perTeacher: Record<string, { H: number; K: number; F: number; total: number }>
    deviation: { H: number; K: number; F: number; total: number }
  }
}

export function TTFairnessSummary({ fairness }: TTFairnessSummaryProps) {
  const teachers = Object.keys(fairness.perTeacher)
  
  const getDeviationColor = (deviation: number, maxAcceptable: number = 3) => {
    if (deviation <= maxAcceptable) return 'text-green-600'
    if (deviation <= maxAcceptable * 2) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getDeviationBackground = (deviation: number, maxAcceptable: number = 3) => {
    if (deviation <= maxAcceptable) return 'bg-green-50'
    if (deviation <= maxAcceptable * 2) return 'bg-yellow-50'
    return 'bg-red-50'
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">주간 공정성 요약</h3>
      
      {/* Deviation Summary */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-3">편차 요약</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'H', label: '담임 (H)', deviation: fairness.deviation.H },
            { key: 'K', label: '한국인 (K)', deviation: fairness.deviation.K },
            { key: 'F', label: '외국인 (F)', deviation: fairness.deviation.F },
            { key: 'total', label: '전체', deviation: fairness.deviation.total }
          ].map(({ key, label, deviation }) => (
            <div key={key} className={`p-3 rounded border ${getDeviationBackground(deviation)}`}>
              <div className="text-sm font-medium text-gray-700">{label}</div>
              <div className={`text-lg font-bold ${getDeviationColor(deviation)}`}>
                {deviation}
              </div>
              <div className="text-xs text-gray-600">
                {deviation <= 3 ? '양호' : deviation <= 6 ? '주의' : '개선 필요'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Teacher Table */}
      <div>
        <h4 className="text-md font-medium mb-3">교사별 배정 현황</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">교사</th>
                <th className="text-center p-3 font-medium">담임 (H)</th>
                <th className="text-center p-3 font-medium">한국인 (K)</th>
                <th className="text-center p-3 font-medium">외국인 (F)</th>
                <th className="text-center p-3 font-medium">전체</th>
                <th className="text-center p-3 font-medium">편차</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(teacher => {
                const stats = fairness.perTeacher[teacher]
                const maxTotal = Math.max(...Object.values(fairness.perTeacher).map(p => p.total))
                const minTotal = Math.min(...Object.values(fairness.perTeacher).map(p => p.total))
                const teacherDeviation = maxTotal - minTotal
                
                return (
                  <tr key={teacher} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{teacher}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        stats.H > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {stats.H}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        stats.K > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {stats.K}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        stats.F > 0 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {stats.F}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        stats.total > 0 ? 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {stats.total}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs font-medium ${
                        stats.total === maxTotal || stats.total === minTotal ? 
                          getDeviationColor(teacherDeviation) : 'text-gray-600'
                      }`}>
                        {stats.total === maxTotal ? `+${stats.total - minTotal}` :
                         stats.total === minTotal ? `-${maxTotal - stats.total}` : '-'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="font-medium">총 교사:</span>
            <span className="ml-1">{teachers.length}명</span>
          </div>
          <div>
            <span className="font-medium">총 배정:</span>
            <span className="ml-1">{Object.values(fairness.perTeacher).reduce((sum, p) => sum + p.total, 0)}회</span>
          </div>
          <div>
            <span className="font-medium">평균:</span>
            <span className="ml-1">{Math.round(Object.values(fairness.perTeacher).reduce((sum, p) => sum + p.total, 0) / teachers.length)}회</span>
          </div>
          <div>
            <span className="font-medium">공정성:</span>
            <span className={`ml-1 ${getDeviationColor(fairness.deviation.total)}`}>
              {fairness.deviation.total <= 3 ? '양호' : fairness.deviation.total <= 6 ? '보통' : '개선 필요'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
