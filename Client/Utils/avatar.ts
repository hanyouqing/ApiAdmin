/**
 * 获取用户头像 URL
 * 如果用户没有头像或头像为空，返回默认头像
 * 默认头像使用 Static/icons/icon-64x64.png
 */
export const getAvatarUrl = (avatar?: string | null): string => {
  // Static 目录被映射到根路径，所以 /icons/icon-64x64.png 对应 Static/icons/icon-64x64.png
  const DEFAULT_AVATAR = '/icons/icon-64x64.png';
  
  if (!avatar || avatar === '') {
    return DEFAULT_AVATAR;
  }
  
  return avatar;
};

