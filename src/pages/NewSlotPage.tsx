import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSlot } from '../services/db/slots'
import { useToast } from '../components/Toast'

export function NewSlotPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  const navigate = useNavigate()
  const toast = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('슬롯 이름을 입력해주세요.')
      return
    }

    setIsCreating(true)
    
    try {
      const newSlot = await createSlot(name.trim(), description.trim())
      toast.success('새 슬롯이 생성되었습니다.')
      navigate(`/slots/${newSlot.id}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '슬롯 생성 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">새 슬롯 만들기</h1>
        <p className="mt-2 text-gray-600">
          스케줄링에 사용할 새로운 슬롯을 생성하세요
        </p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              슬롯 이름 *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="예: 2024년 1학기 스케줄"
              disabled={isCreating}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              설명
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="슬롯에 대한 간단한 설명을 입력하세요"
              disabled={isCreating}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/slots')}
              disabled={isCreating}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isCreating ? '생성 중...' : '슬롯 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


