import { useParams, useNavigate } from 'react-router-dom'

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 flex flex-col items-center justify-center p-8">
      <div className="bg-green-800/40 backdrop-blur rounded-2xl p-12 max-w-2xl w-full text-center border border-green-700/50">
        <h1 className="text-3xl font-bold text-white mb-4">牌桌</h1>
        <p className="text-green-300 mb-2">
          游戏 ID: <span className="font-mono text-amber-400">{id}</span>
        </p>
        <p className="text-green-400 text-sm mb-8">
          牌桌 UI 将在 T5.3 中实现
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors cursor-pointer"
          >
            返回大厅
          </button>
          <button
            onClick={() => navigate(`/result/${id}`)}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-green-950 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            查看结果
          </button>
        </div>
      </div>
    </div>
  )
}
