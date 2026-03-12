// ============================================================
// 开始游戏按钮 - 调用 create API 并跳转到牌桌
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../stores/gameStore'

export default function StartButton() {
  const navigate = useNavigate()
  const { status, error, createGame, aiOpponents, playerName } = useGameStore()
  const [localError, setLocalError] = useState<string | null>(null)

  const isCreating = status === 'creating'

  const handleStart = async () => {
    setLocalError(null)

    // 基础验证
    if (!playerName.trim()) {
      setLocalError('请输入你的名称')
      return
    }

    if (aiOpponents.length === 0) {
      setLocalError('至少需要一个 AI 对手')
      return
    }

    try {
      const response = await createGame()
      // 创建成功，跳转到牌桌页面
      navigate(`/game/${response.game_id}`)
    } catch (err) {
      // createGame 内部已经设置了 store error
      // 这里设置 localError 作为额外提示
      if (err instanceof Error) {
        setLocalError(err.message)
      }
    }
  }

  const displayError = localError || error

  return (
    <div className="space-y-3">
      {displayError && (
        <div className="px-4 py-2.5 bg-red-900/30 border border-red-700/40 rounded-lg text-red-300 text-sm">
          {displayError}
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={isCreating}
        className={`w-full py-3.5 font-bold rounded-lg text-lg transition-all cursor-pointer
          ${
            isCreating
              ? 'bg-amber-500/50 text-green-950/70 cursor-wait'
              : 'bg-amber-500 hover:bg-amber-400 text-green-950 hover:shadow-lg hover:shadow-amber-500/20 active:scale-[0.98]'
          }`}
      >
        {isCreating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-green-900/30 border-t-green-900 rounded-full animate-spin" />
            创建中...
          </span>
        ) : (
          '开始游戏'
        )}
      </button>

      <p className="text-center text-green-600 text-xs">
        {aiOpponents.length} 个 AI 对手 | 点击开始创建游戏并进入牌桌
      </p>
    </div>
  )
}
