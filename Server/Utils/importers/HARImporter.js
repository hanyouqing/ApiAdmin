import { logger } from '../logger.js';
import Interface from '../../Models/Interface.js';

export class HARImporter {
  async import(data, options = {}) {
    const { projectId, userId, mode = 'normal' } = options;
    const har = typeof data === 'string' ? JSON.parse(data) : data;

    if (!har.log || !har.log.entries) {
      throw new Error('Invalid HAR format');
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (const entry of har.log.entries) {
      await this.importEntry(entry, projectId, userId, mode, results);
    }

    return results;
  }

  async importEntry(entry, projectId, userId, mode, results) {
    try {
      const request = entry.request;
      const response = entry.response;

      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method.toUpperCase();

      const existing = await Interface.findOne({
        project_id: projectId,
        path,
        method,
      });

      if (existing && mode === 'normal') {
        results.skipped++;
        return;
      }

      const query = (request.queryString || []).map((q) => ({
        name: q.name,
        type: 'string',
        required: false,
        default: q.value || '',
        desc: '',
      }));

      const headers = (request.headers || []).map((h) => ({
        name: h.name,
        value: h.value,
        required: false,
        desc: '',
      }));

      let reqBody = '';
      let reqBodyType = 'json';
      if (request.postData) {
        reqBody = request.postData.text || '';
        const mimeType = request.postData.mimeType || '';
        if (mimeType.includes('json')) {
          reqBodyType = 'json';
        } else if (mimeType.includes('form')) {
          reqBodyType = 'form';
        }
      }

      let resBody = '{}';
      if (response.content && response.content.text) {
        try {
          const content = JSON.parse(response.content.text);
          resBody = JSON.stringify(content, null, 2);
        } catch {
          resBody = response.content.text;
        }
      }

      const interfaceData = {
        project_id: projectId,
        catid: null,
        title: `${method} ${path}`,
        path,
        method,
        req_query: query,
        req_headers: headers,
        req_body_type: reqBodyType,
        req_body: reqBody,
        res_body: resBody,
        res_body_type: 'json',
        status: 'developing',
        desc: '',
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
      logger.error({ error, entry }, 'Import HAR entry error');
      results.errors.push({ error: error.message });
    }
  }
}


