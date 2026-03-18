// ============================================================
// 游戏设置 Store (Zustand)
// 管理全局设置：LLM max_tokens 等
// ============================================================

import { create } from 'zustand'
import { getSettings, updateSettings } from '../services/api'
import { useUIStore } from './uiStore'

export interface SettingsState {
  /** LLM 最大生成 token 数，null 表示无上限（使用默认值） */
  maxTokens: number | null
  /** 是否正在加载设置 */
  loading: boolean
  /** 是否正在保存设置 */
  saving: boolean

  /** 从后端拉取当前设置 */
  fetchSettings: () => Promise<void>
  /** 更新 max_tokens 设置 */
  setMaxTokens: (value: number | null) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  maxTokens: null,
  loading: false,
  saving: false,

  fetchSettings: async () => {
    set({ loading: true })
    try {
      const res = await getSettings()
      set({ maxTokens: res.llm_max_tokens })
    } catch (err) {
      useUIStore.getState().pushErrorPopup({
        message: err instanceof Error ? err.message : '获取设置失败',
        source: '加载设置',
      })
    } finally {
      set({ loading: false })
    }
  },

  setMaxTokens: async (value: number | null) => {
    set({ saving: true })
    try {
      await updateSettings({ llm_max_tokens: value })
      set({ maxTokens: value })
    } catch (err) {
      useUIStore.getState().pushErrorPopup({
        message: err instanceof Error ? err.message : '更新设置失败',
        source: '保存设置',
      })
    } finally {
      set({ saving: false })
    }
  },
}))
