/**
 * API 客户端
 *
 * 调用 mcp-server 后端 API
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.useweeknight.com';

/**
 * 通用 API 请求
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// Tonight API
// =============================================================================

export interface TonightInput {
  user_id: string;
  text_input: string;
  pantry_snapshot?: Array<{
    name: string;
    qty_est_range: { lower: number; upper: number };
    unit?: string;
  }>;
}

export interface SuggestionCard {
  recipe_id: string;
  title: string;
  hero_image_url?: string;
  time_total_min: number;
  cookware_count: number;
  servings: number;
  tags: string[];
  kid_friendly: boolean;
  equipment: string[];
  substitutions_applied?: Array<{
    original: string;
    substitute: string;
    level: string;
  }>;
  leftover_potential?: {
    suitable: boolean;
    transformation?: string;
    safe_hours: number;
  };
  nutrition?: {
    calories_kcal?: number;
    protein_g?: number;
    fat_g?: number;
    carbs_g?: number;
  };
  score: number;
  rank_reasons: string[];
}

export interface TimelineStep {
  id: string;
  step_order: number;
  instruction: string;
  instruction_zh?: string;
  duration_sec?: number;
  timer_sec?: number;
  method?: string;
  equipment?: string;
  concurrent_group?: string;
  cleanup_hint?: string;
  temperature_f?: number;
  doneness_cue?: string;
  icon_keys?: string[];
}

export interface SideDish {
  name: string;
  time_min: number;
  equipment: string[];
  steps: string[];
  insert_window?: string;
}

export interface TonightResponse {
  ok: boolean;
  suggestions: SuggestionCard[];
  timeline: TimelineStep[];
  side_dishes: SideDish[];
  trace_id: string;
  decision_time_ms: number;
  clarifying_question?: string;
}

export async function getTonightSuggestions(
  input: TonightInput,
  token?: string
): Promise<TonightResponse> {
  return apiRequest<TonightResponse>('/api/tonight', {
    method: 'POST',
    body: JSON.stringify(input),
  }, token);
}

// =============================================================================
// Recipes API
// =============================================================================

export interface RecipeSearchParams {
  q?: string;
  cook_type?: string;
  equipment?: string;
  cuisine?: string;
  tags?: string;
  time_max?: number;
  cookware_max?: number;
  kid_friendly?: boolean;
  page?: number;
  limit?: number;
}

export interface RecipeCard {
  recipe_id: string;
  slug: string;
  title: string;
  title_zh?: string;
  hero_image_url?: string;
  time_total_min: number;
  cookware_count: number;
  servings: number;
  difficulty: string;
  kid_friendly: boolean;
  tags: string[];
  cook_type: string[];
  equipment: string[];
  cuisine?: string;
}

export interface RecipeSearchResponse {
  ok: boolean;
  data: RecipeCard[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export async function searchRecipes(
  params: RecipeSearchParams,
  token?: string
): Promise<RecipeSearchResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.set(key, String(value));
    }
  });
  
  return apiRequest<RecipeSearchResponse>(
    `/recipes/search?${queryParams.toString()}`,
    { method: 'GET' },
    token
  );
}

export async function getRecipeById(id: string, token?: string) {
  return apiRequest<{ ok: boolean; data: unknown }>(
    `/recipes/${id}`,
    { method: 'GET' },
    token
  );
}

export async function getRecipeTimeline(id: string, token?: string) {
  return apiRequest<{ ok: boolean; data: TimelineStep[] }>(
    `/recipes/${id}/timeline`,
    { method: 'GET' },
    token
  );
}

// =============================================================================
// Telemetry API
// =============================================================================

export type TelemetryEvent =
  | 'card_view'
  | 'card_click'
  | 'card_select'
  | 'cook_start'
  | 'cook_complete'
  | 'leftover_mark'
  | 'share'
  | 'emoji_good'
  | 'emoji_neutral'
  | 'emoji_bad';

export async function sendTelemetry(
  event: TelemetryEvent,
  data: {
    recipe_id?: string;
    user_id?: string;
    context?: Record<string, unknown>;
  },
  token?: string
): Promise<void> {
  await apiRequest('/telemetry', {
    method: 'POST',
    body: JSON.stringify({
      event,
      ...data,
    }),
  }, token);
}

// =============================================================================
// Share Card API
// =============================================================================

export async function generateShareCard(
  pngBlob: Blob,
  userId: string,
  token?: string
): Promise<{ ok: boolean; url: string }> {
  const response = await fetch(`${API_BASE}/generate-card?userId=${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/png',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: pngBlob,
  });

  if (!response.ok) {
    throw new Error('Failed to generate share card');
  }

  return response.json();
}

// =============================================================================
// Cook API (Step 7)
// =============================================================================

export interface CookSession {
  session_id: string;
  recipe_id: string;
  current_step: number;
  status: 'idle' | 'cooking' | 'paused' | 'completed';
  timer_remaining_sec: number;
  steps: TimelineStep[];
  current_step_data?: TimelineStep;
}

export interface CookStartResponse {
  ok: boolean;
  session_id: string;
  steps: TimelineStep[];
  current_step: number;
  status: string;
  timer_sec: number;
}

export interface CookActionResponse {
  ok: boolean;
  message: string;
  current_step: number;
  status: string;
  timer_remaining_sec: number;
}

/**
 * 创建烹饪会话
 */
export async function startCookSession(
  recipeId: string,
  userId?: string,
  token?: string
): Promise<CookStartResponse> {
  return apiRequest<CookStartResponse>('/cook/start', {
    method: 'POST',
    body: JSON.stringify({
      recipe_id: recipeId,
      user_id: userId,
    }),
  }, token);
}

/**
 * 发送烹饪控制指令
 */
export async function sendCookAction(
  sessionId: string,
  action: 'start' | 'next' | 'prev' | 'pause' | 'resume' | 'add_time' | 'set_time' | 'repeat' | 'stop',
  value?: number,
  token?: string
): Promise<CookActionResponse> {
  return apiRequest<CookActionResponse>('/cook/action', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      action,
      value,
    }),
  }, token);
}

/**
 * 获取烹饪会话状态
 */
export async function getCookSession(
  sessionId: string,
  token?: string
): Promise<{ ok: boolean; data: CookSession }> {
  return apiRequest<{ ok: boolean; data: CookSession }>(
    `/cook/session/${sessionId}`,
    { method: 'GET' },
    token
  );
}

/**
 * 创建 SSE 事件连接
 * 返回一个 EventSource 对象，调用者需要自行管理生命周期
 */
export function createCookEventSource(sessionId: string): EventSource {
  return new EventSource(`${API_BASE}/cook/events?session_id=${sessionId}`);
}

// =============================================================================
// Feature Flags API (Step 7 补丁)
// =============================================================================

export interface FeatureFlags {
  cold_start_flow: boolean;
  emoji_feedback: boolean;
  autoplan: boolean;
  budget_learning: boolean;
  multi_channel_list: boolean;
  nutrition_weekly: boolean;
  ocr_import: boolean;
  multi_dish_scheduler: boolean;
  appliance_link: boolean;
  web_voice_experiment: boolean;
  [key: string]: boolean; // 允许其他 flag
}

export interface FeatureFlagsResponse {
  ok: boolean;
  flags: FeatureFlags;
  source: 'database' | 'defaults';
  trace_id?: string;
}

/**
 * 获取功能开关
 */
export async function getFeatureFlags(
  keys?: string[],
  token?: string
): Promise<FeatureFlagsResponse> {
  const params = keys ? `?keys=${keys.join(',')}` : '';
  return apiRequest<FeatureFlagsResponse>(
    `/api/flags${params}`,
    { method: 'GET' },
    token
  );
}

/**
 * 获取单个功能开关
 */
export async function getFeatureFlag(
  key: string,
  token?: string
): Promise<{ ok: boolean; key: string; value: boolean; enabled: boolean }> {
  return apiRequest<{ ok: boolean; key: string; value: boolean; enabled: boolean }>(
    `/api/flags/${key}`,
    { method: 'GET' },
    token
  );
}

// =============================================================================
// Leftovers API (Step 7 补丁)
// =============================================================================

export interface Leftover {
  id: string;
  household_id?: string;
  recipe_id: string;
  recipe_title?: string;
  servings: number;
  safe_until: string;
  transformation?: string;
  is_consumed: boolean;
  consumed_at?: string;
  created_at: string;
}

export interface CreateLeftoverInput {
  recipe_id: string;
  recipe_title?: string;
  servings: number;
  user_id?: string;
  household_id?: string;
  safe_hours?: number;
  transformation?: string;
}

export interface LeftoversResponse {
  ok: boolean;
  data: Leftover[];
  total: number;
  trace_id?: string;
}

/**
 * 创建剩菜记录
 */
export async function createLeftover(
  input: CreateLeftoverInput,
  token?: string
): Promise<{ ok: boolean; data: Leftover; trace_id?: string }> {
  return apiRequest<{ ok: boolean; data: Leftover; trace_id?: string }>(
    '/api/leftovers',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token
  );
}

/**
 * 获取剩菜列表
 */
export async function getLeftovers(
  params: {
    user_id?: string;
    household_id?: string;
    include_consumed?: boolean;
    include_expired?: boolean;
  } = {},
  token?: string
): Promise<LeftoversResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.set(key, String(value));
    }
  });
  
  return apiRequest<LeftoversResponse>(
    `/api/leftovers?${queryParams.toString()}`,
    { method: 'GET' },
    token
  );
}

/**
 * 标记剩菜已消费
 */
export async function consumeLeftover(
  id: string,
  userId?: string,
  token?: string
): Promise<{ ok: boolean; data: Leftover; message?: string }> {
  return apiRequest<{ ok: boolean; data: Leftover; message?: string }>(
    `/api/leftovers/${id}/consume`,
    {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId }),
    },
    token
  );
}

// =============================================================================
// Groceries API (Step 7 补丁)
// =============================================================================

export interface GroceryRecipeInput {
  recipe_id: string;
  servings?: number;
}

export interface GroceryItem {
  name: string;
  qty: number;
  unit?: string;
  aisle: string;
  checked: boolean;
}

export interface GroceryAisleGroup {
  aisle: string;
  items: GroceryItem[];
}

export interface GroceryListResponse {
  ok: boolean;
  grocery_list: GroceryAisleGroup[];
  total_items: number;
  recipes_included: number;
  trace_id?: string;
}

/**
 * 生成购物清单
 */
export async function generateGroceryList(
  recipes: GroceryRecipeInput[],
  pantrySnapshot: Array<{ name: string }> = [],
  storePreference?: string,
  token?: string
): Promise<GroceryListResponse> {
  return apiRequest<GroceryListResponse>(
    '/api/groceries',
    {
      method: 'POST',
      body: JSON.stringify({
        recipes,
        pantry_snapshot: pantrySnapshot,
        store_preference: storePreference,
      }),
    },
    token
  );
}

