import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { SAML } from 'passport-saml';
import ldap from 'ldapjs';
import User from '../Models/User.js';
import { logger } from './logger.js';
import { logLogin } from './loginLogger.js';
import config from './config.js';

function getJWTSecret() {
  const secret = config.JWT_SECRET;
  if (!secret || secret === 'your-secret-key') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
  }
  return secret;
}

function getJWTExpiresIn() {
  return config.JWT_EXPIRES_IN || '7d';
}

/**
 * 生成 JWT token
 */
function generateToken(userId) {
  return jwt.sign({ userId }, getJWTSecret(), {
    expiresIn: getJWTExpiresIn(),
  });
}

/**
 * 映射 SSO 角色到系统角色
 */
function mapRole(ssoRole, roleMapping) {
  if (!ssoRole || !roleMapping) {
    return 'guest';
  }

  if (typeof roleMapping === 'string') {
    try {
      roleMapping = JSON.parse(roleMapping);
    } catch (e) {
      logger.warn({ roleMapping }, 'Invalid roleMapping format');
      return 'guest';
    }
  }

  return roleMapping[ssoRole] || roleMapping['*'] || 'guest';
}

/**
 * 创建或查找用户
 */
async function findOrCreateUser({
  provider,
  ssoId,
  email,
  username,
  name,
  avatar,
  ssoAttributes = {},
  roleMapping = {},
  autoCreateUser = true,
  ip = '',
  userAgent = '',
}) {
  try {
    let user = await User.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { ssoId, ssoProvider: provider },
      ],
    });

    if (user) {
      user.ssoProvider = provider;
      user.ssoId = ssoId;
      user.ssoAttributes = ssoAttributes;
      if (avatar) {
        user.avatar = avatar;
      }
      await user.save();
      logger.info({ userId: user._id, provider }, 'User updated via SSO');
      return user;
    }

    if (!autoCreateUser) {
      logger.warn({ email, provider }, 'User not found and autoCreateUser is disabled');
      return null;
    }

    const ssoRole = ssoAttributes.role || ssoAttributes.Role || ssoAttributes.roleName;
    const role = mapRole(ssoRole, roleMapping);

    user = new User({
      username: username || email?.split('@')[0] || `user_${ssoId}`,
      email: email?.toLowerCase() || `${ssoId}@${provider}.sso`,
      password: crypto.randomBytes(16).toString('hex'),
      avatar: avatar || '/icons/icon-64x64.png',
      role,
      ssoProvider: provider,
      ssoId,
      ssoAttributes,
    });

    await user.save();
    logger.info({ userId: user._id, provider, email }, 'User created via SSO');

    await logLogin({
      userId: user._id,
      username: user.username,
      email: user.email,
      loginType: 'sso',
      provider,
      status: 'success',
      ip,
      userAgent,
    });

    return user;
  } catch (error) {
    logger.error({ error, provider, email }, 'Error finding or creating user');
    throw error;
  }
}

/**
 * SAML 2.0 认证
 */
export async function initiateSAMLAuth(provider, redirectUrl) {
  try {
    const { config: providerConfig } = provider;
    const { entryPoint, issuer, cert, callbackUrl } = providerConfig;

    if (!entryPoint || !issuer) {
      throw new Error('SAML configuration missing entryPoint or issuer');
    }

    const callback = callbackUrl || `${process.env.APP_URL || 'http://localhost:3000'}/api/sso/auth/${provider._id}/callback`;

    const samlOptions = {
      entryPoint,
      issuer,
      cert: cert || null,
      callbackUrl: callback,
      signatureAlgorithm: 'sha256',
      wantAssertionsSigned: false,
      wantMessageSigned: false,
    };

    const saml = new SAML(samlOptions);
    const loginUrl = saml.getAuthorizeUrl(callback, {}, false);

    return {
      redirectUrl: loginUrl,
    };
  } catch (error) {
    logger.error({ error, providerId: provider._id }, 'SAML auth initiation failed');
    throw error;
  }
}

/**
 * SAML 回调处理
 */
export async function handleSAMLCallback(provider, samlResponse, relayState) {
  try {
    const { config: providerConfig } = provider;
    const { issuer, cert, callbackUrl, entryPoint } = providerConfig;

    if (!samlResponse) {
      throw new Error('SAML response is required');
    }

    const callback = callbackUrl || `${process.env.APP_URL || 'http://localhost:3000'}/api/sso/auth/${provider._id}/callback`;

    const samlOptions = {
      entryPoint: entryPoint || '',
      issuer,
      cert: cert || null,
      callbackUrl: callback,
      signatureAlgorithm: 'sha256',
      wantAssertionsSigned: false,
      wantMessageSigned: false,
    };

    const saml = new SAML(samlOptions);

    return new Promise((resolve, reject) => {
      saml.validatePostResponse(
        { SAMLResponse: samlResponse, RelayState: relayState },
        (err, profile) => {
          if (err) {
            logger.error({ error: err }, 'SAML assertion validation failed');
            reject(err);
            return;
          }

          if (!profile) {
            reject(new Error('SAML profile is empty'));
            return;
          }

          const email = profile.email || profile.mail || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || profile.nameID;
          const username = profile.username || profile.name || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || email?.split('@')[0];
          const name = profile.displayName || profile.name || profile.cn || username;
          const ssoId = profile.nameID || profile.userPrincipalName || email;

          if (!email && !ssoId) {
            reject(new Error('SAML response missing email or name_id'));
            return;
          }

          resolve({
            email,
            username,
            name,
            ssoId,
            ssoAttributes: profile,
          });
        }
      );
    });
  } catch (error) {
    logger.error({ error, providerId: provider._id }, 'SAML callback handling failed');
    throw error;
  }
}

/**
 * OAuth 2.0 / OIDC 认证初始化
 */
export async function initiateOAuth2Auth(provider, redirectUrl) {
  try {
    const { config: providerConfig } = provider;
    const { authorizationUrl, clientId, callbackUrl } = providerConfig;

    if (!authorizationUrl || !clientId) {
      throw new Error('OAuth2 configuration missing authorizationUrl or clientId');
    }

    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = callbackUrl || `${process.env.APP_URL || 'http://localhost:3000'}/api/sso/auth/${provider._id}/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: provider.type === 'oidc' ? 'openid profile email' : 'read:user user:email',
    });

    if (provider.type === 'oidc' && providerConfig.scope) {
      params.set('scope', providerConfig.scope);
    }

    const authUrl = `${authorizationUrl}?${params.toString()}`;

    return {
      redirectUrl: authUrl,
      state,
    };
  } catch (error) {
    logger.error({ error, providerId: provider._id }, 'OAuth2 auth initiation failed');
    throw error;
  }
}

/**
 * OAuth 2.0 / OIDC 回调处理
 */
export async function handleOAuth2Callback(provider, code, state) {
  try {
    const { config: providerConfig, roleMapping, autoCreateUser } = provider;
    const { tokenUrl, userInfoUrl, clientId, clientSecret, callbackUrl } = providerConfig;

    if (!code) {
      throw new Error('OAuth2 callback missing authorization code');
    }

    const redirectUri = callbackUrl || `${process.env.APP_URL || 'http://localhost:3000'}/api/sso/auth/${provider._id}/callback`;

    const tokenResponse = await axios.post(
      tokenUrl,
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      }
    );

    const { access_token, id_token } = tokenResponse.data;

    if (!access_token) {
      throw new Error('OAuth2 token exchange failed: no access_token');
    }

    let userInfo = {};

    if (provider.type === 'oidc' && id_token) {
      try {
        const decoded = jwt.decode(id_token, { complete: true });
        userInfo = decoded.payload || {};
      } catch (e) {
        logger.warn({ error: e }, 'Failed to decode OIDC id_token');
      }
    }

    if (userInfoUrl) {
      try {
        const userInfoResponse = await axios.get(userInfoUrl, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });
        userInfo = { ...userInfo, ...userInfoResponse.data };
      } catch (e) {
        logger.warn({ error: e }, 'Failed to fetch user info from userInfoUrl');
      }
    }

    const email = userInfo.email || userInfo.mail || userInfo['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
    const username = userInfo.username || userInfo.login || userInfo.preferred_username || userInfo.name;
    const name = userInfo.name || userInfo.displayName || userInfo.display_name || username;
    const avatar = userInfo.avatar_url || userInfo.avatar || userInfo.picture || userInfo.photo;
    const ssoId = userInfo.id?.toString() || userInfo.sub || userInfo.user_id || email;

    if (!email && !ssoId) {
      throw new Error('OAuth2 user info missing email and id');
    }

    return {
      email,
      username,
      name,
      avatar,
      ssoId,
      ssoAttributes: userInfo,
    };
  } catch (error) {
    logger.error({ error, providerId: provider._id }, 'OAuth2 callback handling failed');
    throw error;
  }
}

/**
 * LDAP 认证
 */
export async function handleLDAPAuth(provider, username, password) {
  try {
    const { config: providerConfig } = provider;
    const { host, port = 389, baseDN, bindDN, bindPassword, userSearchFilter } = providerConfig;

    if (!host || !baseDN) {
      throw new Error('LDAP configuration missing host or baseDN');
    }

    return new Promise((resolve, reject) => {
      const client = ldap.createClient({
        url: `ldap://${host}:${port}`,
        timeout: 5000,
        connectTimeout: 10000,
      });

      const bindUser = bindDN || `uid=${username},${baseDN}`;
      const bindPass = bindPassword || password;

      client.bind(bindUser, bindPass, (bindErr) => {
        if (bindErr) {
          client.unbind();
          logger.warn({ error: bindErr, username }, 'LDAP bind failed');
          reject(new Error('LDAP authentication failed: invalid credentials'));
          return;
        }

        const filter = userSearchFilter || `(uid=${username})`;
        const searchOptions = {
          filter,
          scope: 'sub',
          attributes: ['cn', 'mail', 'displayName', 'uid', 'memberOf', 'sn', 'givenName'],
        };

        client.search(baseDN, searchOptions, (searchErr, res) => {
          if (searchErr) {
            client.unbind();
            reject(new Error(`LDAP search failed: ${searchErr.message}`));
            return;
          }

          let userAttributes = null;
          let entryCount = 0;

          res.on('searchEntry', (entry) => {
            entryCount++;
            userAttributes = entry.object;
          });

          res.on('error', (err) => {
            client.unbind();
            reject(new Error(`LDAP search error: ${err.message}`));
          });

          res.on('end', (result) => {
            client.unbind();

            if (!userAttributes || entryCount === 0) {
              reject(new Error('LDAP user not found'));
              return;
            }

            const email = userAttributes.mail || userAttributes.email || `${username}@${host}`;
            const name = userAttributes.cn || userAttributes.displayName || userAttributes.name || username;
            const ssoId = userAttributes.uid || userAttributes.sAMAccountName || username;
            const groups = Array.isArray(userAttributes.memberOf) ? userAttributes.memberOf : (userAttributes.memberOf ? [userAttributes.memberOf] : []);

            resolve({
              email,
              username,
              name,
              ssoId,
              ssoAttributes: {
                ...userAttributes,
                groups,
              },
            });
          });
        });
      });
    });
  } catch (error) {
    logger.error({ error, providerId: provider._id }, 'LDAP authentication failed');
    throw error;
  }
}

/**
 * CAS 认证初始化
 */
export async function initiateCASAuth(provider, redirectUrl) {
  try {
    const { config: providerConfig } = provider;
    const { serverUrl } = providerConfig;

    if (!serverUrl) {
      throw new Error('CAS configuration missing serverUrl');
    }

    const service = redirectUrl || `${process.env.APP_URL || 'http://localhost:3000'}/api/sso/auth/${provider._id}/callback`;
    const casUrl = `${serverUrl}/login?service=${encodeURIComponent(service)}`;

    return {
      redirectUrl: casUrl,
    };
  } catch (error) {
    logger.error({ error, providerId: provider._id }, 'CAS auth initiation failed');
    throw error;
  }
}

/**
 * CAS 回调处理
 */
export async function handleCASCallback(provider, ticket) {
  try {
    const { config: providerConfig } = provider;
    const { serverUrl } = providerConfig;

    if (!ticket) {
      throw new Error('CAS callback missing ticket');
    }

    const service = `${process.env.APP_URL || 'http://localhost:3000'}/api/sso/auth/${provider._id}/callback`;
    const validateUrl = `${serverUrl}/serviceValidate?service=${encodeURIComponent(service)}&ticket=${ticket}`;

    const response = await axios.get(validateUrl, {
      headers: {
        Accept: 'application/xml',
      },
      timeout: 10000,
    });

    const xml = response.data;
    
    if (xml.includes('<cas:authenticationFailure')) {
      const errorMatch = xml.match(/<cas:authenticationFailure[^>]*>(.*?)<\/cas:authenticationFailure>/);
      const errorCode = errorMatch ? errorMatch[1] : 'Unknown error';
      throw new Error(`CAS validation failed: ${errorCode}`);
    }

    const userMatch = xml.match(/<cas:user>(.*?)<\/cas:user>/);
    
    if (!userMatch) {
      throw new Error('CAS validation failed: no user in response');
    }

    const ssoId = userMatch[1].trim();
    let attributes = {};

    const attributesMatch = xml.match(/<cas:attributes>(.*?)<\/cas:attributes>/s);
    if (attributesMatch) {
      const attrsXml = attributesMatch[1];
      const emailMatch = attrsXml.match(/<cas:email>(.*?)<\/cas:email>/);
      const nameMatch = attrsXml.match(/<cas:name>(.*?)<\/cas:name>/);
      const roleMatch = attrsXml.match(/<cas:role>(.*?)<\/cas:role>/);
      const displayNameMatch = attrsXml.match(/<cas:displayName>(.*?)<\/cas:displayName>/);

      if (emailMatch) attributes.email = emailMatch[1].trim();
      if (nameMatch) attributes.name = nameMatch[1].trim();
      if (roleMatch) attributes.role = roleMatch[1].trim();
      if (displayNameMatch) attributes.displayName = displayNameMatch[1].trim();
    }

    const email = attributes.email || `${ssoId}@cas.sso`;
    const username = ssoId.split('@')[0] || ssoId;
    const name = attributes.displayName || attributes.name || username;

    return {
      email,
      username,
      name,
      ssoId,
      ssoAttributes: attributes,
    };
  } catch (error) {
    logger.error({ error, providerId: provider._id }, 'CAS callback handling failed');
    throw error;
  }
}

/**
 * 统一处理 SSO 认证结果
 */
export async function processSSOAuthResult(provider, userInfo, ip, userAgent) {
  try {
    const { roleMapping, autoCreateUser } = provider;

    const user = await findOrCreateUser({
      provider: provider.type,
      ssoId: userInfo.ssoId,
      email: userInfo.email,
      username: userInfo.username,
      name: userInfo.name,
      avatar: userInfo.avatar,
      ssoAttributes: userInfo.ssoAttributes,
      roleMapping,
      autoCreateUser,
      ip,
      userAgent,
    });

    if (!user) {
      throw new Error('User creation or lookup failed');
    }

    const token = generateToken(user._id);

    return {
      user,
      token,
    };
  } catch (error) {
    logger.error({ error, providerId: provider._id }, 'SSO auth result processing failed');
    throw error;
  }
}

