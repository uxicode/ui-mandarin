import type { Task, ComputedScores, Quadrant, TaskWithComputed } from '@/types/task'

export function calculateScores(scores: Task['scores']): ComputedScores {
  // 1~5점을 -2~+2로 변환 (3점이 기준점 0)
  return {
    importanceScore: scores.importance - 3,
    urgencyScore: scores.urgency - 3,
  }
}

export function getQuadrant(computedScores: ComputedScores): Quadrant {
  const { importanceScore, urgencyScore } = computedScores

  if (importanceScore >= 0 && urgencyScore >= 0) return 'A'
  if (importanceScore >= 0 && urgencyScore < 0) return 'B'
  if (importanceScore < 0 && urgencyScore >= 0) return 'C'
  return 'D'
}

export function computeTask(task: Task): TaskWithComputed {
  const computedScores = calculateScores(task.scores)
  const quadrant = getQuadrant(computedScores)

  return {
    ...task,
    computedScores,
    quadrant,
  }
}

