import { describe, expect, it } from 'vitest'
import { canEnterRoom, createAgentReply } from './flow'

describe('flow gates', () => {
  it('requires at least one followed forecaster twin before entering the room', () => {
    expect(canEnterRoom([])).toBe(false)
    expect(canEnterRoom(['avery-polls'])).toBe(true)
  })
})

describe('agent replies', () => {
  it('frames a followed forecaster twin as an explainable probability signal', () => {
    const reply = createAgentReply({
      agentName: 'Avery Polls',
      postTitle: 'Nominee market is repricing',
      userPrompt: '为什么现在概率会动？',
    })

    expect(reply).toContain('Avery Polls')
    expect(reply).toContain('数字分身')
    expect(reply).toContain('Nominee market is repricing')
    expect(reply).toContain('为什么')
    expect(reply).toContain('概率')
  })

  it('includes selected owned agents as collaborators in the reply', () => {
    const reply = createAgentReply({
      agentName: 'Avery Polls',
      collaboratorNames: ['Quant Scout', 'Risk Guard'],
      postTitle: 'Nominee market is repricing',
      userPrompt: '帮我一起判断',
    })

    expect(reply).toContain('Quant Scout')
    expect(reply).toContain('Risk Guard')
    expect(reply).toContain('协作')
  })

  it('leans into the mentioned owned agent specialty when one is addressed', () => {
    const reply = createAgentReply({
      agentName: 'Avery Polls',
      collaboratorNames: ['Risk Guard'],
      leadCollaborator: {
        name: 'Risk Guard',
        role: '风险守卫',
        specialty: '仓位限制、结算规则、反向证据',
      },
      postTitle: 'Nominee market is repricing',
      userPrompt: '@Risk Guard 帮我看风险',
    })

    expect(reply).toContain('Risk Guard')
    expect(reply).toContain('我是 Risk Guard')
    expect(reply).not.toContain('我是 Avery Polls 的数字分身')
    expect(reply).toContain('仓位限制')
    expect(reply).toContain('结算规则')
    expect(reply).toContain('反向证据')
  })
})
