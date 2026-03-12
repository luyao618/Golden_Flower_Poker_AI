import { useParams, useNavigate } from 'react-router-dom'

export default function ResultPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 flex flex-col items-center justify-center p-8">
      <div className="bg-green-800/40 backdrop-blur rounded-2xl p-12 max-w-2xl w-full text-center border border-green-700/50">
        <h1 className="text-3xl font-bold text-amber-400 mb-4">游戏结果</h1>
        <p className="text-green-300 mb-2">
          游戏 ID: <span className="font-mono text-white">{id}</span>
        </p>
        <p className="text-green-400 text-sm mb-8">
          结果页面将在 T7.2 中实现
        </p>

        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-green-950 font-bold rounded-lg transition-colors cursor-pointer"
        >
          返回大厅
        </button>
      </div>
    </div>
  )
}
