# 松赞基本盘自动开团 Demo

本项目是一个本地运行的 Web Demo，用于模拟松赞第一阶段“基本盘自动开团”流程。当前版本只使用本地 mock JSON，不登录、不接数据库，确认后只模拟执行开团接口。

## 运行

```bash
npm install
npm run dev
```

默认 Demo 日期建议选择 `2026-06-01` 至 `2026-06-30`。示例选择：

- 日期区间：`2026-06-01` 至 `2026-06-30`
- 产品 / 行程搜索框输入：`滇藏`
- 从搜索结果选择一个或多个产品行程，例如：`P001 / 滇藏深度主题团 / IT-XMMLB-7D / 香梅梅拉奔基础盘`

## 当前 Demo 流程

1. 系统加载 mock 产品行程列表，模拟接口一次返回产品和行程数据。
2. 产品运营选择本次要生成计划的具体日期区间。
3. 产品运营在产品 / 行程搜索选择框输入关键字，并从展开的搜索结果中选择一个或多个产品行程。
4. 系统读取本地配置中的开团间隔、出发日限制、房型偏好。
5. 系统按日期区间生成候选出发日。
6. 系统按每日行程酒店简称计算入住块，例如 `香梅梅拉奔` 表示香格里拉 1 晚、梅里连住 2 晚、拉萨连住 2 晚、奔子栏 1 晚。
7. 系统选择房型并检查公共池库存是否满足占用。
8. 页面输出待确认计划、酒店资源占用和 mock payload。
9. 产品运营勾选可开团计划，点击确认后执行 mock 开团接口。

## 目录结构

```text
src/
  mock/          本地产品行程、开团配置、酒店房型、库存、策略 JSON
  types/         业务类型定义
  config/        mock 数据装配层，后续可替换为 API adapter
  engine/        自动开团规则引擎
  components/    通用 UI 组件
  pages/         自动开团、待确认计划、资源占用、Payload 页面
```

## 核心算法

入口是 `src/engine/openingEngine.ts` 的 `generateOpeningPlans`。

1. `generateMonthDates(year, month)` 生成目标月份日期列表。
2. `generateDateRangeDates(startDate, endDate)` 生成运营选择的具体日期区间。
3. 根据产品开团配置的 `frequencyRuleId` 读取 `strategyConfig.businessFrequencyRules`。
4. `generateCandidateDepartureDates(product, monthDates, frequencyRule, openingConfig)` 按业务频次生成候选出发日期。
5. `checkAllowedDepartureRule(openingConfig, date)` 检查单数日、双数日、指定星期等配置化出发日限制。
6. `calculateItineraryResourceUsage(product, departureDate, openingConfig)` 按每日行程计算每晚入住酒店和用房数量。
7. `chooseRoomType(hotel, roomTypePreference, config)` 按房型偏好和房型优先级选择基础房型。
8. `checkInventoryAvailability(resourceUsage, inventory, lockedInventory, config)` 检查 `预保留 + 预分配 + 预占 + 实占 + 本轮锁定 + 本次计划占用` 是否超过公共池。
9. `lockInventory(resourceUsage, lockedInventory)` 只锁定状态为“可开团”的计划，避免后续候选团期重复占用。
10. `generateOpeningPayload(openingPlan)` 输出 mock 开团接口 payload。

当前策略只使用基础房型。高级房型虽然可以卖，但会触发团期涨价，基本盘第一版不自动使用；如果基础房型不存在或公共池不足，计划会被标记为“资源不足”。

## Mock 数据

- `src/mock/products.json`：产品行程主数据，包含产品代码、产品名称、行程代码、行程名称、业务类型、行程天数、每日酒店和活动；同一产品代码可对应多条行程。
- `src/mock/productOpeningConfig.json`：产品基本盘开团配置，包含是否参与、默认人数/房数、开团频次、出发日限制、房型偏好。
- `src/mock/hotels.json`：酒店和房型基础资料，包含酒店代码、酒店名称、酒店简写、房型代码、房型名称、房类、是否高级房型。
- `src/mock/inventory.json`：酒店房型库存，包含公共池、预保留、预分配、预占、实占、日期。
- `src/mock/strategyConfig.json`：系统策略配置，包含业务频次规则、房型优先级；第一版 `roomLevelPriority` 仅配置基础房型。

## 后续接真实 API

建议保留 `engine` 目录的纯函数不变，只替换 `src/config/data.ts` 和确认执行逻辑：

1. 调用产品行程列表接口，返回产品及其多个行程，归一化成 `Product[]`。
2. 前端提供产品 / 行程搜索多选框，选中一条或多条行程后传给规则引擎。
3. 从系统配置读取 `ProductOpeningConfig` 和 `StrategyConfig`。
4. 按日期区间查询酒店房型库存接口，归一化成 `InventoryItem`。
5. 点击生成时调用 `generateOpeningPlans`，生成待确认计划。
6. 产品运营确认时，服务端重新校验库存。
7. 校验通过后调用真实开团接口，并回写开团结果。
