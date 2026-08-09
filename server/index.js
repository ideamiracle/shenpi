const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ========== 数据库适配层 ==========
// 生产环境用 Turso，本地开发用 sql.js

let db; // 统一数据库接口

async function initDB() {
  if (process.env.TURSO_URL) {
    // ====== 生产模式：Turso ======
    const { createClient } = require('@libsql/client');
    db = createClient({
      url: process.env.TURSO_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // 创建表（Turso 语法）
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        avatar TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        price REAL NOT NULL,
        reason TEXT NOT NULL,
        category TEXT NOT NULL,
        anonymous INTEGER DEFAULT 0,
        author_id TEXT NOT NULL,
        approve_count INTEGER DEFAULT 0,
        reject_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS post_images (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        url TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        like_count INTEGER DEFAULT 0,
        parent_id TEXT DEFAULT NULL,
        reply_to_name TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS comment_likes (
        id TEXT PRIMARY KEY,
        comment_id TEXT NOT NULL,
        user_id TEXT NOT NULL
      );
    `);

    console.log('✅ Turso 数据库已连接');
  } else {
    // ====== 本地模式：sql.js ======
    const initSqlJs = require('sql.js');
    const DB_PATH = path.join(__dirname, 'shenpi.db');
    const SQL = await initSqlJs();

    let rawDb;
    if (fs.existsSync(DB_PATH)) {
      rawDb = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      rawDb = new SQL.Database();
    }

    // sql.js 适配器：实现与 Turso 兼容的接口
    db = {
      _raw: rawDb,
      _dbPath: DB_PATH,

      async execute(statement, params = []) {
        if (statement.trim().toLowerCase().startsWith('select') ||
            statement.trim().toLowerCase().startsWith('with') ||
            statement.trim().toLowerCase().startsWith('pragma')) {
          const stmt = rawDb.prepare(statement);
          if (params.length) stmt.bind(params);
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          return { rows, columns: rows.length > 0 ? Object.keys(rows[0]) : [] };
        } else {
          rawDb.run(statement, params);
          return { rows: [], columns: [] };
        }
      },

      async executeMultiple(sql) {
        rawDb.run(sql);
      },
    };

    // 保存数据库的辅助函数
    db._save = () => {
      const data = rawDb.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    };

    console.log('✅ 本地 SQLite 数据库已连接');
  }

  // 确保表存在并插入测试数据
  await ensureTablesAndData();
}

// 创建表和测试数据
async function ensureTablesAndData() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, nickname TEXT NOT NULL, avatar TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, title TEXT NOT NULL, price REAL NOT NULL, reason TEXT NOT NULL, category TEXT NOT NULL, anonymous INTEGER DEFAULT 0, author_id TEXT NOT NULL, approve_count INTEGER DEFAULT 0, reject_count INTEGER DEFAULT 0, comment_count INTEGER DEFAULT 0, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS post_images (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, url TEXT NOT NULL, sort_order INTEGER DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS votes (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, user_id TEXT NOT NULL, type TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, user_id TEXT NOT NULL, content TEXT NOT NULL, like_count INTEGER DEFAULT 0, parent_id TEXT DEFAULT NULL, reply_to_name TEXT DEFAULT NULL, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS comment_likes (id TEXT PRIMARY KEY, comment_id TEXT NOT NULL, user_id TEXT NOT NULL)`,
  ];

  for (const t of tables) {
    await db.execute(t);
  }

  // 迁移：为旧数据库添加列
  try { await db.execute("ALTER TABLE comments ADD COLUMN parent_id TEXT DEFAULT NULL"); } catch (e) {}
  try { await db.execute("ALTER TABLE comments ADD COLUMN reply_to_name TEXT DEFAULT NULL"); } catch (e) {}

  // 插入测试数据
  const existing = await db.execute("SELECT id FROM users WHERE id = 'test-user-1'");
  if (existing.rows.length === 0) {
    await db.execute("INSERT INTO users (id, nickname) VALUES ('test-user-1', '测试用户')");
    await db.execute("INSERT INTO users (id, nickname) VALUES ('test-user-2', '路人甲')");
    await db.execute("INSERT INTO users (id, nickname) VALUES ('test-user-3', '剁手达人')");

    const posts = [
      ['post-1', '匡威大星星托特包', 246, '上班背大包装东西很方便，而且颜值很高，搭配衣服也好看。已经种草很久了，求批准！', '服饰', 0, 'test-user-1', 136, 64, 8],
      ['post-2', 'iPhone 16 Pro Max', 9999, '现在的手机用了3年了，电池不行了，拍照也糊了。想换一个能用5年的手机。', '数码', 0, 'test-user-2', 89, 156, 12],
      ['post-3', '戴森吹风机 HD15', 3199, '头发又长又多，每天吹头发要20分钟，听说戴森5分钟就能吹干。求批准，救救我的时间！', '家居', 0, 'test-user-3', 234, 178, 15],
      ['post-4', '乐高霍格沃茨城堡', 3999, '哈利波特死忠粉，这辈子一定要拥有一次！而且可以当摆件，不亏！', '其他', 0, 'test-user-1', 456, 23, 20],
      ['post-5', '辞职去旅行一个月', 15000, '工作太累了，想gap一个月去云南大理休息。人生不只是工作，我想去看看世界。', '奇葩', 1, 'test-user-2', 678, 345, 35],
      ['post-6', 'SK-II 神仙水 230ml', 1590, '最近皮肤状态很差，听说神仙水对油皮很友好，想试试看效果。', '美妆', 0, 'test-user-3', 120, 200, 10],
    ];
    for (const p of posts) {
      await db.execute(
        "INSERT INTO posts (id, title, price, reason, category, anonymous, author_id, approve_count, reject_count, comment_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        p
      );
    }

    const comments = [
      [uuidv4(), 'post-1', 'test-user-2', '上班背确实方便，批准！我同事就有一个，很能装'],
      [uuidv4(), 'post-1', 'test-user-3', '同款已买，质量不错，推荐入'],
      [uuidv4(), 'post-2', 'test-user-3', '太贵了，建议等降价或者买上一代'],
      [uuidv4(), 'post-2', 'test-user-1', '不如买华为，支持国产！'],
      [uuidv4(), 'post-3', 'test-user-1', '戴森是真的好用，长发星人必入'],
      [uuidv4(), 'post-5', 'test-user-3', '批准！人生苦短，该浪就浪'],
      [uuidv4(), 'post-5', 'test-user-1', '不批。建议先找好下家再辞职'],
      [uuidv4(), 'post-4', 'test-user-2', '哈迷表示必须批准！买它！'],
    ];
    for (const c of comments) {
      await db.execute("INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)", c);
    }

    console.log('✅ 测试数据已插入');
  }

  if (db._save) db._save();
}

// ========== Express 配置 ==========

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// 图片上传（本地开发模式：存文件；生产模式：存 base64）
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// 生产模式：使用 multer 处理文件上传
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ========== 用户 API ==========

app.post('/api/login', async (req, res) => {
  const { nickname } = req.body;
  const id = uuidv4();
  const name = nickname || `游客${Math.floor(Math.random() * 10000)}`;
  await db.execute("INSERT INTO users (id, nickname) VALUES (?, ?)", [id, name]);
  if (db._save) db._save();
  res.json({ id, nickname: name });
});

app.get('/api/users/:id', async (req, res) => {
  const result = await db.execute("SELECT * FROM users WHERE id = ?", [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: '用户不存在' });
  const user = result.rows[0];

  const posts = await db.execute("SELECT COUNT(*) as count FROM posts WHERE author_id = ?", [req.params.id]);
  const votes = await db.execute("SELECT COUNT(*) as count FROM votes WHERE user_id = ?", [req.params.id]);
  const approves = await db.execute("SELECT COUNT(*) as count FROM votes WHERE user_id = ? AND type = 'approve'", [req.params.id]);

  res.json({ ...user, stats: { post_count: posts.rows[0].count, vote_count: votes.rows[0].count, approve_count: approves.rows[0].count } });
});

// ========== 申请 API ==========

app.get('/api/posts', async (req, res) => {
  const { page = 1, limit = 10, category, sort = 'hot' } = req.query;
  const offset = (page - 1) * limit;

  let where = "WHERE p.status = 'active'";
  const params = [];
  if (category && category !== '全部') { where += ' AND p.category = ?'; params.push(category); }

  let orderBy = 'ORDER BY (p.approve_count + p.reject_count) DESC, p.created_at DESC';
  if (sort === 'new') orderBy = 'ORDER BY p.created_at DESC';
  if (sort === 'controversial') orderBy = 'ORDER BY ABS(p.approve_count - p.reject_count) ASC, (p.approve_count + p.reject_count) DESC';

  const countResult = await db.execute(`SELECT COUNT(*) as total FROM posts p ${where}`, params);
  const total = countResult.rows[0]?.total || 0;

  const postsResult = await db.execute(
    `SELECT p.*, u.nickname as author_name, u.avatar as author_avatar
     FROM posts p LEFT JOIN users u ON p.author_id = u.id
     ${where} ${orderBy} LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  // 批量获取所有图片（一次查询替代 N 次）
  const postRows = postsResult.rows;
  const imagesMap = {};
  if (postRows.length > 0) {
    const placeholders = postRows.map(() => '?').join(',');
    const postIds = postRows.map(r => r.id);
    const allImages = await db.execute(
      `SELECT post_id, url FROM post_images WHERE post_id IN (${placeholders}) ORDER BY sort_order`,
      postIds
    );
    allImages.rows.forEach(img => {
      if (!imagesMap[img.post_id]) imagesMap[img.post_id] = [];
      imagesMap[img.post_id].push(img.url);
    });
  }

  const posts = postRows.map(post => ({
    ...post,
    images: imagesMap[post.id] || [],
    anonymous: !!post.anonymous
  }));

  res.json({ posts, total, page: Number(page), limit: Number(limit) });
});

app.get('/api/posts/:id', async (req, res) => {
  const result = await db.execute(
    "SELECT p.*, u.nickname as author_name, u.avatar as author_avatar FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE p.id = ?",
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: '申请不存在' });

  const post = result.rows[0];
  const imgs = await db.execute("SELECT url FROM post_images WHERE post_id = ? ORDER BY sort_order", [post.id]);
  res.json({ ...post, images: imgs.rows.map(r => r.url), anonymous: !!post.anonymous });
});

app.post('/api/posts', upload.array('images', 3), async (req, res) => {
  const { title, price, reason, category, anonymous, author_id } = req.body;
  if (!title || !price || !reason || !category || !author_id) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const postId = uuidv4();
  await db.execute(
    "INSERT INTO posts (id, title, price, reason, category, anonymous, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [postId, title, Number(price), reason, category, anonymous === 'true' || anonymous === true ? 1 : 0, author_id]
  );

  // 保存图片
  if (req.files && req.files.length > 0) {
    for (let i = 0; i < req.files.length; i++) {
      await db.execute("INSERT INTO post_images (id, post_id, url, sort_order) VALUES (?, ?, ?, ?)", [
        uuidv4(), postId, `/uploads/${req.files[i].filename}`, i
      ]);
    }
  }

  if (db._save) db._save();

  const result2 = await db.execute(
    "SELECT p.*, u.nickname as author_name FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE p.id = ?",
    [postId]
  );
  res.json(result2.rows[0]);
});

app.delete('/api/posts/:id', async (req, res) => {
  const { user_id } = req.body;
  const result = await db.execute("SELECT * FROM posts WHERE id = ?", [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: '申请不存在' });
  if (result.rows[0].author_id !== user_id) return res.status(403).json({ error: '无权删除' });

  await db.execute("UPDATE posts SET status = 'deleted' WHERE id = ?", [req.params.id]);
  if (db._save) db._save();
  res.json({ success: true });
});

// ========== 投票 API ==========

app.post('/api/posts/:id/vote', async (req, res) => {
  const { user_id, type } = req.body;
  if (!['approve', 'reject'].includes(type)) return res.status(400).json({ error: '投票类型无效' });

  const postResult = await db.execute("SELECT * FROM posts WHERE id = ?", [req.params.id]);
  if (postResult.rows.length === 0) return res.status(404).json({ error: '申请不存在' });

  const existing = await db.execute("SELECT * FROM votes WHERE post_id = ? AND user_id = ?", [req.params.id, user_id]);

  if (existing.rows.length > 0) {
    const oldVote = existing.rows[0];
    if (oldVote.type === type) {
      // 取消投票
      await db.execute("DELETE FROM votes WHERE id = ?", [oldVote.id]);
      await db.execute(`UPDATE posts SET ${type === 'approve' ? 'approve_count' : 'reject_count'} = ${type === 'approve' ? 'approve_count' : 'reject_count'} - 1 WHERE id = ?`, [req.params.id]);
      if (db._save) db._save();
      return res.json({ action: 'removed', type });
    } else {
      // 改票
      await db.execute("UPDATE votes SET type = ? WHERE id = ?", [type, oldVote.id]);
      const oldField = oldVote.type === 'approve' ? 'approve_count' : 'reject_count';
      const newField = type === 'approve' ? 'approve_count' : 'reject_count';
      await db.execute(`UPDATE posts SET ${oldField} = ${oldField} - 1, ${newField} = ${newField} + 1 WHERE id = ?`, [req.params.id]);
      if (db._save) db._save();
      return res.json({ action: 'changed', type });
    }
  } else {
    // 新投票
    await db.execute("INSERT INTO votes (id, post_id, user_id, type) VALUES (?, ?, ?, ?)", [uuidv4(), req.params.id, user_id, type]);
    await db.execute(`UPDATE posts SET ${type === 'approve' ? 'approve_count' : 'reject_count'} = ${type === 'approve' ? 'approve_count' : 'reject_count'} + 1 WHERE id = ?`, [req.params.id]);
    if (db._save) db._save();
    return res.json({ action: 'added', type });
  }
});

app.get('/api/posts/:id/vote/:userId', async (req, res) => {
  const result = await db.execute("SELECT type FROM votes WHERE post_id = ? AND user_id = ?", [req.params.id, req.params.userId]);
  res.json({ voted: result.rows.length > 0 ? result.rows[0].type : null });
});

// ========== 评论 API ==========

app.get('/api/posts/:id/comments', async (req, res) => {
  const { type, sort = 'new' } = req.query;
  let orderBy = 'ORDER BY c.created_at DESC';
  if (sort === 'hot') orderBy = 'ORDER BY c.like_count DESC, c.created_at DESC';

  const result = await db.execute(
    `SELECT c.*, u.nickname as author_name, u.avatar as author_avatar,
            (SELECT v.type FROM votes v WHERE v.post_id = c.post_id AND v.user_id = c.user_id) as vote_type
     FROM comments c LEFT JOIN users u ON c.user_id = u.id
     WHERE c.post_id = ? ${orderBy}`,
    [req.params.id]
  );

  let comments = result.rows;
  if (type === 'approve') comments = comments.filter(c => c.vote_type === 'approve');
  if (type === 'reject') comments = comments.filter(c => c.vote_type === 'reject');

  res.json(comments);
});

app.post('/api/posts/:id/comments', async (req, res) => {
  const { user_id, content, parent_id, reply_to_name } = req.body;
  if (!content || content.trim().length === 0) return res.status(400).json({ error: '评论内容不能为空' });

  const commentId = uuidv4();
  await db.execute(
    "INSERT INTO comments (id, post_id, user_id, content, like_count, parent_id, reply_to_name) VALUES (?, ?, ?, ?, 0, ?, ?)",
    [commentId, req.params.id, user_id, content.trim(), parent_id || null, reply_to_name || null]
  );
  await db.execute("UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?", [req.params.id]);
  if (db._save) db._save();

  const result = await db.execute(
    `SELECT c.*, u.nickname as author_name, u.avatar as author_avatar,
            (SELECT v.type FROM votes v WHERE v.post_id = c.post_id AND v.user_id = c.user_id) as vote_type
     FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
    [commentId]
  );
  res.json(result.rows[0]);
});

app.post('/api/comments/:id/like', async (req, res) => {
  const { user_id } = req.body;
  const existing = await db.execute("SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?", [req.params.id, user_id]);

  if (existing.rows.length > 0) {
    await db.execute("DELETE FROM comment_likes WHERE id = ?", [existing.rows[0].id]);
    await db.execute("UPDATE comments SET like_count = like_count - 1 WHERE id = ?", [req.params.id]);
    if (db._save) db._save();
    return res.json({ liked: false });
  } else {
    await db.execute("INSERT INTO comment_likes (id, comment_id, user_id) VALUES (?, ?, ?)", [uuidv4(), req.params.id, user_id]);
    await db.execute("UPDATE comments SET like_count = like_count + 1 WHERE id = ?", [req.params.id]);
    if (db._save) db._save();
    return res.json({ liked: true });
  }
});

// ========== 统计 API ==========

app.get('/api/stats', async (req, res) => {
  const posts = await db.execute("SELECT COUNT(*) as count FROM posts WHERE status = 'active'");
  const votes = await db.execute("SELECT COUNT(*) as count FROM votes");
  const comments = await db.execute("SELECT COUNT(*) as count FROM comments");
  const users = await db.execute("SELECT COUNT(*) as count FROM users");
  const todayPosts = await db.execute("SELECT COUNT(*) as count FROM posts WHERE status = 'active' AND date(created_at) = date('now')");
  const approvalStats = await db.execute("SELECT SUM(approve_count) as ta, SUM(reject_count) as tr FROM posts WHERE status = 'active'");
  const catStats = await db.execute("SELECT category, COUNT(*) as count, SUM(approve_count + reject_count) as total_votes FROM posts WHERE status = 'active' GROUP BY category ORDER BY count DESC");
  const hotPosts = await db.execute("SELECT id, title, approve_count + reject_count as hot_score FROM posts WHERE status = 'active' ORDER BY hot_score DESC LIMIT 5");
  const controversial = await db.execute("SELECT id, title, ABS(approve_count - reject_count) as gap, approve_count + reject_count as total FROM posts WHERE status = 'active' AND (approve_count + reject_count) >= 10 ORDER BY gap ASC, total DESC LIMIT 5");

  const ta = approvalStats.rows[0]?.ta || 0;
  const tr = approvalStats.rows[0]?.tr || 0;

  res.json({
    total_posts: posts.rows[0].count,
    total_votes: votes.rows[0].count,
    total_comments: comments.rows[0].count,
    total_users: users.rows[0].count,
    today_posts: todayPosts.rows[0]?.count || 0,
    overall_approve_rate: (ta + tr) > 0 ? Math.round((ta / (ta + tr)) * 100) : 0,
    category_stats: catStats.rows,
    hot_posts: hotPosts.rows,
    controversial_posts: controversial.rows,
  });
});

// ========== 生产模式：托管前端静态文件 ==========
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    // 排除 API 路由
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 3001;

async function start() {
  await initDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 购买审批服务器运行在 http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
