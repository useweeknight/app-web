/**
 * ShareCard 组件
 *
 * 分享卡生成与展示
 * 调用后端 /generate-card 接口生成图片 URL
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { generateShareCard } from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface ShareCardProps {
  /** 用于生成卡片的内容元素的 ref */
  contentRef: React.RefObject<HTMLElement | null>;
  /** 用户 ID */
  userId?: string;
  /** 授权 token */
  token?: string;
  /** 卡片标题（用于分享） */
  title?: string;
  /** 关闭回调 */
  onClose?: () => void;
}

export function ShareCard({
  contentRef,
  userId = 'anon',
  token,
  title = 'My Weeknight Card',
  onClose,
}: ShareCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 生成分享卡
  const handleGenerate = useCallback(async () => {
    if (!contentRef.current) {
      setError('No content to capture');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 使用 html2canvas 捕获内容（如果可用）
      // 由于不使用 canvas 库，我们创建一个简单的 SVG/PNG 占位图
      // 实际实现应该在后端处理，这里只是传递请求

      // 创建一个简单的占位 PNG blob
      // 在真实实现中，这里应该捕获实际内容
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // 绘制简单的卡片背景
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, 600, 400);

        // 绘制标题
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(title, 300, 100);

        // 绘制装饰
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(50, 150, 500, 4);

        // 绘制品牌
        ctx.fillStyle = '#999999';
        ctx.font = '16px system-ui';
        ctx.fillText('Weeknight', 300, 350);
      }

      // 转换为 blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      });

      // 调用后端生成卡片
      const result = await generateShareCard(blob, userId, token);

      if (result.ok && result.url) {
        setImageUrl(result.url);
      } else {
        setError('Failed to generate card');
      }
    } catch (err) {
      console.error('[ShareCard] Generate error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate card');
    } finally {
      setLoading(false);
    }
  }, [contentRef, userId, token, title]);

  // 下载图片
  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `weeknight-card-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ShareCard] Download error:', err);
      // 回退：打开新标签页
      window.open(imageUrl, '_blank');
    }
  }, [imageUrl]);

  // 系统分享
  const handleShare = useCallback(async () => {
    if (!imageUrl) return;

    if (navigator.share) {
      try {
        // 尝试分享图片
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'weeknight-card.png', { type: 'image/png' });

        await navigator.share({
          title,
          files: [file],
        });
      } catch {
        // 如果分享文件失败，尝试分享 URL
        try {
          await navigator.share({
            title,
            url: imageUrl,
          });
        } catch {
          console.log('Share cancelled');
        }
      }
    } else {
      // 复制链接到剪贴板
      await navigator.clipboard.writeText(imageUrl);
      alert('Image URL copied to clipboard!');
    }
  }, [imageUrl, title]);

  return (
    <div
      className="share-card-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        className="share-card-modal"
        style={{
          background: 'var(--color-surface, #1e1e1e)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* 标题 */}
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: '1rem',
            color: 'var(--color-text, #fff)',
          }}
        >
          Share Card
        </h2>

        {/* 预览区域 */}
        <div
          style={{
            width: '100%',
            aspectRatio: '3 / 2',
            background: 'var(--color-background, #121212)',
            borderRadius: '12px',
            marginBottom: '1rem',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '3px solid var(--color-border, #333)',
                borderTopColor: 'var(--color-primary, #4CAF50)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          ) : imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt="Share Card"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                padding: '2rem',
                color: 'var(--color-text-secondary, #999)',
              }}
            >
              {error ? (
                <span style={{ color: 'var(--color-error, #f44336)' }}>{error}</span>
              ) : (
                'Click Generate to create your share card'
              )}
            </div>
          )}
        </div>

        {/* 按钮 */}
        {!imageUrl ? (
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="outline" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="outline" onClick={handleDownload} style={{ flex: 1 }}>
                📥 Download
              </Button>
              <Button variant="primary" onClick={handleShare} style={{ flex: 1 }}>
                🔗 Share
              </Button>
            </div>
            <Button variant="outline" onClick={onClose} style={{ width: '100%' }}>
              Done
            </Button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// ShareButton - 简化版分享按钮
// =============================================================================

interface ShareButtonProps {
  /** 用户 ID */
  userId?: string;
  /** 授权 token */
  token?: string;
  /** 卡片标题 */
  title?: string;
  /** 样式 */
  style?: React.CSSProperties;
  /** 类名 */
  className?: string;
}

export function ShareButton({
  userId = 'anon',
  token,
  title = 'My Weeknight Card',
  style,
  className,
}: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'var(--color-primary, #4CAF50)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          border: 'none',
          ...style,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>

      {/* 隐藏的内容容器 */}
      <div ref={contentRef} style={{ display: 'none' }} />

      {showModal && (
        <ShareCard
          contentRef={contentRef}
          userId={userId}
          token={token}
          title={title}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default ShareCard;

