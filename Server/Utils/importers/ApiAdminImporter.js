import { logger } from '../logger.js';
import Interface from '../../Models/Interface.js';
import InterfaceCat from '../../Models/InterfaceCat.js';
import Project from '../../Models/Project.js';

export class ApiAdminImporter {
  async import(data, options = {}) {
    const { projectId, userId, mode = 'normal' } = options;
    const importData = typeof data === 'string' ? JSON.parse(data) : data;

    if (!importData.interfaces) {
      throw new Error('Invalid ApiAdmin JSON format');
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    const catMap = new Map();

    for (const interfaceData of importData.interfaces) {
      try {
        let catId = null;
        if (interfaceData.catid) {
          if (!catMap.has(interfaceData.catid)) {
            const cat = await InterfaceCat.findOne({
              project_id: projectId,
              name: interfaceData.catid,
            });
            if (cat) {
              catMap.set(interfaceData.catid, cat._id);
              catId = cat._id;
            }
          } else {
            catId = catMap.get(interfaceData.catid);
          }
        }

        const existing = await Interface.findOne({
          project_id: projectId,
          path: interfaceData.path,
          method: interfaceData.method,
          catid: catId,
        });

        if (existing && mode === 'normal') {
          results.skipped++;
          continue;
        }

        const newInterfaceData = {
          project_id: projectId,
          catid: catId,
          title: interfaceData.title,
          path: interfaceData.path,
          method: interfaceData.method,
          req_query: interfaceData.req_query || [],
          req_headers: interfaceData.req_headers || [],
          req_body_type: interfaceData.req_body_type || 'json',
          req_body: interfaceData.req_body || '',
          res_body: interfaceData.res_body || '{}',
          res_body_type: interfaceData.res_body_type || 'json',
          status: interfaceData.status || 'developing',
          desc: interfaceData.desc || '',
          tag: interfaceData.tag || [],
          uid: userId,
        };

        if (existing && mode === 'merge') {
          Object.assign(existing, newInterfaceData);
          await existing.save();
          results.imported++;
        } else {
          if (existing && mode === 'overwrite') {
            await existing.deleteOne();
          }
          const newInterface = new Interface(newInterfaceData);
          await newInterface.save();
          results.imported++;
        }
      } catch (error) {
        logger.error({ error, interface: interfaceData.title }, 'Import interface error');
        results.errors.push({ name: interfaceData.title, error: error.message });
      }
    }

    return results;
  }
}

