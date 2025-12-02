/**
 * Grocery Page
 *
 * 过道分组购物清单 + 勾选 + 还差清单
 * Step 7 补丁：从后端 /api/groceries 获取数据
 */
'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BottomNav } from '@/components/ui/BottomNav';
import { Button } from '@/components/ui/Button';
import { generateGroceryList, type GroceryAisleGroup } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  aisle: string;
  checked: boolean;
  recipeSource?: string;
}

interface AisleGroup {
  aisle: string;
  items: GroceryItem[];
}

// =============================================================================
// Helpers
// =============================================================================

function groupByAisle(items: GroceryItem[]): AisleGroup[] {
  const groups: Record<string, GroceryItem[]> = {};
  
  items.forEach((item) => {
    if (!groups[item.aisle]) {
      groups[item.aisle] = [];
    }
    groups[item.aisle].push(item);
  });

  // 按过道排序
  const aisleOrder = ['Produce', 'Meat & Seafood', 'Dairy', 'Dairy & Eggs', 'Grains & Pasta', 'Pasta, Rice & Grains', 'Condiments', 'Condiments & Sauces', 'Spices & Seasonings', 'Frozen', 'Frozen Foods', 'Canned Goods', 'Bakery', 'Baking', 'Refrigerated', 'Other'];
  
  return Object.entries(groups)
    .map(([aisle, items]) => ({ aisle, items }))
    .sort((a, b) => {
      const aIndex = aisleOrder.indexOf(a.aisle);
      const bIndex = aisleOrder.indexOf(b.aisle);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
}

// 将 API 返回的数据转换为组件使用的格式
function convertAPIResponse(apiGroups: GroceryAisleGroup[]): GroceryItem[] {
  const items: GroceryItem[] = [];
  let id = 1;
  
  for (const group of apiGroups) {
    for (const item of group.items) {
      items.push({
        id: String(id++),
        name: item.name,
        quantity: String(item.qty || ''),
        unit: item.unit || '',
        aisle: item.aisle || group.aisle,
        checked: item.checked || false,
      });
    }
  }
  
  return items;
}

// =============================================================================
// GroceryItem Component
// =============================================================================

interface GroceryItemProps {
  item: GroceryItem;
  onToggle: () => void;
}

function GroceryItemView({ item, onToggle }: GroceryItemProps) {
  return (
    <div className={`grocery-item ${item.checked ? 'checked' : ''}`} onClick={onToggle}>
      <style jsx>{`
        .grocery-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--color-surface);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .grocery-item:hover {
          background: var(--color-border-light);
        }

        .grocery-item.checked {
          opacity: 0.6;
        }

        .checkbox {
          width: 24px;
          height: 24px;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .grocery-item.checked .checkbox {
          background: var(--color-success);
          border-color: var(--color-success);
        }

        .item-content {
          flex: 1;
          min-width: 0;
        }

        .item-name {
          font-weight: 500;
          color: var(--color-text-primary);
          text-decoration: none;
          transition: text-decoration var(--transition-fast);
        }

        .grocery-item.checked .item-name {
          text-decoration: line-through;
          color: var(--color-text-secondary);
        }

        .item-meta {
          display: flex;
          gap: var(--spacing-sm);
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          margin-top: var(--spacing-xs);
        }

        .item-source {
          color: var(--color-text-tertiary);
        }
      `}</style>

      <div className="checkbox">
        {item.checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <div className="item-content">
        <span className="item-name">{item.name}</span>
        <div className="item-meta">
          <span>{item.quantity} {item.unit}</span>
          {item.recipeSource && (
            <span className="item-source">• {item.recipeSource}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Grocery Content Component
// =============================================================================

function GroceryContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  // 从 URL 获取选定的菜谱
  const recipeIds = searchParams.get('recipes')?.split(',').filter(Boolean) || [];
  const servingsParam = searchParams.get('servings'); // 格式: "id1:4,id2:2"

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'remaining'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 获取用户 session
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setToken(session.access_token);
      }
    };
    getSession();
  }, [supabase]);

  // 用于依赖追踪的稳定字符串
  const recipeIdsString = recipeIds.join(',');

  // 从后端获取购物清单
  useEffect(() => {
    const fetchGroceryList = async () => {
      const ids = recipeIdsString.split(',').filter(Boolean);
      
      if (ids.length === 0) {
        // 没有选定菜谱时显示空状态
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // 解析份数参数
      const currentServingsMap: Record<string, number> = {};
      if (servingsParam) {
        servingsParam.split(',').forEach(pair => {
          const [id, servings] = pair.split(':');
          if (id && servings) {
            currentServingsMap[id] = parseInt(servings, 10);
          }
        });
      }

      try {
        const recipes = ids.map(id => ({
          recipe_id: id,
          servings: currentServingsMap[id] || undefined,
        }));

        const result = await generateGroceryList(recipes, [], undefined, token || undefined);

        if (result.ok) {
          const convertedItems = convertAPIResponse(result.grocery_list);
          setItems(convertedItems);
        } else {
          setError('Failed to generate grocery list');
        }
      } catch (err) {
        console.error('[Grocery] Failed to fetch:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch grocery list');
      } finally {
        setLoading(false);
      }
    };

    fetchGroceryList();
  }, [recipeIdsString, servingsParam, token]);

  const filteredItems = filter === 'remaining' 
    ? items.filter(item => !item.checked)
    : items;

  const groupedItems = groupByAisle(filteredItems);
  const totalItems = items.length;
  const checkedItems = items.filter(item => item.checked).length;
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  // 切换勾选状态
  const handleToggle = useCallback((itemId: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ));
  }, []);

  // 清除已购买
  const handleClearChecked = useCallback(() => {
    setItems(prev => prev.filter(item => !item.checked));
  }, []);

  // 分享清单
  const handleShare = useCallback(async () => {
    const remainingItems = items.filter(item => !item.checked);
    const text = remainingItems
      .map(item => `□ ${item.name} - ${item.quantity} ${item.unit}`)
      .join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Grocery List',
          text: `Grocery List:\n\n${text}`,
        });
      } catch {
        console.log('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(`Grocery List:\n\n${text}`);
      alert('List copied to clipboard!');
    }
  }, [items]);

  if (loading) {
    return (
      <div className="page-with-nav grocery-page">
        <style jsx>{`
          .grocery-page {
            background: var(--color-background);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid var(--color-border);
            border-top-color: var(--color-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: var(--spacing-md);
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div className="loading-spinner" />
        <p>Loading grocery list...</p>
        <BottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-with-nav grocery-page">
        <style jsx>{`
          .grocery-page {
            background: var(--color-background);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-lg);
            text-align: center;
          }
          .error-emoji {
            font-size: 4rem;
            margin-bottom: var(--spacing-md);
          }
          .error-message {
            color: var(--color-error);
            margin-bottom: var(--spacing-lg);
          }
        `}</style>
        <span className="error-emoji">😕</span>
        <p className="error-message">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page-with-nav grocery-page">
      <style jsx>{`
        .grocery-page {
          background: var(--color-background);
        }

        .grocery-header {
          padding: var(--spacing-lg);
          padding-top: calc(var(--spacing-lg) + var(--safe-area-inset-top));
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border-light);
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .header-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .header-actions {
          display: flex;
          gap: var(--spacing-sm);
        }

        .icon-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-border-light);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
        }

        .icon-btn:hover {
          background: var(--color-border);
        }

        .progress-section {
          margin-bottom: var(--spacing-md);
        }

        .progress-text {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin-bottom: var(--spacing-xs);
        }

        .progress-bar {
          height: 8px;
          background: var(--color-border-light);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--color-success);
          border-radius: var(--radius-full);
          transition: width var(--transition-normal);
        }

        .filter-tabs {
          display: flex;
          gap: var(--spacing-sm);
        }

        .filter-tab {
          padding: var(--spacing-xs) var(--spacing-md);
          background: var(--color-border-light);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .filter-tab.active {
          background: var(--color-primary);
          color: white;
        }

        .grocery-content {
          padding: var(--spacing-md);
        }

        .aisle-section {
          margin-bottom: var(--spacing-lg);
        }

        .aisle-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
          padding: var(--spacing-xs) 0;
        }

        .aisle-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
        }

        .aisle-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .aisle-count {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          margin-left: auto;
        }

        .aisle-items {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-2xl);
          text-align: center;
        }

        .empty-emoji {
          font-size: 4rem;
          margin-bottom: var(--spacing-md);
        }

        .empty-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .empty-description {
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }

        .clear-btn {
          margin-top: var(--spacing-md);
        }
      `}</style>

      <header className="grocery-header">
        <div className="header-top">
          <h1 className="header-title">Grocery List</h1>
          <div className="header-actions">
            <button className="icon-btn" onClick={handleShare}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          </div>
        </div>

        <div className="progress-section">
          <div className="progress-text">
            <span>{checkedItems} of {totalItems} items</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({totalItems})
          </button>
          <button 
            className={`filter-tab ${filter === 'remaining' ? 'active' : ''}`}
            onClick={() => setFilter('remaining')}
          >
            Remaining ({totalItems - checkedItems})
          </button>
        </div>
      </header>

      <main className="grocery-content">
        {groupedItems.length === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">🛒</span>
            <h2 className="empty-title">
              {filter === 'remaining' ? 'All done!' : 'No items yet'}
            </h2>
            <p className="empty-description">
              {filter === 'remaining' 
                ? 'You\'ve checked off everything on your list!' 
                : 'Select recipes to generate a grocery list.'}
            </p>
            {filter === 'remaining' && checkedItems > 0 && (
              <Button variant="secondary" onClick={handleClearChecked} className="clear-btn">
                Clear Checked Items
              </Button>
            )}
          </div>
        ) : (
          <>
            {groupedItems.map((group) => (
              <section key={group.aisle} className="aisle-section">
                <header className="aisle-header">
                  <span className="aisle-icon">
                    {group.aisle === 'Produce' && '🥬'}
                    {(group.aisle === 'Meat & Seafood') && '🥩'}
                    {(group.aisle === 'Dairy' || group.aisle === 'Dairy & Eggs') && '🥛'}
                    {(group.aisle === 'Grains & Pasta' || group.aisle === 'Pasta, Rice & Grains') && '🍚'}
                    {(group.aisle === 'Condiments' || group.aisle === 'Condiments & Sauces') && '🫙'}
                    {group.aisle === 'Spices & Seasonings' && '🧂'}
                    {(group.aisle === 'Frozen' || group.aisle === 'Frozen Foods') && '🧊'}
                    {group.aisle === 'Canned Goods' && '🥫'}
                    {group.aisle === 'Bakery' && '🍞'}
                    {group.aisle === 'Baking' && '🧁'}
                    {group.aisle === 'Refrigerated' && '🧊'}
                    {group.aisle === 'Other' && '📦'}
                  </span>
                  <h2 className="aisle-name">{group.aisle}</h2>
                  <span className="aisle-count">
                    {group.items.filter(i => !i.checked).length} items
                  </span>
                </header>
                <div className="aisle-items">
                  {group.items.map((item) => (
                    <GroceryItemView 
                      key={item.id} 
                      item={item} 
                      onToggle={() => handleToggle(item.id)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {checkedItems > 0 && (
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={handleClearChecked}
                className="clear-btn"
              >
                Clear {checkedItems} Checked Item{checkedItems > 1 ? 's' : ''}
              </Button>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

// =============================================================================
// Main Component with Suspense
// =============================================================================

export default function GroceryPage() {
  return (
    <Suspense fallback={
      <div className="page-with-nav" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--color-background)'
      }}>
        <p>Loading...</p>
        <BottomNav />
      </div>
    }>
      <GroceryContent />
    </Suspense>
  );
}
