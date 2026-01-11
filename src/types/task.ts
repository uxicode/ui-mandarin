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

