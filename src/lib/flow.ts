export type AgentReplyInput = {
  agentName: string
  collaboratorNames?: string[]
  leadCollaborator?: {
    name: string
    role: string
    specialty: string
  }
  postTitle: string
  userPrompt: string
}

export function canEnterRoom(followedAgentIds: string[]) {
  return followedAgentIds.length > 0
}

export function createAgentReply({
  agentName,
  collaboratorNames = [],
  leadCollaborator,
  postTitle,
  userPrompt,
}: AgentReplyInput) {
  const asksWhy = /为什么|why|reason/i.test(userPrompt)
  const collaboratorLine =
    collaboratorNames.length > 0
      ? `这次我会让 ${collaboratorNames.join('、')} 参与协作：一个负责补数据和规则，一个负责检查反向证据与仓位风险。`
      : null
  const leadCollaboratorLine = leadCollaborator
    ? `${leadCollaborator.name} 会主导这次回答，重点按「${leadCollaborator.specialty}」来拆解，而不是泛泛复述市场情绪。`
    : null
  const openingLine = leadCollaborator
    ? `我是 ${leadCollaborator.name}，这次我会以「${leadCollaborator.role}」的视角看「${postTitle}」。`
    : `我是 ${agentName} 的数字分身。关于「${postTitle}」，我会把它当成一个概率变化信号来看。`

  return [
    openingLine,
    collaboratorLine,
    leadCollaboratorLine,
    asksWhy
      ? '如果你问“为什么现在波动”，我的判断是：价格不是单纯转述新闻，而是在提前计入一个更清晰的事件路径。'
      : '这次变化背后更重要的是我对数据、日程、流动性和结算规则的重新权衡。',
    '我的概率推断是：当前价格在测试社区共识，同时提醒你把注意力从单点 headline 转向后续确认事件。',
  ]
    .filter(Boolean)
    .join('\n\n')
}
