/**
 * EmojiFeedback 组件
 *
 * 饭后 Emoji 反馈弹窗
 * 按产品书：😋(好评) / 😐(一般) / 🙅(差评) + "孩子不爱"可选
 */

'use client';

import { useState, useCallback } from 'react';
import { sendTelemetry, TelemetryEvent } from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface EmojiFeedbackProps {
  /** 菜谱 ID */
  recipeId: string;
  /** 用户 ID */
  userId?: string;
  /** 授权 token */
  token?: string;
  /** 提交后回调 */
  onSubmit?: (rating: string, kidDislike: boolean) => void;
  /** 关闭弹窗 */
  onClose?: () => void;
}

type EmojiRating = 'good' | 'neutral' | 'bad';

const EMOJI_OPTIONS: { value: EmojiRating; emoji: string; label: string; event: TelemetryEvent }[] = [
  { value: 'good', emoji: '😋', label: 'Delicious!', event: 'emoji_good' },
  { value: 'neutral', emoji: '😐', label: 'It was okay', event: 'emoji_neutral' },
  { value: 'bad', emoji: '🙅', label: 'Not for me', event: 'emoji_bad' },
];

export function EmojiFeedback({
  recipeId,
  userId,
  token,
  onSubmit,
  onClose,
}: EmojiFeedbackProps) {
  const [selected, setSelected] = useState<EmojiRating | null>(null);
  const [kidDislike, setKidDislike] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!selected) return;

    setSubmitting(true);
    try {
      // 找到对应的事件类型
      const option = EMOJI_OPTIONS.find((o) => o.value === selected);
      if (option) {
        await sendTelemetry(option.event, {
          recipe_id: recipeId,
          user_id: userId,
          context: {
            kid_dislike: kidDislike,
            rating: selected,
          },
        }, token);
      }

      onSubmit?.(selected, kidDislike);
    } catch (error) {
      console.error('[EmojiFeedback] Failed to submit:', error);
      // 即使失败也关闭弹窗
      onSubmit?.(selected, kidDislike);
    } finally {
      setSubmitting(false);
    }
  }, [selected, kidDislike, recipeId, userId, token, onSubmit]);

  return (
    <div
      className="emoji-feedback-overlay"
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
        className="emoji-feedback-modal"
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
          How was it?
        </h2>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary, #999)',
            marginBottom: '1.5rem',
          }}
        >
          Your feedback helps us improve recommendations
        </p>

        {/* Emoji 选项 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '1.5rem',
          }}
        >
          {EMOJI_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelected(option.value)}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '16px',
                border: selected === option.value
                  ? '3px solid var(--color-primary, #4CAF50)'
                  : '2px solid var(--color-border, #333)',
                background: selected === option.value
                  ? 'rgba(76, 175, 80, 0.15)'
                  : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '2rem' }}>{option.emoji}</span>
              <span
                style={{
                  fontSize: '0.625rem',
                  color: 'var(--color-text-secondary, #999)',
                }}
              >
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {/* 孩子不爱选项 */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '1.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            color: 'var(--color-text, #fff)',
          }}
        >
          <input
            type="checkbox"
            checked={kidDislike}
            onChange={(e) => setKidDislike(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              accentColor: 'var(--color-primary, #4CAF50)',
            }}
          />
          <span>👶 Kids didn&apos;t like it</span>
        </label>

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
            disabled={!selected || submitting}
            style={{
              flex: 1,
            }}
          >
            {submitting ? 'Saving...' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EmojiFeedback;

