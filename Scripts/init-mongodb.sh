#!/bin/bash

# MongoDB 初始化脚本
# 用于创建数据库、用户和设置权限

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}MongoDB 初始化脚本${NC}"
echo "================================"

# 配置变量（可以从环境变量读取）
MONGO_HOST=${MONGO_HOST:-localhost}
MONGO_PORT=${MONGO_PORT:-27017}
MONGO_ROOT_USERNAME=${MONGO_ROOT_USERNAME:-admin}
MONGO_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD:-}
MONGO_DATABASE=${MONGO_DATABASE:-apiadmin}
MONGO_USERNAME=${MONGO_USERNAME:-apiadmin}
MONGO_PASSWORD=${MONGO_PASSWORD:-}

# 如果未设置密码，提示用户输入
if [ -z "$MONGO_ROOT_PASSWORD" ]; then
  echo -e "${YELLOW}请输入 MongoDB root 用户密码（如果 MongoDB 未启用认证，直接按回车）:${NC}"
  read -s MONGO_ROOT_PASSWORD
  echo
fi

if [ -z "$MONGO_PASSWORD" ]; then
  echo -e "${YELLOW}请输入应用数据库用户密码（如果 MongoDB 未启用认证，直接按回车）:${NC}"
  read -s MONGO_PASSWORD
  echo
fi

# 构建连接字符串
if [ -z "$MONGO_ROOT_PASSWORD" ]; then
  # 无认证连接
  MONGO_CONNECTION="mongodb://${MONGO_HOST}:${MONGO_PORT}"
  echo -e "${YELLOW}使用无认证模式连接 MongoDB${NC}"
else
  # 有认证连接
  MONGO_CONNECTION="mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/admin"
  echo -e "${GREEN}使用认证模式连接 MongoDB${NC}"
fi

echo "连接字符串: ${MONGO_CONNECTION//${MONGO_ROOT_PASSWORD}/***}"

# 测试连接
echo -e "\n${GREEN}测试 MongoDB 连接...${NC}"
if mongosh "$MONGO_CONNECTION" --quiet --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ MongoDB 连接成功${NC}"
else
  echo -e "${RED}✗ MongoDB 连接失败，请检查：${NC}"
  echo "  1. MongoDB 服务是否运行"
  echo "  2. 主机地址和端口是否正确"
  echo "  3. 用户名和密码是否正确"
  exit 1
fi

# 初始化脚本
INIT_SCRIPT=$(cat <<EOF
// 切换到 admin 数据库
use admin

// 如果 root 用户不存在，创建 root 用户（仅首次运行）
if (db.getUsers().filter(u => u.user === '${MONGO_ROOT_USERNAME}').length === 0) {
  print('创建 root 用户...');
  db.createUser({
    user: '${MONGO_ROOT_USERNAME}',
    pwd: '${MONGO_ROOT_PASSWORD}',
    roles: [{ role: 'root', db: 'admin' }]
  });
  print('✓ Root 用户创建成功');
} else {
  print('✓ Root 用户已存在');
}

// 切换到应用数据库
use ${MONGO_DATABASE}

// 创建应用数据库用户（如果不存在）
if (db.getUsers().filter(u => u.user === '${MONGO_USERNAME}').length === 0) {
  print('创建应用数据库用户...');
  db.createUser({
    user: '${MONGO_USERNAME}',
    pwd: '${MONGO_PASSWORD}',
    roles: [
      { role: 'readWrite', db: '${MONGO_DATABASE}' }
    ]
  });
  print('✓ 应用数据库用户创建成功');
} else {
  print('✓ 应用数据库用户已存在');
}

// 验证数据库和用户
print('\n数据库初始化完成！');
print('数据库名称: ${MONGO_DATABASE}');
print('应用用户名: ${MONGO_USERNAME}');
print('\n连接字符串:');
print('mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DATABASE}?authSource=admin');
EOF
)

# 执行初始化
echo -e "\n${GREEN}执行数据库初始化...${NC}"
echo "$INIT_SCRIPT" | mongosh "$MONGO_CONNECTION" --quiet

if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}✓ MongoDB 初始化成功！${NC}"
  echo -e "\n${YELLOW}请在 .env 或 .env.local 文件中设置：${NC}"
  echo "MONGODB_URL=mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DATABASE}?authSource=admin"
else
  echo -e "\n${RED}✗ MongoDB 初始化失败${NC}"
  exit 1
fi


