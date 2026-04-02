export interface TaskScores {
  importance: number // 1~5
  urgency: number // 1~5
}

export interface Task {
  id: string
  title: string
  description?: string
  scores: TaskScores
  completed: boolean
  startDate?: string // ISO 8601 format (YYYY-MM-DDTHH:mm)
  deadline?: string // ISO 8601 format (YYYY-MM-DDTHH:mm)
  /** 서버/로컬 생성 시각 (ISO 8601). 일정 없을 때 캘린더 동기화에 사용 */
  createdAt?: string
  updatedAt?: string // ISO 8601, 완료일 정렬 등에 사용
}

export interface ComputedScores {
  importanceScore: number // -2 ~ +2 (1점=-2, 2점=-1, 3점=0, 4점=+1, 5점=+2)
  urgencyScore: number // -2 ~ +2 (1점=-2, 2점=-1, 3점=0, 4점=+1, 5점=+2)
}

export type Quadrant = 'A' | 'B' | 'C' | 'D'

export interface TaskWithComputed extends Task {
  computedScores: ComputedScores
  quadrant: Quadrant
}

