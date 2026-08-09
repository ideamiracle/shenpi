// API 工具函数
const API_BASE = '/api';

// 通用请求方法
async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

// 用户相关
export const userApi = {
  // 登录（创建临时用户）
  login: (nickname) => request('/login', {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  }),

  // 获取用户信息
  getUser: (id) => request(`/users/${id}`),
};

// 申请相关
export const postApi = {
  // 获取申请列表
  getPosts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/posts?${query}`);
  },

  // 获取单个申请
  getPost: (id) => request(`/posts/${id}`),

  // 创建申请（发送 JSON，图片用 base64）
  createPost: (data) => request('/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // 删除申请
  deletePost: (id, userId) => request(`/posts/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ user_id: userId }),
  }),
};

// 投票相关
export const voteApi = {
  // 投票
  vote: (postId, userId, type) => request(`/posts/${postId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, type }),
  }),

  // 获取投票状态
  getVoteStatus: (postId, userId) => request(`/posts/${postId}/vote/${userId}`),
};

// 评论相关
export const commentApi = {
  // 获取评论列表
  getComments: (postId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/posts/${postId}/comments?${query}`);
  },

  // 发表评论
  createComment: (postId, userId, content, parentId, replyToName) => request(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, content, parent_id: parentId, reply_to_name: replyToName }),
  }),

  // 点赞评论
  likeComment: (commentId, userId) => request(`/comments/${commentId}/like`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }),
};

// 统计相关
export const statsApi = {
  getStats: () => request('/stats'),
};

// 本地存储用户信息
const USER_KEY = 'shenpi_user';

export const storage = {
  // 保存用户信息
  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  // 获取用户信息
  getUser: () => {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  // 清除用户信息
  clearUser: () => {
    localStorage.removeItem(USER_KEY);
  },
};
