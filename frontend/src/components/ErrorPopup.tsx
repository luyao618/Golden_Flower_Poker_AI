import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../stores/uiStore'

/**
 * 通用错误弹窗组件
 *
 * 当游戏操作（开始游戏、下一局、玩家操作等）出错时，以居中模态框展示错误信息。
 * - 风格与项目现有弹窗（如「尚未配置 AI 模型」）完全一致
 * - 队列式：每次显示最早一条错误，关闭后自动弹出下一条
 * - 半透明遮罩 + 渐变边框 + 毛玻璃背景
 */
export default function ErrorPopup() {
  const errorPopups = useUIStore((s) => s.errorPopups)
  const dismissErrorPopup = useUIStore((s) => s.dismissErrorPopup)

  // 只显示队列中第一条
  const current = errorPopups.length > 0 ? errorPopups[0] : null

  const handleDismiss = useCallback(() => {
    dismissErrorPopup(0)
  }, [dismissErrorPopup])

  return (
    <AnimatePresence>
      {current && (
        <>
          {/* 遮罩层 */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          />

          {/* 弹窗 */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          >
            <div
              className="w-full max-w-sm rounded-2xl p-[1px] overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,80,80,0.5), rgba(200,60,100,0.4), rgba(255,80,80,0.2))',
              }}
            >
              <div
                className="rounded-2xl p-6 space-y-5"
                style={{
                  background: 'rgba(10, 10, 30, 0.92)',
                  backdropFilter: 'blur(24px) saturate(1.3)',
                  WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
                  boxShadow: '0 0 40px rgba(255, 80, 80, 0.12), 0 0 80px rgba(200, 60, 100, 0.06)',
                }}
              >
                {/* 图标 + 标题 */}
                <div className="flex flex-col items-center text-center space-y-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(255, 80, 80, 0.08)',
                      border: '1px solid rgba(255, 80, 80, 0.25)',
                      boxShadow: '0 0 20px rgba(255, 80, 80, 0.15)',
                    }}
                  >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                         style={{ color: '#ff5050', filter: 'drop-shadow(0 0 6px rgba(255,80,80,0.5))' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3
                    className="text-lg font-bold tracking-wide"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: '#ffe0e0',
                      textShadow: '0 0 12px rgba(255, 80, 80, 0.4)',
                    }}
                  >
                    {current.source ?? '操作失败'}
                  </h3>
                </div>

                {/* 错误消息 */}
                <p
                  className="text-sm leading-relaxed text-center"
                  style={{ color: '#a0b8d0', fontFamily: 'var(--font-body)' }}
                >
                  {current.message}
                </p>

                {/* 剩余错误提示 */}
                {errorPopups.length > 1 && (
                  <p
                    className="text-xs text-center"
                    style={{ color: '#607080' }}
                  >
                    还有 {errorPopups.length - 1} 条错误消息
                  </p>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleDismiss}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
                    style={{
                      fontFamily: 'var(--font-display)',
                      color: '#c0d0e0',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.color = '#e0f0ff'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                      e.currentTarget.style.color = '#c0d0e0'
                    }}
                  >
                    知道了
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
