export class JSONExporter {
  async export(interfaces, options = {}) {
    const { project, publicOnly = false } = options;

    const data = {
      project: {
        name: project.project_name,
        desc: project.project_desc,
        basepath: project.basepath,
      },
      interfaces: interfaces
        .filter((i) => !publicOnly || i.tag?.includes('public'))
        .map((i) => ({
          title: i.title,
          path: i.path,
          method: i.method,
          req_query: i.req_query || [],
          req_headers: i.req_headers || [],
          req_body_type: i.req_body_type,
          req_body: i.req_body,
          res_body: i.res_body,
          res_body_type: i.res_body_type,
          status: i.status,
          desc: i.desc,
          tag: i.tag || [],
          catid: i.catid?.name || null,
        })),
    };

    return JSON.stringify(data, null, 2);
  }
}

