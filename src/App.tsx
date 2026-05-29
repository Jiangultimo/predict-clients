import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  Cpu,
  Eye,
  MessageCircle,
  Network,
  Plus,
  Search,
  Send,
  Sparkles,
  Terminal,
  UserPlus,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import marketRoomHero from './assets/mastra-agent-network-hero.png'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './components/ui/tooltip'
import {
  onboardingPrompts,
  ownedAgents,
  recommendedAgents,
  type OwnedAgent,
  type PersonaAgent,
} from './data/content'
import { useTypewriter } from './hooks/useTypewriter'
import { canEnterRoom, createAgentReply } from './lib/flow'
import './App.css'

type Step = 'landing' | 'onboarding' | 'follow' | 'room'

type ChatMessage = {
  id: string
  role: 'user' | 'agent' | 'system'
  text: string
  agentId?: string
  agentContext?: ChatAgentContext
  mentions?: ChatAgentContext[]
  typewriter?: boolean
}

type ChatAgentContext = Pick<
  OwnedAgent,
  'accent' | 'id' | 'name' | 'role' | 'specialty'
>

const starterQuestions = [
  '为什么现在概率会动？',
  '这个市场背后的核心变量是什么？',
  '反向证据和结算风险在哪里？',
]

const landingSignals = [
  'Election market 57%',
  'Rate cut YES 49%',
  'AI bill YES 31%',
  'Consensus gap 12pp',
  'Liquidity steady',
]

const onboardingStages = [
  { label: 'Market', text: '判断信号源' },
  { label: 'Horizon', text: '周期与风险' },
  { label: 'Rules', text: '规则记忆' },
  { label: 'Profile', text: '预测画像' },
]

function getMentionQuery(value: string) {
  const mentionStart = value.lastIndexOf('@')

  if (mentionStart < 0) {
    return null
  }

  const query = value.slice(mentionStart + 1)

  if (/\s/.test(query)) {
    return null
  }

  return {
    mentionStart,
    query,
  }
}

function matchesOwnedAgent(agent: OwnedAgent, query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [agent.name, agent.initials, agent.role, agent.specialty]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery)
}

function toChatAgentContext(agent: OwnedAgent): ChatAgentContext {
  return {
    accent: agent.accent,
    id: agent.id,
    name: agent.name,
    role: agent.role,
    specialty: agent.specialty,
  }
}

function App() {
  const [step, setStep] = useState<Step>('landing')
  const [onboardingAnswers, setOnboardingAnswers] = useState<string[]>([])
  const [customAnswer, setCustomAnswer] = useState('')
  const [followedAgentIds, setFollowedAgentIds] = useState<string[]>([])
  const [activeAgentId, setActiveAgentId] = useState(recommendedAgents[0].id)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [copiedPickIds, setCopiedPickIds] = useState<string[]>([])
  const [agentPickerOpen, setAgentPickerOpen] = useState(false)
  const [selectedOwnedAgentIds, setSelectedOwnedAgentIds] = useState<string[]>([])
  const [draftOwnedAgentIds, setDraftOwnedAgentIds] = useState<string[]>([])

  const followedAgents = useMemo(
    () =>
      recommendedAgents.filter((agent) => followedAgentIds.includes(agent.id)),
    [followedAgentIds],
  )

  const activeAgent =
    recommendedAgents.find((agent) => agent.id === activeAgentId) ??
    recommendedAgents[0]

  const selectedOwnedAgents = useMemo(
    () => ownedAgents.filter((agent) => selectedOwnedAgentIds.includes(agent.id)),
    [selectedOwnedAgentIds],
  )

  const currentPrompt = onboardingPrompts[onboardingAnswers.length]
  const profileReady = onboardingAnswers.length >= onboardingPrompts.length
  const readyForRoom = canEnterRoom(followedAgentIds)

  function answerOnboarding(answer: string) {
    if (!answer.trim()) {
      return
    }

    setOnboardingAnswers((current) => [...current, answer.trim()])
    setCustomAnswer('')
  }

  function toggleFollow(agentId: string) {
    setFollowedAgentIds((current) =>
      current.includes(agentId)
        ? current.filter((id) => id !== agentId)
        : [...current, agentId],
    )
  }

  function enterRoom() {
    if (!readyForRoom) {
      return
    }

    const firstAgent = followedAgents[0] ?? recommendedAgents[0]
    setActiveAgentId(firstAgent.id)
    setMessages([
      {
        id: 'system-welcome',
        role: 'system',
        text: `${firstAgent.name} 的数字分身已经上线。最新预测市场信号已推送，你可以直接追问动因、变量和风险。`,
        agentId: firstAgent.id,
      },
    ])
    setStep('room')
  }

  function askAgent(question: string) {
    if (!question.trim()) {
      return
    }

    const timestamp = Date.now()
    const joinedOwnedAgentIds = Array.from(
      new Set([...selectedOwnedAgentIds, ...draftOwnedAgentIds]),
    )
    const joinedOwnedAgents = ownedAgents.filter((agent) =>
      joinedOwnedAgentIds.includes(agent.id),
    )
    const draftOwnedAgents = ownedAgents.filter((agent) =>
      draftOwnedAgentIds.includes(agent.id),
    )
    const leadOwnedAgent = draftOwnedAgents[0]
    const messageMentions = draftOwnedAgents.map(toChatAgentContext)
    const leadAgentContext = leadOwnedAgent
      ? toChatAgentContext(leadOwnedAgent)
      : undefined

    setMessages((current) => [
      ...current,
      {
        id: `user-${timestamp}`,
        role: 'user',
        text: question.trim(),
        mentions: messageMentions,
      },
      {
        id: `agent-${timestamp}`,
        role: 'agent',
        text: createAgentReply({
          agentName: activeAgent.name,
          collaboratorNames: joinedOwnedAgents.map((agent) => agent.name),
          leadCollaborator: leadOwnedAgent
            ? {
                name: leadOwnedAgent.name,
                role: leadOwnedAgent.role,
                specialty: leadOwnedAgent.specialty,
              }
            : undefined,
          postTitle: activeAgent.latestPost.title,
          userPrompt: question,
        }),
        agentId: activeAgent.id,
        agentContext: leadAgentContext,
        typewriter: true,
      },
    ])
    setSelectedOwnedAgentIds(joinedOwnedAgentIds)
    setDraftOwnedAgentIds([])
    setChatInput('')
    setAgentPickerOpen(false)
  }

  function handleChatInput(value: string) {
    setChatInput(value)
  }

  function toggleCopyTrade(pickId: string) {
    const choicePrefix = pickId.includes(':') ? `${pickId.split(':')[0]}:` : null

    setCopiedPickIds((current) =>
      current.includes(pickId)
        ? current.filter((id) => id !== pickId)
        : [
            ...(choicePrefix
              ? current.filter((id) => !id.startsWith(choicePrefix))
              : current),
            pickId,
          ],
    )
  }

  function toggleDraftOwnedAgent(agentId: string) {
    setDraftOwnedAgentIds((current) =>
      current.includes(agentId)
        ? current.filter((id) => id !== agentId)
        : [...current, agentId],
    )
  }

  function toggleOwnedAgent(agentId: string) {
    setSelectedOwnedAgentIds((current) =>
      current.includes(agentId)
        ? current.filter((id) => id !== agentId)
        : [...current, agentId],
    )
  }

  return (
    <TooltipProvider
      delayDuration={0}
      disableHoverableContent
      skipDelayDuration={0}
    >
      <main className={`app-shell step-${step}`}>
        {step === 'landing' && <Landing onStart={() => setStep('onboarding')} />}

        {step === 'onboarding' && (
          <Onboarding
            answers={onboardingAnswers}
            currentPrompt={currentPrompt}
            customAnswer={customAnswer}
            profileReady={profileReady}
            onAnswer={answerOnboarding}
            onCustomAnswer={setCustomAnswer}
            onNext={() => setStep('follow')}
          />
        )}

        {step === 'follow' && (
          <FollowSetup
            followedAgentIds={followedAgentIds}
            onToggleFollow={toggleFollow}
            onNext={enterRoom}
          />
        )}

        {step === 'room' && (
          <PredictionRoom
            activeAgent={activeAgent}
            agentPickerOpen={agentPickerOpen}
            copiedPickIds={copiedPickIds}
            followedAgents={followedAgents}
            messages={messages}
            draftOwnedAgentIds={draftOwnedAgentIds}
            selectedOwnedAgentIds={selectedOwnedAgentIds}
            selectedOwnedAgents={selectedOwnedAgents}
            chatInput={chatInput}
            onAgentPickerOpen={setAgentPickerOpen}
            onChatInput={handleChatInput}
            onAskAgent={askAgent}
            onCopyTrade={toggleCopyTrade}
            onToggleDraftOwnedAgent={toggleDraftOwnedAgent}
            onToggleOwnedAgent={toggleOwnedAgent}
            onSelectAgent={(agent) => {
              setActiveAgentId(agent.id)
              setMessages([
                {
                  id: `system-${agent.id}`,
                  role: 'system',
                  text: `${agent.name} 的数字分身切换完成。最新预测市场信号已推送到中间频道。`,
                  agentId: agent.id,
                },
              ])
            }}
          />
        )}
      </main>
    </TooltipProvider>
  )
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <>
      <section className="landing-hero">
        <img
          className="landing-visual"
          src={marketRoomHero}
          alt="Prediction market workspace background"
        />
        <div className="hero-overlay" />
        <div className="hero-motion" aria-hidden="true">
          <div className="scan-beam" />
          <div className="signal-vector vector-a" />
          <div className="signal-vector vector-b" />
          <div className="hud-panel hud-panel-a">
            <span>ODDS GRAPH</span>
            <strong>73%</strong>
          </div>
          <div className="hud-panel hud-panel-b">
            <span>MARKET HEAT</span>
            <strong>8.6</strong>
          </div>
          <div className="data-column column-a">
            <span>0101</span>
            <span>1100</span>
            <span>ODDS</span>
            <span>57%</span>
          </div>
          <div className="data-column column-b">
            <span>FLOW</span>
            <span>12PP</span>
            <span>RISK</span>
            <span>0011</span>
          </div>
        </div>
        <nav className="topbar" aria-label="Primary">
          <div className="brand-mark">
            <Network size={18} />
            <span>PredictDesk</span>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" type="button">
              <Eye size={16} />
              Live Markets
            </button>
            <button className="ghost-button" type="button">
              <Search size={16} />
              Forecasters
            </button>
          </div>
        </nav>

        <div className="hero-content">
          <div className="status-pill">
            <span className="pulse-dot" />
            prediction market desk · live probability workspace
          </div>
          <h1>
            <span>Track events.</span>
            <span>Price outcomes.</span>
          </h1>
          <p>
            一个面向预测市场用户的 AI 概率工作台：关注在选举、宏观、政策、体育等领域有判断力的人，
            让他的数字分身解释概率波动、新闻催化、流动性和结算规则。
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={onStart}>
              <Sparkles size={18} />
              Start my forecast desk
              <ArrowRight size={18} />
            </button>
            <span className="hero-note">
              Sign in to build your forecaster graph
            </span>
          </div>
        </div>

        <div className="market-rail" aria-label="Market signals">
          <div className="ticker-track">
            {[...landingSignals, ...landingSignals].map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Product promises">
        <SignalItem
          Icon={UserPlus}
          title="Follow forecasters"
          text="关注一个人，等于订阅他的领域判断、数字分身和相关预测市场信号。"
        />
        <SignalItem
          Icon={MessageCircle}
          title="Ask why it moved"
          text="每次盘口变化都可以追问触发因素、核心变量和反向证据。"
        />
        <SignalItem
          Icon={Bot}
          title="Build a forecast desk"
          text="选择权威分身、市场扫描、事件校验、盘口分析和风控 Agent 组成你的预测工作台。"
        />
      </section>
    </>
  )
}

function SignalItem({
  Icon,
  title,
  text,
}: {
  Icon: LucideIcon
  title: string
  text: string
}) {
  return (
    <article className="signal-item">
      <Icon size={20} />
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  )
}

function FlowFrame({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="flow-frame">
      <div className="flow-header">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {children}
    </section>
  )
}

function Onboarding({
  answers,
  currentPrompt,
  customAnswer,
  profileReady,
  onAnswer,
  onCustomAnswer,
  onNext,
}: {
  answers: string[]
  currentPrompt: (typeof onboardingPrompts)[number] | undefined
  customAnswer: string
  profileReady: boolean
  onAnswer: (answer: string) => void
  onCustomAnswer: (answer: string) => void
  onNext: () => void
}) {
  const activeStage = Math.min(answers.length, onboardingStages.length - 1)
  const pipelineProgress = Math.round(
    (answers.length / onboardingPrompts.length) * 100,
  )

  return (
    <FlowFrame eyebrow="Step 01 · Forecast pipeline" title="让系统先理解你的预测方法">
      <div className="onboarding-grid">
        <div className="agent-console">
          <div className="console-header">
            <Terminal size={18} />
            Forecast Onboarding
          </div>
          <div className="pipeline-rail" aria-label="冷启动采集流水线">
            {onboardingStages.map((stage, index) => (
              <div
                className={`pipeline-node ${
                  index < answers.length ? 'complete' : ''
                } ${index === activeStage ? 'active' : ''}`}
                key={stage.label}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{stage.label}</strong>
                <small>{stage.text}</small>
              </div>
            ))}
          </div>
          <div className="pipeline-meter" aria-hidden="true">
            <span style={{ width: `${pipelineProgress}%` }} />
          </div>
          <div className="dialog-stack">
            <div className="dialog-line agent">
              登录完成。接下来按流水线采集你的判断方式，并生成预测画像。
            </div>
            {answers.map((answer, index) => (
              <div className="answer-packet" key={`${answer}-${index}`}>
                <span>PACKET {String(index + 1).padStart(2, '0')}</span>
                <strong>{answer}</strong>
              </div>
            ))}
            {currentPrompt && (
              <div className="question-card" key={answers.length}>
                <span>{onboardingStages[activeStage].text}</span>
                <h2>{currentPrompt.agent}</h2>
                <p>选择一个最贴近你的答案，系统会把它写入预测画像。</p>
              </div>
            )}
            {profileReady && (
              <div className="completion-card">
                <span>PIPELINE COMPLETE</span>
                <h2>预测画像已生成</h2>
                <p>
                  你偏好用数据和盘口确认方向，同时保留结算规则与反向证据检查。
                </p>
              </div>
            )}
          </div>

          {!profileReady ? (
            <div className="answer-panel">
              <div className="chip-row">
                {currentPrompt?.chips.map((chip, index) => (
                  <button
                    className="choice-chip"
                    key={chip}
                    style={{ animationDelay: `${index * 70}ms` }}
                    type="button"
                    onClick={() => onAnswer(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <form
                className="inline-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  onAnswer(customAnswer)
                }}
              >
                <input
                  value={customAnswer}
                  onChange={(event) => onCustomAnswer(event.target.value)}
                  placeholder="或者直接输入你的回答"
                />
                <button type="submit" aria-label="Send onboarding answer">
                  <Send size={17} />
                </button>
              </form>
            </div>
          ) : (
            <button className="primary-button wide" type="button" onClick={onNext}>
              推荐可以关注的分身
              <ArrowRight size={18} />
            </button>
          )}
        </div>

        <aside className="profile-preview">
          <div className="profile-core">
            <div className="profile-orbit">
              <Cpu size={36} />
              <i />
              <i />
              <i />
            </div>
            <span>
              {profileReady
                ? 'Forecast Profile Ready'
                : `Profile Building ${pipelineProgress}%`}
            </span>
          </div>
          <dl>
            <div>
              <dt>Risk budget</dt>
              <dd>{answers[1] ?? '等待输入'}</dd>
            </div>
            <div>
              <dt>Signal source</dt>
              <dd>{answers[0] ?? '等待输入'}</dd>
            </div>
            <div>
              <dt>Rules memory</dt>
              <dd>{answers[2] ?? '等待输入'}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </FlowFrame>
  )
}

function FollowSetup({
  followedAgentIds,
  onToggleFollow,
  onNext,
}: {
  followedAgentIds: string[]
  onToggleFollow: (agentId: string) => void
  onNext: () => void
}) {
  const canContinue = followedAgentIds.length > 0

  return (
    <FlowFrame eyebrow="Step 02 · Forecaster graph" title="关注你的第一批权威预测分身">
      <div className="setup-toolbar">
        <p>
          必须至少关注 1 个数字分身才能继续。关注后，你会在 Prediction Room 里收到这个人关注的预测市场信号和分身解释。
        </p>
        <button
          className="primary-button"
          type="button"
          onClick={onNext}
          disabled={!canContinue}
        >
          进入 Prediction Room
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="agent-grid">
        {recommendedAgents.map((agent) => {
          const followed = followedAgentIds.includes(agent.id)

          return (
            <article className="agent-card" key={agent.id}>
              <div className="agent-card-top">
                <div>
                  <h2>{agent.name}</h2>
                  <p>{agent.handle}</p>
                </div>
                <span className="score">{agent.signalScore}</span>
              </div>
              <p className="thesis">{agent.thesis}</p>
              <div className="tag-row">
                {agent.focus.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="agent-metrics">
                <span>Confidence {agent.conviction}%</span>
                <span>{agent.followers} followers</span>
              </div>
              <button
                className={followed ? 'secondary-button selected' : 'secondary-button'}
                type="button"
                onClick={() => onToggleFollow(agent.id)}
              >
                {followed ? <Check size={17} /> : <UserPlus size={17} />}
                {followed ? 'Following twin' : 'Follow twin'}
              </button>
            </article>
          )
        })}
      </div>
    </FlowFrame>
  )
}

function PredictionRoom({
  activeAgent,
  agentPickerOpen,
  copiedPickIds,
  followedAgents,
  messages,
  draftOwnedAgentIds,
  selectedOwnedAgentIds,
  selectedOwnedAgents,
  chatInput,
  onAgentPickerOpen,
  onChatInput,
  onAskAgent,
  onCopyTrade,
  onToggleDraftOwnedAgent,
  onToggleOwnedAgent,
  onSelectAgent,
}: {
  activeAgent: PersonaAgent
  agentPickerOpen: boolean
  copiedPickIds: string[]
  followedAgents: PersonaAgent[]
  messages: ChatMessage[]
  draftOwnedAgentIds: string[]
  selectedOwnedAgentIds: string[]
  selectedOwnedAgents: OwnedAgent[]
  chatInput: string
  onAgentPickerOpen: (open: boolean) => void
  onChatInput: (value: string) => void
  onAskAgent: (question: string) => void
  onCopyTrade: (pickId: string) => void
  onToggleDraftOwnedAgent: (agentId: string) => void
  onToggleOwnedAgent: (agentId: string) => void
  onSelectAgent: (agent: PersonaAgent) => void
}) {
  const chatFeedRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLFormElement>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const mentionQuery = getMentionQuery(chatInput)
  const mentionAgents = mentionQuery
    ? ownedAgents.filter((agent) => matchesOwnedAgent(agent, mentionQuery.query))
    : []
  const mentionListOpen =
    Boolean(mentionQuery) && mentionAgents.length > 0 && !agentPickerOpen
  const activeMentionIndex =
    mentionAgents.length > 0 ? mentionIndex % mentionAgents.length : 0

  useEffect(() => {
    const feed = chatFeedRef.current

    if (!feed) {
      return
    }

    const scrollToBottom = () => {
      feed.scrollTop = feed.scrollHeight
    }

    const observer = new MutationObserver(scrollToBottom)
    observer.observe(feed, {
      characterData: true,
      childList: true,
      subtree: true,
    })
    scrollToBottom()

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (!agentPickerOpen) {
      return
    }

    function closePickerOnOutsideClick(event: PointerEvent) {
      const composer = composerRef.current

      if (!composer?.contains(event.target as Node)) {
        onAgentPickerOpen(false)
      }
    }

    document.addEventListener('pointerdown', closePickerOnOutsideClick)

    return () => {
      document.removeEventListener('pointerdown', closePickerOnOutsideClick)
    }
  }, [agentPickerOpen, onAgentPickerOpen])

  function selectMentionAgent(agent: OwnedAgent) {
    const mention = getMentionQuery(chatInput)

    if (!mention) {
      return
    }

    if (!draftOwnedAgentIds.includes(agent.id)) {
      onToggleDraftOwnedAgent(agent.id)
    }

    onChatInput(`${chatInput.slice(0, mention.mentionStart)}@${agent.name} `)
  }

  function handleChatInputChange(value: string) {
    const nextMentionQuery = getMentionQuery(value)

    if (nextMentionQuery?.query !== mentionQuery?.query) {
      setMentionIndex(0)
    }

    onChatInput(value)
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!mentionListOpen) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setMentionIndex((current) => (current + 1) % mentionAgents.length)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setMentionIndex(
        (current) => (current - 1 + mentionAgents.length) % mentionAgents.length,
      )
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const selectedMentionAgent = mentionAgents[activeMentionIndex]

      if (selectedMentionAgent) {
        selectMentionAgent(selectedMentionAgent)
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      onChatInput(chatInput.replace(/@\S*$/, ''))
    }
  }

  return (
    <section className="room-layout">
      <aside className="room-sidebar">
        <div className="room-brand">
          <Network size={19} />
          PredictDesk
        </div>
        <div className="sidebar-section">
          <span className="sidebar-label">Followed twins</span>
          {followedAgents.map((agent) => (
            <button
              className={`agent-row ${
                agent.id === activeAgent.id ? 'active' : ''
              }`}
              key={agent.id}
              type="button"
              onClick={() => onSelectAgent(agent)}
            >
              <span className="market-code">{agent.name.slice(0, 2)}</span>
              <span>
                <strong>{agent.name}</strong>
                <small>{agent.handle}</small>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="room-main">
        <header className="room-header">
          <div>
            <span className="status-pill compact">
              <span className="pulse-dot" />
              Live market signal from digital twin
            </span>
            <h1>{activeAgent.name}</h1>
            <p>{activeAgent.thesis}</p>
          </div>
          <div className="room-header-actions">
            {selectedOwnedAgents.length > 0 && (
              <div className="agent-avatar-stack" aria-label="已选择的 agent 员工">
                {selectedOwnedAgents.map((agent, index) => (
                  <span
                    className={`owned-agent-avatar accent-${agent.accent}`}
                    key={agent.id}
                    style={
                      {
                        '--avatar-index': index,
                        zIndex: selectedOwnedAgents.length - index,
                      } as CSSProperties
                    }
                    title={agent.name}
                  >
                    {agent.initials}
                  </span>
                ))}
              </div>
            )}
            <div className="room-header-metric">
              <BadgeCheck size={18} />
              Signal {activeAgent.signalScore}
            </div>
          </div>
        </header>

        <article className="post-block">
          <div className="post-meta">
            <span>{activeAgent.handle}</span>
            <span>{activeAgent.latestPost.meta}</span>
          </div>
          <h2>{activeAgent.latestPost.title}</h2>
          <p>{activeAgent.latestPost.body}</p>
          <div className="impact-line">
            <Zap size={16} />
            {activeAgent.latestPost.impact}
          </div>
        </article>

        <div className="question-row">
          {starterQuestions.map((question) => (
            <button
              className="choice-chip"
              key={question}
              type="button"
              onClick={() => onAskAgent(question)}
            >
              {question}
            </button>
          ))}
        </div>

        <div className="chat-feed" aria-live="polite" ref={chatFeedRef}>
          {messages.map((message) => (
            <ChatBubble
              activeAgent={activeAgent}
              key={message.id}
              message={message}
            />
          ))}
        </div>

        <form
          className="chat-composer"
          ref={composerRef}
          onSubmit={(event) => {
            event.preventDefault()
            onAskAgent(chatInput)
          }}
        >
          {agentPickerOpen && (
            <OwnedAgentPicker
              selectedAgentIds={selectedOwnedAgentIds}
              onToggleAgent={onToggleOwnedAgent}
            />
          )}
          {mentionListOpen && (
            <OwnedAgentMentionList
              activeIndex={activeMentionIndex}
              agents={mentionAgents}
              onSelectAgent={selectMentionAgent}
            />
          )}
          <div className="chat-composer-row">
            <button
              aria-label="添加 agent 员工"
              className="composer-tool-button"
              type="button"
              onClick={() => onAgentPickerOpen(!agentPickerOpen)}
            >
              <Plus size={18} />
            </button>
            <input
              value={chatInput}
              onChange={(event) => handleChatInputChange(event.target.value)}
              onClick={() => onAgentPickerOpen(false)}
              onFocus={() => onAgentPickerOpen(false)}
              onKeyDown={handleComposerKeyDown}
              placeholder="追问这个分身：为什么概率波动、怎么看、风险在哪里..."
            />
            <button type="submit" disabled={!chatInput.trim()}>
              <Send size={18} />
            </button>
          </div>
        </form>
      </section>

      <MarketPicksPanel
        activeAgent={activeAgent}
        copiedPickIds={copiedPickIds}
        onCopyTrade={onCopyTrade}
      />
    </section>
  )
}

function OwnedAgentPicker({
  selectedAgentIds,
  onToggleAgent,
}: {
  selectedAgentIds: string[]
  onToggleAgent: (agentId: string) => void
}) {
  return (
    <div
      aria-label="Agent employees"
      className="owned-agent-picker"
      role="dialog"
    >
      <div className="owned-agent-picker-header">
        <span>Agent employees</span>
        <small>@ 快速选择</small>
      </div>
      <div className="owned-agent-list">
        {ownedAgents.map((agent) => {
          const checked = selectedAgentIds.includes(agent.id)

          return (
            <label
              className={`owned-agent-option accent-${agent.accent} ${
                checked ? 'selected' : ''
              }`}
              key={agent.id}
            >
              <input
                aria-label={agent.name}
                checked={checked}
                type="checkbox"
                onChange={() => onToggleAgent(agent.id)}
              />
              <span className={`owned-agent-avatar accent-${agent.accent}`}>
                {agent.initials}
              </span>
              <span>
                <strong>{agent.name}</strong>
                <small>
                  {agent.role} · {agent.specialty}
                </small>
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function OwnedAgentMentionList({
  activeIndex,
  agents,
  onSelectAgent,
}: {
  activeIndex: number
  agents: OwnedAgent[]
  onSelectAgent: (agent: OwnedAgent) => void
}) {
  return (
    <div
      aria-label="@ agent list"
      className="owned-agent-mention-list"
      role="listbox"
    >
      {agents.map((agent, index) => (
        <button
          aria-selected={index === activeIndex}
          className={`owned-agent-mention-option accent-${agent.accent} ${
            index === activeIndex ? 'active' : ''
          }`}
          key={agent.id}
          role="option"
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            onSelectAgent(agent)
          }}
        >
          <span className={`owned-agent-avatar accent-${agent.accent}`}>
            {agent.initials}
          </span>
          <span>
            <strong>{agent.name}</strong>
            <small>{agent.role}</small>
          </span>
        </button>
      ))}
    </div>
  )
}

function MarketPicksPanel({
  activeAgent,
  copiedPickIds,
  onCopyTrade,
}: {
  activeAgent: PersonaAgent
  copiedPickIds: string[]
  onCopyTrade: (pickId: string) => void
}) {
  return (
    <aside className="intel-panel market-picks-panel">
      <div className="market-panel-header">
        <span className="sidebar-label">Twin positions</span>
        <h2>{activeAgent.name} 关注 / 已预测</h2>
        <p>
          已预测卡片可以直接跟投；关注中卡片直接选择 UP / DOWN 方向。
        </p>
      </div>

      <div className="market-pick-list">
        {activeAgent.marketPicks.map((pick) => {
          const selectedChoice = pick.copyChoices?.find((choice) =>
            copiedPickIds.includes(`${pick.id}:${choice.id}`),
          )
          const statusLabel = pick.position === 'bought' ? '已预测' : '关注中'
          const predictedChoices = [
            {
              id: 'yes',
              label: 'YES',
              price: pick.side === 'YES' ? pick.marketPrice : 100 - pick.marketPrice,
              twinPick: pick.side === 'YES',
            },
            {
              id: 'no',
              label: 'NO',
              price: pick.side === 'NO' ? pick.marketPrice : 100 - pick.marketPrice,
              twinPick: pick.side === 'NO',
            },
          ]

          return (
            <article
              className={`market-pick-card polymarket-card ${pick.position}`}
              key={pick.id}
            >
              <div className="polymarket-card-header">
                <span className="market-avatar" aria-hidden="true">
                  {pick.category.slice(0, 1)}
                </span>
                <div className="market-card-kicker">
                  <span>{pick.category}</span>
                  <small>Resolves {pick.resolveDate}</small>
                </div>
                <strong className={`market-status-badge ${pick.position}`}>
                  {statusLabel}
                </strong>
              </div>
              <h3>{pick.title}</h3>
              <div className="polymarket-odds-bar" aria-label={`${pick.probability}% probability`}>
                <span style={{ width: `${pick.probability}%` }} />
              </div>
              <div className="polymarket-market-stats">
                <span>
                  <strong>{pick.probability}%</strong>
                  <small>Chance</small>
                </span>
                <span>
                  <strong>{pick.volume}</strong>
                  <small>Vol.</small>
                </span>
                <span>
                  <strong>{pick.liquidity}</strong>
                  <small>Liquidity</small>
                </span>
              </div>
              <p className="market-card-note">{pick.rationale}</p>
              {pick.position === 'bought' ? (
                <div className="watch-trade-controls predicted-trade-controls">
                  <div className="direction-choice-grid">
                    {predictedChoices.map((choice) => {
                      const choiceId = `${pick.id}:${choice.id}`
                      const selected = copiedPickIds.includes(choiceId)
                      const tooltipLabel = choice.twinPick
                        ? '分身已预测'
                        : '反向观点'

                      return (
                        <Tooltip key={choice.id}>
                          <TooltipTrigger asChild>
                            <button
                              aria-label={`${choice.label} ${choice.price}¢ ${tooltipLabel}`}
                              className={`direction-choice-button ${choice.id} ${
                                selected ? 'selected' : ''
                              } ${choice.twinPick ? 'twin-pick' : ''}`}
                              type="button"
                              onClick={() => onCopyTrade(choiceId)}
                            >
                              {choice.twinPick && (
                                <span className="twin-pick-dot" aria-hidden="true" />
                              )}
                              {selected ? <Check size={15} /> : <Zap size={15} />}
                              <span>{choice.label}</span>
                              <strong>{choice.price}¢</strong>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{tooltipLabel}</p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="watch-trade-controls">
                  {selectedChoice && (
                    <div className="watch-selection-status">
                      已选择 {selectedChoice.label}
                    </div>
                  )}
                  <div className="direction-choice-grid">
                    {pick.copyChoices?.map((choice) => {
                      const choiceId = `${pick.id}:${choice.id}`
                      const selected = copiedPickIds.includes(choiceId)

                      return (
                        <button
                          className={`direction-choice-button ${choice.id} ${
                            selected ? 'selected' : ''
                          }`}
                          key={choice.id}
                          type="button"
                          onClick={() => onCopyTrade(choiceId)}
                        >
                          {selected ? <Check size={15} /> : <Zap size={15} />}
                          <span>{choice.label}</span>
                          <strong>{choice.price}¢</strong>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </aside>
  )
}

function ChatBubble({
  message,
  activeAgent,
}: {
  message: ChatMessage
  activeAgent: PersonaAgent
}) {
  const typed = useTypewriter(message.text, 14, Boolean(message.typewriter))
  const displayText = message.typewriter ? typed.text : message.text
  const accentClass =
    message.role === 'agent' && message.agentContext
      ? `accent-${message.agentContext.accent}`
      : ''
  const author =
    message.role === 'user'
      ? 'You'
      : message.role === 'system'
        ? 'System'
        : message.agentContext
          ? `${message.agentContext.name} · ${message.agentContext.role}`
          : `${activeAgent.name} Twin`

  return (
    <div className={`chat-bubble ${message.role} ${accentClass}`}>
      <div className="bubble-author">{author}</div>
      <p>{renderMentionedText(displayText, message.mentions)}</p>
      {message.typewriter && typed.isTyping && (
        <span className="typing-cursor">▌</span>
      )}
    </div>
  )
}

function renderMentionedText(
  text: string,
  mentions: ChatAgentContext[] = [],
): ReactNode {
  const tokens = mentions
    .map((agent) => ({
      agent,
      token: `@${agent.name}`,
    }))
    .sort((a, b) => b.token.length - a.token.length)

  if (tokens.length === 0) {
    return text
  }

  const parts: ReactNode[] = []
  let cursor = 0

  while (cursor < text.length) {
    const nextMatch = tokens.reduce<{
      agent: ChatAgentContext
      index: number
      token: string
    } | null>((closest, candidate) => {
      const index = text.indexOf(candidate.token, cursor)

      if (index < 0 || (closest && index >= closest.index)) {
        return closest
      }

      return {
        agent: candidate.agent,
        index,
        token: candidate.token,
      }
    }, null)

    if (!nextMatch) {
      parts.push(text.slice(cursor))
      break
    }

    if (nextMatch.index > cursor) {
      parts.push(text.slice(cursor, nextMatch.index))
    }

    parts.push(
      <span
        className={`agent-mention-token accent-${nextMatch.agent.accent}`}
        key={`${nextMatch.agent.id}-${nextMatch.index}`}
      >
        {nextMatch.token}
      </span>,
    )
    cursor = nextMatch.index + nextMatch.token.length
  }

  return parts
}

export default App
