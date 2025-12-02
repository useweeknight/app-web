/**
 * LeftoverMarker 组件
 *
 * 剩菜标记弹层
 * 按产品书：烹饪完成后弹出「吃光 / 剩1份 / 剩2+」选择
 */

'use client';

import { useState, useCallback } from 'react';
import { createLeftover, sendTelemetry } from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface LeftoverMarkerProps {
  /** 菜谱 ID */
  recipeId: string;
  /** 菜谱标题 */
  recipeTitle?: string;
  /** 用户 ID */
  userId?: string;
  /** 授权 token */
  token?: string;
  /** 提交后回调 */
  onSubmit?: (leftoverServings: number) => void;
  /** 关闭弹窗 */
  onClose?: () => void;
}

type LeftoverOption = 0 | 1 | 2;

const LEFTOVER_OPTIONS: { value: LeftoverOption; label: string; description: string }[] = [
  { value: 0, label: '🍽️ All gone!', description: 'Nothing left' },
  { value: 1, label: '🥡 1 serving', description: 'Save for later' },
  { value: 2, label: '📦 2+ servings', description: 'Plenty of leftovers' },
];

export function LeftoverMarker({
  recipeId,
  recipeTitle,
  userId,
  token,
  onSubmit,
  onClose,
}: LeftoverMarkerProps) {
  const [selected, setSelected] = useState<LeftoverOption | null>(null);
  const [servings2Plus, setServings2Plus] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (selected === null) return;

    setSubmitting(true);
    try {
      const actualServings = selected === 2 ? servings2Plus : selected;

      // 发送 telemetry
      await sendTelemetry('leftover_mark', {
        recipe_id: recipeId,
        user_id: userId,
        context: {
          servings: actualServings,
          option_selected: selected,
        },
      }, token);

      // 如果有剩菜，创建记录
      if (actualServings > 0) {
        await createLeftover({
          recipe_id: recipeId,
          recipe_title: recipeTitle,
          servings: actualServings,
          user_id: userId,
        }, token);
      }

      onSubmit?.(actualServings);
    } catch (error) {
      console.error('[LeftoverMarker] Failed to submit:', error);
      // 即使失败也关闭弹窗
      onSubmit?.(selected === 2 ? servings2Plus : selected);
    } finally {
      setSubmitting(false);
    }
  }, [selected, servings2Plus, recipeId, recipeTitle, userId, token, onSubmit]);

  return (
    <div
      className="leftover-marker-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        className="leftover-marker-modal"
        style={{
          background: 'var(--color-surface, #1e1e1e)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '360px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* 标题 */}
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: 'var(--color-text, #fff)',
          }}
        >
          Any leftovers?
        </h2>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary, #999)',
            marginBottom: '1.5rem',
          }}
        >
          Track leftovers for future meal planning
        </p>

        {/* 选项 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '1.5rem',
          }}
        >
          {LEFTOVER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelected(option.value)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: selected === option.value
                  ? '2px solid var(--color-primary, #4CAF50)'
                  : '2px solid var(--color-border, #333)',
                background: selected === option.value
                  ? 'rgba(76, 175, 80, 0.15)'
                  : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 500,
                  color: 'var(--color-text, #fff)',
                  marginBottom: '4px',
                }}
              >
                {option.label}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary, #999)',
                }}
              >
                {option.description}
              </div>
            </button>
          ))}
        </div>

        {/* 2+ 份数选择器 */}
        {selected === 2 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '1.5rem',
              padding: '12px',
              background: 'var(--color-background, #121212)',
              borderRadius: '8px',
            }}
          >
            <span style={{ color: 'var(--color-text-secondary, #999)' }}>
              How many servings?
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setServings2Plus(Math.max(2, servings2Plus - 1))}
                disabled={servings2Plus <= 2}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--color-surface, #1e1e1e)',
                  color: 'var(--color-text, #fff)',
                  cursor: servings2Plus <= 2 ? 'not-allowed' : 'pointer',
                  opacity: servings2Plus <= 2 ? 0.5 : 1,
                  fontSize: '1.25rem',
                }}
              >
                −
              </button>
              <span
                style={{
                  minWidth: '32px',
                  textAlign: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--color-text, #fff)',
                }}
              >
                {servings2Plus}
              </span>
              <button
                onClick={() => setServings2Plus(Math.min(10, servings2Plus + 1))}
                disabled={servings2Plus >= 10}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--color-surface, #1e1e1e)',
                  color: 'var(--color-text, #fff)',
                  cursor: servings2Plus >= 10 ? 'not-allowed' : 'pointer',
                  opacity: servings2Plus >= 10 ? 0.5 : 1,
                  fontSize: '1.25rem',
                }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* 按钮 */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
          }}
        >
          <Button
            variant="outline"
            onClick={onClose}
            style={{
              flex: 1,
            }}
          >
            Skip
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={selected === null || submitting}
            style={{
              flex: 1,
            }}
          >
            {submitting ? 'Saving...' : 'Done'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LeftoverMarker;

