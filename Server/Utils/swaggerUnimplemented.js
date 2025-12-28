/**
 * ApiAdmin - 未实现功能 Swagger 定义
 * 
 * 本文档包含所有未实现功能的 Swagger/OpenAPI 定义
 * 这些定义应在功能实现后集成到主 swagger.js 文件中
 * 
 * 文档版本: 1.0
 * 创建日期: 2025-01-27
 */

/**
 * 未实现功能的 Swagger 路径定义
 * 这些路径应该合并到主 swaggerDefinition.paths 对象中
 */
export const unimplementedPaths = {
  // ============================================================================
  // 1. SSO 单点登录 API
  // ============================================================================
  '/api/sso/providers': {
    get: {
      tags: ['SSO'],
      summary: 'Get SSO providers list',
      description: 'Get list of all configured SSO providers',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'SSO providers list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/SSOProvider'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['SSO'],
      summary: 'Create SSO provider',
      description: 'Create a new SSO provider configuration',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/SSOProviderCreate'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'SSO provider created',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        '400': {
          $ref: '#/components/responses/BadRequest'
        }
      }
    }
  },
  '/api/sso/providers/{id}': {
    get: {
      tags: ['SSO'],
      summary: 'Get SSO provider details',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'SSO provider details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/SSOProvider'
                  }
                }
              }
            }
          }
        },
        '404': {
          $ref: '#/components/responses/NotFound'
        }
      }
    },
    put: {
      tags: ['SSO'],
      summary: 'Update SSO provider',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/SSOProviderUpdate'
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    },
    delete: {
      tags: ['SSO'],
      summary: 'Delete SSO provider',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/sso/auth/{providerId}': {
    get: {
      tags: ['SSO'],
      summary: 'Initiate SSO authentication',
      description: 'Redirect to SSO provider for authentication',
      parameters: [
        {
          name: 'providerId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'redirectUrl',
          in: 'query',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '302': {
          description: 'Redirect to SSO provider'
        },
        '404': {
          $ref: '#/components/responses/NotFound'
        }
      }
    }
  },
  '/api/sso/auth/{providerId}/callback': {
    get: {
      tags: ['SSO'],
      summary: 'SSO authentication callback',
      description: 'Handle SSO provider callback',
      parameters: [
        {
          name: 'providerId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'code',
          in: 'query',
          schema: { type: 'string' },
          description: 'OAuth/OIDC authorization code'
        },
        {
          name: 'state',
          in: 'query',
          schema: { type: 'string' },
          description: 'OAuth state parameter'
        },
        {
          name: 'SAMLResponse',
          in: 'query',
          schema: { type: 'string' },
          description: 'SAML response'
        },
        {
          name: 'ticket',
          in: 'query',
          schema: { type: 'string' },
          description: 'CAS ticket'
        }
      ],
      responses: {
        '302': {
          description: 'Redirect to application'
        },
        '400': {
          $ref: '#/components/responses/BadRequest'
        }
      }
    }
  },

  // ============================================================================
  // 2. 第三方登录 API
  // ============================================================================
  '/api/auth/github': {
    get: {
      tags: ['Auth'],
      summary: 'GitHub login',
      description: 'Initiate GitHub OAuth login',
      parameters: [
        {
          name: 'redirectUrl',
          in: 'query',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '302': {
          description: 'Redirect to GitHub'
        }
      }
    }
  },
  '/api/auth/github/callback': {
    get: {
      tags: ['Auth'],
      summary: 'GitHub login callback',
      parameters: [
        {
          name: 'code',
          in: 'query',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'state',
          in: 'query',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      user: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '403': {
          description: 'User not in whitelist'
        }
      }
    }
  },
  '/api/auth/phone/send-code': {
    post: {
      tags: ['Auth'],
      summary: 'Send phone verification code',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['phone'],
              properties: {
                phone: {
                  type: 'string',
                  pattern: '^1[3-9]\\d{9}$',
                  description: 'Phone number'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        },
        '400': {
          $ref: '#/components/responses/BadRequest'
        },
        '403': {
          description: 'Phone not in whitelist'
        },
        '429': {
          description: 'Rate limit exceeded'
        }
      }
    }
  },
  '/api/auth/phone/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login with phone and verification code',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['phone', 'code'],
              properties: {
                phone: { type: 'string' },
                code: {
                  type: 'string',
                  pattern: '^\\d{6}$',
                  description: '6-digit verification code'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      user: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '400': {
          description: 'Invalid or expired code'
        }
      }
    }
  },
  '/api/auth/email/send-code': {
    post: {
      tags: ['Auth'],
      summary: 'Send email verification code',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/auth/email/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login with email and verification code',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'code'],
              properties: {
                email: { type: 'string', format: 'email' },
                code: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      user: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  // ============================================================================
  // 3. 白名单管理 API
  // ============================================================================
  '/api/whitelist/config': {
    get: {
      tags: ['Whitelist'],
      summary: 'Get whitelist configuration',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Whitelist configuration',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/WhitelistConfig'
                  }
                }
              }
            }
          }
        }
      }
    },
    put: {
      tags: ['Whitelist'],
      summary: 'Update whitelist configuration',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/WhitelistConfig'
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/whitelist/entries': {
    get: {
      tags: ['Whitelist'],
      summary: 'Get whitelist entries',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'platform',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['github', 'gitlab', 'gmail', 'wechat', 'phone', 'email']
          }
        },
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 }
        },
        {
          name: 'pageSize',
          in: 'query',
          schema: { type: 'integer', default: 10 }
        },
        {
          name: 'search',
          in: 'query',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Whitelist entries',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      list: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/WhitelistEntry'
                        }
                      },
                      pagination: {
                        $ref: '#/components/schemas/Pagination'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Whitelist'],
      summary: 'Add whitelist entry',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/WhitelistEntryCreate'
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    },
    delete: {
      tags: ['Whitelist'],
      summary: 'Batch delete whitelist entries',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ids: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/whitelist/entries/{id}': {
    put: {
      tags: ['Whitelist'],
      summary: 'Update whitelist entry',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/WhitelistEntryUpdate'
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    },
    delete: {
      tags: ['Whitelist'],
      summary: 'Delete whitelist entry',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/whitelist/entries/check': {
    post: {
      tags: ['Whitelist'],
      summary: 'Check if value in whitelist',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['platform', 'value'],
              properties: {
                platform: {
                  type: 'string',
                  enum: ['github', 'gitlab', 'gmail', 'wechat', 'phone', 'email']
                },
                value: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Check result',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      inWhitelist: { type: 'boolean' },
                      entry: {
                        $ref: '#/components/schemas/WhitelistEntry'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  // ============================================================================
  // 4. 邮件服务 API
  // ============================================================================
  '/api/email/config': {
    get: {
      tags: ['Email'],
      summary: 'Get email service configuration',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Email configuration',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/EmailConfig'
                  }
                }
              }
            }
          }
        }
      }
    },
    put: {
      tags: ['Email'],
      summary: 'Update email service configuration',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/EmailConfig'
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/email/test': {
    post: {
      tags: ['Email'],
      summary: 'Send test email',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['to'],
              properties: {
                to: { type: 'string', format: 'email' },
                subject: { type: 'string' },
                content: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/email/templates': {
    get: {
      tags: ['Email'],
      summary: 'Get email templates list',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Email templates',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/EmailTemplate'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Email'],
      summary: 'Create email template',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/EmailTemplateCreate'
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/email/templates/{id}': {
    get: {
      tags: ['Email'],
      summary: 'Get email template details',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Email template',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/EmailTemplate'
                  }
                }
              }
            }
          }
        }
      }
    },
    put: {
      tags: ['Email'],
      summary: 'Update email template',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/EmailTemplateUpdate'
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    },
    delete: {
      tags: ['Email'],
      summary: 'Delete email template',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/email/send': {
    post: {
      tags: ['Email'],
      summary: 'Send email using template',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['to', 'templateId'],
              properties: {
                to: {
                  oneOf: [
                    { type: 'string', format: 'email' },
                    {
                      type: 'array',
                      items: { type: 'string', format: 'email' }
                    }
                  ]
                },
                templateId: { type: 'string' },
                variables: {
                  type: 'object',
                  additionalProperties: true
                },
                subject: { type: 'string' },
                attachments: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/EmailAttachment'
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Email sent',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      sentCount: { type: 'integer' },
                      failedCount: { type: 'integer' },
                      messageIds: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  // ============================================================================
  // 5. 插件系统 API
  // ============================================================================
  '/api/plugins': {
    get: {
      tags: ['Plugins'],
      summary: 'Get plugins list',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'enabled',
          in: 'query',
          schema: { type: 'boolean' }
        },
        {
          name: 'category',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['export', 'import', 'mock', 'test', 'integration', 'other']
          }
        }
      ],
      responses: {
        '200': {
          description: 'Plugins list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Plugin'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/plugins/{id}': {
    get: {
      tags: ['Plugins'],
      summary: 'Get plugin details',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Plugin details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/Plugin'
                  }
                }
              }
            }
          }
        }
      }
    },
    delete: {
      tags: ['Plugins'],
      summary: 'Uninstall plugin',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/plugins/install/local': {
    post: {
      tags: ['Plugins'],
      summary: 'Install plugin from local directory',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['pluginPath'],
              properties: {
                pluginPath: {
                  type: 'string',
                  description: 'Plugin directory path relative to Plugins directory'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/plugins/install/npm': {
    post: {
      tags: ['Plugins'],
      summary: 'Install plugin from npm',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['packageName'],
              properties: {
                packageName: {
                  type: 'string',
                  description: 'npm package name, e.g., @apiadmin/plugin-xxx'
                },
                version: {
                  type: 'string',
                  description: 'Package version, default: latest'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/plugins/{id}/enable': {
    patch: {
      tags: ['Plugins'],
      summary: 'Enable or disable plugin',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['enabled'],
              properties: {
                enabled: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/plugins/{id}/config': {
    get: {
      tags: ['Plugins'],
      summary: 'Get plugin configuration',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Plugin configuration',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      config: {
                        type: 'object',
                        additionalProperties: true
                      },
                      schema: {
                        type: 'object',
                        description: 'JSON Schema for config validation'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    put: {
      tags: ['Plugins'],
      summary: 'Update plugin configuration',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  additionalProperties: true
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },

  // ============================================================================
  // 6. CI/CD 集成 API
  // ============================================================================
  '/api/cicd/tokens': {
    get: {
      tags: ['CI/CD'],
      summary: 'Get CLI tokens list',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'CLI tokens list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/CLIToken'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['CI/CD'],
      summary: 'Generate CLI token',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                projectId: { type: 'string' },
                expiresAt: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'CLI token generated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/CLIToken'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/cicd/test/run': {
    post: {
      tags: ['CI/CD'],
      summary: 'Run test collection via CLI',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['collectionId'],
              properties: {
                collectionId: { type: 'string' },
                environment: {
                  type: 'object',
                  additionalProperties: true
                },
                format: {
                  type: 'string',
                  enum: ['json', 'junit', 'allure'],
                  default: 'json'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Test report',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      report: {
                        type: 'object',
                        description: 'Test report object'
                      },
                      format: {
                        type: 'string',
                        enum: ['json', 'junit', 'allure']
                      },
                      content: {
                        type: 'string',
                        description: 'Formatted report content'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  // ============================================================================
  // 7. 已导入接口自动化测试 API
  // ============================================================================
  '/api/auto-test/config': {
    get: {
      tags: ['Auto Test'],
      summary: 'Get auto test configuration',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'projectId',
          in: 'query',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Auto test configuration',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/AutoTestConfig'
                  }
                }
              }
            }
          }
        }
      }
    },
    put: {
      tags: ['Auto Test'],
      summary: 'Update auto test configuration',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/AutoTestConfig'
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/auto-test/generate': {
    post: {
      tags: ['Auto Test'],
      summary: 'Generate test cases for imported interfaces',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                interfaceIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Interface IDs, empty for all imported interfaces'
                },
                projectId: { type: 'string' },
                strategy: {
                  type: 'string',
                  enum: ['mock', 'example', 'history'],
                  default: 'mock'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Test cases generated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      generatedCount: { type: 'integer' },
                      testCases: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/TestCase'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/auto-test/run': {
    post: {
      tags: ['Auto Test'],
      summary: 'Run auto tests for imported interfaces',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                interfaceIds: {
                  type: 'array',
                  items: { type: 'string' }
                },
                projectId: { type: 'string' },
                collectionId: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Test results',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      report: {
                        $ref: '#/components/schemas/TestReport'
                      },
                      qualityReport: {
                        $ref: '#/components/schemas/QualityReport'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  // ============================================================================
  // 8. 消息通知 API
  // ============================================================================
  '/api/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'Get notifications list',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'unreadOnly',
          in: 'query',
          schema: { type: 'boolean' }
        },
        {
          name: 'type',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['interface-change', 'test-failed', 'project-update', 'system']
          }
        },
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 }
        },
        {
          name: 'pageSize',
          in: 'query',
          schema: { type: 'integer', default: 10 }
        }
      ],
      responses: {
        '200': {
          description: 'Notifications list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      list: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Notification'
                        }
                      },
                      pagination: {
                        $ref: '#/components/schemas/Pagination'
                      },
                      unreadCount: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/notifications/{id}/read': {
    patch: {
      tags: ['Notifications'],
      summary: 'Mark notification as read',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/notifications/settings': {
    get: {
      tags: ['Notifications'],
      summary: 'Get notification settings',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Notification settings',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/NotificationSettings'
                  }
                }
              }
            }
          }
        }
      }
    },
    put: {
      tags: ['Notifications'],
      summary: 'Update notification settings',
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/NotificationSettings'
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },

  // ============================================================================
  // 9. 搜索功能 API
  // ============================================================================
  '/api/search': {
    get: {
      tags: ['Search'],
      summary: 'Global search',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'q',
          in: 'query',
          required: true,
          schema: { type: 'string' },
          description: 'Search keyword'
        },
        {
          name: 'type',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['all', 'interface', 'project', 'group'],
            default: 'all'
          }
        },
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 }
        },
        {
          name: 'pageSize',
          in: 'query',
          schema: { type: 'integer', default: 10 }
        }
      ],
      responses: {
        '200': {
          description: 'Search results',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      results: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/SearchResult'
                        }
                      },
                      pagination: {
                        $ref: '#/components/schemas/Pagination'
                      },
                      total: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/search/suggestions': {
    get: {
      tags: ['Search'],
      summary: 'Get search suggestions',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'q',
          in: 'query',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 5 }
        }
      ],
      responses: {
        '200': {
          description: 'Search suggestions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        text: { type: 'string' },
                        type: {
                          type: 'string',
                          enum: ['interface', 'project', 'group']
                        },
                        count: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  // ============================================================================
  // 10. 项目关注 API
  // ============================================================================
  '/api/projects/{projectId}/follow': {
    post: {
      tags: ['Projects'],
      summary: 'Follow project',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'projectId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    },
    delete: {
      tags: ['Projects'],
      summary: 'Unfollow project',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'projectId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/projects/following': {
    get: {
      tags: ['Projects'],
      summary: 'Get followed projects list',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 }
        },
        {
          name: 'pageSize',
          in: 'query',
          schema: { type: 'integer', default: 10 }
        }
      ],
      responses: {
        '200': {
          description: 'Followed projects',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      list: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Project'
                        }
                      },
                      pagination: {
                        $ref: '#/components/schemas/Pagination'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  // ============================================================================
  // 11. 操作日志 API
  // ============================================================================
  '/api/logs': {
    get: {
      tags: ['Logs'],
      summary: 'Get operation logs',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'type',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['project', 'interface', 'user', 'all']
          }
        },
        {
          name: 'projectId',
          in: 'query',
          schema: { type: 'string' }
        },
        {
          name: 'userId',
          in: 'query',
          schema: { type: 'string' }
        },
        {
          name: 'action',
          in: 'query',
          schema: { type: 'string' }
        },
        {
          name: 'startDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' }
        },
        {
          name: 'endDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' }
        },
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 }
        },
        {
          name: 'pageSize',
          in: 'query',
          schema: { type: 'integer', default: 10 }
        }
      ],
      responses: {
        '200': {
          description: 'Operation logs',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      list: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/OperationLog'
                        }
                      },
                      pagination: {
                        $ref: '#/components/schemas/Pagination'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/logs/export': {
    get: {
      tags: ['Logs'],
      summary: 'Export operation logs',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'type',
          in: 'query',
          schema: { type: 'string' }
        },
        {
          name: 'format',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['csv', 'json', 'excel'],
            default: 'csv'
          }
        }
      ],
      responses: {
        '200': {
          description: 'Exported logs file',
          content: {
            'application/octet-stream': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            }
          }
        }
      }
    }
  },

  // ============================================================================
  // 12. 用户中心增强 API
  // ============================================================================
  '/api/user/projects': {
    get: {
      tags: ['User'],
      summary: 'Get user participated projects',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'role',
          in: 'query',
          schema: { type: 'string' }
        },
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 }
        },
        {
          name: 'pageSize',
          in: 'query',
          schema: { type: 'integer', default: 10 }
        }
      ],
      responses: {
        '200': {
          description: 'User projects',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      list: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Project'
                        }
                      },
                      pagination: {
                        $ref: '#/components/schemas/Pagination'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/user/stats': {
    get: {
      tags: ['User'],
      summary: 'Get user operation statistics',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'startDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' }
        },
        {
          name: 'endDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' }
        }
      ],
      responses: {
        '200': {
          description: 'User statistics',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/UserStats'
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  // ============================================================================
  // 13. OpenAPI 接口
  // ============================================================================
  '/api/openapi/interfaces': {
    get: {
      tags: ['OpenAPI'],
      summary: 'Get interfaces list via OpenAPI',
      description: 'Access interfaces using project token',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'catId',
          in: 'query',
          schema: { type: 'string' }
        },
        {
          name: 'tag',
          in: 'query',
          schema: { type: 'string' }
        },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string' }
        },
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 }
        },
        {
          name: 'pageSize',
          in: 'query',
          schema: { type: 'integer', default: 10 }
        }
      ],
      responses: {
        '200': {
          description: 'Interfaces list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      list: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Interface'
                        }
                      },
                      pagination: {
                        $ref: '#/components/schemas/Pagination'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['OpenAPI'],
      summary: 'Create interface via OpenAPI',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Interface'
            }
          }
        }
      },
      responses: {
        '200': {
          $ref: '#/components/responses/Success'
        }
      }
    }
  },
  '/api/projects/{projectId}/tokens': {
    get: {
      tags: ['Projects'],
      summary: 'Get project tokens list',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'projectId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Project tokens',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/ProjectToken'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Projects'],
      summary: 'Generate project token',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'projectId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                expiresAt: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Project token generated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/ProjectToken'
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  // ============================================================================
  // 14. 交互式文档中心 API
  // ============================================================================
  '/api/projects/{projectId}/docs/publish': {
    post: {
      tags: ['Documentation'],
      summary: 'Publish project documentation',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'projectId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                version: { type: 'string' },
                theme: {
                  type: 'object',
                  additionalProperties: true
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Documentation published',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      url: { type: 'string' },
                      version: { type: 'string' },
                      publishedAt: {
                        type: 'string',
                        format: 'date-time'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/projects/{projectId}/docs/export/pdf': {
    get: {
      tags: ['Documentation'],
      summary: 'Export documentation as PDF',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'projectId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'interfaceIds',
          in: 'query',
          schema: {
            type: 'string',
            description: 'Comma-separated interface IDs'
          }
        },
        {
          name: 'template',
          in: 'query',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'PDF file',
          content: {
            'application/pdf': {
              schema: {
                type: 'string',
                format: 'binary'
              }
            }
          }
        }
      }
    }
  },

  // ============================================================================
  // 15. 数据洞察与质量中心 API
  // ============================================================================
  '/api/projects/{projectId}/health': {
    get: {
      tags: ['Analytics'],
      summary: 'Get project health metrics',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'projectId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Project health metrics',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/ProjectHealth'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/monitor/stats/api-calls': {
    get: {
      tags: ['Monitor'],
      summary: 'Get API call statistics',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'startDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' }
        },
        {
          name: 'endDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' }
        },
        {
          name: 'interval',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['hour', 'day', 'week', 'month'],
            default: 'day'
          }
        },
        {
          name: 'interfaceId',
          in: 'query',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'API call statistics',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/APICallStats'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/monitor/stats/response-time': {
    get: {
      tags: ['Monitor'],
      summary: 'Get response time analysis',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'startDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' }
        },
        {
          name: 'endDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' }
        },
        {
          name: 'interfaceId',
          in: 'query',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Response time analysis',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/ResponseTimeAnalysis'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/monitor/stats/error-rate': {
    get: {
      tags: ['Monitor'],
      summary: 'Get error rate statistics',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'startDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' }
        },
        {
          name: 'endDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' }
        },
        {
          name: 'interfaceId',
          in: 'query',
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Error rate statistics',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    $ref: '#/components/schemas/ErrorRateStats'
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

/**
 * 未实现功能的 Swagger 组件定义
 * 这些组件应该合并到主 swaggerDefinition.components.schemas 对象中
 */
export const unimplementedComponents = {
  schemas: {
    SSOProvider: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        type: {
          type: 'string',
          enum: ['saml', 'oauth2', 'oidc', 'ldap', 'cas']
        },
        enabled: { type: 'boolean' },
        description: { type: 'string' },
        config: {
          type: 'object',
          additionalProperties: true
        },
        roleMapping: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        autoCreateUser: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    },
    SSOProviderCreate: {
      type: 'object',
      required: ['name', 'type', 'config'],
      properties: {
        name: { type: 'string' },
        type: {
          type: 'string',
          enum: ['saml', 'oauth2', 'oidc', 'ldap', 'cas']
        },
        enabled: { type: 'boolean', default: true },
        config: {
          type: 'object',
          additionalProperties: true
        },
        roleMapping: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        autoCreateUser: { type: 'boolean', default: true }
      }
    },
    SSOProviderUpdate: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        enabled: { type: 'boolean' },
        config: {
          type: 'object',
          additionalProperties: true
        },
        roleMapping: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        autoCreateUser: { type: 'boolean' }
      }
    },
    WhitelistConfig: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        platforms: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['github', 'gitlab', 'gmail', 'wechat', 'phone', 'email']
          }
        }
      }
    },
    WhitelistEntry: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        platform: {
          type: 'string',
          enum: ['github', 'gitlab', 'gmail', 'wechat', 'phone', 'email']
        },
        value: { type: 'string' },
        description: { type: 'string' },
        enabled: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        createdBy: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' }
          }
        }
      }
    },
    WhitelistEntryCreate: {
      type: 'object',
      required: ['platform', 'value'],
      properties: {
        platform: {
          type: 'string',
          enum: ['github', 'gitlab', 'gmail', 'wechat', 'phone', 'email']
        },
        value: { type: 'string' },
        description: { type: 'string' }
      }
    },
    WhitelistEntryUpdate: {
      type: 'object',
      properties: {
        value: { type: 'string' },
        description: { type: 'string' },
        enabled: { type: 'boolean' }
      }
    },
    EmailConfig: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['smtp', 'sendgrid', 'ses', 'aliyun']
        },
        smtp: {
          type: 'object',
          properties: {
            host: { type: 'string' },
            port: { type: 'integer' },
            secure: { type: 'boolean' },
            auth: {
              type: 'object',
              properties: {
                user: { type: 'string' },
                pass: { type: 'string' }
              }
            }
          }
        },
        sendgrid: {
          type: 'object',
          properties: {
            apiKey: { type: 'string' }
          }
        },
        ses: {
          type: 'object',
          properties: {
            accessKeyId: { type: 'string' },
            secretAccessKey: { type: 'string' },
            region: { type: 'string' }
          }
        },
        aliyun: {
          type: 'object',
          properties: {
            accessKeyId: { type: 'string' },
            accessKeySecret: { type: 'string' },
            region: { type: 'string' }
          }
        },
        from: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' }
          }
        }
      }
    },
    EmailTemplate: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        type: {
          type: 'string',
          enum: ['verification', 'welcome', 'password-reset', 'interface-change', 'custom']
        },
        subject: { type: 'string' },
        html: { type: 'string' },
        text: { type: 'string' },
        variables: {
          type: 'array',
          items: { type: 'string' }
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    },
    EmailTemplateCreate: {
      type: 'object',
      required: ['name', 'type', 'subject', 'html'],
      properties: {
        name: { type: 'string' },
        type: {
          type: 'string',
          enum: ['verification', 'welcome', 'password-reset', 'interface-change', 'custom']
        },
        subject: { type: 'string' },
        html: { type: 'string' },
        text: { type: 'string' },
        variables: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    EmailTemplateUpdate: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        subject: { type: 'string' },
        html: { type: 'string' },
        text: { type: 'string' },
        variables: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    EmailAttachment: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        content: { type: 'string', description: 'Base64 encoded content' },
        contentType: { type: 'string' }
      }
    },
    Plugin: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        displayName: { type: 'string' },
        version: { type: 'string' },
        description: { type: 'string' },
        author: { type: 'string' },
        license: { type: 'string' },
        icon: { type: 'string' },
        category: {
          type: 'string',
          enum: ['export', 'import', 'mock', 'test', 'integration', 'other']
        },
        enabled: { type: 'boolean' },
        installed: { type: 'boolean' },
        hasUpdate: { type: 'boolean' },
        latestVersion: { type: 'string' },
        dependencies: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        routes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              method: { type: 'string' }
            }
          }
        },
        hooks: {
          type: 'array',
          items: { type: 'string' }
        },
        permissions: {
          type: 'array',
          items: { type: 'string' }
        },
        config: {
          type: 'object',
          additionalProperties: true
        },
        installedAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    },
    CLIToken: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        token: { type: 'string', description: 'Only returned once on creation' },
        name: { type: 'string' },
        projectId: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        lastUsedAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    AutoTestConfig: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        autoGenerate: { type: 'boolean' },
        autoExecute: { type: 'boolean' },
        dataGenerationStrategy: {
          type: 'string',
          enum: ['mock', 'example', 'history']
        },
        assertionTemplate: { type: 'string' },
        timeout: { type: 'integer', description: 'Timeout in milliseconds' },
        retryCount: { type: 'integer' }
      }
    },
    Notification: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: {
          type: 'string',
          enum: ['interface-change', 'test-failed', 'project-update', 'system']
        },
        title: { type: 'string' },
        content: { type: 'string' },
        read: { type: 'boolean' },
        readAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        metadata: {
          type: 'object',
          additionalProperties: true
        }
      }
    },
    NotificationSettings: {
      type: 'object',
      properties: {
        email: {
          type: 'object',
          properties: {
            interfaceChange: { type: 'boolean' },
            testFailed: { type: 'boolean' },
            projectUpdate: { type: 'boolean' },
            system: { type: 'boolean' }
          }
        },
        inApp: {
          type: 'object',
          properties: {
            interfaceChange: { type: 'boolean' },
            testFailed: { type: 'boolean' },
            projectUpdate: { type: 'boolean' },
            system: { type: 'boolean' }
          }
        },
        webhook: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            url: { type: 'string', format: 'uri' }
          }
        }
      }
    },
    SearchResult: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['interface', 'project', 'group']
        },
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        highlight: { type: 'string', description: 'Highlighted matching text' },
        score: { type: 'number', description: 'Relevance score' },
        metadata: {
          type: 'object',
          additionalProperties: true
        }
      }
    },
    OperationLog: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: {
          type: 'string',
          enum: ['project', 'interface', 'user']
        },
        action: { type: 'string' },
        targetId: { type: 'string' },
        targetName: { type: 'string' },
        userId: { type: 'string' },
        username: { type: 'string' },
        details: {
          type: 'object',
          additionalProperties: true
        },
        ip: { type: 'string' },
        userAgent: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    UserStats: {
      type: 'object',
      properties: {
        totalActions: { type: 'integer' },
        actionsByType: {
          type: 'object',
          additionalProperties: { type: 'integer' }
        },
        actionsByDate: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              count: { type: 'integer' }
            }
          }
        },
        projectsContributed: { type: 'integer' },
        interfacesCreated: { type: 'integer' },
        testsRun: { type: 'integer' }
      }
    },
    ProjectToken: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        token: { type: 'string', description: 'Only returned once on creation' },
        name: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        lastUsedAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    ProjectHealth: {
      type: 'object',
      properties: {
        totalInterfaces: { type: 'integer' },
        documentedInterfaces: { type: 'integer' },
        documentationCoverage: { type: 'number' },
        mockUsageRate: { type: 'number' },
        testPassRate: { type: 'number' },
        teamActivity: {
          type: 'object',
          properties: {
            totalMembers: { type: 'integer' },
            activeMembers: { type: 'integer' },
            contributionScore: { type: 'integer' }
          }
        },
        changeFrequency: {
          type: 'object',
          properties: {
            daily: { type: 'integer' },
            weekly: { type: 'integer' },
            monthly: { type: 'integer' }
          }
        },
        score: { type: 'integer', description: 'Overall health score (0-100)' },
        trend: {
          type: 'string',
          enum: ['improving', 'stable', 'declining']
        }
      }
    },
    APICallStats: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        success: { type: 'integer' },
        failed: { type: 'integer' },
        byTime: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              time: { type: 'string', format: 'date-time' },
              total: { type: 'integer' },
              success: { type: 'integer' },
              failed: { type: 'integer' }
            }
          }
        },
        byInterface: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              interfaceId: { type: 'string' },
              interfaceName: { type: 'string' },
              total: { type: 'integer' },
              success: { type: 'integer' },
              failed: { type: 'integer' }
            }
          }
        },
        byUser: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              username: { type: 'string' },
              total: { type: 'integer' },
              frequency: { type: 'number' }
            }
          }
        }
      }
    },
    ResponseTimeAnalysis: {
      type: 'object',
      properties: {
        average: { type: 'number' },
        p50: { type: 'number' },
        p95: { type: 'number' },
        p99: { type: 'number' },
        distribution: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              range: { type: 'string' },
              count: { type: 'integer' }
            }
          }
        },
        trend: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              average: { type: 'number' },
              p50: { type: 'number' },
              p95: { type: 'number' },
              p99: { type: 'number' }
            }
          }
        },
        slowInterfaces: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              interfaceId: { type: 'string' },
              interfaceName: { type: 'string' },
              averageResponseTime: { type: 'number' },
              p95: { type: 'number' }
            }
          }
        }
      }
    },
    ErrorRateStats: {
      type: 'object',
      properties: {
        overall: { type: 'number', description: 'Overall error rate' },
        byStatusCode: {
          type: 'object',
          additionalProperties: { type: 'integer' }
        },
        trend: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              errorRate: { type: 'number' }
            }
          }
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              interfaceId: { type: 'string' },
              statusCode: { type: 'integer' },
              count: { type: 'integer' },
              lastOccurredAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    TestReport: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        passed: { type: 'integer' },
        failed: { type: 'integer' },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              interfaceId: { type: 'string' },
              testCaseId: { type: 'string' },
              status: {
                type: 'string',
                enum: ['passed', 'failed']
              },
              duration: { type: 'number' },
              error: { type: 'string' }
            }
          }
        }
      }
    },
    QualityReport: {
      type: 'object',
      properties: {
        totalInterfaces: { type: 'integer' },
        testedInterfaces: { type: 'integer' },
        passedInterfaces: { type: 'integer' },
        failedInterfaces: { type: 'integer' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              interfaceId: { type: 'string' },
              type: {
                type: 'string',
                enum: ['not-accessible', 'format-mismatch', 'missing-params', 'type-mismatch']
              },
              message: { type: 'string' }
            }
          }
        },
        suggestions: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    Pagination: {
      type: 'object',
      properties: {
        page: { type: 'integer' },
        pageSize: { type: 'integer' },
        total: { type: 'integer' },
        totalPages: { type: 'integer' }
      }
    },
    SuccessResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          oneOf: [
            { type: 'object' },
            { type: 'array' },
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' }
          ]
        },
        message: { type: 'string' }
      }
    }
  },
  responses: {
    Success: {
      description: 'Success',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/SuccessResponse'
          }
        }
      }
    },
    BadRequest: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              message: { type: 'string' },
              code: { type: 'integer', example: 400 }
            }
          }
        }
      }
    },
    NotFound: {
      description: 'Not Found',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              message: { type: 'string' },
              code: { type: 'integer', example: 404 }
            }
          }
        }
      }
    }
  }
};

/**
 * 使用说明：
 * 
 * 1. 在主 swagger.js 文件中导入这些定义：
 *    import { unimplementedPaths, unimplementedComponents } from './swaggerUnimplemented.js';
 * 
 * 2. 合并到主 swaggerDefinition：
 *    swaggerDefinition.paths = {
 *      ...swaggerDefinition.paths,
 *      ...unimplementedPaths
 *    };
 * 
 *    swaggerDefinition.components = {
 *      ...swaggerDefinition.components,
 *      schemas: {
 *        ...swaggerDefinition.components.schemas,
 *        ...unimplementedComponents.schemas
 *      },
 *      responses: {
 *        ...swaggerDefinition.components.responses,
 *        ...unimplementedComponents.responses
 *      }
 *    };
 */

