import { logger } from '../logger.js';
import Interface from '../../Models/Interface.js';
import InterfaceCat from '../../Models/InterfaceCat.js';

export class PostmanImporter {
  async import(data, options = {}) {
    const { projectId, userId, mode = 'normal' } = options;
    const collection = typeof data === 'string' ? JSON.parse(data) : data;

    if (!collection.info || !collection.item) {
      throw new Error('Invalid Postman collection format');
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    await this.processItems(collection.item, projectId, userId, mode, null, results);

    return results;
  }

  async processItems(items, projectId, userId, mode, parentCatId, results) {
    for (const item of items) {
      if (item.request) {
        await this.importRequest(item, projectId, userId, mode, parentCatId, results);
      } else if (item.item) {
        const cat = await this.createCategory(item.name, projectId, userId, parentCatId);
        await this.processItems(item.item, projectId, userId, mode, cat._id, results);
      }
    }
  }

  async createCategory(name, projectId, userId, parentId) {
    const existing = await InterfaceCat.findOne({
      project_id: projectId,
      name,
      parent_id: parentId || null,
    });

    if (existing) {
      return existing;
    }

    const cat = new InterfaceCat({
      project_id: projectId,
      name,
      parent_id: parentId || null,
      uid: userId,
    });

    await cat.save();
    return cat;
  }

  async importRequest(item, projectId, userId, mode, catId, results) {
    try {
      const existing = await Interface.findOne({
        project_id: projectId,
        title: item.name,
        catid: catId || null,
      });

      if (existing && mode === 'normal') {
        results.skipped++;
        return;
      }

      const request = item.request;
      const method = request.method || 'GET';
      const url = request.url || {};

      let path = '';
      if (typeof url === 'string') {
        path = url;
      } else if (url.raw) {
        path = url.raw;
      } else if (url.path) {
        path = '/' + (Array.isArray(url.path) ? url.path.join('/') : url.path);
      }

      const query = this.parseQuery(url.query || []);
      const headers = this.parseHeaders(request.header || []);
      const body = this.parseBody(request.body);

      const interfaceData = {
        project_id: projectId,
        catid: catId || null,
        title: item.name || 'Untitled',
        path,
        method: method.toUpperCase(),
        req_query: query,
        req_headers: headers,
        req_body_type: body.type || 'json',
        req_body: body.data || '',
        res_body: item.response && item.response[0] ? JSON.stringify(item.response[0].body, null, 2) : '{}',
        res_body_type: 'json',
        status: 'developing',
        desc: item.description || '',
        uid: userId,
      };

      if (existing && mode === 'merge') {
        Object.assign(existing, interfaceData);
        await existing.save();
        results.imported++;
      } else {
        if (existing && mode === 'overwrite') {
          await existing.deleteOne();
        }
        const newInterface = new Interface(interfaceData);
        await newInterface.save();
        results.imported++;
      }
    } catch (error) {
      logger.error({ error, item: item.name }, 'Import request error');
      results.errors.push({ name: item.name, error: error.message });
    }
  }

  parseQuery(query) {
    if (!Array.isArray(query)) return [];
    return query.map((q) => ({
      name: q.key || '',
      type: 'string',
      required: q.disabled !== true,
      default: q.value || '',
      desc: q.description || '',
    }));
  }

  parseHeaders(headers) {
    if (!Array.isArray(headers)) return [];
    return headers.map((h) => ({
      name: h.key || '',
      value: h.value || '',
      required: false,
      desc: h.description || '',
    }));
  }

  parseBody(body) {
    if (!body) return { type: 'json', data: '' };

    switch (body.mode) {
      case 'raw':
        return { type: 'json', data: body.raw || '' };
      case 'formdata':
      case 'urlencoded':
        return { type: 'form', data: body[body.mode] || [] };
      default:
        return { type: 'json', data: '' };
    }
  }
}


