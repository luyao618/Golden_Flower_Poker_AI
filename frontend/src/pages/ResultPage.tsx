import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../stores/gameStore'
import Leaderboard from '../components/Settlement/Leaderboard'
import type { LeaderboardPlayer } from '../components/Settlement/Leaderboard'
import AgentSummaryCard from '../components/Settlement/AgentSummaryCard'
import { getGameSummary, getExperienceReviews, getGameState, cancelGameSummaries } from '../services/api'
import type { GameSummary, ExperienceReview, Player } from '../types/game'
import resultBg from '../assets/result-bg.png'

/** 轮询配置 */
const POLL_INTERVAL = 3000  // 每 3 秒重试一次
const MAX_POLL_ATTEMPTS = 40 // 最多重试 40 次（约 2 分钟）

export default function ResultPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const gameId = id ?? ''

  // 从 store 获取状态（如果有的话）
  const storePlayers = useGameStore((s) => s.players)
  const storeConfig = useGameStore((s) => s.config)
  const reset = useGameStore((s) => s.reset)

  // 本地状态
  const [players, setPlayers] = useState<Player[]>(storePlayers)
  const [initialChips, setInitialChips] = useState(storeConfig?.initial_chips ?? 1000)
  const [summaries, setSummaries] = useState<Record<string, GameSummary>>({})
  const [reviews, setReviews] = useState<Record<string, ExperienceReview[]>>({})
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [pageLoading, setPageLoading] = useState(true)

  // 用于跟踪是否已离开页面（取消轮询）
  const cancelledRef = useRef(false)
  // 跟踪轮询定时器，便于清理
  const pollTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  // 如果 store 中没有 players 数据（例如直接访问 URL），从 API 加载
  useEffect(() => {
    async function loadGameData() {
      if (storePlayers.length > 0) {
        setPlayers(storePlayers)
        setInitialChips(storeConfig?.initial_chips ?? 1000)
        setPageLoading(false)
        return
      }

      if (!gameId) {
        setPageLoading(false)
        return
      }

      try {
        const state = await getGameState(gameId)
        const loaded = state.players.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          avatar: (p.avatar as string) || '',
          player_type: p.player_type as 'human' | 'ai',
          chips: p.chips as number,
          status: p.status as Player['status'],
          hand: null,
          total_bet_this_round: 0,
          model_id: (p.model_id as string) || null,
        }))
        setPlayers(loaded)
        const config = state.config as Record<string, unknown>
        if (config?.initial_chips) {
          setInitialChips(config.initial_chips as number)
        }
      } catch (err) {
        console.error('Failed to load game state:', err)
      } finally {
        setPageLoading(false)
      }
    }

    loadGameData()
  }, [gameId, storePlayers, storeConfig])

  // AI 玩家列表
  const aiPlayers = useMemo(
    () => players.filter((p) => p.player_type === 'ai'),
    [players],
  )

  // 排行榜数据：按筹码降序
  const rankings: LeaderboardPlayer[] = useMemo(() => {
    return [...players]
      .sort((a, b) => b.chips - a.chips)
      .map((p) => ({
        player: p,
        chipChange: p.chips - initialChips,
        initialChips,
      }))
  }, [players, initialChips])

  // 加载所有 AI 的 summary 和 reviews（支持轮询重试）
  const loadSummaries = useCallback(async () => {
    if (!gameId || aiPlayers.length === 0) return

    const loadingMap: Record<string, boolean> = {}
    aiPlayers.forEach((ai) => { loadingMap[ai.id] = true })
    setLoadingStates(loadingMap)

    // 先加载 reviews（不需要等待总结生成）
    await Promise.allSettled(
      aiPlayers.map(async (ai) => {
        try {
          const reviewList = await getExperienceReviews(gameId, ai.id)
          setReviews((prev) => ({ ...prev, [ai.id]: reviewList }))
        } catch (err) {
          console.error(`Failed to load reviews for ${ai.name}:`, err)
        }
      }),
    )

    // 轮询加载 summary（可能还在后台生成中）
    for (const ai of aiPlayers) {
      pollSummary(ai.id, ai.name, 0)
    }
  }, [gameId, aiPlayers]) // eslint-disable-line react-hooks/exhaustive-deps

  /** 轮询加载单个 AI 的总结报告 */
  const pollSummary = useCallback((agentId: string, agentName: string, attempt: number) => {
    if (cancelledRef.current) return

    getGameSummary(gameId, agentId)
      .then((summary) => {
        if (!cancelledRef.current) {
          setSummaries((prev) => ({ ...prev, [agentId]: summary }))
          setLoadingStates((prev) => ({ ...prev, [agentId]: false }))
        }
      })
      .catch(() => {
        if (cancelledRef.current) return

        if (attempt < MAX_POLL_ATTEMPTS) {
          // 总结尚未生成完毕，稍后重试
          const timer = setTimeout(() => {
            pollTimersRef.current.delete(timer)
            pollSummary(agentId, agentName, attempt + 1)
          }, POLL_INTERVAL)
          pollTimersRef.current.add(timer)
        } else {
          // 超过最大重试次数，放弃
          console.error(`Summary for ${agentName} not available after ${MAX_POLL_ATTEMPTS} attempts`)
          setLoadingStates((prev) => ({ ...prev, [agentId]: false }))
        }
      })
  }, [gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pageLoading && aiPlayers.length > 0) {
      loadSummaries()
    }
  }, [pageLoading, aiPlayers.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // 离开页面时：取消前端轮询 + 通知后端取消生成任务
  useEffect(() => {
    return () => {
      cancelledRef.current = true
      // 清理所有轮询定时器
      for (const timer of pollTimersRef.current) {
        clearTimeout(timer)
      }
      pollTimersRef.current.clear()
      // 通知后端取消还在进行的总结生成
      if (gameId) {
        cancelGameSummaries(gameId).catch(() => {
          // 静默失败 — 后端任务可能已完成
        })
      }
    }
  }, [gameId])

  // 返回大厅
  const handleBackToLobby = () => {
    reset()
    navigate('/')
  }

  // 加载中
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-deepest)] flex items-center justify-center relative overflow-hidden">
        {/* 背景图 */}
        <div className="fixed inset-0 pointer-events-none">
          <img src={resultBg} alt="" className="w-full h-full object-cover" style={{ objectPosition: 'center 20%', filter: 'brightness(0.75) saturate(1.2)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(5,5,15,0.35) 0%, rgba(5,5,15,0.5) 50%, rgba(5,5,15,0.7) 100%)' }} />
        </div>
        {/* 背景光晕 */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.04) 0%, transparent 50%)'
          }}
        />
        <div className="text-center space-y-4 relative z-10">
          <div className="inline-block w-8 h-8 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">加载游戏结果...</p>
        </div>
      </div>
    )
  }

  // 没有数据
  if (players.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-deepest)] flex items-center justify-center relative overflow-hidden">
        {/* 背景图 */}
        <div className="fixed inset-0 pointer-events-none">
          <img src={resultBg} alt="" className="w-full h-full object-cover" style={{ objectPosition: 'center 20%', filter: 'brightness(0.75) saturate(1.2)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(5,5,15,0.35) 0%, rgba(5,5,15,0.5) 50%, rgba(5,5,15,0.7) 100%)' }} />
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.04) 0%, transparent 50%)'
          }}
        />
        <div className="text-center space-y-4 relative z-10">
          <p className="text-[var(--text-muted)]">未找到游戏数据</p>
          <div className="neon-btn-wrapper inline-block">
            <button
              onClick={handleBackToLobby}
              className="relative px-6 py-2 font-bold rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] transition-all cursor-pointer hover:bg-[var(--bg-elevated)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              返回大厅
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deepest)] relative overflow-hidden">
      {/* 背景图 — 固定定位，滚动时不动 */}
      <div className="fixed inset-0 pointer-events-none">
        <img
          src={resultBg}
          alt=""
           className="w-full h-full object-cover"
          style={{ objectPosition: 'center 20%', filter: 'brightness(0.75) saturate(1.2)' }}
        />
        {/* 暗色叠加层 — 保证文字可读性 */}
        <div className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(5,5,15,0.35) 0%, rgba(5,5,15,0.5) 50%, rgba(5,5,15,0.7) 100%)'
          }}
        />
      </div>
      {/* 背景装饰：径向光晕（叠在图片上方） */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 10%, rgba(0,212,255,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 90%, rgba(139,92,246,0.04) 0%, transparent 50%)'
        }}
      />
      {/* 背景装饰：底部透视网格 */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 perspective-grid opacity-20 pointer-events-none" />

      {/* 顶部栏 */}
      <header className="sticky top-0 z-10 bg-[var(--bg-deep)]/80 backdrop-blur-md border-b border-[var(--border-default)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBackToLobby}
            className="lobby-back-btn flex items-center gap-2.5 px-5 py-2.5 rounded-2xl
                       transition-all cursor-pointer group"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                 style={{ color: '#00d4ff', filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.6))' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-semibold tracking-wider"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: '#d5fbff',
                    textShadow: '0 0 8px rgba(0,212,255,0.5), 0 0 20px rgba(0,212,255,0.25)',
                  }}>
              返回大厅
            </span>
          </button>
          <div className="text-[var(--text-muted)] text-xs font-mono">
            ID: {gameId.slice(0, 8)}
          </div>
          <div />
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10 relative z-[1]">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold neon-text-hero mb-3"
              style={{ fontFamily: 'var(--font-display)' }}>
            GAME OVER
          </h1>
          {/* 渐变分隔线 */}
          <div className="mx-auto w-48 title-deco-line mb-3" />
          <p className="text-[var(--text-muted)] text-sm">
            共 {rankings.length} 名玩家参与了本场对局
          </p>
        </motion.div>

        {/* 排行榜 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Leaderboard rankings={rankings} />
        </motion.section>

        {/* AI 总结报告 */}
        {aiPlayers.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-[var(--text-primary)] text-center"
                style={{ fontFamily: 'var(--font-display)' }}>
              AI 总结报告
            </h2>
            <p className="text-[var(--text-muted)] text-xs text-center mb-4">
              点击卡片查看每个 AI 的详细总结、关键时刻回顾和策略调整历程
            </p>

            <div className="space-y-3">
              {aiPlayers.map((ai, index) => (
                <motion.div
                  key={ai.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
                >
                  <AgentSummaryCard
                    player={ai}
                    summary={summaries[ai.id] ?? null}
                    reviews={reviews[ai.id] ?? []}
                    loading={loadingStates[ai.id] ?? false}
                    initialOpen={index === 0}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* 底部 — 再来一局霓虹按钮 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-center pb-8"
        >
          <div className="neon-btn-wrapper inline-block">
            <button
              onClick={handleBackToLobby}
              className="relative px-8 py-3 font-bold rounded-xl text-lg bg-[var(--bg-surface)] text-[var(--text-primary)] transition-all cursor-pointer hover:bg-[var(--bg-elevated)] active:scale-[0.98]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              再来一局
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
