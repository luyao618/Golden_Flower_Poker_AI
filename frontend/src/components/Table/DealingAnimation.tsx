import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../../stores/uiStore'
import CardFace from '../Cards/CardFace'

// ============================================================
// DealingAnimation - 荷官式发牌飞行动画
//
// 牌从桌面右侧（荷官位置）逐张沿弧线飞向各玩家座位。
// 发牌顺序模拟真实发牌：3 轮，每轮每人 1 张，快速连发。
// 每张牌带旋转、弧线轨迹和落地回弹效果。
// ============================================================

interface SeatPosition {
  x: number // 百分比 0-100
  y: number // 百分比 0-100
}

export interface DealingAnimationProps {
  /** 各玩家座位位置（百分比坐标），顺序与玩家列表一致 */
  seatPositions: SeatPosition[]
  /** 玩家数量 */
  playerCount: number
  /** 发牌完成回调 */
  onComplete?: () => void
}

/** 荷官位置：桌面右侧 */
const DEALER_POSITION = { x: 88, y: 48 }

/** 发牌节奏参数 */
const DEAL_INTERVAL = 80   // 每张牌发出间隔（ms）
const FLY_DURATION = 0.35  // 单张牌飞行时间（s）

/** 单张飞行牌的状态 */
interface FlyingCard {
  id: number
  targetPlayerIndex: number
  cardIndex: number // 该玩家的第几张牌 (0, 1, 2)
  target: SeatPosition
  /** 弧线偏移量（向上为负） */
  arcOffset: number
  /** 起始旋转角度 */
  startRotation: number
}

/**
 * 计算弧线偏移 — 根据目标相对荷官的方向，
 * 让牌飞行时走一条自然的弧线而非直线
 */
function calcArcOffset(target: SeatPosition): number {
  const dx = target.x - DEALER_POSITION.x
  // 向左飞的牌弧线向上偏，向下飞的牌弧线幅度更大
  const baseArc = -8
  const directionBias = dx < 0 ? -3 : 0
  return baseArc + directionBias
}

/**
 * 计算起始旋转角度 — 模拟荷官甩牌的初始角度
 * 向左飞的牌起始角度偏正（顺时针），向右偏负
 */
function calcStartRotation(target: SeatPosition): number {
  const dx = target.x - DEALER_POSITION.x
  return dx < 0 ? 15 : -10
}

export default function DealingAnimation({
  seatPositions,
  playerCount,
  onComplete,
}: DealingAnimationProps) {
  const { dealingAnimation } = useUIStore()
  const [visibleCards, setVisibleCards] = useState<FlyingCard[]>([])
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set())
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // 构建发牌序列：3 轮，每轮每人 1 张
  const buildDealSequence = useCallback((): FlyingCard[] => {
    const seq: FlyingCard[] = []
    let id = 0
    for (let round = 0; round < 3; round++) {
      for (let pIdx = 0; pIdx < playerCount; pIdx++) {
        if (seatPositions[pIdx]) {
          const target = seatPositions[pIdx]
          seq.push({
            id: id++,
            targetPlayerIndex: pIdx,
            cardIndex: round,
            target,
            arcOffset: calcArcOffset(target),
            startRotation: calcStartRotation(target),
          })
        }
      }
    }
    return seq
  }, [playerCount, seatPositions])

  // 启动或停止发牌动画
  useEffect(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []

    if (!dealingAnimation.isDealing) {
      return
    }

    const sequence = buildDealSequence()
    if (sequence.length === 0) return

    setVisibleCards([])
    setCompletedCards(new Set())

    // 依次发出每张牌
    sequence.forEach((card, index) => {
      const timer = setTimeout(() => {
        setVisibleCards((prev) => [...prev, card])
      }, index * DEAL_INTERVAL)
      timersRef.current.push(timer)
    })

    // 所有牌发完后等飞行结束再回调
    const totalTime = sequence.length * DEAL_INTERVAL + FLY_DURATION * 1000 + 200
    const completeTimer = setTimeout(() => {
      onCompleteRef.current?.()
    }, totalTime)
    timersRef.current.push(completeTimer)

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [dealingAnimation.isDealing, buildDealSequence])

  // 牌飞行完毕
  const handleLanded = useCallback((cardId: number) => {
    setCompletedCards((prev) => {
      const next = new Set(prev)
      next.add(cardId)
      return next
    })
  }, [])

  if (!dealingAnimation.isDealing && visibleCards.length === 0) {
    return null
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* 荷官牌堆（右侧，略微倾斜） */}
      <AnimatePresence>
        {dealingAnimation.isDealing && (
          <motion.div
            className="absolute"
            style={{
              left: `${DEALER_POSITION.x}%`,
              top: `${DEALER_POSITION.y}%`,
              transform: 'translate(-50%, -50%) rotate(-8deg)',
            }}
            initial={{ scale: 0, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: -8 }}
            exit={{ scale: 0.3, opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="relative">
              {/* 叠放的牌背 — 模拟荷官手中的牌叠 */}
              {[4, 3, 2, 1, 0].map((i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    top: `${-i * 1.5}px`,
                    left: `${-i * 0.8}px`,
                    zIndex: i,
                  }}
                >
                  <CardFace card={null} faceUp={false} size="sm" />
                </div>
              ))}
              {/* 占位保持尺寸 */}
              <div className="invisible">
                <CardFace card={null} faceUp={false} size="sm" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 飞行中的牌 */}
      {visibleCards.map((card) => {
        if (completedCards.has(card.id)) return null

        // 落点微调：根据 cardIndex 横向偏移，模拟手牌排列
        const spreadOffset = (card.cardIndex - 1) * 1.2

        // 弧线中点 Y 偏移
        const midY = (DEALER_POSITION.y + card.target.y + 9) / 2 + card.arcOffset

        return (
          <motion.div
            key={card.id}
            className="absolute"
            style={{ zIndex: 40 + card.id }}
            initial={{
              left: `${DEALER_POSITION.x}%`,
              top: `${DEALER_POSITION.y}%`,
              x: '-50%',
              y: '-50%',
              scale: 0.9,
              rotate: card.startRotation,
              opacity: 0.7,
            }}
            animate={{
              left: `${card.target.x + spreadOffset}%`,
              top: `${card.target.y + 9}%`,
              x: '-50%',
              y: '-50%',
              scale: [0.9, 0.85, 0.75, 0.8],     // 飞行中缩小，落地微回弹
              rotate: [card.startRotation, card.startRotation * 0.3, 0, 0],
              opacity: [0.7, 1, 1, 1],
            }}
            transition={{
              duration: FLY_DURATION,
              ease: [0.2, 0.65, 0.35, 1.0],
              // 弧线：top 使用自定义关键帧 timing
              top: {
                duration: FLY_DURATION,
                ease: 'easeInOut',
                times: [0, 0.4, 1],
                // @ts-expect-error framer-motion supports keyframe arrays in animate
                value: [`${DEALER_POSITION.y}%`, `${midY}%`, `${card.target.y + 9}%`],
              },
            }}
            onAnimationComplete={() => handleLanded(card.id)}
          >
            <CardFace card={null} faceUp={false} size="sm" />
          </motion.div>
        )
      })}
    </div>
  )
}
