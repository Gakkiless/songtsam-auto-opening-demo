# 松赞基本盘自动开团 Demo

本项目是一个本地运行的 Web Demo，用于模拟松赞第一阶段“基本盘自动开团”流程。当前版本只使用本地 mock JSON，不登录、不接数据库，确认后只模拟执行开团接口。

## 运行

```bash
npm install
npm run dev
```

默认 Demo 日期建议选择 `2026-06-01` 至 `2026-06-30`。示例选择：

- 日期区间：`2026-06-01` 至 `2026-06-30`
- 产品搜索框输入：`滇藏`
- 行程选择：`IT-XMMLB-7D / 香梅梅拉奔基础盘`
- 点击“添加到待开团清单”，可重复添加多个产品下的多个行程

## 当前 Demo 流程

1. 系统加载 mock 产品行程列表，模拟接口一次返回产品和行程数据。
2. 产品运营选择本次要生成计划的具体日期区间。
3. 产品运营搜索并选择一个产品。
4. 系统带出该产品下的行程，产品运营选择其中一条行程并添加到待开团清单。
5. 产品运营在已选中的产品行程卡片里配置默认人数、默认房间数、开团频次、出发日限制和首选/次选出发日。
6. 系统读取产品行程级开团配置。
7. 系统按日期区间生成候选出发日。
8. 系统按每日行程酒店简称计算入住块，例如 `香梅梅拉奔` 表示香格里拉 1 晚、梅里连住 2 晚、拉萨连住 2 晚、奔子栏 1 晚。
9. 系统选择基础房型并检查公共池库存是否满足占用。
10. 页面输出待确认计划、酒店资源占用和 mock payload。
11. 产品运营勾选可开团计划，点击确认后执行 mock 开团接口。
12. 系统展示本次执行结果：开团成功、开团失败、失败原因和成功团期号，并沉淀到历史开团记录。
13. 产品运营可在“开团结果”页导出历史开团记录。

## 目录结构

```text
src/
  mock/          本地产品行程、开团配置、酒店房型、库存、策略 JSON
  types/         业务类型定义
  config/        mock 数据装配层，后续可替换为 API adapter
  engine/        自动开团规则引擎
  components/    通用 UI 组件
  pages/         自动开团、待确认计划、开团结果、资源占用、Payload 页面
```

## 核心算法

入口是 `src/engine/openingEngine.ts` 的 `generateOpeningPlans`。

1. `generateMonthDates(year, month)` 生成目标月份日期列表。
2. `generateDateRangeDates(startDate, endDate)` 生成运营选择的具体日期区间。
3. `resolveOpeningConfig(product, productOpeningConfigs, businessTypeOpeningRules)` 解析产品行程级开团配置；业务类型规则仅作为兜底默认值。
4. `generateCandidateDepartureDates(product, monthDates, openingConfig)` 按合并后的业务频次生成候选出发日期。
5. `checkAllowedDepartureRule(openingConfig, date)` 检查单数日、双数日、指定星期等配置化出发日限制。
6. `calculateItineraryResourceUsage(product, departureDate, openingConfig)` 按每日行程计算每晚入住酒店和用房数量。
7. `chooseRoomType(hotel, roomTypePreference, config)` 按房型偏好和房型优先级选择基础房型。
8. `checkInventoryAvailability(resourceUsage, inventory, lockedInventory, config)` 检查 `预保留 + 预分配 + 预占 + 实占 + 本轮锁定 + 本次计划占用` 是否超过公共池。
9. `lockInventory(resourceUsage, lockedInventory)` 只锁定状态为“可开团”的计划，避免后续候选团期重复占用。
10. `generateOpeningPayload(openingPlan)` 输出 mock 开团接口 payload。

当前策略只使用基础房型。高级房型虽然可以卖，但会触发团期涨价，基本盘第一版不自动使用；如果基础房型不存在或公共池不足，计划会被标记为“资源不足”。

## Mock 数据

- `src/mock/products.json`：产品行程主数据，包含产品代码、产品名称、行程代码、行程名称、业务类型、行程天数、每日酒店和活动；同一产品代码可对应多条行程。
- `src/mock/productOpeningConfig.json`：产品行程级基本盘开团配置，包含默认人数/房数、开团频次、出发日限制、首选/次选出发日和房型偏好。
- `src/mock/hotels.json`：酒店和房型基础资料，包含酒店代码、酒店名称、酒店简写、房型代码、房型名称、房类、是否高级房型。
- `src/mock/inventory.json`：酒店房型库存，包含公共池、预保留、预分配、预占、实占、日期。
- `src/mock/strategyConfig.json`：系统兜底策略配置和房型优先级；第一版 `roomLevelPriority` 仅配置基础房型。

## 可配置项

当前 Demo 已支持产品行程级配置：

- 开团频次：每日、隔日 / 每 N 天、每周指定星期。
- 出发日限制：不限、单数日、双数日、指定星期。
- 首选出发日和次选出发日。
- 最大人数库存和默认房间数。
- 酒店房型偏好，例如某酒店优先基础双床。

配置入口在“自动开团”页。产品运营先添加一个或多个产品行程，然后点击已选产品行程卡片标题后的设置图标，在弹窗里调整规则。当前是 Demo 本地状态，修改后会立即影响本次生成结果；刷新页面会恢复 mock 默认值。真实系统落地时，这里应改为读取和保存产品行程开团配置接口。

库存状态不做前端规则配置。开团接口执行后，酒店资源状态由后端写入“预分配”；“预占”是客人下单支付后的状态，只作为库存占用口径参与校验。

## 后续接真实 API

建议保留 `engine` 目录的纯函数不变，只替换 `src/config/data.ts` 和确认执行逻辑：

1. 调用产品行程列表接口，返回产品及其多个行程，归一化成 `Product[]`。
2. 前端提供“选择产品、选择行程、添加到清单”的组合交互，清单中的一条或多条行程传给规则引擎。
3. 从系统配置读取产品行程开团配置和房型策略。
4. 按日期区间查询酒店房型库存接口，归一化成 `InventoryItem`。
5. 点击生成时调用 `generateOpeningPlans`，生成待确认计划。
6. 产品运营确认时，服务端重新校验库存。
7. 校验通过后调用真实开团接口，并回写开团结果。
8. 将开团结果列表落库，支持按批次、产品、行程、日期和状态查询，并导出历史记录。
