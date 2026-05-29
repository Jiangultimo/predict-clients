import { describe, expect, it } from 'vitest'
import { recommendedAgents } from './content'

describe('recommendedAgents', () => {
  it('mocks twelve forecaster twins', () => {
    expect(recommendedAgents).toHaveLength(12)
    expect(new Set(recommendedAgents.map((agent) => agent.id)).size).toBe(12)
  })

  it('attaches actionable prediction markets to every twin', () => {
    for (const agent of recommendedAgents) {
      expect(agent.marketPicks.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('requires watched markets to expand into user-selected directions', () => {
    let boughtMarkets = 0
    let watchedMarkets = 0

    for (const agent of recommendedAgents) {
      for (const pick of agent.marketPicks) {
        const choices = (
          pick as {
            copyChoices?: Array<{
              label: string
              action: string
            }>
          }
        ).copyChoices

        if (pick.position === 'bought') {
          boughtMarkets += 1
          expect(pick.canCopy).toBe(true)
          expect(pick.copyAction).toBeTruthy()
          expect(choices).toBeUndefined()
        } else {
          watchedMarkets += 1
          expect(pick.canCopy).toBe(false)
          expect(pick.copyAction).toBeUndefined()
          expect(choices?.map((choice) => choice.label)).toEqual(['UP', 'DOWN'])
          expect(choices?.every((choice) => choice.action)).toBe(true)
        }
      }
    }

    expect(boughtMarkets).toBeGreaterThan(0)
    expect(watchedMarkets).toBeGreaterThan(0)
  })
})
