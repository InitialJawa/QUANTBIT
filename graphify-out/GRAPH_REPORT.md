# Graph Report - .  (2026-07-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1102 nodes · 2062 edges · 99 communities (80 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4331586`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- PortfolioTracker.tsx
- marketData.ts
- dependencies
- SimulationTab.tsx
- pipeline-sync.ts
- devDependencies
- scripts
- compilerOptions
- models
- db.ts
- aiClient.ts
- FloatingAIChat.tsx
- buyPressure.ts
- aiChatHandler.ts
- marketRegimeEngine.ts
- 0004_v2_schema.sql
- AppSidebar.tsx
- MarketTab.tsx
- aiMemory.ts
- server.ts
- App.tsx
- motionVariants.ts
- StockData
- useProactiveAgent.ts
- TickerPage.tsx
- SignalHistoryTab.tsx
- compute-intermediate.ts
- runAiChat
- useAITools.ts
- models
- portfolioValue.ts
- simulate-strategy.ts
- AuthContext.tsx
- api
- usePortfolioManager.ts
- provider
- LeadersTab.tsx
- EngineConfigContext.tsx
- models
- STOCKS_DATA
- tsconfig.json
- keirouter
- systemKnowledge.ts
- localDb.ts
- ErrorBoundary
- compute-rank-history.ts
- compute-rotation.ts
- compute-signals.ts
- find-best-config.ts
- DigitalWalletUI.tsx
- types.ts
- 0007_ticker_detail.sql
- virtusoul
- buildProviderList
- api.ts
- compute-scores.ts
- fetchYahooData.ts
- run.ts
- portfolio.ts
- trade-logs.ts
- watchlist.ts
- models
- FloatingAIChat.history.test.tsx
- useShortcuts.ts
- 0005_auth_tables.sql
- login.ts
- me.ts
- signup.ts
- backtest-data.ts
- db-sync-status.ts
- idx80.ts
- sync.ts
- fundamentals.ts
- peers.ts
- profiles.ts
- rotation.ts
- scores.ts
- signals.ts
- profile.ts
- live-prices.ts
- nara
- vite.config.ts
- 0006_intermediate.sql

## God Nodes (most connected - your core abstractions)
1. `StockData` - 41 edges
2. `PortfolioItem` - 30 edges
3. `scripts` - 27 edges
4. `useEngineConfig()` - 23 edges
5. `runStrategy()` - 19 edges
6. `STOCKS_DATA` - 18 edges
7. `isCrashActive()` - 17 edges
8. `FloatingAIChat()` - 15 edges
9. `MKT` - 15 edges
10. `WatchlistItem` - 15 edges

## Surprising Connections (you probably didn't know these)
- `useDataFeed()` --indirect_call--> `fetchPrices()`  [INFERRED]
  src/hooks/useDataFeed.ts → scripts/pipeline-sync.ts
- `getAiStatusFromEnv()` --calls--> `getAiStatus()`  [EXTRACTED]
  server.ts → src/server/aiChatHandler.ts
- `ensureD1()` --calls--> `ensureSchema()`  [EXTRACTED]
  server.ts → src/server/db.ts
- `fetchPrices()` --references--> `yf`  [EXTRACTED]
  scripts/pipeline-sync.ts → src/data/yahoo/fetchYahooData.ts
- `fetchFundamentals()` --references--> `yf`  [EXTRACTED]
  scripts/pipeline-sync.ts → src/data/yahoo/fetchYahooData.ts

## Import Cycles
- None detected.

## Communities (99 total, 19 thin omitted)

### Community 0 - "PortfolioTracker.tsx"
Cohesion: 0.09
Nodes (56): PortfolioTracker(), SortKey, SyncStatus, AllocationResult, computeBuyAmount(), computeGoldPurchase(), computeGoldSale(), computeInitialAllocation() (+48 more)

### Community 1 - "marketData.ts"
Cohesion: 0.07
Nodes (40): setDividendCache(), buildMetricsFromFundamentals(), fundamentalsMap, getFundamentals(), getLatestFundamentals(), RealFundamentals, SyncStatus, useDataFeed() (+32 more)

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (49): better-sqlite3, express, @google/genai, groq-sdk, lucide-react, @modelcontextprotocol/sdk, motion, node-cron (+41 more)

### Community 3 - "SimulationTab.tsx"
Cohesion: 0.06
Nodes (39): allTickers, idx30Set, idx80Set, lq45Set, Card(), CardProps, Padding, paddingMap (+31 more)

### Community 4 - "pipeline-sync.ts"
Cohesion: 0.08
Nodes (37): avg(), computeMomentumSQL(), computeScoreSQL(), __dirname, esc(), fetchFundamentals(), fetchPrices(), fmtDate() (+29 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (34): @cloudflare/workers-types, concurrently, jsdom, devDependencies, @cloudflare/workers-types, concurrently, jsdom, playwright (+26 more)

### Community 6 - "scripts"
Cohesion: 0.06
Nodes (32): description, name, private, scripts, build, build:db, clean, db:migrate (+24 more)

### Community 7 - "compilerOptions"
Cohesion: 0.06
Nodes (31): ./*, dist, DOM, DOM.Iterable, ES2022, external, node_modules, quantbit (+23 more)

### Community 8 - "models"
Cohesion: 0.08
Nodes (25): models, name, name, name, name, name, name, name (+17 more)

### Community 9 - "db.ts"
Cohesion: 0.13
Nodes (20): __dirname, main(), __root, ensureD1(), RAW_STOCKS_DATA, server, transport, closeDb() (+12 more)

### Community 10 - "aiClient.ts"
Cohesion: 0.16
Nodes (20): AIChatMessage, askAI(), AskAIOptions, AskAIResult, DevMockResult, generateMockResponse(), generateTextResponse(), matchAction() (+12 more)

### Community 11 - "FloatingAIChat.tsx"
Cohesion: 0.14
Nodes (16): AIActionApprovalCard(), AIActionApprovalCardProps, ExplainButton(), ExplainButtonProps, WELCOME, MarkdownRenderer(), MarkdownRendererProps, samplePending (+8 more)

### Community 12 - "buyPressure.ts"
Cohesion: 0.15
Nodes (19): buildLiveContext(), ACTION_META, BuyPressureDashboard(), FACTOR_META, FactorBarProps, actionFromScore(), buildReason(), BuyPressureAction (+11 more)

### Community 13 - "aiChatHandler.ts"
Cohesion: 0.13
Nodes (22): AiChatResult, AiEnv, buildErrorMessage(), chatOpenAICompatible(), classifyError(), clearCooldown(), cooldown403Ms(), cooldown429Ms() (+14 more)

### Community 14 - "marketRegimeEngine.ts"
Cohesion: 0.20
Nodes (19): useMarketRegimeSync(), AuditTrailEntry, computeEMA(), computeMarketRegime(), computeSMA(), CurrentDecision, filterTickersForUniverse(), getAuditTrail() (+11 more)

### Community 15 - "0004_v2_schema.sql"
Cohesion: 0.21
Nodes (19): ai_messages, ai_sessions, backtest_logs, backtest_sessions, cash_holdings, idx80_scans, market_daily, notification_rules (+11 more)

### Community 16 - "AppSidebar.tsx"
Cohesion: 0.16
Nodes (13): AppSidebar(), ManageProfilesModal(), MarketTab(), DEFAULT_PROFILE, DEFAULT_UNIVERSE, StrategyConfigShape, StrategySettingsPanel(), StrategySettingsPanelProps (+5 more)

### Community 17 - "MarketTab.tsx"
Cohesion: 0.14
Nodes (13): LastUpdatedChip(), LastUpdatedChipProps, ChartDay, computeSMA(), MarketOverviewCharts(), MarketOverviewChartsProps, RawDay, Timeframe (+5 more)

### Community 18 - "aiMemory.ts"
Cohesion: 0.19
Nodes (15): AiMessage, AiMessageRole, AiSession, appendMessage(), createSession(), deleteSession(), getRecentMemory(), getSessionMessages() (+7 more)

### Community 19 - "server.ts"
Cohesion: 0.13
Nodes (11): app, __dirname, envPath, __filename, memAppendMessage(), memCreateSession(), MemMessage, MemSession (+3 more)

### Community 20 - "App.tsx"
Cohesion: 0.13
Nodes (13): AnalyticsTab, MarketRegimeSyncBridge(), MarketTab, PortfolioTracker, ProactiveAgentBridge(), SimulationTab, TickerPage, ADR-0003 (+5 more)

### Community 21 - "motionVariants.ts"
Cohesion: 0.21
Nodes (13): cards, CapabilityCard(), CapabilityCardProps, badgeVariants, bottomTitleVariants, cardContentChecklistVariants, cardContentDescVariants, cardContentTitleVariants (+5 more)

### Community 22 - "StockData"
Cohesion: 0.27
Nodes (16): BuildContextInputs, AnalyticsTabProps, AppSidebarProps, FloatingAIChatProps, LeadersTabProps, MarketTabProps, PortfolioTrackerProps, SimulationTabProps (+8 more)

### Community 23 - "useProactiveAgent.ts"
Cohesion: 0.19
Nodes (11): AppContent(), STORAGE_KEYS, useNotifications(), markRuleFired(), ProactiveRule, shouldFireRule(), useProactiveAgent(), Tab (+3 more)

### Community 24 - "TickerPage.tsx"
Cohesion: 0.15
Nodes (12): ForwardDividendsForecast(), ForwardDividendsForecastProps, MultiSearchableSelect(), MultiSearchableSelectProps, Option, TickerLogo(), OverviewTab, PeerComparisonTab (+4 more)

### Community 25 - "SignalHistoryTab.tsx"
Cohesion: 0.15
Nodes (11): FACTORS, ScoreBreakdown(), ScoreBreakdownProps, SignalBadge(), SignalBadgeProps, TIER_CONFIG, FundamentalsResponse, ScoreData (+3 more)

### Community 26 - "compute-intermediate.ts"
Cohesion: 0.25
Nodes (13): atr(), DailyRow, __dirname, ema(), esc(), macd(), main(), maxDrawdown() (+5 more)

### Community 27 - "runAiChat"
Cohesion: 0.19
Nodes (11): getAiStatusFromEnv(), clearAllCooldowns(), formatMemoryBlock(), getAiStatus(), getAllCooldowns(), getCooldownMsLeft(), getProviderStatus(), isAiError() (+3 more)

### Community 28 - "useAITools.ts"
Cohesion: 0.26
Nodes (12): mockCtx, ACTION_REGISTRY, buildMarketHistory(), buildPendingActionFromContext(), buildTickerMetrics(), formatIDR(), getProcessedLeadersSafe(), safeNum() (+4 more)

### Community 29 - "models"
Cohesion: 0.15
Nodes (13): models, name, name, name, name, name, name, kiro/auto (+5 more)

### Community 30 - "portfolioValue.ts"
Cohesion: 0.30
Nodes (10): AppHeader(), AppHeaderProps, TABS, formatRupiahShort(), goldValue(), positionValue(), stocksValue(), totalCost() (+2 more)

### Community 31 - "simulate-strategy.ts"
Cohesion: 0.29
Nodes (10): computeRanks(), computeSmoothRank(), DayData, detectCrash(), detectRecovery(), fetchData(), main(), SimConfig (+2 more)

### Community 32 - "AuthContext.tsx"
Cohesion: 0.27
Nodes (8): App(), LoginScreen(), AuthContext, AuthContextType, AuthProvider(), useAuth(), authApi, User

### Community 33 - "api"
Cohesion: 0.20
Nodes (8): RotationBadge(), RotationBadgeProps, STATUS_CONFIG, RotationEntry, RotationHistoryTabProps, RotationResponse, STATUS_COLORS, api

### Community 34 - "usePortfolioManager.ts"
Cohesion: 0.25
Nodes (9): loadPersisted(), Notification, NotificationContext, NotificationContextType, NotificationProvider(), persist(), TradeLog, usePortfolioManager() (+1 more)

### Community 35 - "provider"
Cohesion: 0.22
Nodes (8): name, npm, options, model, provider, 9router, openrouter, $schema

### Community 36 - "LeadersTab.tsx"
Cohesion: 0.33
Nodes (7): PROFILES, getRotationColor(), getRotationData(), LeadersTab(), CW_AMAN, CW_MAP, getProcessedLeaders()

### Community 37 - "EngineConfigContext.tsx"
Cohesion: 0.29
Nodes (9): createDefaultConfig(), DEFAULT_PROFILES, EngineConfig, EngineConfigContext, EngineConfigContextType, EngineConfigProvider(), getTodayWIB(), StrategySnapshot (+1 more)

### Community 38 - "models"
Cohesion: 0.22
Nodes (9): name, name, name, name, claude-haiku-4.5, claude-sonnet-4.5, mistral-large, mistral-medium-3-5 (+1 more)

### Community 39 - "STOCKS_DATA"
Cohesion: 0.28
Nodes (7): COMPARE_METRICS, fmtScore(), PeerComparisonTab(), PeerComparisonTabProps, PeerData, PeerResponse, STOCKS_DATA

### Community 40 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, types, extends, include, @cloudflare/workers-types, ./**/*.ts, ../tsconfig.json

### Community 41 - "keirouter"
Cohesion: 0.32
Nodes (8): name, npm, options, options, apiKey, baseURL, keirouter, options

### Community 42 - "systemKnowledge.ts"
Cohesion: 0.36
Nodes (6): AILiveContext, BEHAVIOR, buildSystemPrompt(), formatLiveContext(), STYLE_REMINDER, SYSTEM_KNOWLEDGE

### Community 44 - "localDb.ts"
Cohesion: 0.29
Nodes (6): DB_QUERY_SCRIPT, __dirname, escapeArg(), __filename, query(), ROOT

### Community 45 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 46 - "compute-rank-history.ts"
Cohesion: 0.38
Nodes (6): __dirname, esc(), main(), __root, run(), W

### Community 47 - "compute-rotation.ts"
Cohesion: 0.43
Nodes (6): __dirname, esc(), getRotation(), main(), __root, run()

### Community 48 - "compute-signals.ts"
Cohesion: 0.43
Nodes (6): __dirname, esc(), getTier(), main(), __root, run()

### Community 49 - "find-best-config.ts"
Cohesion: 0.33
Nodes (6): Cfg, D, main(), PROFILES, Res, run()

### Community 50 - "DigitalWalletUI.tsx"
Cohesion: 0.33
Nodes (4): DigitalWalletUI(), DigitalWalletUIProps, FloatingWallet(), FloatingWalletProps

### Community 51 - "types.ts"
Cohesion: 0.38
Nodes (3): HistoricalChart(), HistoricalChartProps, METRICS

### Community 52 - "0007_ticker_detail.sql"
Cohesion: 0.33
Nodes (5): company_profile, financial_statements, rank_history, rotation_history, signal_history

### Community 53 - "virtusoul"
Cohesion: 0.33
Nodes (6): virtusoul-v1, virtusoul, models, name, npm, name

### Community 54 - "buildProviderList"
Cohesion: 0.40
Nodes (6): buildProviderList(), chatGemini(), getAiStatusWithQuota(), getOpenRouterQuota(), isKeySet(), tryGeminiFallback()

### Community 55 - "api.ts"
Cohesion: 0.60
Nodes (4): clearSession(), devMock(), getSession(), request()

### Community 56 - "compute-scores.ts"
Cohesion: 0.50
Nodes (4): __dirname, main(), run(), SQL_FILE

### Community 57 - "fetchYahooData.ts"
Cohesion: 0.60
Nodes (3): fetchYahooData(), YahooStock, handleYahooRequest()

### Community 59 - "portfolio.ts"
Cohesion: 0.67
Nodes (3): Env, getUserEmail(), onRequest()

### Community 60 - "trade-logs.ts"
Cohesion: 0.67
Nodes (3): Env, getUserEmail(), onRequest()

### Community 61 - "watchlist.ts"
Cohesion: 0.67
Nodes (3): Env, getUserEmail(), onRequest()

### Community 62 - "models"
Cohesion: 0.40
Nodes (5): cohere/north-mini-code:free, meta-llama/llama-3.3-70b-instruct:free, nvidia/nemotron-3-super-120b:free, openai/gpt-oss-120b:free, models

### Community 63 - "FloatingAIChat.history.test.tsx"
Cohesion: 0.67
Nodes (3): TestHarness(), useChatHistory(), WELCOME

### Community 64 - "useShortcuts.ts"
Cohesion: 0.67
Nodes (3): isEditableTarget(), ShortcutMap, useShortcuts()

### Community 81 - "nara"
Cohesion: 0.67
Nodes (3): name, npm, nara

## Knowledge Gaps
- **356 isolated node(s):** `pipeline_runs`, `market_daily`, `backtest_intermediate`, `rank_history`, `rotation_history` (+351 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `StockData` connect `StockData` to `PortfolioTracker.tsx`, `marketData.ts`, `usePortfolioManager.ts`, `SimulationTab.tsx`, `LeadersTab.tsx`, `api`, `STOCKS_DATA`, `aiClient.ts`, `FloatingAIChat.tsx`, `AppSidebar.tsx`, `MarketTab.tsx`, `types.ts`, `App.tsx`, `TickerPage.tsx`, `SignalHistoryTab.tsx`, `useAITools.ts`, `portfolioValue.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `useDataFeed()` connect `marketData.ts` to `App.tsx`, `pipeline-sync.ts`, `marketRegimeEngine.ts`, `useProactiveAgent.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `fetchPrices()` connect `pipeline-sync.ts` to `marketData.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `pipeline_runs`, `market_daily`, `backtest_intermediate` to the rest of the system?**
  _356 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `PortfolioTracker.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08646322378716745 - nodes in this community are weakly interconnected._
- **Should `marketData.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06778476589797344 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._