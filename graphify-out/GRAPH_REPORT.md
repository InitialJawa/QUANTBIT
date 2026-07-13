# Graph Report - /tmp/QUANTBIT  (2026-07-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1060 nodes · 2013 edges · 87 communities (70 shown, 17 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- index.ts
- marketData.ts
- dependencies
- pipeline-sync.ts
- devDependencies
- scripts
- compilerOptions
- models
- db.ts
- buyPressure.ts
- marketRegimeEngine.ts
- SimulationTab.tsx
- aiChatHandler.ts
- FloatingAIChat.tsx
- App.tsx
- aiMemory.ts
- PortfolioTracker.tsx
- StockData
- server.ts
- useAITools.ts
- motionVariants.ts
- AppSidebar.tsx
- SignalHistoryTab.tsx
- compute-intermediate.ts
- runAiChat
- aiClient.ts
- MarketOverviewCharts.tsx
- models
- AICockpitContext.tsx
- portfolioValue.ts
- EngineConfigContext.tsx
- simulate-strategy.ts
- ErrorBoundary
- MarketTab.tsx
- api
- sync_engine.ts
- api.ts
- usePortfolioManager.ts
- useProactiveAgent.ts
- provider
- types.ts
- SearchableSelect.tsx
- STOCKS_DATA
- models
- tsconfig.json
- keirouter
- systemKnowledge.ts
- localDb.ts
- compute-rank-history.ts
- compute-rotation.ts
- compute-signals.ts
- find-best-config.ts
- DigitalWalletUI.tsx
- OverviewTab.tsx
- virtusoul
- buildProviderList
- compute-scores.ts
- fetchYahooData.ts
- run.ts
- portfolio.ts
- trade-logs.ts
- watchlist.ts
- 9router
- FloatingAIChat.history.test.tsx
- useShortcuts.ts
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

## Communities (87 total, 17 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.09
Nodes (54): PortfolioTracker(), AllocationResult, computeBuyAmount(), computeGoldPurchase(), computeGoldSale(), computeInitialAllocation(), computeRebalanceSwap(), computeSellProceeds() (+46 more)

### Community 1 - "marketData.ts"
Cohesion: 0.07
Nodes (38): setDividendCache(), buildMetricsFromFundamentals(), fundamentalsMap, getFundamentals(), getLatestFundamentals(), RealFundamentals, SyncStatus, useDataFeed() (+30 more)

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (49): better-sqlite3, express, @google/genai, groq-sdk, lucide-react, @modelcontextprotocol/sdk, motion, node-cron (+41 more)

### Community 3 - "pipeline-sync.ts"
Cohesion: 0.08
Nodes (37): avg(), computeMomentumSQL(), computeScoreSQL(), __dirname, esc(), fetchFundamentals(), fetchPrices(), fmtDate() (+29 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (34): @cloudflare/workers-types, concurrently, jsdom, devDependencies, @cloudflare/workers-types, concurrently, jsdom, playwright (+26 more)

### Community 5 - "scripts"
Cohesion: 0.06
Nodes (32): description, name, private, scripts, build, build:db, clean, db:migrate (+24 more)

### Community 6 - "compilerOptions"
Cohesion: 0.06
Nodes (31): ./*, dist, DOM, DOM.Iterable, ES2022, external, node_modules, quantbit (+23 more)

### Community 7 - "models"
Cohesion: 0.08
Nodes (25): models, name, name, name, name, name, name, name (+17 more)

### Community 8 - "db.ts"
Cohesion: 0.13
Nodes (20): __dirname, main(), __root, ensureD1(), RAW_STOCKS_DATA, server, transport, closeDb() (+12 more)

### Community 9 - "buyPressure.ts"
Cohesion: 0.14
Nodes (21): buildLiveContext(), ACTION_META, BuyPressureDashboard(), FACTOR_META, FactorBarProps, useEngineConfig(), actionFromScore(), buildReason() (+13 more)

### Community 10 - "marketRegimeEngine.ts"
Cohesion: 0.17
Nodes (21): MarketRegimeSyncBridge(), useMarketRegimeSync(), CW_AMAN, CW_MAP, AuditTrailEntry, computeMarketRegime(), computeSMA(), CurrentDecision (+13 more)

### Community 11 - "SimulationTab.tsx"
Cohesion: 0.10
Nodes (19): Card(), CardProps, Padding, paddingMap, Signal, signalMap, Variant, variantMap (+11 more)

### Community 12 - "aiChatHandler.ts"
Cohesion: 0.13
Nodes (22): AiChatResult, AiEnv, buildErrorMessage(), chatOpenAICompatible(), classifyError(), clearCooldown(), cooldown403Ms(), cooldown429Ms() (+14 more)

### Community 13 - "FloatingAIChat.tsx"
Cohesion: 0.16
Nodes (16): askAI(), extractToolCalls(), findMatchingBrace(), ACTION_TOOLS, extractToolCalls(), findMatchingBrace(), READ_ONLY_TOOLS, AppContent() (+8 more)

### Community 14 - "App.tsx"
Cohesion: 0.13
Nodes (14): AnalyticsTab, MarketTab, PortfolioTracker, ProactiveAgentBridge(), SimulationTab, TickerPage, ADR-0003, AITestHarness() (+6 more)

### Community 15 - "aiMemory.ts"
Cohesion: 0.19
Nodes (15): AiMessage, AiMessageRole, AiSession, appendMessage(), createSession(), deleteSession(), getRecentMemory(), getSessionMessages() (+7 more)

### Community 16 - "PortfolioTracker.tsx"
Cohesion: 0.22
Nodes (14): allTickers, idx30Set, idx80Set, lq45Set, getRotationColor(), getRotationData(), LeadersTab(), SortKey (+6 more)

### Community 17 - "StockData"
Cohesion: 0.24
Nodes (16): BuildContextInputs, AnalyticsTabProps, PROFILES, AppSidebarProps, FloatingAIChatProps, LeadersTabProps, MarketTabProps, PortfolioTrackerProps (+8 more)

### Community 18 - "server.ts"
Cohesion: 0.13
Nodes (11): app, __dirname, envPath, __filename, memAppendMessage(), memCreateSession(), MemMessage, MemSession (+3 more)

### Community 19 - "useAITools.ts"
Cohesion: 0.24
Nodes (13): STORAGE_KEYS, mockCtx, ACTION_REGISTRY, buildMarketHistory(), buildPendingActionFromContext(), buildTickerMetrics(), formatIDR(), getProcessedLeadersSafe() (+5 more)

### Community 20 - "motionVariants.ts"
Cohesion: 0.21
Nodes (13): cards, CapabilityCard(), CapabilityCardProps, badgeVariants, bottomTitleVariants, cardContentChecklistVariants, cardContentDescVariants, cardContentTitleVariants (+5 more)

### Community 21 - "AppSidebar.tsx"
Cohesion: 0.16
Nodes (9): ExplainButton(), ExplainButtonProps, DEFAULT_PROFILE, DEFAULT_UNIVERSE, StrategyConfigShape, StrategySettingsPanel(), StrategySettingsPanelProps, useAICockpit() (+1 more)

### Community 22 - "SignalHistoryTab.tsx"
Cohesion: 0.15
Nodes (11): FACTORS, ScoreBreakdown(), ScoreBreakdownProps, SignalBadge(), SignalBadgeProps, TIER_CONFIG, FundamentalsResponse, ScoreData (+3 more)

### Community 23 - "compute-intermediate.ts"
Cohesion: 0.25
Nodes (13): atr(), DailyRow, __dirname, ema(), esc(), macd(), main(), maxDrawdown() (+5 more)

### Community 24 - "runAiChat"
Cohesion: 0.19
Nodes (11): getAiStatusFromEnv(), clearAllCooldowns(), formatMemoryBlock(), getAiStatus(), getAllCooldowns(), getCooldownMsLeft(), getProviderStatus(), isAiError() (+3 more)

### Community 25 - "aiClient.ts"
Cohesion: 0.25
Nodes (11): AIChatMessage, AskAIOptions, AskAIResult, DevMockResult, generateMockResponse(), generateTextResponse(), matchAction(), matchReadOnly() (+3 more)

### Community 26 - "MarketOverviewCharts.tsx"
Cohesion: 0.19
Nodes (10): ChartDay, computeSMA(), MarketOverviewCharts(), MarketOverviewChartsProps, RawDay, Timeframe, PortfolioHistoryPoint, portfolioIndexedHistory() (+2 more)

### Community 27 - "models"
Cohesion: 0.15
Nodes (13): models, name, name, name, name, name, name, kiro/auto (+5 more)

### Community 28 - "AICockpitContext.tsx"
Cohesion: 0.24
Nodes (9): AIActionApprovalCard(), AIActionApprovalCardProps, samplePending, AICockpitContext, AICockpitContextType, AICockpitProvider(), ExplainRequest, PendingAction (+1 more)

### Community 29 - "portfolioValue.ts"
Cohesion: 0.30
Nodes (10): AppHeader(), AppHeaderProps, TABS, formatRupiahShort(), goldValue(), positionValue(), stocksValue(), totalCost() (+2 more)

### Community 30 - "EngineConfigContext.tsx"
Cohesion: 0.24
Nodes (10): ManageProfilesModal(), createDefaultConfig(), DEFAULT_PROFILES, EngineConfig, EngineConfigContext, EngineConfigContextType, EngineConfigProvider(), getTodayWIB() (+2 more)

### Community 31 - "simulate-strategy.ts"
Cohesion: 0.29
Nodes (10): computeRanks(), computeSmoothRank(), DayData, detectCrash(), detectRecovery(), fetchData(), main(), SimConfig (+2 more)

### Community 32 - "ErrorBoundary"
Cohesion: 0.20
Nodes (5): App(), AuthProvider(), ErrorBoundary, Props, State

### Community 33 - "MarketTab.tsx"
Cohesion: 0.29
Nodes (9): AppSidebar(), LastUpdatedChip(), LastUpdatedChipProps, MarketTab(), SyncStatus, computeEMA(), computeMACD(), computeRSI() (+1 more)

### Community 34 - "api"
Cohesion: 0.20
Nodes (8): RotationBadge(), RotationBadgeProps, STATUS_CONFIG, RotationEntry, RotationHistoryTabProps, RotationResponse, STATUS_COLORS, api

### Community 35 - "sync_engine.ts"
Cohesion: 0.31
Nodes (10): COMBINED_TICKERS, ACTIVE_UNIVERSE, calcDividend(), calcGrowth(), calcQuality(), calcValue(), refreshActiveUniverse(), runIdx80Scan() (+2 more)

### Community 36 - "api.ts"
Cohesion: 0.31
Nodes (8): AuthContext, AuthContextType, authApi, clearSession(), devMock(), getSession(), request(), User

### Community 37 - "usePortfolioManager.ts"
Cohesion: 0.25
Nodes (9): loadPersisted(), Notification, NotificationContext, NotificationContextType, NotificationProvider(), persist(), TradeLog, usePortfolioManager() (+1 more)

### Community 38 - "useProactiveAgent.ts"
Cohesion: 0.24
Nodes (7): markRuleFired(), ProactiveRule, shouldFireRule(), Tab, Theme, ADR-0003, useUIState()

### Community 39 - "provider"
Cohesion: 0.20
Nodes (9): model, cohere/north-mini-code:free, meta-llama/llama-3.3-70b-instruct:free, nvidia/nemotron-3-super-120b:free, openai/gpt-oss-120b:free, models, provider, openrouter (+1 more)

### Community 40 - "types.ts"
Cohesion: 0.24
Nodes (7): ForwardDividendsForecast(), ForwardDividendsForecastProps, OverviewTab, PeerComparisonTab, RotationHistoryTab, SignalHistoryTab, TICKER_TABS

### Community 41 - "SearchableSelect.tsx"
Cohesion: 0.24
Nodes (7): MultiSearchableSelect(), MultiSearchableSelectProps, Option, Option, SearchableSelect(), SearchableSelectProps, TickerLogo()

### Community 42 - "STOCKS_DATA"
Cohesion: 0.24
Nodes (8): COMPARE_METRICS, fmtScore(), PeerComparisonTab(), PeerComparisonTabProps, PeerData, PeerResponse, TickerPage(), STOCKS_DATA

### Community 43 - "models"
Cohesion: 0.22
Nodes (9): name, name, name, name, claude-haiku-4.5, claude-sonnet-4.5, mistral-large, mistral-medium-3-5 (+1 more)

### Community 44 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, types, extends, include, @cloudflare/workers-types, ./**/*.ts, ../tsconfig.json

### Community 45 - "keirouter"
Cohesion: 0.32
Nodes (8): name, npm, options, options, apiKey, baseURL, keirouter, options

### Community 46 - "systemKnowledge.ts"
Cohesion: 0.36
Nodes (6): AILiveContext, BEHAVIOR, buildSystemPrompt(), formatLiveContext(), STYLE_REMINDER, SYSTEM_KNOWLEDGE

### Community 48 - "localDb.ts"
Cohesion: 0.29
Nodes (6): DB_QUERY_SCRIPT, __dirname, escapeArg(), __filename, query(), ROOT

### Community 49 - "compute-rank-history.ts"
Cohesion: 0.38
Nodes (6): __dirname, esc(), main(), __root, run(), W

### Community 50 - "compute-rotation.ts"
Cohesion: 0.43
Nodes (6): __dirname, esc(), getRotation(), main(), __root, run()

### Community 51 - "compute-signals.ts"
Cohesion: 0.43
Nodes (6): __dirname, esc(), getTier(), main(), __root, run()

### Community 52 - "find-best-config.ts"
Cohesion: 0.33
Nodes (6): Cfg, D, main(), PROFILES, Res, run()

### Community 53 - "DigitalWalletUI.tsx"
Cohesion: 0.33
Nodes (4): DigitalWalletUI(), DigitalWalletUIProps, FloatingWallet(), FloatingWalletProps

### Community 54 - "OverviewTab.tsx"
Cohesion: 0.33
Nodes (4): HistoricalChart(), HistoricalChartProps, METRICS, OverviewTabProps

### Community 55 - "virtusoul"
Cohesion: 0.33
Nodes (6): virtusoul-v1, virtusoul, models, name, npm, name

### Community 56 - "buildProviderList"
Cohesion: 0.40
Nodes (6): buildProviderList(), chatGemini(), getAiStatusWithQuota(), getOpenRouterQuota(), isKeySet(), tryGeminiFallback()

### Community 57 - "compute-scores.ts"
Cohesion: 0.50
Nodes (4): __dirname, main(), run(), SQL_FILE

### Community 58 - "fetchYahooData.ts"
Cohesion: 0.60
Nodes (3): fetchYahooData(), YahooStock, handleYahooRequest()

### Community 60 - "portfolio.ts"
Cohesion: 0.67
Nodes (3): Env, getUserEmail(), onRequest()

### Community 61 - "trade-logs.ts"
Cohesion: 0.67
Nodes (3): Env, getUserEmail(), onRequest()

### Community 62 - "watchlist.ts"
Cohesion: 0.67
Nodes (3): Env, getUserEmail(), onRequest()

### Community 63 - "9router"
Cohesion: 0.50
Nodes (4): name, npm, options, 9router

### Community 64 - "FloatingAIChat.history.test.tsx"
Cohesion: 0.67
Nodes (3): TestHarness(), useChatHistory(), WELCOME

### Community 65 - "useShortcuts.ts"
Cohesion: 0.67
Nodes (3): isEditableTarget(), ShortcutMap, useShortcuts()

### Community 81 - "nara"
Cohesion: 0.67
Nodes (3): name, npm, nara

## Knowledge Gaps
- **348 isolated node(s):** `Env`, `Env`, `Env`, `Env`, `Env` (+343 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useDataFeed()` connect `marketData.ts` to `marketRegimeEngine.ts`, `pipeline-sync.ts`, `FloatingAIChat.tsx`, `App.tsx`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `fetchPrices()` connect `pipeline-sync.ts` to `marketData.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `StockData` connect `StockData` to `MarketTab.tsx`, `marketData.ts`, `api`, `usePortfolioManager.ts`, `types.ts`, `STOCKS_DATA`, `SimulationTab.tsx`, `FloatingAIChat.tsx`, `App.tsx`, `PortfolioTracker.tsx`, `useAITools.ts`, `AppSidebar.tsx`, `OverviewTab.tsx`, `SignalHistoryTab.tsx`, `aiClient.ts`, `portfolioValue.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `Env`, `Env`, `Env` to the rest of the system?**
  _348 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08994032395566923 - nodes in this community are weakly interconnected._
- **Should `marketData.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07013574660633484 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._