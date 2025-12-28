#!/bin/bash

# ApiAdmin Docker 构建脚本
# 用法: ./docker-build.sh [选项]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认值
IMAGE_NAME="apiadmin"
RELEASE_VERSION=""
CLEAN_BUILD=false
RUN_AFTER_BUILD=false
PUSH_AFTER_BUILD=false
SKIP_GIT_CHECK=false
SKIP_GIT_PULL=false
BUILD_ARGS=""

# 显示帮助信息
show_help() {
    cat << EOF
${GREEN}ApiAdmin Docker 构建脚本${NC}

用法: $0 [选项]

选项:
  -h, --help              显示此帮助信息
  -r, --release VERSION   构建 release 版本（格式: release-1.0.0）
  -c, --clean            清理构建缓存和旧镜像
  -R, --run              构建成功后启动容器测试
  -p, --push             构建成功后推送到镜像仓库
  -s, --skip-git-check   跳过 Git 状态检查
  -S, --skip-git-pull    跳过 Git pull
  -a, --build-arg ARG    传递构建参数（格式: KEY=VALUE，可多次使用）
  -t, --tag TAG          指定镜像标签（默认: latest 或 release-VERSION）

示例:
  $0                      # 普通构建
  $0 --release 1.0.0      # 构建 release-1.0.0 版本
  $0 --clean --run        # 清理后构建并运行
  $0 --release 1.0.0 --push  # 构建并推送 release 版本
  $0 --build-arg BUILD_TIME=\$(date -u +%Y-%m-%dT%H:%M:%SZ) --build-arg BUILD_BRANCH=\$(git branch --show-current)

EOF
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -r|--release)
                RELEASE_VERSION="$2"
                shift 2
                ;;
            -c|--clean)
                CLEAN_BUILD=true
                shift
                ;;
            -R|--run)
                RUN_AFTER_BUILD=true
                shift
                ;;
            -p|--push)
                PUSH_AFTER_BUILD=true
                shift
                ;;
            -s|--skip-git-check)
                SKIP_GIT_CHECK=true
                shift
                ;;
            -S|--skip-git-pull)
                SKIP_GIT_PULL=true
                shift
                ;;
            -a|--build-arg)
                BUILD_ARGS="$BUILD_ARGS --build-arg $2"
                shift 2
                ;;
            -t|--tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            *)
                echo -e "${RED}错误: 未知选项 $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done
}

# 显示 Git 信息
show_git_info() {
    if ! command -v git &> /dev/null; then
        echo -e "${YELLOW}警告: Git 未安装，跳过 Git 信息检查${NC}"
        return
    fi

    if [ ! -d .git ]; then
        echo -e "${YELLOW}警告: 当前目录不是 Git 仓库${NC}"
        return
    fi

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 Git 信息${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # 当前分支
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    echo -e "${GREEN}当前分支:${NC} ${CURRENT_BRANCH}"

    # 最新 commit
    LATEST_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    COMMIT_SHORT=$(echo "$LATEST_COMMIT" | cut -c1-8)
    echo -e "${GREEN}最新 Commit:${NC} ${COMMIT_SHORT} (${LATEST_COMMIT})"

    # Commit 信息
    COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}Commit 信息:${NC} ${COMMIT_MSG}"

    # Commit 作者和时间
    COMMIT_AUTHOR=$(git log -1 --pretty=format:"%an <%ae>" 2>/dev/null || echo "unknown")
    COMMIT_DATE=$(git log -1 --pretty=format:"%ad" --date=format:"%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}提交者:${NC} ${COMMIT_AUTHOR}"
    echo -e "${GREEN}提交时间:${NC} ${COMMIT_DATE}"

    echo ""
}

# 检查未提交的变更
check_git_status() {
    if [ "$SKIP_GIT_CHECK" = true ]; then
        return
    fi

    if ! command -v git &> /dev/null || [ ! -d .git ]; then
        return
    fi

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔍 检查 Git 状态${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # 检查是否有未提交的变更
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠️  检测到未提交的变更:${NC}"
        git status --short
        echo ""
        read -p "是否继续构建? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}构建已取消${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ 工作目录干净，没有未提交的变更${NC}"
    fi
    echo ""
}

# 执行 Git pull
git_pull() {
    if [ "$SKIP_GIT_PULL" = true ]; then
        return
    fi

    if ! command -v git &> /dev/null || [ ! -d .git ]; then
        return
    fi

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📥 更新代码${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
    echo -e "正在从 ${CURRENT_BRANCH} 分支拉取最新代码..."
    
    if git pull origin "$CURRENT_BRANCH" 2>/dev/null; then
        echo -e "${GREEN}✅ 代码更新成功${NC}"
    else
        echo -e "${YELLOW}⚠️  Git pull 失败，继续使用当前代码${NC}"
    fi
    echo ""
}

# 清理 Docker 资源
clean_docker() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🧹 清理 Docker 资源${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # 停止并删除相关容器
    echo -e "停止相关容器..."
    docker-compose down 2>/dev/null || true
    docker stop apiadmin 2>/dev/null || true
    docker rm apiadmin 2>/dev/null || true

    # 删除旧镜像
    echo -e "删除旧镜像..."
    docker rmi "${IMAGE_NAME}:latest" 2>/dev/null || true
    docker rmi "${IMAGE_NAME}:${IMAGE_TAG}" 2>/dev/null || true

    # 清理构建缓存
    echo -e "清理构建缓存..."
    docker builder prune -f

    echo -e "${GREEN}✅ 清理完成${NC}"
    echo ""
}

# 构建 Docker 镜像
build_image() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔨 开始构建 Docker 镜像${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # 确定镜像标签
    if [ -n "$RELEASE_VERSION" ]; then
        IMAGE_TAG="release-${RELEASE_VERSION}"
    elif [ -z "$IMAGE_TAG" ]; then
        IMAGE_TAG="latest"
    fi

    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
    echo -e "${GREEN}镜像名称:${NC} ${FULL_IMAGE_NAME}"
    echo ""

    # 准备构建参数
    BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    BUILD_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    BUILD_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    BUILD_COMMIT_SHORT=$(echo "$BUILD_COMMIT" | cut -c1-8)

    # 默认构建参数
    DEFAULT_BUILD_ARGS="--build-arg BUILD_TIME=${BUILD_TIME} --build-arg BUILD_BRANCH=${BUILD_BRANCH} --build-arg BUILD_COMMIT=${BUILD_COMMIT}"

    # 组合所有构建参数
    ALL_BUILD_ARGS="${DEFAULT_BUILD_ARGS} ${BUILD_ARGS}"

    echo -e "${GREEN}构建参数:${NC}"
    echo "  BUILD_TIME: ${BUILD_TIME}"
    echo "  BUILD_BRANCH: ${BUILD_BRANCH}"
    echo "  BUILD_COMMIT: ${BUILD_COMMIT_SHORT}"
    echo ""

    # 执行构建
    echo -e "开始构建..."
    if docker build ${ALL_BUILD_ARGS} -t "${FULL_IMAGE_NAME}" -t "${IMAGE_NAME}:latest" .; then
        echo ""
        echo -e "${GREEN}✅ 镜像构建成功: ${FULL_IMAGE_NAME}${NC}"
        
        # 显示镜像信息
        echo ""
        echo -e "${BLUE}镜像信息:${NC}"
        docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    else
        echo ""
        echo -e "${RED}❌ 镜像构建失败${NC}"
        exit 1
    fi
    echo ""
}

# 运行容器
run_container() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🚀 启动容器测试${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG:-latest}"
    
    # 停止旧容器
    docker stop apiadmin-test 2>/dev/null || true
    docker rm apiadmin-test 2>/dev/null || true

    echo -e "启动容器: ${FULL_IMAGE_NAME}"
    echo -e "${YELLOW}提示: 按 Ctrl+C 停止容器${NC}"
    echo ""

    # 运行容器
    docker run -it --rm \
        --name apiadmin-test \
        -p 3000:3000 \
        -e NODE_ENV=development \
        -e MONGODB_URL=mongodb://host.docker.internal:27017/apiadmin \
        -e JWT_SECRET=test-secret-key \
        "${FULL_IMAGE_NAME}"
}

# 推送镜像
push_image() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📤 推送镜像到仓库${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG:-latest}"
    
    # 检查是否设置了镜像仓库
    if [[ "$IMAGE_NAME" != *"/"* ]]; then
        echo -e "${YELLOW}⚠️  镜像名称不包含仓库地址${NC}"
        echo -e "当前镜像: ${FULL_IMAGE_NAME}"
        echo -e "如需推送，请设置镜像仓库，例如:"
        echo -e "  export IMAGE_NAME=registry.example.com/apiadmin"
        echo -e "  或修改脚本中的 IMAGE_NAME 变量"
        read -p "是否继续推送? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}推送已取消${NC}"
            return
        fi
    fi

    echo -e "推送镜像: ${FULL_IMAGE_NAME}"
    if docker push "${FULL_IMAGE_NAME}"; then
        echo -e "${GREEN}✅ 镜像推送成功${NC}"
        
        # 如果构建了 release 版本，也推送 latest
        if [ -n "$RELEASE_VERSION" ]; then
            echo -e "推送 latest 标签..."
            docker push "${IMAGE_NAME}:latest" || true
        fi
    else
        echo -e "${RED}❌ 镜像推送失败${NC}"
        exit 1
    fi
    echo ""
}

# 显示构建摘要
show_summary() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 构建摘要${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG:-latest}"
    
    echo -e "${GREEN}✅ 构建完成${NC}"
    echo -e "镜像: ${FULL_IMAGE_NAME}"
    echo ""
    
    if [ "$RUN_AFTER_BUILD" = true ]; then
        echo -e "${YELLOW}提示: 容器已在后台运行${NC}"
    fi
    
    if [ "$PUSH_AFTER_BUILD" = true ]; then
        echo -e "${YELLOW}提示: 镜像已推送到仓库${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}常用命令:${NC}"
    echo -e "  查看镜像: ${GREEN}docker images ${IMAGE_NAME}${NC}"
    echo -e "  运行容器: ${GREEN}docker run -d -p 3000:3000 --name apiadmin ${FULL_IMAGE_NAME}${NC}"
    echo -e "  查看日志: ${GREEN}docker logs -f apiadmin${NC}"
    echo -e "  停止容器: ${GREEN}docker stop apiadmin${NC}"
    echo ""
}

# 主函数
main() {
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════╗"
    echo "║      ApiAdmin Docker 构建脚本                  ║"
    echo "╚════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""

    # 解析参数
    parse_args "$@"

    # 显示 Git 信息
    show_git_info

    # 检查 Git 状态
    check_git_status

    # Git pull
    git_pull

    # 清理（如果需要）
    if [ "$CLEAN_BUILD" = true ]; then
        clean_docker
    fi

    # 构建镜像
    build_image

    # 运行容器（如果需要）
    if [ "$RUN_AFTER_BUILD" = true ]; then
        run_container
        exit 0
    fi

    # 推送镜像（如果需要）
    if [ "$PUSH_AFTER_BUILD" = true ]; then
        push_image
    fi

    # 显示摘要
    show_summary
}

# 执行主函数
main "$@"

