// Create slot modal component
import { useState } from 'react'

interface CreateSlotModalProps {
  onClose: () => void
  onConfirm: (name: string, description: string, dayGroup: 'MWF' | 'TT') => void
}

export function CreateSlotModal({ onClose, onConfirm }: CreateSlotModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dayGroup, setDayGroup] = useState<'MWF' | 'TT'>('MWF')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(name.trim(), description.trim(), dayGroup)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          새 슬롯 생성
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="slot-name" className="block text-sm font-medium text-gray-700 mb-1">
              슬롯 이름 *
            </label>
            <input
              id="slot-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 2024년 1학기 MWF"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="slot-description" className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              id="slot-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="슬롯에 대한 설명을 입력하세요"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Day Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              요일 그룹 *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="MWF"
                  checked={dayGroup === 'MWF'}
                  onChange={(e) => setDayGroup(e.target.value as 'MWF')}
                  className="mr-2"
                  disabled={isSubmitting}
                />
                <span className="text-sm">MWF (월, 수, 금)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="TT"
                  checked={dayGroup === 'TT'}
                  onChange={(e) => setDayGroup(e.target.value as 'TT')}
                  className="mr-2"
                  disabled={isSubmitting}
                />
                <span className="text-sm">TT (화, 목)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


