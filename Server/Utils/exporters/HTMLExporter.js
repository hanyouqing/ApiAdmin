export class HTMLExporter {
  async export(interfaces, options = {}) {
    const { project, publicOnly = false } = options;

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${project.project_name} - API Documentation</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    code { background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${project.project_name}</h1>
  ${project.project_desc ? `<p>${project.project_desc}</p>` : ''}
  <hr>
`;

    interfaces
      .filter((i) => !publicOnly || i.tag?.includes('public'))
      .forEach((interfaceData) => {
        html += `  <h2>${interfaceData.method} ${interfaceData.path}</h2>\n`;
        html += `  <p><strong>${interfaceData.title}</strong></p>\n`;
        if (interfaceData.desc) {
          html += `  <p>${interfaceData.desc}</p>\n`;
        }

        if (interfaceData.req_query && interfaceData.req_query.length > 0) {
          html += `  <h3>Query Parameters</h3>\n`;
          html += `  <table>\n`;
          html += `    <tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr>\n`;
          interfaceData.req_query.forEach((q) => {
            html += `    <tr><td>${q.name}</td><td>${q.type}</td><td>${q.required ? 'Yes' : 'No'}</td><td>${q.desc || ''}</td></tr>\n`;
          });
          html += `  </table>\n`;
        }

        if (interfaceData.req_body) {
          html += `  <h3>Request Body</h3>\n`;
          html += `  <pre><code>${this.escapeHtml(interfaceData.req_body)}</code></pre>\n`;
        }

        if (interfaceData.res_body) {
          html += `  <h3>Response</h3>\n`;
          html += `  <pre><code>${this.escapeHtml(interfaceData.res_body)}</code></pre>\n`;
        }

        html += `  <hr>\n`;
      });

    html += `</body>
</html>`;

    return html;
  }

  escapeHtml(text) {
    if (typeof text !== 'string') {
      text = String(text);
    }
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
      '/': '&#x2F;',
    };
    return text.replace(/[&<>"'/]/g, (m) => map[m]);
  }
}

