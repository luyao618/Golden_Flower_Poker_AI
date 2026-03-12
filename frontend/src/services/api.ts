// ============================================================
// REST API 调用封装
// 封装所有后端 HTTP 接口调用
// ============================================================

import type {
  AIModelInfo,
  ActionResponse,
  ChatMessage,
  CreateGameRequest,
  CreateGameResponse,
  ExperienceReview,
  GameSummary,
  PlayerActionRequest,
  RoundNarrative,
  ThoughtRecord,
} from '../types/game'

const BASE_URL = '/api'

// ---- 通用请求方法 ----

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

// ---- 游戏管理 ----

/** 创建新游戏 */
export async function createGame(req: CreateGameRequest): Promise<CreateGameResponse> {
  return request<CreateGameResponse>('/game/create', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

/** 获取游戏状态 */
export async function getGameState(gameId: string, playerId?: string) {
  const params = playerId ? `?player_id=${playerId}` : ''
  return request<{
    game_id: string
    status: string
    players: Array<Record<string, unknown>>
    current_round: Record<string, unknown> | null
    round_history: Array<Record<string, unknown>>
    config: Record<string, unknown>
  }>(`/game/${gameId}${params}`)
}

/** 开始游戏（开始第一局） */
export async function startGame(gameId: string) {
  return request<{
    message: string
    round_number: number
    dealer_index: number
    pot: number
    current_player_index: number
    game_state: Record<string, unknown>
  }>(`/game/${gameId}/start`, { method: 'POST' })
}

/** 结束游戏 */
export async function endGame(gameId: string) {
  return request<{
    message: string
    game_id: string
    final_standings: Array<{ id: string; name: string; chips: number }>
  }>(`/game/${gameId}/end`, { method: 'POST' })
}

/** 玩家执行操作 */
export async function playerAction(
  gameId: string,
  req: PlayerActionRequest
): Promise<ActionResponse> {
  return request<ActionResponse>(`/game/${gameId}/action`, {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

/** 获取可用 AI 模型列表 */
export async function getAvailableModels(): Promise<AIModelInfo[]> {
  return request<AIModelInfo[]>('/models')
}

// ---- 心路历程 ----

/** 获取某 AI 的所有思考记录 */
export async function getThoughts(
  gameId: string,
  agentId: string
): Promise<ThoughtRecord[]> {
  return request<ThoughtRecord[]>(`/game/${gameId}/thoughts/${agentId}`)
}

/** 获取某 AI 某局的思考记录 */
export async function getRoundThoughts(
  gameId: string,
  agentId: string,
  roundNum: number
): Promise<ThoughtRecord[]> {
  return request<ThoughtRecord[]>(
    `/game/${gameId}/thoughts/${agentId}/round/${roundNum}`
  )
}

/** 获取某 AI 某局的叙事 */
export async function getRoundNarrative(
  gameId: string,
  agentId: string,
  roundNum: number
): Promise<RoundNarrative> {
  return request<RoundNarrative>(
    `/game/${gameId}/narrative/${agentId}/round/${roundNum}`
  )
}

/** 获取某 AI 的游戏总结 */
export async function getGameSummary(
  gameId: string,
  agentId: string
): Promise<GameSummary> {
  return request<GameSummary>(`/game/${gameId}/summary/${agentId}`)
}

/** 获取某 AI 的所有经验回顾记录 */
export async function getExperienceReviews(
  gameId: string,
  agentId: string
): Promise<ExperienceReview[]> {
  return request<ExperienceReview[]>(`/game/${gameId}/reviews/${agentId}`)
}

// ---- 聊天 ----

/** 获取聊天历史 */
export async function getChatHistory(gameId: string): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/game/${gameId}/chat`)
}

/** 获取某局聊天历史 */
export async function getRoundChatHistory(
  gameId: string,
  roundNum: number
): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/game/${gameId}/chat/round/${roundNum}`)
}
