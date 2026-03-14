import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { disconnectCopilot } from '../services/api'
import { useCallback, useState } from 'react'

/**
 * Copilot 错误弹窗
 *
 * 当后端检测到 Copilot API 返回 403（通常是因为组织管理的 Copilot Business 许可证
 * 不允许非官方客户端调用）时，弹出此模态框：
 * - 显示错误原因说明
 * - 提供「断开并切换账号」按钮：断开当前 Copilot 连接 → 重置游戏 → 跳回大厅重新授权
 * - 提供「关闭」按钮（仅关闭弹窗，不做其他操作）
 */
export default function CopilotErrorModal() {
  const copilotError = useUIStore((s) => s.copilotError)
  const setCopilotError = useUIStore((s) => s.setCopilotError)
  const resetUI = useUIStore((s) => s.resetUI)
  const resetGame = useGameStore((s) => s.reset)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleDismiss = useCallback(() => {
    setCopilotError(null)
  }, [setCopilotError])

  const handleSwitchAccount = useCallback(async () => {
    setLoading(true)
    try {
      await disconnectCopilot()
    } catch {
      // 即使断开失败也继续（可能已经断开了）
    }
    resetGame()
    resetUI()
    navigate('/')
  }, [resetGame, resetUI, navigate])

  const isSubscriptionError = copilotError?.errorCode === 'copilot_subscription_error'

  return (
    <AnimatePresence>
      {copilotError && (
        <>
          {/* 遮罩层 */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          />

          {/* 弹窗 */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="bg-green-950 border border-red-500/40 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
              {/* 标题 */}
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xl">⚠</span>
                <h2 className="text-red-400 font-bold text-lg">
                  Copilot 调用失败
                </h2>
              </div>

              {/* 错误消息 */}
              <p className="text-green-300/90 text-sm leading-relaxed">
                {copilotError.message}
              </p>

              {/* 详细说明（仅 403 订阅错误时显示） */}
              {isSubscriptionError && (
                <div className="bg-black/30 border border-green-800/40 rounded-lg p-3 space-y-2">
                  <p className="text-green-400/70 text-xs leading-relaxed">
                    <strong className="text-green-400/90">原因：</strong>
                    您当前登录的 GitHub 账号使用的是组织管理的 Copilot Business/Enterprise
                    许可证，该许可证仅允许通过官方客户端（如 VS Code、JetBrains
                    等）调用 Copilot API。
                  </p>
                  <p className="text-green-400/70 text-xs leading-relaxed">
                    <strong className="text-green-400/90">解决方案：</strong>
                    请切换到拥有个人 Copilot 订阅（Copilot Individual / Pro）的 GitHub
                    账号，然后重新授权连接。
                  </p>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center gap-3 pt-2">
                {isSubscriptionError && (
                  <button
                    onClick={handleSwitchAccount}
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50
                      text-green-950 font-bold rounded-lg transition-all cursor-pointer text-sm"
                  >
                    {loading ? '正在断开...' : '断开并切换账号'}
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className={`px-4 py-2.5 border border-green-700/50 hover:border-green-600/50
                    text-green-400 rounded-lg transition-all cursor-pointer text-sm
                    ${isSubscriptionError ? '' : 'flex-1'}`}
                >
                  关闭
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
