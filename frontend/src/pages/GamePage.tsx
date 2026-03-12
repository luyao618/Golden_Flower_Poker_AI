import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import TableLayout from '../components/Table/TableLayout'
import { useGameStore } from '../stores/gameStore'
import type { Player, RoundState } from '../types/game'

/**
 * 生成演示用的模拟玩家数据
 * 在后端连接完成前用于展示牌桌布局效果
 */
function createDemoPlayers(): Player[] {
  return [
    {
      id: 'player-human',
      name: '玩家',
      avatar: '',
      player_type: 'human',
      chips: 1000,
      status: 'active_blind',
      hand: null,
      total_bet_this_round: 20,
      model_id: null,
      personality: null,
    },
    {
      id: 'ai-1',
      name: '赌神 GPT',
      avatar: '',
      player_type: 'ai',
      chips: 950,
      status: 'active_seen',
      hand: null,
      total_bet_this_round: 40,
      model_id: 'openai-gpt4',
      personality: 'aggressive',
    },
    {
      id: 'ai-2',
      name: '分析师 Claude',
      avatar: '',
      player_type: 'ai',
      chips: 1080,
      status: 'active_blind',
      hand: null,
      total_bet_this_round: 20,
      model_id: 'anthropic-claude',
      personality: 'analytical',
    },
    {
      id: 'ai-3',
      name: '直觉 Gemini',
      avatar: '',
      player_type: 'ai',
      chips: 720,
      status: 'folded',
      hand: null,
      total_bet_this_round: 10,
      model_id: 'google-gemini',
      personality: 'intuitive',
    },
    {
      id: 'ai-4',
      name: '诈唬王',
      avatar: '',
      player_type: 'ai',
      chips: 250,
      status: 'active_seen',
      hand: null,
      total_bet_this_round: 80,
      model_id: 'openai-gpt4',
      personality: 'bluffer',
    },
  ]
}

function createDemoRound(): RoundState {
  return {
    round_number: 3,
    pot: 170,
    current_bet: 20,
    dealer_index: 0,
    current_player_index: 1,
    actions: [],
    phase: 'betting',
    turn_count: 2,
    max_turns: 10,
  }
}

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setGameState, setMyPlayerId, players } = useGameStore()

  // 初始化演示数据（后续会被 WebSocket 状态替代）
  useEffect(() => {
    if (players.length === 0) {
      const demoPlayers = createDemoPlayers()
      const demoRound = createDemoRound()

      setGameState({
        game_id: id ?? 'demo',
        players: demoPlayers,
        current_round: demoRound,
        round_history: [],
        config: {
          initial_chips: 1000,
          ante: 10,
          max_bet: 200,
          max_turns: 10,
        },
        status: 'playing',
      })

      setMyPlayerId('player-human')
    }
  }, [id, players.length, setGameState, setMyPlayerId])

  return (
    <div className="h-screen bg-gradient-to-b from-green-950 via-green-900 to-green-950 flex flex-col">
      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-green-800/50">
        <button
          onClick={() => navigate('/')}
          className="text-green-400 hover:text-green-300 text-sm transition-colors cursor-pointer"
        >
          ← 返回大厅
        </button>
        <div className="text-green-500/60 text-xs font-mono">
          ID: {id?.slice(0, 8)}
        </div>
        <button
          onClick={() => navigate(`/result/${id}`)}
          className="text-amber-500 hover:text-amber-400 text-sm transition-colors cursor-pointer"
        >
          结束游戏
        </button>
      </header>

      {/* 牌桌区域 */}
      <main className="flex-1 relative min-h-0">
        <TableLayout className="w-full h-full" />
      </main>

      {/* 底部操作区域（占位，T6.2 中实现） */}
      <footer className="h-16 bg-black/40 border-t border-green-800/50 flex items-center justify-center">
        <span className="text-green-600/40 text-sm">
          操作面板 — T6.2 中实现
        </span>
      </footer>
    </div>
  )
}
