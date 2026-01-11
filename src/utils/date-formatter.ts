/**
 * 날짜를 지정된 포맷으로 변환합니다
 * @param date - Date 객체 또는 ISO 8601 형식의 날짜 문자열
 * @param formatString - 포맷 문자열 (예: 'YYYY.MM.DD HH:mm', 'YYYY/MM/DD HH:mm')
 * @returns 포맷된 날짜 문자열
 * 
 * 지원하는 포맷 토큰:
 * - YYYY: 4자리 연도
 * - MM: 2자리 월 (01-12)
 * - DD: 2자리 일 (01-31)
 * - HH: 2자리 시간 (00-23)
 * - mm: 2자리 분 (00-59)
 * - ss: 2자리 초 (00-59)
 */
export function format(date: Date | string | undefined, formatString: string): string {
  if (!date) return ''

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    
    // 유효한 날짜인지 확인
    if (isNaN(dateObj.getTime())) return ''

    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    const hours = String(dateObj.getHours()).padStart(2, '0')
    const minutes = String(dateObj.getMinutes()).padStart(2, '0')
    const seconds = String(dateObj.getSeconds()).padStart(2, '0')

    return formatString
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
  } catch (error) {
    return ''
  }
}

/**
 * ISO 8601 날짜 문자열을 포맷팅합니다
 * @param dateString - ISO 8601 형식의 날짜 문자열 (YYYY-MM-DDTHH:mm)
 * @returns 포맷된 날짜 문자열 (YYYY년 MM월 DD일 HH:mm)
 */
export function formatDeadline(dateString: string | undefined): string {
  return format(dateString, 'YYYY.MM.DD HH:mm')
}

/**
 * 시작일을 포맷팅합니다 (formatDeadline과 동일한 형식)
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns 포맷된 날짜 문자열 (YYYY년 MM월 DD일 HH:mm)
 */
export function formatStartDate(dateString: string | undefined): string {
  return format(dateString, 'YYYY.MM.DD HH:mm')
}

/**
 * 마감일이 지났는지 확인합니다
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns 마감일이 지났으면 true, 아니면 false
 */
export function isOverdue(dateString: string | undefined): boolean {
  if (!dateString) return false

  try {
    const deadline = new Date(dateString)
    const now = new Date()
    
    return deadline < now
  } catch (error) {
    return false
  }
}

/**
 * 시작일이 지났는지 확인합니다 (업무가 시작되었는지)
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns 시작일이 지났으면 true, 아니면 false
 */
export function hasStarted(dateString: string | undefined): boolean {
  if (!dateString) return true // 시작일이 없으면 시작된 것으로 간주

  try {
    const startDate = new Date(dateString)
    const now = new Date()
    
    return startDate <= now
  } catch (error) {
    return true
  }
}

/**
 * 마감일까지 남은 시간을 사람이 읽기 쉬운 형태로 반환합니다
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns 남은 시간 문자열 (예: "2일 후", "3시간 후", "지남")
 */
export function getTimeRemaining(dateString: string | undefined): string {
  if (!dateString) return ''

  try {
    const deadline = new Date(dateString)
    const now = new Date()
    const diff = deadline.getTime() - now.getTime()

    if (diff < 0) {
      return '지남'
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) {
      return `${days}일 후`
    } else if (hours > 0) {
      return `${hours}시간 후`
    } else if (minutes > 0) {
      return `${minutes}분 후`
    } else {
      return '곧 마감'
    }
  } catch (error) {
    return ''
  }
}

/**
 * 시작일까지 남은/지난 시간을 사람이 읽기 쉬운 형태로 반환합니다
 * @param dateString - ISO 8601 형식의 날짜 문자열
 * @returns 시간 문자열 (예: "2일 후 시작", "3시간 전 시작", "진행 중")
 */
export function getStartStatus(dateString: string | undefined): string {
  if (!dateString) return ''

  try {
    const startDate = new Date(dateString)
    const now = new Date()
    const diff = startDate.getTime() - now.getTime()

    if (diff < 0) {
      // 이미 시작됨
      const absDiff = Math.abs(diff)
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24))
      
      if (days > 0) {
        return `${days}일 전 시작`
      } else {
        return '진행 중'
      }
    } else {
      // 아직 시작 안됨
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      
      if (days > 0) {
        return `${days}일 후 시작`
      } else if (hours > 0) {
        return `${hours}시간 후 시작`
      } else {
        return '곧 시작'
      }
    }
  } catch (error) {
    return ''
  }
}

/**
 * 전체 업무 기간을 표시합니다
 * @param startDate - 시작일
 * @param deadline - 마감일
 * @returns 기간 문자열 (예: "3일간", "2주간")
 */
export function getTaskDuration(startDate: string | undefined, deadline: string | undefined): string {
  if (!startDate || !deadline) return ''

  try {
    const start = new Date(startDate)
    const end = new Date(deadline)
    const diff = end.getTime() - start.getTime()

    if (diff <= 0) return ''

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days >= 7) {
      const weeks = Math.floor(days / 7)
      return `${weeks}주간`
    } else if (days > 0) {
      return `${days}일간`
    } else if (hours > 0) {
      return `${hours}시간`
    } else {
      return '단기'
    }
  } catch (error) {
    return ''
  }
}
