export class MarkdownExporter {
  async export(interfaces, options = {}) {
    const { project, publicOnly = false } = options;

    let markdown = `# ${project.project_name}\n\n`;
    if (project.project_desc) {
      markdown += `${project.project_desc}\n\n`;
    }
    markdown += `---\n\n`;

    interfaces
      .filter((i) => !publicOnly || i.tag?.includes('public'))
      .forEach((interfaceData) => {
        markdown += `## ${interfaceData.method} ${interfaceData.path}\n\n`;
        markdown += `**${interfaceData.title}**\n\n`;
        if (interfaceData.desc) {
          markdown += `${interfaceData.desc}\n\n`;
        }

        if (interfaceData.req_query && interfaceData.req_query.length > 0) {
          markdown += `### Query Parameters\n\n`;
          markdown += `| Name | Type | Required | Description |\n`;
          markdown += `|------|------|----------|-------------|\n`;
          interfaceData.req_query.forEach((q) => {
            markdown += `| ${q.name} | ${q.type} | ${q.required ? 'Yes' : 'No'} | ${q.desc || ''} |\n`;
          });
          markdown += `\n`;
        }

        if (interfaceData.req_body) {
          markdown += `### Request Body\n\n`;
          markdown += `\`\`\`json\n${interfaceData.req_body}\n\`\`\`\n\n`;
        }

        if (interfaceData.res_body) {
          markdown += `### Response\n\n`;
          markdown += `\`\`\`json\n${interfaceData.res_body}\n\`\`\`\n\n`;
        }

        markdown += `---\n\n`;
      });

    return markdown;
  }
}


