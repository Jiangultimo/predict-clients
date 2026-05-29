// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
})

function enterPredictionRoom() {
  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: /Start my forecast desk/ }))
  fireEvent.click(screen.getByRole('button', { name: '盘口价格' }))
  fireEvent.click(screen.getByRole('button', { name: '一周内' }))
  fireEvent.click(screen.getByRole('button', { name: '反向证据' }))
  fireEvent.click(screen.getByRole('button', { name: '推荐可以关注的分身' }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Follow twin' })[0])
  fireEvent.click(screen.getByRole('button', { name: '进入 Prediction Room' }))
}

describe('Prediction room market actions', () => {
  it('marks predicted and watched markets with the requested status labels', () => {
    enterPredictionRoom()

    expect(screen.getByText('已预测')).toBeTruthy()
    expect(screen.getByText('关注中')).toBeTruthy()
    expect(screen.queryByText(/已买入/)).toBeNull()
  })

  it('shows watched market direction choices directly without an expand step', () => {
    enterPredictionRoom()

    const watchedCard = screen.getByText('关注中').closest('.market-pick-card')

    expect(watchedCard).not.toBeNull()
    expect(screen.queryByRole('button', { name: '展开 UP / DOWN' })).toBeNull()
    expect(within(watchedCard as HTMLElement).getByRole('button', { name: /UP/ })).toBeTruthy()
    expect(within(watchedCard as HTMLElement).getByRole('button', { name: /DOWN/ })).toBeTruthy()
  })

  it('shows both sides on predicted markets and explains side status in tooltips', async () => {
    enterPredictionRoom()

    const predictedCard = screen.getByText('已预测').closest('.market-pick-card')
    const yesButton = within(predictedCard as HTMLElement).getByRole('button', { name: /YES/ })
    const noButton = within(predictedCard as HTMLElement).getByRole('button', { name: /NO/ })

    expect(predictedCard).not.toBeNull()
    expect(yesButton).toBeTruthy()
    expect(noButton).toBeTruthy()
    expect(yesButton.querySelector('.twin-pick-dot')).toBeTruthy()
    expect(noButton.querySelector('.twin-pick-dot')).toBeNull()
    expect(within(predictedCard as HTMLElement).queryByText('分身已预测')).toBeNull()
    expect(within(predictedCard as HTMLElement).queryByText('反向观点')).toBeNull()

    fireEvent.focus(yesButton)

    expect((await screen.findAllByText('分身已预测')).length).toBeGreaterThan(0)
  })

  it('joins owned agents immediately when selected from the plus picker', () => {
    enterPredictionRoom()

    fireEvent.click(screen.getByRole('button', { name: '添加 agent 员工' }))

    const picker = screen.getByRole('dialog', { name: 'Agent employees' })

    fireEvent.click(within(picker).getByLabelText('Quant Scout'))
    fireEvent.click(within(picker).getByLabelText('Risk Guard'))

    const stack = screen.getByLabelText('已选择的 agent 员工')

    expect(within(stack).getByText('QS')).toBeTruthy()
    expect(within(stack).getByText('RG')).toBeTruthy()
  })

  it('closes owned agent picker when the chat input is clicked', () => {
    enterPredictionRoom()

    fireEvent.click(screen.getByRole('button', { name: '添加 agent 员工' }))
    expect(screen.getByRole('dialog', { name: 'Agent employees' })).toBeTruthy()

    fireEvent.click(screen.getByPlaceholderText('追问这个分身：为什么概率波动、怎么看、风险在哪里...'))

    expect(screen.queryByRole('dialog', { name: 'Agent employees' })).toBeNull()
  })

  it('opens a compact @ agent list, filters it, and selects with keyboard', () => {
    enterPredictionRoom()

    const input = screen.getByPlaceholderText('追问这个分身：为什么概率波动、怎么看、风险在哪里...')

    fireEvent.change(input, { target: { value: '@ri' } })

    const mentionList = screen.getByRole('listbox', { name: '@ agent list' })

    expect(within(mentionList).getByRole('option', { name: /Risk Guard/ })).toBeTruthy()
    expect(within(mentionList).queryByRole('option', { name: /Quant Scout/ })).toBeNull()

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.queryByLabelText('已选择的 agent 员工')).toBeNull()
    expect(screen.queryByRole('listbox', { name: '@ agent list' })).toBeNull()
    expect((input as HTMLInputElement).value).toBe('@Risk Guard ')

    fireEvent.submit(input.closest('form') as HTMLFormElement)

    const stack = screen.getByLabelText('已选择的 agent 员工')

    expect(within(stack).getByText('RG')).toBeTruthy()
  })

  it('colors sent @ agent blocks and matching agent replies by the addressed agent', () => {
    enterPredictionRoom()

    const input = screen.getByPlaceholderText('追问这个分身：为什么概率波动、怎么看、风险在哪里...')

    fireEvent.change(input, { target: { value: '@ri' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    const sentMention = screen.getByText('@Risk Guard')
    const agentReply = screen
      .getByText('Risk Guard · 风险守卫')
      .closest('.chat-bubble')

    expect(sentMention.classList.contains('agent-mention-token')).toBe(true)
    expect(sentMention.classList.contains('accent-red')).toBe(true)
    expect(agentReply?.classList.contains('accent-red')).toBe(true)
  })

  it('keeps repeated @ of an already joined agent as the current reply context', () => {
    enterPredictionRoom()

    const input = screen.getByPlaceholderText('追问这个分身：为什么概率波动、怎么看、风险在哪里...')

    function mentionRiskGuardAndSend() {
      fireEvent.change(input, { target: { value: '@ri' } })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'Enter' })
      fireEvent.submit(input.closest('form') as HTMLFormElement)
    }

    mentionRiskGuardAndSend()
    mentionRiskGuardAndSend()

    const sentMentions = screen.getAllByText('@Risk Guard')
    const agentReplies = screen.getAllByText('Risk Guard · 风险守卫')

    expect(sentMentions).toHaveLength(2)
    expect(sentMentions[1].classList.contains('agent-mention-token')).toBe(true)
    expect(sentMentions[1].classList.contains('accent-red')).toBe(true)
    expect(agentReplies).toHaveLength(2)
    expect(
      agentReplies[1].closest('.chat-bubble')?.classList.contains('accent-red'),
    ).toBe(true)
  })

  it('closes owned agent picker when clicking outside it', () => {
    enterPredictionRoom()

    fireEvent.click(screen.getByRole('button', { name: '添加 agent 员工' }))
    expect(screen.getByRole('dialog', { name: 'Agent employees' })).toBeTruthy()

    fireEvent.pointerDown(screen.getByText('Live market signal from digital twin'))

    expect(screen.queryByRole('dialog', { name: 'Agent employees' })).toBeNull()
  })
})
