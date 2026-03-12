import { useNavigate } from 'react-router-dom'

export default function LobbyPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold text-amber-400 mb-4">
        炸金花 AI
      </h1>
      <p className="text-green-300 text-lg mb-12">
        与 AI 驱动的智能对手对战，体验牌桌上的心理博弈
      </p>

      <div className="bg-green-800/60 backdrop-blur rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-green-700/50">
        <h2 className="text-xl font-semibold text-white mb-6">开始新游戏</h2>

        <p className="text-green-300 text-sm mb-8">
          游戏配置功能将在后续版本中完善。点击下方按钮快速开始一场游戏。
        </p>

        <button
          onClick={() => navigate('/game/demo')}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-green-950 font-bold rounded-lg transition-colors text-lg cursor-pointer"
        >
          快速开始
        </button>
      </div>

      <p className="text-green-600 text-sm mt-8">
        Golden Flower Poker AI v0.1
      </p>
    </div>
  )
}
