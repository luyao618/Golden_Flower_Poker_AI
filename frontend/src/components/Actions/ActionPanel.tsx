import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, ArrowDown, TrendingUp, X, Swords, type LucideIcon } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { useUIStore } from '../../stores/uiStore'
import type { GameAction, Player, RoundState } from '../../types/game'
import CompareSelector from './CompareSelector'

// ---- 费用计算 ----

function getCallCost(round: RoundState, player: Player): number {
  if (player.status === 'active_blind') return round.current_bet
  if (player.status === 'active_seen') return round.current_bet * 2
  return 0
}

function getRaiseCost(round: RoundState, player: Player): number {
  if (player.status === 'active_blind') return round.current_bet * 2
  if (player.status === 'active_seen') return round.current_bet * 4
  return 0
}

function getCompareCost(round: RoundState, player: Player): number {
  if (player.status !== 'active_seen') return 0
  return getCallCost(round, player)
}

// ---- 操作按钮配置 ----

interface ActionButtonConfig {
  action: GameAction
  label: string
  costLabel?: string
  icon: LucideIcon
  needsConfirm?: boolean
  hotkey?: string
}

// ---- 每个 action 的主题色 ----

const ACTION_ACCENT: Record<string, { border: string; bg: string; text: string }> = {
  check_cards: { border: 'border-blue-400/40',  bg: 'bg-blue-400/10',  text: 'text-blue-400' },
  call:        { border: 'border-cyan-400/40',   bg: 'bg-cyan-400/10',  text: 'text-cyan-400' },
  raise:       { border: 'border-amber-400/40',  bg: 'bg-amber-400/10', text: 'text-amber-400' },
  compare:     { border: 'border-purple-400/40', bg: 'bg-purple-400/10', text: 'text-purple-400' },
  fold:        { border: 'border-red-400/40',    bg: 'bg-red-400/10',   text: 'text-red-400' },
}

interface ActionPanelProps {
  onAction: (action: GameAction, target?: string) => void
}

export default function ActionPanel({ onAction }: ActionPanelProps) {
  const availableActions = useGameStore((s) => s.availableActions)
  const currentRound = useGameStore((s) => s.currentRound)
  const getMyPlayer = useGameStore((s) => s.getMyPlayer)
  const players = useGameStore((s) => s.players)
  const myPlayerId = useGameStore((s) => s.myPlayerId)

  const isCompareMode = useUIStore((s) => s.isCompareMode)
  const enterCompareMode = useUIStore((s) => s.enterCompareMode)
  const exitCompareMode = useUIStore((s) => s.exitCompareMode)

  const [confirmAction, setConfirmAction] = useState<GameAction | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const myPlayer = getMyPlayer()
  const isMyTurn = availableActions.length > 0

  const executeAction = useCallback(
    (action: GameAction, target?: string) => {
      if (isProcessing) return
      setIsProcessing(true)
      setConfirmAction(null)
      exitCompareMode()
      onAction(action, target)
      setTimeout(() => setIsProcessing(false), 500)
    },
    [isProcessing, onAction, exitCompareMode],
  )

  const handleActionClick = useCallback(
    (action: GameAction, needsConfirm?: boolean) => {
      if (action === 'compare') {
        enterCompareMode()
        return
      }
      if (needsConfirm && confirmAction !== action) {
        setConfirmAction(action)
        return
      }
      executeAction(action)
    },
    [enterCompareMode, confirmAction, executeAction],
  )

  const handleCompareTarget = useCallback(
    (targetId: string) => {
      executeAction('compare', targetId)
    },
    [executeAction],
  )

  const handleCancelConfirm = useCallback(() => {
    setConfirmAction(null)
  }, [])

  if (!isMyTurn || !myPlayer || !currentRound) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[var(--text-muted)] text-sm">等待对手行动...</span>
      </div>
    )
  }

  // 构建操作按钮
  const buttons: ActionButtonConfig[] = []

  for (const action of availableActions) {
    switch (action) {
      case 'check_cards':
        buttons.push({ action: 'check_cards', label: '看牌', icon: Eye, hotkey: 'Q' })
        break
      case 'call':
        buttons.push({ action: 'call', label: '跟注', costLabel: `${getCallCost(currentRound, myPlayer)}`, icon: ArrowDown, hotkey: 'W' })
        break
      case 'raise':
        buttons.push({ action: 'raise', label: '加注', costLabel: `${getRaiseCost(currentRound, myPlayer)}`, icon: TrendingUp, hotkey: 'E' })
        break
      case 'compare':
        buttons.push({ action: 'compare', label: '比牌', costLabel: `${getCompareCost(currentRound, myPlayer)}`, icon: Swords, hotkey: 'R' })
        break
      case 'fold':
        buttons.push({ action: 'fold', label: '弃牌', icon: X, needsConfirm: true, hotkey: 'F' })
        break
    }
  }

  // 比牌选择模式
  if (isCompareMode) {
    const compareTargets = players.filter(
      (p) => p.id !== myPlayerId && p.status !== 'folded' && p.status !== 'out',
    )
    return (
      <CompareSelector
        targets={compareTargets}
        cost={getCompareCost(currentRound, myPlayer)}
        onSelect={handleCompareTarget}
        onCancel={exitCompareMode}
      />
    )
  }

  return (
    <div className="flex items-center justify-center gap-2 h-full px-3">
      {/* 游戏信息 */}
      <div className="flex items-center gap-2 mr-2 shrink-0 text-[10px]">
        <span className="text-[var(--text-muted)]">
          底池 <span className="text-[var(--color-gold)]/80 font-mono">{currentRound.pot}</span>
        </span>
        <span className="text-[var(--text-disabled)]">·</span>
        <span className="text-[var(--text-muted)]">
          {myPlayer.status === 'active_blind' ? '暗注' : '明注'}
        </span>
      </div>

      {/* 操作按钮 */}
      <AnimatePresence mode="popLayout">
        {buttons.map((btn) => {
          const isConfirming = confirmAction === btn.action
          const Icon = btn.icon
          const accent = ACTION_ACCENT[btn.action] ?? ACTION_ACCENT.call

          return (
            <motion.div
              key={btn.action}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {isConfirming ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => executeAction(btn.action)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 rounded-full text-xs font-bold
                      bg-[var(--color-danger)]/20 text-[var(--color-danger)]
                      border border-[var(--color-danger)]/50
                      hover:bg-[var(--color-danger)]/30
                      transition-all cursor-pointer disabled:opacity-50"
                  >
                    确认{btn.label}
                  </button>
                  <button
                    onClick={handleCancelConfirm}
                    className="px-2 py-1.5 rounded-full text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleActionClick(btn.action, btn.needsConfirm)}
                  disabled={isProcessing}
                  className={`
                    relative flex items-center gap-1.5 px-3 py-1.5 rounded-full
                    bg-white/[0.03] border ${accent.border}
                    text-[var(--text-primary)]
                    hover:bg-white/[0.06] hover:scale-105
                    active:scale-95
                    transition-all cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <Icon className={`w-3.5 h-3.5 ${accent.text}`} />
                  <span className="text-xs font-medium">{btn.label}</span>
                  {btn.costLabel && (
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {btn.costLabel}
                    </span>
                  )}
                  {btn.hotkey && (
                    <span className="absolute -top-1.5 -right-1 text-[7px] bg-black/60 text-[var(--text-disabled)] rounded px-0.5 leading-relaxed">
                      {btn.hotkey}
                    </span>
                  )}
                </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* 筹码信息 */}
      <div className="flex items-center gap-1 ml-2 shrink-0 text-[10px]">
        <span className="text-[var(--text-muted)]">筹码</span>
        <span className="text-[var(--color-gold)] font-mono font-semibold">
          {myPlayer.chips.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
