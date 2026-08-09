# 🛒 买不买 - 购买审批神器

一个有趣的社交决策工具：想买啥？让大家帮你决定！

## ✨ 核心功能

- **发起购买申请**：列出想买的物品、价格、购买理由
- **全网投票**：其他用户可以投票「批准」或「不批」
- **评论互动**：投票后可以留下理由，支持点赞
- **实时统计**：显示批准率、票数、评论数
- **趣味结论**：根据投票结果生成趣味文案

## 🛠️ 技术栈

### 前端
- React 19
- Vite
- TailwindCSS 4

### 后端
- Node.js
- Express
- sql.js (纯 JS SQLite，无需编译)

## 🚀 快速开始

### 1. 安装依赖

```bash
# 后端
cd server
npm install

# 前端
cd client
npm install
```

### 2. 启动服务

```bash
# 启动后端（默认端口 3001）
cd server
npm start

# 启动前端（默认端口 5173）
cd client
npm run dev
```

### 3. 访问应用

打开浏览器访问 http://localhost:5173

## 📁 项目结构

```
shenpi/
├── server/              # 后端服务
│   ├── index.js         # Express 服务器 + API
│   ├── uploads/         # 上传的图片
│   └── shenpi.db        # SQLite 数据库
│
└── client/              # 前端应用
    ├── src/
    │   ├── api.js       # API 工具函数
    │   ├── App.jsx      # 主应用组件
    │   ├── components/  # 通用组件
    │   │   ├── LoginModal.jsx
    │   │   └── PostCard.jsx
    │   └── pages/       # 页面组件
    │       ├── HomePage.jsx
    │       ├── DetailPage.jsx
    │       ├── CreatePage.jsx
    │       └── ProfilePage.jsx
    └── index.html
```

## 📱 页面说明

1. **首页**：展示所有购买申请，支持分类筛选和排序
2. **详情页**：查看申请详情、投票、评论
3. **发起页**：创建新的购买申请
4. **个人中心**：查看我的申请和统计数据

## 🎯 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/login | 用户登录（创建临时用户） |
| GET | /api/users/:id | 获取用户信息 |
| GET | /api/posts | 获取申请列表 |
| GET | /api/posts/:id | 获取申请详情 |
| POST | /api/posts | 创建申请 |
| DELETE | /api/posts/:id | 删除申请 |
| POST | /api/posts/:id/vote | 投票 |
| GET | /api/posts/:id/vote/:userId | 获取投票状态 |
| GET | /api/posts/:id/comments | 获取评论 |
| POST | /api/posts/:id/comments | 发表评论 |
| POST | /api/comments/:id/like | 点赞评论 |

## 💡 设计理念

- **极低参与门槛**：游客模式浏览，一键登录投票
- **强情绪共鸣**：「批准党」和「不批党」天然站队
- **实用价值**：帮人理性消费，反向种草
- **娱乐属性**：各种奇葩申请自带传播点

## 📄 License

MIT
