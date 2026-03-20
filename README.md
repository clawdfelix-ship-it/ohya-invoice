# OHA Invoice Web App

會計開單系統 - Next.js + Neon PostgreSQL (Vercel)

## 安裝

```bash
cd oha-invoice-web
npm install
```

## 本地運行

```bash
npm start
```

然後開瀏覽器去 http://localhost:3000

## 部署到 Railway (免費free)

1. 將呢個 folder push 去 GitHub
2. 去 https://railway.app 開個免費 account
3. 按 "New Project" → "Deploy from GitHub repo"
4. 揀你個 repo
5. 佢會自動 detect Node.js 並部署
6. 部署完會俾個 URL 你（例如：https://oha-invoice-production.up.railway.app）

## 檔案結構

```
oha-invoice-web/
├── package.json      # Node.js 依賴
├── server.js         # Express API server
├── database.js       # SQLite 數據庫設置
├── public/
│   └── index.html    # 前端 SPA
└── README.md
```

## 功能

- 📊 Dashboard - 總覽收支、未付款發票
- 👥 客戶管理 - 新增/編輯/刪除客戶，搜尋客戶
- 📄 發票開單 - 利潤%自動計售價，選客戶開單
- 💰 收支記錄 - 記錄收入/支出

## 數據庫

數據存在 `oha-invoice.db` (SQLite)，自動創建。

## 注意事項

- 第一次運行會自動創建數據庫
- 所有 API 都係 RESTful
- 前端用 fetch 呼叫 API
- 匯率預設 0.052 (1 JPY = 0.052 HKD)，存在 localStorage
