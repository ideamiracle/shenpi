const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { neon } = require('@neondatabase/serverless');

// 数据库连接（从环境变量读取）
const DATABASE_URL = process.env.DATABASE_URL;
let sql;

// 初始化数据库
async function initDB() {
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL 环境变量未设置');
    throw new Error('DATABASE_URL not set');
  }

  sql = neon(DATABASE_URL);

  // 创建表（PostgreSQL 语法，IF NOT EXISTS 保证幂等）
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
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
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS post_images (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      url TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      like_count INTEGER DEFAULT 0,
      parent_id TEXT DEFAULT NULL,
      reply_to_name TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS comment_likes (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL,
      user_id TEXT NOT NULL
    )
  `;

  // 插入测试数据（仅首次）
  const { count } = (await sql`SELECT COUNT(*) as count FROM users WHERE id = 'test-user-1'`)[0];
  if (Number(count) === 0) {
    await sql`INSERT INTO users (id, nickname) VALUES ('test-user-1', '测试用户')`;
    await sql`INSERT INTO users (id, nickname) VALUES ('test-user-2', '路人甲')`;
    await sql`INSERT INTO users (id, nickname) VALUES ('test-user-3', '剁手达人')`;

    const posts = [
      ['post-1', '匡威大星星托特包', 246, '上班背大包装东西很方便，而且颜值很高，搭配衣服也好看。已经种草很久了，求批准！', '服饰', 0, 'test-user-1', 136, 64, 8],
      ['post-2', 'iPhone 16 Pro Max', 9999, '现在的手机用了3年了，电池不行了，拍照也糊了。想换一个能用5年的手机。', '数码', 0, 'test-user-2', 89, 156, 12],
      ['post-3', '戴森吹风机 HD15', 3199, '头发又长又多，每天吹头发要20分钟，听说戴森5分钟就能吹干。求批准，救救我的时间！', '家居', 0, 'test-user-3', 234, 178, 15],
      ['post-4', '乐高霍格沃茨城堡', 3999, '哈利波特死忠粉，这辈子一定要拥有一次！而且可以当摆件，不亏！', '其他', 0, 'test-user-1', 456, 23, 20],
      ['post-5', '辞职去旅行一个月', 15000, '工作太累了，想gap一个月去云南大理休息。人生不只是工作，我想去看看世界。', '奇葩', 1, 'test-user-2', 678, 345, 35],
      ['post-6', 'SK-II 神仙水 230ml', 1590, '最近皮肤状态很差，听说神仙水对油皮很友好，想试试看效果。', '美妆', 0, 'test-user-3', 120, 200, 10],
    ];
    for (const p of posts) {
      await sql`INSERT INTO posts (id, title, price, reason, category, anonymous, author_id, approve_count, reject_count, comment_count) VALUES (${p[0]}, ${p[1]}, ${p[2]}, ${p[3]}, ${p[4]}, ${p[5]}, ${p[6]}, ${p[7]}, ${p[8]}, ${p[9]})`;
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
      await sql`INSERT INTO comments (id, post_id, user_id, content) VALUES (${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`;
    }

    console.log('✅ 测试数据已插入');
  }

  console.log('✅ 数据库初始化完成');
}

// ========== Express 应用 ==========
const app = express();
app.use(express.json({ limit: '10mb' })); // 允许 base64 图片上传

// 初始化数据库（冷启动时执行一次）
let dbReady = false;
app.use(async (req, res, next) => {
  if (!dbReady) {
    try {
      await initDB();
      dbReady = true;
    } catch (err) {
      console.error('数据库初始化失败:', err);
      return res.status(500).json({ error: '服务不可用' });
    }
  }
  next();
});

// CORS（允许所有来源）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ========== 用户 API ==========
app.post('/api/login', async (req, res) => {
  const { nickname } = req.body;
  const id = uuidv4();
  const name = nickname || `游客${Math.floor(Math.random() * 10000)}`;
  await sql`INSERT INTO users (id, nickname) VALUES (${id}, ${name})`;
  res.json({ id, nickname: name });
});

app.get('/api/users/:id', async (req, res) => {
  const rows = await sql`SELECT * FROM users WHERE id = ${req.params.id}`;
  if (rows.length === 0) return res.status(404).json({ error: '用户不存在' });
  const user = rows[0];

  const postCount = await sql`SELECT COUNT(*) as count FROM posts WHERE author_id = ${req.params.id}`;
  const voteCount = await sql`SELECT COUNT(*) as count FROM votes WHERE user_id = ${req.params.id}`;
  const approveCount = await sql`SELECT COUNT(*) as count FROM votes WHERE user_id = ${req.params.id} AND type = 'approve'`;

  res.json({ ...user, stats: { post_count: Number(postCount[0].count), vote_count: Number(voteCount[0].count), approve_count: Number(approveCount[0].count) } });
});

// ========== 申请 API ==========
app.get('/api/posts', async (req, res) => {
  const { page = 1, limit = 10, category, sort = 'hot', include_stats } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const params = [];

  let where = "WHERE p.status = $1";
  params.push('active');

  if (category && category !== '全部') {
    where += ` AND p.category = $${params.length + 1}`;
    params.push(category);
  }

  let orderBy = 'ORDER BY (p.approve_count + p.reject_count) DESC, p.created_at DESC';
  if (sort === 'new') orderBy = 'ORDER BY p.created_at DESC';
  if (sort === 'controversial') orderBy = 'ORDER BY ABS(p.approve_count - p.reject_count) ASC, (p.approve_count + p.reject_count) DESC';

  // 总数查询
  const countSql = `SELECT COUNT(*) as total FROM posts p ${where}`;
  const totalResult = await sql(countSql, params);
  const total = Number(totalResult[0]?.total || 0);

  // 列表查询
  const listParams = [...params, Number(limit), Number(offset)];
  const listSql = `SELECT p.*, u.nickname as author_name, u.avatar as author_avatar FROM posts p LEFT JOIN users u ON p.author_id = u.id ${where} ${orderBy} LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`;
  const listResult = await sql(listSql, listParams);

  // 批量获取所有图片（一次查询替代 N 次，关键性能优化）
  const postIds = listResult.map(p => p.id);
  const imagesMap = {};
  if (postIds.length > 0) {
    const allImages = await sql`SELECT post_id, url FROM post_images WHERE post_id = ANY(${postIds}) ORDER BY sort_order`;
    allImages.forEach(img => {
      if (!imagesMap[img.post_id]) imagesMap[img.post_id] = [];
      imagesMap[img.post_id].push(img.url);
    });
  }

  const posts = listResult.map(post => ({
    ...post,
    images: imagesMap[post.id] || [],
    anonymous: !!post.anonymous
  }));

  // 构建响应
  const response = { posts, total, page: Number(page), limit: Number(limit) };

  // 合并统计查询：减少一次 HTTP 请求
  if (include_stats === 'true') {
    response.stats = await computeStats();
  }

  res.json(response);
});

app.get('/api/posts/:id', async (req, res) => {
  const rows = await sql`SELECT p.*, u.nickname as author_name, u.avatar as author_avatar FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE p.id = ${req.params.id}`;
  if (rows.length === 0) return res.status(404).json({ error: '申请不存在' });
  const post = rows[0];
  const imgs = await sql`SELECT url FROM post_images WHERE post_id = ${post.id} ORDER BY sort_order`;
  res.json({ ...post, images: imgs.map(r => r.url), anonymous: !!post.anonymous });
});

app.post('/api/posts', async (req, res) => {
  try {
    const { title, price, reason, category, anonymous, author_id, images } = req.body || {};
    if (!title || !price || !reason || !category || !author_id) {
      return res.status(400).json({ error: '缺少必填字段', received: { title: !!title, price: !!price, reason: !!reason, category: !!category, author_id: !!author_id } });
    }

    const postId = uuidv4();
    await sql`INSERT INTO posts (id, title, price, reason, category, anonymous, author_id) VALUES (${postId}, ${title}, ${Number(price)}, ${reason}, ${category}, ${anonymous ? 1 : 0}, ${author_id})`;

    // 保存图片 URL（base64 或普通 URL）
    if (images && Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await sql`INSERT INTO post_images (id, post_id, url, sort_order) VALUES (${uuidv4()}, ${postId}, ${images[i]}, ${i})`;
      }
    }

    const rows = await sql`SELECT p.*, u.nickname as author_name FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE p.id = ${postId}`;
    res.json(rows[0]);
  } catch (err) {
    console.error('创建申请失败:', err);
    res.status(500).json({ error: '创建申请失败', detail: err.message });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  const { user_id } = req.body;
  const rows = await sql`SELECT * FROM posts WHERE id = ${req.params.id}`;
  if (rows.length === 0) return res.status(404).json({ error: '申请不存在' });
  if (rows[0].author_id !== user_id) return res.status(403).json({ error: '无权删除' });

  await sql`UPDATE posts SET status = 'deleted' WHERE id = ${req.params.id}`;
  res.json({ success: true });
});

// ========== 投票 API ==========
app.post('/api/posts/:id/vote', async (req, res) => {
  const { user_id, type } = req.body;
  if (!['approve', 'reject'].includes(type)) return res.status(400).json({ error: '投票类型无效' });

  const postRows = await sql`SELECT * FROM posts WHERE id = ${req.params.id}`;
  if (postRows.length === 0) return res.status(404).json({ error: '申请不存在' });

  const existing = await sql`SELECT * FROM votes WHERE post_id = ${req.params.id} AND user_id = ${user_id}`;

  if (existing.length > 0) {
    const oldVote = existing[0];
    if (oldVote.type === type) {
      // 取消投票
      await sql`DELETE FROM votes WHERE id = ${oldVote.id}`;
      if (type === 'approve') {
        await sql`UPDATE posts SET approve_count = approve_count - 1 WHERE id = ${req.params.id}`;
      } else {
        await sql`UPDATE posts SET reject_count = reject_count - 1 WHERE id = ${req.params.id}`;
      }
      return res.json({ action: 'removed', type });
    } else {
      // 改票
      await sql`UPDATE votes SET type = ${type} WHERE id = ${oldVote.id}`;
      if (type === 'approve') {
        await sql`UPDATE posts SET approve_count = approve_count + 1, reject_count = reject_count - 1 WHERE id = ${req.params.id}`;
      } else {
        await sql`UPDATE posts SET reject_count = reject_count + 1, approve_count = approve_count - 1 WHERE id = ${req.params.id}`;
      }
      return res.json({ action: 'changed', type });
    }
  } else {
    // 新投票
    await sql`INSERT INTO votes (id, post_id, user_id, type) VALUES (${uuidv4()}, ${req.params.id}, ${user_id}, ${type})`;
    if (type === 'approve') {
      await sql`UPDATE posts SET approve_count = approve_count + 1 WHERE id = ${req.params.id}`;
    } else {
      await sql`UPDATE posts SET reject_count = reject_count + 1 WHERE id = ${req.params.id}`;
    }
    return res.json({ action: 'added', type });
  }
});

app.get('/api/posts/:id/vote/:userId', async (req, res) => {
  const rows = await sql`SELECT type FROM votes WHERE post_id = ${req.params.id} AND user_id = ${req.params.userId}`;
  res.json({ voted: rows.length > 0 ? rows[0].type : null });
});

// 批量获取投票状态（一次查询替代 N 次）(Task #14)
app.post('/api/votes/batch', async (req, res) => {
  const { user_id, post_ids } = req.body;
  if (!user_id || !post_ids || !Array.isArray(post_ids) || post_ids.length === 0) {
    return res.json({});
  }
  const rows = await sql`SELECT post_id, type FROM votes WHERE user_id = ${user_id} AND post_id = ANY(${post_ids})`;
  const result = {};
  rows.forEach(r => { result[r.post_id] = r.type; });
  res.json(result);
});

// ========== 评论 API ==========
app.get('/api/posts/:id/comments', async (req, res) => {
  const { type, sort = 'new' } = req.query;
  const orderClause = sort === 'hot'
    ? 'c.like_count DESC, c.created_at DESC'
    : 'c.created_at DESC';

  const rows = await sql(
    `SELECT c.*, u.nickname as author_name, u.avatar as author_avatar,
            (SELECT v.type FROM votes v WHERE v.post_id = c.post_id AND v.user_id = c.user_id LIMIT 1) as vote_type
     FROM comments c LEFT JOIN users u ON c.user_id = u.id
     WHERE c.post_id = $1 ORDER BY ${orderClause}`,
    [req.params.id]
  );

  let comments = rows;
  if (type === 'approve') comments = rows.filter(c => c.vote_type === 'approve');
  if (type === 'reject') comments = rows.filter(c => c.vote_type === 'reject');

  res.json(comments);
});

app.post('/api/posts/:id/comments', async (req, res) => {
  const { user_id, content, parent_id, reply_to_name } = req.body;
  if (!content || content.trim().length === 0) return res.status(400).json({ error: '评论内容不能为空' });

  const commentId = uuidv4();
  await sql`INSERT INTO comments (id, post_id, user_id, content, like_count, parent_id, reply_to_name) VALUES (${commentId}, ${req.params.id}, ${user_id}, ${content.trim()}, 0, ${parent_id || null}, ${reply_to_name || null})`;
  await sql`UPDATE posts SET comment_count = comment_count + 1 WHERE id = ${req.params.id}`;

  const rows = await sql`
    SELECT c.*, u.nickname as author_name, u.avatar as author_avatar,
           (SELECT v.type FROM votes v WHERE v.post_id = c.post_id AND v.user_id = c.user_id LIMIT 1) as vote_type
    FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ${commentId}
  `;
  res.json(rows[0]);
});

app.post('/api/comments/:id/like', async (req, res) => {
  const { user_id } = req.body;
  const existing = await sql`SELECT id FROM comment_likes WHERE comment_id = ${req.params.id} AND user_id = ${user_id}`;

  if (existing.length > 0) {
    await sql`DELETE FROM comment_likes WHERE id = ${existing[0].id}`;
    await sql`UPDATE comments SET like_count = like_count - 1 WHERE id = ${req.params.id}`;
    return res.json({ liked: false });
  } else {
    await sql`INSERT INTO comment_likes (id, comment_id, user_id) VALUES (${uuidv4()}, ${req.params.id}, ${user_id})`;
    await sql`UPDATE comments SET like_count = like_count + 1 WHERE id = ${req.params.id}`;
    return res.json({ liked: true });
  }
});

// ========== 统计工具函数（可复用，避免重复查询） ==========
async function computeStats() {
  const posts = await sql`SELECT COUNT(*) as count FROM posts WHERE status = 'active'`;
  const votes = await sql`SELECT COUNT(*) as count FROM votes`;
  const comments = await sql`SELECT COUNT(*) as count FROM comments`;
  const users = await sql`SELECT COUNT(*) as count FROM users`;
  const todayPosts = await sql`SELECT COUNT(*) as count FROM posts WHERE status = 'active' AND created_at::date = CURRENT_DATE`;
  const approvalStats = await sql`SELECT COALESCE(SUM(approve_count),0) as ta, COALESCE(SUM(reject_count),0) as tr FROM posts WHERE status = 'active'`;
  const catStats = await sql`SELECT category, COUNT(*) as count, COALESCE(SUM(approve_count + reject_count),0) as total_votes FROM posts WHERE status = 'active' GROUP BY category ORDER BY count DESC`;
  const hotPosts = await sql`SELECT id, title, approve_count + reject_count as hot_score FROM posts WHERE status = 'active' ORDER BY hot_score DESC LIMIT 5`;
  const controversial = await sql`SELECT id, title, ABS(approve_count - reject_count) as gap, approve_count + reject_count as total FROM posts WHERE status = 'active' AND (approve_count + reject_count) >= 10 ORDER BY gap ASC, total DESC LIMIT 5`;

  const ta = Number(approvalStats[0]?.ta || 0);
  const tr = Number(approvalStats[0]?.tr || 0);

  return {
    total_posts: Number(posts[0].count),
    total_votes: Number(votes[0].count),
    total_comments: Number(comments[0].count),
    total_users: Number(users[0].count),
    today_posts: Number(todayPosts[0]?.count || 0),
    overall_approve_rate: (ta + tr) > 0 ? Math.round((ta / (ta + tr)) * 100) : 0,
    category_stats: catStats.map(c => ({ ...c, count: Number(c.count), total_votes: Number(c.total_votes) })),
    hot_posts: hotPosts.map(p => ({ ...p, hot_score: Number(p.hot_score) })),
    controversial_posts: controversial.map(p => ({ ...p, gap: Number(p.gap), total: Number(p.total) })),
  };
}

// ========== 统计 API ==========
app.get('/api/stats', async (req, res) => {
  res.json(await computeStats());
});

// ========== 健康检查 ==========
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: dbReady });
});

// 导出给 Vercel
module.exports = app;
