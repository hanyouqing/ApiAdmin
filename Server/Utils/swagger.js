import config from './config.js';
import { unimplementedPaths, unimplementedComponents } from './swaggerUnimplemented.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ApiAdmin API',
    version: '0.0.1',
    description: 'ApiAdmin API Documentation',
    contact: {
      name: 'ApiAdmin Support',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.PORT}`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Check API health status',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    database: { type: 'string' },
                    uptime: { type: 'number' },
                    memory: {
                      type: 'object',
                      properties: {
                        used: { type: 'number' },
                        total: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/version': {
      get: {
        tags: ['System'],
        summary: 'Get version information',
        description: 'Get application version information including build time, branch, and commit',
        responses: {
          '200': {
            description: 'Version information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    buildTime: { type: 'string', description: 'Build time (YYYY-MM-DD-HH:MM:SS+TZ)' },
                    buildBranch: { type: 'string', description: 'Git branch name' },
                    buildCommit: { type: 'string', description: 'Git commit ID' },
                    nodeVersion: { type: 'string', description: 'Node.js version' },
                    npmVersion: { type: 'string', description: 'npm version' },
                    appVersion: { type: 'string', description: 'Application version' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/version': {
      get: {
        tags: ['System'],
        summary: 'Get version information',
        description: 'Get application version information including build time, branch, and commit',
        responses: {
          '200': {
            description: 'Version information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    buildTime: { type: 'string', description: 'Build time (YYYY-MM-DD-HH:MM:SS+TZ)' },
                    buildBranch: { type: 'string', description: 'Git branch name' },
                    buildCommit: { type: 'string', description: 'Git commit ID' },
                    nodeVersion: { type: 'string', description: 'Node.js version' },
                    npmVersion: { type: 'string', description: 'npm version' },
                    appVersion: { type: 'string', description: 'Application version' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/user/register': {
      post: {
        tags: ['User'],
        summary: 'Register a new user',
        description: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'username'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                  username: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Registration successful',
          },
          '400': {
            description: 'Bad request',
          },
        },
      },
    },
    '/api/user/login': {
      post: {
        tags: ['User'],
        summary: 'User login',
        description: 'Authenticate user and get JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        email: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/api/user/info': {
      get: {
        tags: ['User'],
        summary: 'Get user info',
        description: 'Get current user information',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/api/group/list': {
      get: {
        tags: ['Group'],
        summary: 'List groups',
        description: 'Get list of all groups',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of groups',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          _id: { type: 'string' },
                          group_name: { type: 'string' },
                          group_desc: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/api/project/list': {
      get: {
        tags: ['Project'],
        summary: 'List projects',
        description: 'Get list of all projects',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of projects',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          _id: { type: 'string' },
                          project_name: { type: 'string' },
                          project_desc: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/api/interface/list': {
      get: {
        tags: ['Interface'],
        summary: 'List interfaces',
        description: 'Get list of all interfaces',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of interfaces',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/api/project/environment/add': {
      post: {
        tags: ['Project'],
        summary: 'Add environment',
        description: 'Add a new environment to a project',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id', 'name', 'host'],
                properties: {
                  project_id: { type: 'string', description: 'Project ID' },
                  name: { type: 'string', description: 'Environment name' },
                  host: { type: 'string', description: 'Host address' },
                  variables: { type: 'object', description: 'Environment variables (JSON object)' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Environment added successfully',
          },
          '400': {
            description: 'Bad request',
          },
          '401': {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/api/project/environment/up': {
      put: {
        tags: ['Project'],
        summary: 'Update environment',
        description: 'Update an existing environment',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id', 'env_name'],
                properties: {
                  project_id: { type: 'string', description: 'Project ID' },
                  env_name: { type: 'string', description: 'Current environment name' },
                  name: { type: 'string', description: 'New environment name' },
                  host: { type: 'string', description: 'Host address' },
                  variables: { type: 'object', description: 'Environment variables (JSON object)' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Environment updated successfully',
          },
          '400': {
            description: 'Bad request',
          },
          '401': {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/api/project/environment/del': {
      delete: {
        tags: ['Project'],
        summary: 'Delete environment',
        description: 'Delete an environment from a project',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'project_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Project ID',
          },
          {
            name: 'env_name',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Environment name',
          },
        ],
        responses: {
          '200': {
            description: 'Environment deleted successfully',
          },
          '400': {
            description: 'Bad request',
          },
          '401': {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/api/user/logout': {
      post: {
        tags: ['User'],
        summary: 'User logout',
        description: 'Logout current user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Logout successful' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/user/info': {
      put: {
        tags: ['User'],
        summary: 'Update user info',
        description: 'Update current user information',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  avatar: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Update successful' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/user/password/reset/request': {
      post: {
        tags: ['User'],
        summary: 'Request password reset',
        description: 'Request password reset email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Reset email sent' },
          '400': { description: 'Bad request' },
        },
      },
    },
    '/api/user/password/reset': {
      post: {
        tags: ['User'],
        summary: 'Reset password',
        description: 'Reset password with token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Password reset successful' },
          '400': { description: 'Bad request' },
        },
      },
    },
    '/api/user/password/change': {
      post: {
        tags: ['User'],
        summary: 'Change password',
        description: 'Change current user password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['oldPassword', 'newPassword'],
                properties: {
                  oldPassword: { type: 'string', format: 'password' },
                  newPassword: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Password changed successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/group/add': {
      post: {
        tags: ['Group'],
        summary: 'Create group',
        description: 'Create a new group',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['group_name'],
                properties: {
                  group_name: { type: 'string' },
                  group_desc: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Group created successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
        },
      },
    },
    '/api/group/up': {
      put: {
        tags: ['Group'],
        summary: 'Update group',
        description: 'Update an existing group',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['_id'],
                properties: {
                  _id: { type: 'string' },
                  group_name: { type: 'string' },
                  group_desc: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Group updated successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Group not found' },
        },
      },
    },
    '/api/group/del': {
      delete: {
        tags: ['Group'],
        summary: 'Delete group',
        description: 'Delete a group',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: '_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Group ID',
          },
        ],
        responses: {
          '200': { description: 'Group deleted successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Group not found' },
        },
      },
    },
    '/api/group/get': {
      get: {
        tags: ['Group'],
        summary: 'Get group',
        description: 'Get group details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: '_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Group ID',
          },
        ],
        responses: {
          '200': { description: 'Group details' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Group not found' },
        },
      },
    },
    '/api/group/member/add': {
      post: {
        tags: ['Group'],
        summary: 'Add group member',
        description: 'Add a member to a group',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['group_id', 'member_email'],
                properties: {
                  group_id: { type: 'string' },
                  member_email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Member added successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Group or user not found' },
        },
      },
    },
    '/api/group/member/del': {
      delete: {
        tags: ['Group'],
        summary: 'Remove group member',
        description: 'Remove a member from a group',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'group_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'member_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Member removed successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Group or member not found' },
        },
      },
    },
    '/api/group/member/setLeader': {
      post: {
        tags: ['Group'],
        summary: 'Set group leader',
        description: 'Set a member as group leader',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['group_id', 'member_id'],
                properties: {
                  group_id: { type: 'string' },
                  member_id: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Leader set successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Group or member not found' },
        },
      },
    },
    '/api/project/add': {
      post: {
        tags: ['Project'],
        summary: 'Create project',
        description: 'Create a new project',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_name', 'group_id'],
                properties: {
                  project_name: { type: 'string' },
                  project_desc: { type: 'string' },
                  group_id: { type: 'string' },
                  basepath: { type: 'string' },
                  icon: { type: 'string' },
                  color: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Project created successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
        },
      },
    },
    '/api/project/up': {
      put: {
        tags: ['Project'],
        summary: 'Update project',
        description: 'Update an existing project',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['_id'],
                properties: {
                  _id: { type: 'string' },
                  project_name: { type: 'string' },
                  project_desc: { type: 'string' },
                  basepath: { type: 'string' },
                  icon: { type: 'string' },
                  color: { type: 'string' },
                  mock_strict: { type: 'boolean' },
                  enable_json5: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Project updated successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Project not found' },
        },
      },
    },
    '/api/project/del': {
      delete: {
        tags: ['Project'],
        summary: 'Delete project',
        description: 'Delete a project',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: '_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Project ID',
          },
        ],
        responses: {
          '200': { description: 'Project deleted successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Project not found' },
        },
      },
    },
    '/api/project/get': {
      get: {
        tags: ['Project'],
        summary: 'Get project',
        description: 'Get project details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: '_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Project ID',
          },
        ],
        responses: {
          '200': { description: 'Project details' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Project not found' },
        },
      },
    },
    '/api/project/member/add': {
      post: {
        tags: ['Project'],
        summary: 'Add project member',
        description: 'Add a member to a project',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id', 'member_email'],
                properties: {
                  project_id: { type: 'string' },
                  member_email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Member added successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Project or user not found' },
        },
      },
    },
    '/api/project/member/del': {
      delete: {
        tags: ['Project'],
        summary: 'Remove project member',
        description: 'Remove a member from a project',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'project_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'member_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Member removed successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Project or member not found' },
        },
      },
    },
    '/api/project/migrate': {
      post: {
        tags: ['Project'],
        summary: 'Migrate project',
        description: 'Migrate a project to another group',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id', 'target_group_id'],
                properties: {
                  project_id: { type: 'string' },
                  target_group_id: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Project migrated successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Project or target group not found' },
        },
      },
    },
    '/api/project/copy': {
      post: {
        tags: ['Project'],
        summary: 'Copy project',
        description: 'Copy a project with all interfaces',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id', 'new_project_name'],
                properties: {
                  project_id: { type: 'string' },
                  new_project_name: { type: 'string' },
                  target_group_id: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Project copied successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Project or target group not found' },
        },
      },
    },
    '/api/project/activities': {
      get: {
        tags: ['Project'],
        summary: 'Get project activities',
        description: 'Get project activity logs',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'project_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Project ID',
          },
        ],
        responses: {
          '200': { description: 'Project activities' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/interface/add': {
      post: {
        tags: ['Interface'],
        summary: 'Create interface',
        description: 'Create a new interface',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id', 'title', 'path', 'method'],
                properties: {
                  project_id: { type: 'string' },
                  title: { type: 'string' },
                  path: { type: 'string' },
                  method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] },
                  catid: { type: 'string' },
                  desc: { type: 'string' },
                  status: { type: 'string', enum: ['developing', 'developed', 'tested', 'online'] },
                  req_body_type: { type: 'string', enum: ['form', 'json', 'file', 'raw'] },
                  res_body_type: { type: 'string', enum: ['json', 'raw'] },
                  mock_script: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Interface created successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
        },
      },
    },
    '/api/interface/up': {
      put: {
        tags: ['Interface'],
        summary: 'Update interface',
        description: 'Update an existing interface',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['_id'],
                properties: {
                  _id: { type: 'string' },
                  title: { type: 'string' },
                  path: { type: 'string' },
                  method: { type: 'string' },
                  catid: { type: 'string' },
                  desc: { type: 'string' },
                  status: { type: 'string' },
                  req_body_type: { type: 'string' },
                  res_body_type: { type: 'string' },
                  mock_script: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Interface updated successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Interface not found' },
        },
      },
    },
    '/api/interface/del': {
      delete: {
        tags: ['Interface'],
        summary: 'Delete interface',
        description: 'Delete an interface',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: '_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Interface ID',
          },
        ],
        responses: {
          '200': { description: 'Interface deleted successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Interface not found' },
        },
      },
    },
    '/api/interface/get': {
      get: {
        tags: ['Interface'],
        summary: 'Get interface',
        description: 'Get interface details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: '_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Interface ID',
          },
        ],
        responses: {
          '200': { description: 'Interface details' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Interface not found' },
        },
      },
    },
    '/api/interface/run': {
      post: {
        tags: ['Interface'],
        summary: 'Run interface',
        description: 'Run/test an interface',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['_id'],
                properties: {
                  _id: { type: 'string' },
                  env: { type: 'string' },
                  params: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Interface run result' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Interface not found' },
        },
      },
    },
    '/api/interface/cat/list': {
      get: {
        tags: ['Interface'],
        summary: 'List interface categories',
        description: 'Get list of interface categories',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'project_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'List of categories' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/interface/cat/add': {
      post: {
        tags: ['Interface'],
        summary: 'Create interface category',
        description: 'Create a new interface category',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id', 'name'],
                properties: {
                  project_id: { type: 'string' },
                  name: { type: 'string' },
                  desc: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Category created successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
        },
      },
    },
    '/api/interface/cat/up': {
      put: {
        tags: ['Interface'],
        summary: 'Update interface category',
        description: 'Update an existing interface category',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['_id'],
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  desc: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Category updated successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Category not found' },
        },
      },
    },
    '/api/interface/cat/del': {
      delete: {
        tags: ['Interface'],
        summary: 'Delete interface category',
        description: 'Delete an interface category',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: '_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Category deleted successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Category not found' },
        },
      },
    },
    '/api/upload': {
      post: {
        tags: ['Upload'],
        summary: 'Upload file',
        description: 'Upload a file',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'File uploaded successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/upload/avatar': {
      post: {
        tags: ['Upload'],
        summary: 'Upload avatar',
        description: 'Upload user avatar',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['avatar'],
                properties: {
                  avatar: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Avatar uploaded successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/monitor/stats': {
      get: {
        tags: ['Monitor'],
        summary: 'Get system statistics',
        description: 'Get system statistics (admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'System statistics' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
        },
      },
    },
    '/api/metrics': {
      get: {
        tags: ['Monitor'],
        summary: 'Get metrics',
        description: 'Get Prometheus metrics',
        responses: {
          '200': { description: 'Metrics in Prometheus format' },
        },
      },
    },
    '/api/mock/expectation/list': {
      get: {
        tags: ['Mock'],
        summary: 'List mock expectations',
        description: 'Get list of mock expectations for an interface',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'interface_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'List of mock expectations' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/mock/expectation/add': {
      post: {
        tags: ['Mock'],
        summary: 'Create mock expectation',
        description: 'Create a new mock expectation',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['interface_id', 'name'],
                properties: {
                  interface_id: { type: 'string' },
                  name: { type: 'string' },
                  ip_filter: { type: 'string' },
                  query_filter: { type: 'object' },
                  body_filter: { type: 'object' },
                  response: { type: 'object' },
                  enabled: { type: 'boolean' },
                  priority: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Mock expectation created successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/mock/expectation/up': {
      put: {
        tags: ['Mock'],
        summary: 'Update mock expectation',
        description: 'Update an existing mock expectation',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['_id'],
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  ip_filter: { type: 'string' },
                  query_filter: { type: 'object' },
                  body_filter: { type: 'object' },
                  response: { type: 'object' },
                  enabled: { type: 'boolean' },
                  priority: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Mock expectation updated successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Mock expectation not found' },
        },
      },
    },
    '/api/mock/expectation/del': {
      delete: {
        tags: ['Mock'],
        summary: 'Delete mock expectation',
        description: 'Delete a mock expectation',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: '_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Mock expectation deleted successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Mock expectation not found' },
        },
      },
    },
    '/api/test/collection/list': {
      get: {
        tags: ['Test'],
        summary: 'List test collections',
        description: 'Get list of test collections',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'project_id',
            in: 'query',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'List of test collections' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/test/collection/{id}': {
      get: {
        tags: ['Test'],
        summary: 'Get test collection',
        description: 'Get test collection details with test cases',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Test collection details' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Test collection not found' },
        },
      },
      put: {
        tags: ['Test'],
        summary: 'Update test collection',
        description: 'Update an existing test collection',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Test collection updated successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Test collection not found' },
        },
      },
      delete: {
        tags: ['Test'],
        summary: 'Delete test collection',
        description: 'Delete a test collection',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Test collection deleted successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Test collection not found' },
        },
      },
    },
    '/api/test/collection/add': {
      post: {
        tags: ['Test'],
        summary: 'Create test collection',
        description: 'Create a new test collection',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id', 'name'],
                properties: {
                  project_id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Test collection created successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/test/case/add': {
      post: {
        tags: ['Test'],
        summary: 'Create test case',
        description: 'Create a new test case',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['collection_id', 'interface_id', 'name'],
                properties: {
                  collection_id: { type: 'string' },
                  interface_id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  request: { type: 'object' },
                  assertion_script: { type: 'string' },
                  order: { type: 'number' },
                  enabled: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Test case created successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/test/case/{id}': {
      put: {
        tags: ['Test'],
        summary: 'Update test case',
        description: 'Update an existing test case',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  request: { type: 'object' },
                  assertion_script: { type: 'string' },
                  order: { type: 'number' },
                  enabled: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Test case updated successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Test case not found' },
        },
      },
      delete: {
        tags: ['Test'],
        summary: 'Delete test case',
        description: 'Delete a test case',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Test case deleted successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Test case not found' },
        },
      },
    },
    '/api/test/run': {
      post: {
        tags: ['Test'],
        summary: 'Run test collection',
        description: 'Run all test cases in a collection',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['collection_id'],
                properties: {
                  collection_id: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Test execution completed' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Test collection not found' },
        },
      },
    },
    '/api/test/history': {
      get: {
        tags: ['Test'],
        summary: 'Get test history',
        description: 'Get test execution history for a collection',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'collection_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Test history' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/import': {
      post: {
        tags: ['ImportExport'],
        summary: 'Import data',
        description: 'Import data from Postman, Swagger, HAR, or ApiAdmin JSON',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_id', 'format', 'data'],
                properties: {
                  project_id: { 
                    type: 'string',
                    description: 'Project ID to import data into',
                    example: '507f1f77bcf86cd799439011'
                  },
                  format: { 
                    type: 'string', 
                    enum: ['postman', 'swagger', 'openapi', 'har', 'apiadmin', 'json'],
                    description: 'Import format type',
                    example: 'swagger'
                  },
                  mode: { 
                    type: 'string', 
                    enum: ['normal', 'good', 'mergin'], 
                    default: 'normal',
                    description: 'Import mode: normal (skip existing), good (merge smartly), mergin (merge all)',
                    example: 'normal'
                  },
                  data: { 
                    type: 'object', 
                    description: 'Import data (Swagger/OpenAPI spec, Postman collection, HAR file, or ApiAdmin JSON)',
                    additionalProperties: true
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Import successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: '导入成功' },
                    data: {
                      type: 'object',
                      properties: {
                        imported: { 
                          type: 'number', 
                          description: 'Number of successfully imported interfaces',
                          example: 10
                        },
                        skipped: { 
                          type: 'number', 
                          description: 'Number of skipped interfaces (already exist in normal mode)',
                          example: 2
                        },
                        updated: {
                          type: 'number',
                          description: 'Number of updated interfaces (in mergin/good mode)',
                          example: 0
                        },
                        errors: {
                          type: 'array',
                          description: 'List of import errors',
                          items: {
                            type: 'object',
                            properties: {
                              path: { type: 'string', example: '/api/users' },
                              method: { type: 'string', example: 'GET' },
                              error: { type: 'string', example: 'Error message' }
                            }
                          },
                          example: []
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '400': { 
            description: 'Bad request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: '无效的项目ID' }
                  }
                }
              }
            }
          },
          '401': { 
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Unauthorized' }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Project not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: '项目不存在' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: '导入失败' }
                  }
                }
              }
            }
          }
        },
      },
    },
    '/api/export': {
      get: {
        tags: ['ImportExport'],
        summary: 'Export data',
        description: 'Export project data to JSON, Swagger, Markdown, or HTML',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'project_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'format',
            in: 'query',
            schema: { type: 'string', enum: ['json', 'swagger', 'markdown', 'html'], default: 'json' },
          },
          {
            name: 'interface_ids',
            in: 'query',
            schema: { type: 'string', description: 'Comma-separated interface IDs' },
          },
          {
            name: 'public_only',
            in: 'query',
            schema: { type: 'boolean', default: false },
          },
        ],
        responses: {
          '200': { description: 'Export data' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/admin/user/list': {
      get: {
        tags: ['Admin'],
        summary: 'List all users',
        description: 'Get list of all users (super admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          _id: { type: 'string' },
                          username: { type: 'string' },
                          email: { type: 'string' },
                          role: { type: 'string', enum: ['super_admin', 'group_leader', 'project_leader', 'developer', 'guest'] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
        },
      },
    },
    '/api/admin/user/add': {
      post: {
        tags: ['Admin'],
        summary: 'Create user',
        description: 'Create a new user (super admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'username'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                  username: { type: 'string' },
                  role: { type: 'string', enum: ['super_admin', 'group_leader', 'project_leader', 'developer', 'guest'], default: 'guest' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'User created successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
        },
      },
    },
    '/api/admin/user/up': {
      put: {
        tags: ['Admin'],
        summary: 'Update user',
        description: 'Update an existing user (super admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['_id'],
                properties: {
                  _id: { type: 'string' },
                  username: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  role: { type: 'string', enum: ['super_admin', 'group_leader', 'project_leader', 'developer', 'guest'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'User updated successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'User not found' },
        },
      },
    },
    '/api/admin/user/del': {
      delete: {
        tags: ['Admin'],
        summary: 'Delete user',
        description: 'Delete a user (super admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: '_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'User ID',
          },
        ],
        responses: {
          '200': { description: 'User deleted successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'User not found' },
        },
      },
    },
    '/api/admin/project/list': {
      get: {
        tags: ['Admin'],
        summary: 'List all projects',
        description: 'Get list of all projects (super admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of projects',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
        },
      },
    },
    '/api/admin/project/add': {
      post: {
        tags: ['Admin'],
        summary: 'Create project',
        description: 'Create a new project (super admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['project_name', 'group_id'],
                properties: {
                  project_name: { type: 'string' },
                  project_desc: { type: 'string' },
                  group_id: { type: 'string' },
                  basepath: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Project created successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
        },
      },
    },
    '/api/admin/project/up': {
      put: {
        tags: ['Admin'],
        summary: 'Update project',
        description: 'Update an existing project (super admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['_id'],
                properties: {
                  _id: { type: 'string' },
                  project_name: { type: 'string' },
                  project_desc: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Project updated successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Project not found' },
        },
      },
    },
    '/api/admin/project/del': {
      delete: {
        tags: ['Admin'],
        summary: 'Delete project',
        description: 'Delete a project (super admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: '_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Project ID',
          },
        ],
        responses: {
          '200': { description: 'Project deleted successfully' },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
          '404': { description: 'Project not found' },
        },
      },
    },
    '/api/admin/interface/list': {
      get: {
        tags: ['Admin'],
        summary: 'List all interfaces',
        description: 'Get list of all interfaces (super admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of interfaces',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
        },
      },
    },
    '/api/admin/environment/list': {
      get: {
        tags: ['Admin'],
        summary: 'List all environments',
        description: 'Get list of all environments across all projects (super admin only)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of environments',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Permission denied' },
        },
      },
    },
  },
  tags: [
    {
      name: 'Health',
      description: 'Health check endpoints',
    },
    {
      name: 'System',
      description: 'System information endpoints',
    },
    {
      name: 'User',
      description: 'User management endpoints',
    },
    {
      name: 'Group',
      description: 'Group management endpoints',
    },
    {
      name: 'Project',
      description: 'Project management endpoints',
    },
    {
      name: 'Interface',
      description: 'Interface management endpoints',
    },
    {
      name: 'Upload',
      description: 'File upload endpoints',
    },
    {
      name: 'Monitor',
      description: 'System monitoring endpoints',
    },
    {
      name: 'Mock',
      description: 'Mock expectation management endpoints',
    },
    {
      name: 'Test',
      description: 'Test management endpoints',
    },
    {
      name: 'ImportExport',
      description: 'Data import and export endpoints',
    },
    {
      name: 'Admin',
      description: 'Admin management endpoints (super admin only)',
    },
  ],
};

// 合并未实现功能的路径定义
swaggerDefinition.paths = {
  ...swaggerDefinition.paths,
  ...unimplementedPaths
};

// 合并未实现功能的组件定义
swaggerDefinition.components = {
  ...swaggerDefinition.components,
  schemas: {
    ...swaggerDefinition.components.schemas,
    ...unimplementedComponents.schemas
  },
  responses: {
    ...(swaggerDefinition.components.responses || {}),
    ...unimplementedComponents.responses
  }
};

// 添加未实现功能的标签
swaggerDefinition.tags = [
  ...swaggerDefinition.tags,
  {
    name: 'SSO',
    description: 'SSO single sign-on endpoints',
  },
  {
    name: 'Whitelist',
    description: 'Whitelist management endpoints',
  },
  {
    name: 'Email',
    description: 'Email service endpoints',
  },
  {
    name: 'Plugins',
    description: 'Plugin management endpoints',
  },
  {
    name: 'CI/CD',
    description: 'CI/CD integration endpoints',
  },
  {
    name: 'Auto Test',
    description: 'Auto test for imported interfaces endpoints',
  },
  {
    name: 'Notifications',
    description: 'Notification management endpoints',
  },
  {
    name: 'Search',
    description: 'Global search endpoints',
  },
  {
    name: 'Logs',
    description: 'Operation logs endpoints',
  },
  {
    name: 'OpenAPI',
    description: 'OpenAPI endpoints (project token authentication)',
  },
  {
    name: 'Documentation',
    description: 'Documentation management endpoints',
  },
  {
    name: 'Analytics',
    description: 'Analytics and quality center endpoints',
  },
];

export default swaggerDefinition;

