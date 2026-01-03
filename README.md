# ApiAdmin - Modern API Management Platform

> ⚠️ **Work in Progress**: This project is currently under active development. Features and APIs may change without notice.

<div align="center">

<img src="Static/icons/icon-144x144.png" alt="ApiAdmin Logo" width="144" height="144">

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-%3E%3D4.4-green.svg)

A modern, locally deployable API management platform designed to provide efficient, user-friendly, and powerful interface management services for developers, product managers, and testers.

[Features](#-core-features) • [Quick Start](#-quick-start) • [Deployment](#-deployment) • [Documentation](#-documentation) • [Contributing](#-contributing)

[中文](README_zh.md) | English

</div>

---

## 📖 Introduction

ApiAdmin is a modern API management platform that helps teams easily create, publish, and maintain APIs through a visual interface, improving team collaboration efficiency. The project adopts a frontend-backend separation architecture, built with React 18 + TypeScript + Koa + MongoDB, supports local deployment, and ensures data security and control.

### Vision

Become the **API Collaboration Center** connecting frontend, backend, testing, and management. Through the closed loop of "Design as Documentation, Documentation as Mock, Change as Sync, Test as Guarantee", we aim to dramatically improve the collaboration efficiency and interface quality of R&D teams.

### Core Values

- **Efficient**: Quickly define interfaces based on Json5 and Mockjs, improving efficiency multiple times
- **User-friendly**: Flat permission design with simple and intuitive operation interface
- **Powerful**: Complete interface management, Mock, testing, import/export functionality
- **Secure**: Local deployment support with data security and control

### Screenshots

![Test Pipeline](Images/test-pipline.png)

![Swagger Integration](Images/swagger.png)

![Unit Testing](Images/unittest.png)

## ✨ Core Features

### 🔐 User & Permission Management
- User registration, login, password recovery
- Flat permission design (Super Admin, Group Leader, Project Leader, Developer, Guest)
- JWT authentication mechanism
- 🚧 SSO single sign-on (SAML 2.0, OAuth 2.0, OIDC, LDAP, CAS)
- 🚧 Third-party login (GitHub, GitLab, Gmail, WeChat, Phone, Email verification code)
- 🚧 Whitelist management

### 📁 Group & Project Management
- Group management (create, edit, delete, member management)
- Project management (create, edit, delete, migrate, copy)
- Project settings (environment configuration, global variables, Token configuration)
- Project member management
- Project activity (operation logs)

### 🔌 Interface Management
- Interface CRUD operations
- Interface category management
- Interface editing (request parameters, response data, Headers)
- Interface run/debug (similar to Postman)
- Interface preview (beautiful documentation display)
- Support RESTful dynamic routing
- Support multiple request body formats (Form, JSON, File, Raw)
- Support JSON Schema and Mockjs data generation

### 🎭 Mock Service
- Basic Mock (based on Mockjs and Json5)
- Mock expectations (return different data based on request conditions)
- Custom Mock scripts (JavaScript)
- Mock strict mode (parameter validation)
- Mock priority management
- Support parameter replacement and regular expressions

### 🧪 Automated Testing
- Test collection management
- Test case editing (request parameters, assertion scripts)
- Variable parameter support (`$.{key}.{params|body}.{path}`)
- Test execution and reporting
- Server-side automated testing (CI/CD integration)
- **Test Pipeline Management**: Create, edit, execute, and manage test pipelines
- **AI-Powered Test Analysis**: Automatic test result analysis, bug fixing suggestions, and test case improvement recommendations
- **Code Repository Integration**: Link test pipelines with code repositories for comprehensive analysis
- 🚧 Deep CI/CD integration (GitHub Actions, Jenkins, GitLab CI)
- 🚧 Automated testing for imported interfaces

### 📥 Data Import/Export
- Postman import (Collection v1/v2)
- Swagger import (2.0 / OpenAPI 3.0)
- HAR import
- ApiAdmin JSON import
- Data export (JSON, Swagger, Markdown, HTML)
- 🚧 Swagger auto-sync (scheduled sync)

### 🔌 Plugin System
- Plugin architecture design
- Plugin management (install, uninstall, enable/disable)
- Built-in plugins (code generation, statistics, Wiki, etc.)
- 🚧 Plugin Hook system
- 🚧 Plugin routing system
- 🚧 Frontend plugin integration

### 💻 Code Repository Management
- Code repository configuration (GitHub, GitLab, Gitee, etc.)
- SSH private key authentication with password support
- Repository connection testing
- Code pull and synchronization
- Integration with test pipelines for AI analysis

### 🤖 AI Configuration & Analysis
- AI provider configuration (OpenAI, DeepSeek, etc.)
- AI-powered test result analysis
- Automatic bug detection and fixing suggestions
- Test case improvement recommendations
- Code quality analysis

### 📊 System Features
- Operation logs
- Login logs
- Internationalization support (Chinese, English)
- Search functionality
- User center
- OpenAPI interface
- Version information query
- Swagger integration (UI + JSON)
- Monitoring and statistics (Prometheus metrics)
- Email service configuration
- Whitelist management
- 🚧 Project following
- 🚧 Message notifications (in-app messages, email notifications)

## 🌟 Highlights

### 1. Modern Technology Stack
- **Frontend**: React 18 + TypeScript + Ant Design 5 + Vite
- **Backend**: Node.js + Koa + MongoDB
- **Developer Experience**: Hot reload, TypeScript type checking, ESLint + Prettier

### 2. Powerful Mock Capabilities
- Flexible data generation based on Mockjs and Json5
- Support Mock expectations, return different data based on conditions
- Support custom JavaScript scripts
- Mock strict mode with parameter validation

### 3. Comprehensive Testing Support
- Visual test case editing
- Support variable parameters and expressions
- JavaScript assertion scripts
- CI/CD integration support
- Test pipeline management with project association
- AI-powered test analysis and optimization
- Code repository integration for comprehensive testing

### 4. Flexible Import/Export
- Support multiple format imports (Postman, Swagger, HAR)
- Support multiple format exports (JSON, Swagger, Markdown, HTML)
- Smart merge and overwrite modes

### 5. Extensible Plugin System
- Plugin architecture supporting custom extensions
- Multiple built-in utility plugins
- Support Hook and routing extensions

### 6. Enterprise Features
- Complete permission management system
- Operation logs and auditing
- Monitoring and statistics (Prometheus)
- Docker and Kubernetes deployment support

### 7. Developer Friendly
- Complete unit testing framework (Vitest)
- **High test coverage target** (aiming for near 100%)
- Swagger API documentation
- Detailed development documentation
- Version information query

### 8. AI-Enhanced Workflow
- AI-powered test analysis and optimization
- Automatic bug detection and fixing suggestions
- Test case improvement recommendations
- Code quality insights

## 🛠 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **UI Library**: Ant Design 5
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **Build Tool**: Vite
- **Code Editor**: Monaco Editor
- **Internationalization**: i18next
- **Real-time Collaboration**: Yjs + y-websocket

### Backend
- **Framework**: Koa 2
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **WebSocket**: Socket.io
- **File Upload**: koa-multer
- **Security**: helmet, bcrypt
- **Logging**: Winston / Pino
- **Monitoring**: Prometheus (prom-client)
- **API Documentation**: Swagger (swagger-jsdoc)

### Development Tools
- **Testing**: Vitest
- **Code Standards**: ESLint + Prettier
- **Type Checking**: TypeScript
- **Version Control**: Git

## 🚀 Quick Start

### Requirements

- **Node.js >= 18.0.0** (Recommended 20.x LTS)
- **npm >= 9.0.0**
- **MongoDB >= 4.4**

> ⚠️ **Important**: If your Node.js version is below 18, please upgrade Node.js first.

### Installation Steps

#### 1. Clone the repository

```bash
git clone https://github.com/hanyouqing/ApiAdmin.git
cd ApiAdmin
```

#### 2. Install dependencies

```bash
# Method 1: Use install:all script (Recommended)
npm run install:all

# Method 2: Manual installation
npm install
cd Client && npm install
cd ../Server && npm install
```

#### 3. Configure environment variables

Create a `.env` file:

```env
# Application configuration
PORT=3000
NODE_ENV=development

# Database configuration
# If MongoDB authentication is not enabled, use:
MONGODB_URL=mongodb://localhost:27017/apiadmin
# If MongoDB authentication is enabled, use:
# MONGODB_URL=mongodb://username:password@localhost:27017/apiadmin?authSource=admin

# JWT configuration
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=7d
```

#### 4. Initialize MongoDB

**If using Docker Compose:**

```bash
# Set environment variables
export MONGO_USERNAME=admin
export MONGO_PASSWORD=your-password

# Start MongoDB (will auto-initialize)
docker-compose up -d mongodb
```

**If using local MongoDB:**

```bash
# Run initialization script
./scripts/init-mongodb.sh
```

For detailed instructions, see [MongoDB Initialization Guide](Docs/MONGODB_INIT.md)

#### 5. Start development server

```bash
# Start from root directory (starts both frontend and backend)
npm run dev

# Or start separately
npm run dev:client  # Frontend: http://localhost:3001
npm run dev:server  # Backend: http://localhost:3000
```

Visit http://localhost:3001 to use the application.

#### 6. Build for production

```bash
npm run build
```

## 🐳 Deployment

### Docker Deployment (Recommended)

#### Using build script

The project provides a convenient Docker build script:

```bash
# View help
./docker-build.sh --help

# Normal build
./docker-build.sh

# Build release version
./docker-build.sh --release 1.0.0

# Clean build and run tests
./docker-build.sh --clean --run
```

#### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Manual build

```bash
# Build image
docker build -t apiadmin .

# Run container
docker run -d -p 3000:3000 \
  -e MONGODB_URL=mongodb://host.docker.internal:27017/apiadmin \
  -e JWT_SECRET=your-secret-key \
  --name apiadmin \
  apiadmin
```

### Kubernetes Deployment

The project provides Helm Chart for Kubernetes deployment:

```bash
# Install Chart
helm install apiadmin ./Helm/apiadmin \
  --namespace apiadmin \
  --create-namespace \
  --set mongodb.auth.rootPassword=your-password \
  --set config.jwtSecret=your-jwt-secret
```

For detailed deployment instructions, see [Deployment Documentation](Docs/DEPLOYMENT.md)

## 📁 Project Structure

```
ApiAdmin/
├── Client/              # Frontend code
│   ├── Components/      # Common components
│   ├── Containers/      # Page containers
│   ├── Reducer/         # Redux state management
│   ├── Utils/           # Utility functions
│   ├── Styles/          # Style files
│   └── i18n/            # Internationalization
├── Server/              # Backend code
│   ├── Controllers/     # Controllers
│   ├── Models/          # Data models
│   ├── Middleware/      # Middleware
│   ├── Utils/           # Utility functions
│   └── Router.js        # Route configuration
├── Plugins/             # Plugin system
│   ├── CodeGenerator/   # Code generation plugin
│   └── _template/        # Plugin template
├── Docs/                # Documentation
├── Scripts/             # Scripts
├── tests/               # Unit tests
├── Helm/                # Kubernetes Helm Chart
└── Static/              # Static resources
```


## 🧪 Testing

The project aims for **near 100% test coverage** to ensure code quality and reliability.

```bash
# Run tests
npm test

# Run tests with coverage report
npm run test:coverage
```

![Test Coverage](Images/npm-run-test-coverage.png)

```bash
# Run test UI
npm run test:ui
```

![Test UI](Images/npm-run-test-ui.png)

### Test Coverage Goals

- **Target Coverage**: Near 100% for all critical paths
- **Current Focus**: 
  - Unit tests for all Controllers
  - Unit tests for all Models
  - Unit tests for all Utils
  - Integration tests for API endpoints
  - Frontend component tests

For detailed testing guidelines, see [Testing Documentation](Docs/TESTING.md)

## 📝 Development Guide

### Code Standards

The project uses ESLint + Prettier for code standard checking:

```bash
# Check code standards
npm run lint

# Auto-fix code format
npm run format
```

### Commit Standards

Please follow these standards when committing code:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Code format adjustment
- `refactor`: Code refactoring
- `test`: Test related
- `chore`: Build/tool related

### Development Workflow

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Create Pull Request

## 🤝 Contributing

We welcome all forms of contributions, including but not limited to:

- 🐛 Report bugs
- 💡 Suggest new features
- 📝 Improve documentation
- 🔧 Submit code

Please see [Contributing Guide](CONTRIBUTING.md) for more details.

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).

## 🙏 Acknowledgments

Thanks to all developers who have contributed to this project!

## 📞 Contact

- Project Issues: [GitHub Issues](https://github.com/hanyouqing/ApiAdmin/issues)
- Documentation: [Project Documentation](Docs/)

---

<div align="center">

**If this project helps you, please give it a ⭐ Star!**

</div>
