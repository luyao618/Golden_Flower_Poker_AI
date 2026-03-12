// ============================================================
// 筹码配置组件 - 初始筹码、底注、单局上限、最大轮数
// ============================================================

import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'

/** 预设配置 */
const PRESETS = [
  { label: '休闲局', initial_chips: 500, ante: 5, max_bet: 100, max_turns: 8 },
  { label: '标准局', initial_chips: 1000, ante: 10, max_bet: 200, max_turns: 10 },
  { label: '豪赌局', initial_chips: 5000, ante: 50, max_bet: 1000, max_turns: 15 },
] as const

export default function ChipsConfig() {
  const { gameConfig, setGameConfig } = useGameStore()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setGameConfig({
      initial_chips: preset.initial_chips,
      ante: preset.ante,
      max_bet: preset.max_bet,
      max_turns: preset.max_turns,
    })
  }

  return (
    <div className="space-y-4">
      <label className="block text-green-300 text-sm font-medium">
        筹码配置
      </label>

      {/* 预设选择 */}
      <div className="flex gap-2">
        {PRESETS.map((preset) => {
          const isActive =
            gameConfig.initial_chips === preset.initial_chips &&
            gameConfig.ante === preset.ante
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer
                ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 border'
                    : 'bg-green-900/40 border-green-700/30 text-green-300 border hover:border-green-600/50'
                }`}
            >
              <div>{preset.label}</div>
              <div className="text-xs mt-0.5 opacity-70">
                {preset.initial_chips} / {preset.ante}
              </div>
            </button>
          )
        })}
      </div>

      {/* 高级配置展开 */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-green-400/60 hover:text-green-300 transition-colors cursor-pointer"
      >
        {showAdvanced ? '收起高级配置' : '高级配置'}
        <span className="ml-1">{showAdvanced ? '▲' : '▼'}</span>
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-4 bg-green-900/30 rounded-lg p-4 border border-green-700/20">
          {/* 初始筹码 */}
          <div>
            <label className="block text-green-400/70 text-xs mb-1">
              初始筹码
            </label>
            <input
              type="number"
              value={gameConfig.initial_chips}
              onChange={(e) =>
                setGameConfig({
                  initial_chips: Math.max(
                    100,
                    Math.min(100000, Number(e.target.value) || 1000)
                  ),
                })
              }
              min={100}
              max={100000}
              step={100}
              className="w-full px-3 py-2 bg-green-950/60 border border-green-700/40 rounded-md
                         text-white text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* 底注 */}
          <div>
            <label className="block text-green-400/70 text-xs mb-1">
              底注
            </label>
            <input
              type="number"
              value={gameConfig.ante}
              onChange={(e) =>
                setGameConfig({
                  ante: Math.max(
                    1,
                    Math.min(1000, Number(e.target.value) || 10)
                  ),
                })
              }
              min={1}
              max={1000}
              step={5}
              className="w-full px-3 py-2 bg-green-950/60 border border-green-700/40 rounded-md
                         text-white text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* 单局下注上限 */}
          <div>
            <label className="block text-green-400/70 text-xs mb-1">
              单局下注上限
            </label>
            <input
              type="number"
              value={gameConfig.max_bet}
              onChange={(e) =>
                setGameConfig({
                  max_bet: Math.max(
                    10,
                    Math.min(10000, Number(e.target.value) || 200)
                  ),
                })
              }
              min={10}
              max={10000}
              step={50}
              className="w-full px-3 py-2 bg-green-950/60 border border-green-700/40 rounded-md
                         text-white text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* 最大轮数 */}
          <div>
            <label className="block text-green-400/70 text-xs mb-1">
              最大轮数
            </label>
            <input
              type="number"
              value={gameConfig.max_turns}
              onChange={(e) =>
                setGameConfig({
                  max_turns: Math.max(
                    3,
                    Math.min(50, Number(e.target.value) || 10)
                  ),
                })
              }
              min={3}
              max={50}
              className="w-full px-3 py-2 bg-green-950/60 border border-green-700/40 rounded-md
                         text-white text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>
      )}

      {/* 当前配置概览 */}
      <div className="flex items-center gap-4 text-xs text-green-500">
        <span>筹码: {gameConfig.initial_chips}</span>
        <span>底注: {gameConfig.ante}</span>
        <span>上限: {gameConfig.max_bet}</span>
        <span>轮数: {gameConfig.max_turns}</span>
      </div>
    </div>
  )
}
