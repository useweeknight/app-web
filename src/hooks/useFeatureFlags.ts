/**
 * useFeatureFlags Hook
 *
 * 从后端获取功能开关，控制 UI 显示
 * 按产品书：cold_start_flow、emoji_feedback 等
 */

import { useState, useEffect, useCallback } from 'react';
import { getFeatureFlags, FeatureFlags } from '@/lib/api';

// 默认 flags（当 API 不可用时）
const DEFAULT_FLAGS: FeatureFlags = {
  cold_start_flow: true,
  emoji_feedback: true,
  autoplan: false,
  budget_learning: false,
  multi_channel_list: false,
  nutrition_weekly: false,
  ocr_import: true,
  multi_dish_scheduler: false,
  appliance_link: false,
  web_voice_experiment: false,
};

interface UseFeatureFlagsOptions {
  /** 指定要获取的 flag 名称列表（默认获取全部） */
  keys?: string[];
  /** 授权 token */
  token?: string;
  /** 是否禁用自动获取（默认 false） */
  disabled?: boolean;
}

interface UseFeatureFlagsReturn {
  /** 功能开关键值对 */
  flags: FeatureFlags;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 刷新 flags */
  refresh: () => Promise<void>;
  /** 检查单个 flag 是否开启 */
  isEnabled: (key: keyof FeatureFlags | string) => boolean;
}

/**
 * 从后端获取功能开关
 */
export function useFeatureFlags(
  options: UseFeatureFlagsOptions = {}
): UseFeatureFlagsReturn {
  const { keys, token, disabled = false } = options;

  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(!disabled);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    if (disabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getFeatureFlags(keys, token);
      if (response.ok) {
        setFlags({ ...DEFAULT_FLAGS, ...response.flags });
      } else {
        console.warn('[useFeatureFlags] API returned not ok, using defaults');
        setFlags(DEFAULT_FLAGS);
      }
    } catch (err) {
      console.error('[useFeatureFlags] Failed to fetch flags:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch flags');
      // 出错时使用默认值
      setFlags(DEFAULT_FLAGS);
    } finally {
      setLoading(false);
    }
  }, [keys, token, disabled]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const isEnabled = useCallback(
    (key: keyof FeatureFlags | string) => {
      return flags[key] ?? false;
    },
    [flags]
  );

  return {
    flags,
    loading,
    error,
    refresh: fetchFlags,
    isEnabled,
  };
}

export default useFeatureFlags;

