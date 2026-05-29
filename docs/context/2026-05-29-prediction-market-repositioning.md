---
date: 2026-05-29
slug: prediction-market-repositioning
title: Prediction-market twin workspace and owned-agent chat behavior
tags: [prediction-market, digital-twin, chat, agents, frontend]
related: []
---

## 背景 / 触发动机
产品方向从 web3 改为预测市场体验，关注对象从“市场”转为“人的数字分身”。主聊天区需要支持用户拥有的 agent 员工参与对话，同时右侧预测卡片和中间聊天要围绕分身、预测数据、跟投/观点选择组织。

## 关键决策
- 数字分身 mock 为 12 个，关注对象仍是“人”，不是市场。
- 右侧预测卡片保持 Polymarket 风格，并区分“关注中”和“已预测”；已预测市场仍展示 YES/NO 两侧，用 tooltip 表达分身持有的一侧。
- 主聊天区的 plus picker 表示“直接加入会话”，选中后立即出现在右上角 agent 头像堆叠。
- 输入框内 `@agent` 表示“本条消息点名的 agent 上下文”，支持小型模糊搜索、键盘选择、发送后高亮 `@Agent` token，并让 AI 回复切到该 agent 的第一人称视角。
- 已加入会话的 agent 仍可再次被 `@` 点名；重复点名必须继续生成高亮 token 和对应 agent 视角回复。

## 影响范围
- `src/App.tsx`：主流程状态、chat composer、plus picker、`@` mention 列表、消息渲染、agent 头像堆叠与消息上下文。
- `src/App.css`：agent mention token、agent 颜色气泡、右侧预测卡片和聊天区视觉样式。
- `src/data/content.ts`：数字分身、owned agents、预测市场 mock 数据。
- `src/lib/flow.ts`：回复生成逻辑，根据被点名 agent 的角色与擅长方向调整话术。
- `src/App.test.tsx` / `src/lib/flow.test.ts`：覆盖 plus 入会话、`@` 选择、重复 `@`、颜色和回复视角。

## 已知遗留 / 后续待办
- 当前预测市场、数字分身和 agent 数据仍是 mock；后续接真实接口时需要保持 `position`、`copyChoices`、`OwnedAgent.accent` 等 UI 契约。
- `@` mention 现在以选择列表写入的 `@Agent Name` 为准；如果后续支持自由编辑复杂富文本，需要把 plain text token 解析升级为结构化 mention 模型。
- AI 回复目前是前端 mock 文案；接真实模型时要把 lead agent、joined agents、active digital twin、market context 作为明确结构化参数传入。

## 验证
- `npm test`：4 files / 17 tests passed
- `npm run build`：通过
- `npm run lint`：通过
- 页面级 Playwright 验证：连续重复 `@Risk Guard` 会生成 2 个红色 mention token、2 条红色 agent 回复；plus picker 勾选 agent 后直接显示在右上角头像堆叠。
