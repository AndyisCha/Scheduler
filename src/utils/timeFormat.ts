import { useI18nStore } from '../store/i18n'

// Period time definitions
export const PERIOD_TIMES = {
  MWF: {
    1: '09:00-09:50',
    2: '10:00-10:50',
    3: '11:00-11:50',
    4: '13:00-13:50',
    5: '14:00-14:50',
    6: '15:00-15:50',
    7: '16:00-16:50',
    8: '17:00-17:50'
  },
  TT: {
    1: '09:00-09:50',
    2: '10:00-10:50',
    3: '11:00-11:50',
    4: '13:00-13:50',
    5: '14:00-14:50',
    6: '15:00-15:50'
  }
} as const

// Convert 24h time to 12h format
export function formatTime12h(time24: string): string {
  const [start, end] = time24.split('-')
  const [startHour, startMin] = start.split(':').map(Number)
  const [endHour, endMin] = end.split(':').map(Number)
  
  const formatHour = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
  }
  
  return `${formatHour(startHour, startMin)}-${formatHour(endHour, endMin)}`
}

// Get formatted time based on current settings
export function getFormattedTime(
  dayGroup: 'MWF' | 'TT', 
  period: number, 
  timeFormat: '24h' | '12h' = '24h'
): string {
  const time24 = PERIOD_TIMES[dayGroup]?.[period as keyof typeof PERIOD_TIMES[typeof dayGroup]]
  
  if (!time24) {
    return 'N/A'
  }
  
  return timeFormat === '12h' ? formatTime12h(time24) : time24
}

// Get period label with time
export function getPeriodLabel(
  dayGroup: 'MWF' | 'TT',
  period: number,
  language: 'ko' | 'en' = 'ko',
  timeFormat: '24h' | '12h' = '24h'
): string {
  const time = getFormattedTime(dayGroup, period, timeFormat)
  
  if (language === 'ko') {
    return `${period}교시 (${time})`
  } else {
    return `Period ${period} (${time})`
  }
}

// Get day label
export function getDayLabel(day: string, language: 'ko' | 'en' = 'ko'): string {
  const dayMap = {
    ko: {
      'Mon': '월',
      'Tue': '화',
      'Wed': '수',
      'Thu': '목',
      'Fri': '금'
    },
    en: {
      'Mon': 'Mon',
      'Tue': 'Tue',
      'Wed': 'Wed',
      'Thu': 'Thu',
      'Fri': 'Fri'
    }
  }
  
  return dayMap[language]?.[day as keyof typeof dayMap[typeof language]] || day
}

// Get day group label
export function getDayGroupLabel(
  dayGroup: 'MWF' | 'TT', 
  language: 'ko' | 'en' = 'ko'
): string {
  const labels = {
    ko: {
      'MWF': '월수금',
      'TT': '화목'
    },
    en: {
      'MWF': 'Mon/Wed/Fri',
      'TT': 'Tue/Thu'
    }
  }
  
  return labels[language]?.[dayGroup] || dayGroup
}

// Get role label
export function getRoleLabel(
  role: string, 
  language: 'ko' | 'en' = 'ko'
): string {
  const roleMap = {
    ko: {
      'H': '담임',
      'K': '한국어',
      'F': '외국어',
      'EXAM': '시험'
    },
    en: {
      'H': 'Homeroom',
      'K': 'Korean',
      'F': 'Foreign',
      'EXAM': 'Exam'
    }
  }
  
  return roleMap[language]?.[role as keyof typeof roleMap[typeof language]] || role
}

// Get round label
export function getRoundLabel(
  round: number, 
  language: 'ko' | 'en' = 'ko'
): string {
  return language === 'ko' ? `R${round}` : `R${round}`
}

// Format date
export function formatDate(
  date: Date, 
  language: 'ko' | 'en' = 'ko'
): string {
  if (language === 'ko') {
    return date.toLocaleDateString('ko-KR')
  } else {
    return date.toLocaleDateString('en-US')
  }
}

// Format date with time
export function formatDateTime(
  date: Date, 
  language: 'ko' | 'en' = 'ko',
  timeFormat: '24h' | '12h' = '24h'
): string {
  const dateStr = formatDate(date, language)
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h'
  }
  
  const timeStr = date.toLocaleTimeString(
    language === 'ko' ? 'ko-KR' : 'en-US', 
    timeOptions
  )
  
  return language === 'ko' ? `${dateStr} ${timeStr}` : `${timeStr} ${dateStr}`
}

// Hook for easy access to formatting functions
export function useTimeFormatting() {
  const { language, timeFormat } = useI18nStore()
  
  return {
    language,
    timeFormat,
    getFormattedTime: (dayGroup: 'MWF' | 'TT', period: number) => 
      getFormattedTime(dayGroup, period, timeFormat),
    getPeriodLabel: (dayGroup: 'MWF' | 'TT', period: number) => 
      getPeriodLabel(dayGroup, period, language, timeFormat),
    getDayLabel: (day: string) => getDayLabel(day, language),
    getDayGroupLabel: (dayGroup: 'MWF' | 'TT') => getDayGroupLabel(dayGroup, language),
    getRoleLabel: (role: string) => getRoleLabel(role, language),
    getRoundLabel: (round: number) => getRoundLabel(round, language),
    formatDate: (date: Date) => formatDate(date, language),
    formatDateTime: (date: Date) => formatDateTime(date, language, timeFormat)
  }
}


