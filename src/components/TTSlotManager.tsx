// TT Slot Manager (placeholder for future TT slot management)

interface TTSlotManagerProps {
  selectedSlotId?: string
  onSlotSelect?: (slotId: string) => void
}

export function TTSlotManager({}: TTSlotManagerProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-3">TT 슬롯 관리</h3>
      <p className="text-gray-600 text-sm">
        TT 슬롯 관리는 추후 구현 예정입니다. 현재는 Mock 데이터를 사용합니다.
      </p>
    </div>
  )
}
