class CodeGeneratorService {
  constructor() {
    this.generators = {
      curl: this.generateCurl.bind(this),
      javascript: this.generateJavaScript.bind(this),
      python: this.generatePython.bind(this),
      java: this.generateJava.bind(this),
      go: this.generateGo.bind(this),
      php: this.generatePhp.bind(this),
      ruby: this.generateRuby.bind(this),
      swift: this.generateSwift.bind(this)
    };
  }

  generate(interfaceData, options = {}) {
    const {
      language = 'javascript',
      environment = null,
      includeComments = true
    } = options;

    const generator = this.generators[language];
    if (!generator) {
      throw new Error(`Unsupported language: ${language}`);
    }

    return generator(interfaceData, { environment, includeComments });
  }

  generateCurl(interfaceData, options) {
    const { method, path, basePath = '', query = [], headers = [], body = null } = interfaceData;
    const { environment } = options;
    
    const url = this.buildUrl(basePath, path, query, environment);
    let curl = `curl -X ${method.toUpperCase()} '${url}'`;
    
    headers.forEach(header => {
      if (header.name && header.value) {
        curl += ` \\\n  -H '${header.name}: ${header.value}'`;
      }
    });
    
    if (body && body.type === 'json' && body.content) {
      curl += ` \\\n  -H 'Content-Type: application/json'`;
      curl += ` \\\n  -d '${JSON.stringify(body.content)}'`;
    } else if (body && body.type === 'form' && body.content) {
      const formData = Object.entries(body.content)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      curl += ` \\\n  -H 'Content-Type: application/x-www-form-urlencoded'`;
      curl += ` \\\n  -d '${formData}'`;
    }
    
    return curl;
  }

  generateJavaScript(interfaceData, options) {
    const { method, path, basePath = '', query = [], headers = [], body = null } = interfaceData;
    const { environment, includeComments } = options;
    
    const url = this.buildUrl(basePath, path, query, environment);
    let code = '';
    
    if (includeComments) {
      code += `// ${interfaceData.name || 'API Request'}\n`;
      if (interfaceData.desc) {
        code += `// ${interfaceData.desc}\n`;
      }
      code += '\n';
    }
    
    code += `const url = '${url}';\n\n`;
    
    const headerObj = this.buildHeaders(headers);
    if (Object.keys(headerObj).length > 0) {
      code += `const headers = ${JSON.stringify(headerObj, null, 2)};\n\n`;
    }
    
    if (body && body.type === 'json' && body.content) {
      code += `const body = ${JSON.stringify(body.content, null, 2)};\n\n`;
    } else if (body && body.type === 'form' && body.content) {
      code += `const body = ${JSON.stringify(body.content, null, 2)};\n\n`;
    }
    
    code += `fetch(url, {\n`;
    code += `  method: '${method.toUpperCase()}'`;
    
    if (Object.keys(headerObj).length > 0) {
      code += `,\n  headers: headers`;
    }
    
    if (body) {
      code += `,\n  body: ${body.type === 'json' ? 'JSON.stringify(body)' : 'new URLSearchParams(body)'}`;
    }
    
    code += `\n})\n`;
    code += `  .then(response => response.json())\n`;
    code += `  .then(data => console.log(data))\n`;
    code += `  .catch(error => console.error('Error:', error));`;
    
    return code;
  }

  generatePython(interfaceData, options) {
    const { method, path, basePath = '', query = [], headers = [], body = null } = interfaceData;
    const { environment, includeComments } = options;
    
    const url = this.buildUrl(basePath, path, query, environment);
    let code = '';
    
    if (includeComments) {
      code += `# ${interfaceData.name || 'API Request'}\n`;
      if (interfaceData.desc) {
        code += `# ${interfaceData.desc}\n`;
      }
      code += '\n';
    }
    
    code += `import requests\n\n`;
    code += `url = '${url}'\n\n`;
    
    const headerObj = this.buildHeaders(headers);
    if (Object.keys(headerObj).length > 0) {
      code += `headers = ${this.pythonDict(headerObj)}\n\n`;
    }
    
    if (body && body.type === 'json' && body.content) {
      code += `data = ${this.pythonDict(body.content)}\n\n`;
    } else if (body && body.type === 'form' && body.content) {
      code += `data = ${this.pythonDict(body.content)}\n\n`;
    }
    
    code += `response = requests.${method.toLowerCase()}(`;
    code += `url`;
    
    if (Object.keys(headerObj).length > 0) {
      code += `, headers=headers`;
    }
    
    if (body) {
      if (body.type === 'json') {
        code += `, json=data`;
      } else {
        code += `, data=data`;
      }
    }
    
    code += `)\n`;
    code += `print(response.json())`;
    
    return code;
  }

  generateJava(interfaceData, options) {
    const { method, path, basePath = '', query = [], headers = [], body = null } = interfaceData;
    const { environment, includeComments } = options;
    
    const url = this.buildUrl(basePath, path, query, environment);
    let code = '';
    
    if (includeComments) {
      code += `// ${interfaceData.name || 'API Request'}\n`;
      if (interfaceData.desc) {
        code += `// ${interfaceData.desc}\n`;
      }
      code += '\n';
    }
    
    code += `import java.net.http.HttpClient;\n`;
    code += `import java.net.http.HttpRequest;\n`;
    code += `import java.net.http.HttpResponse;\n`;
    code += `import java.net.URI;\n`;
    code += `import java.net.http.HttpRequest.BodyPublishers;\n`;
    code += `import java.net.http.HttpRequest.BodyHandlers;\n\n`;
    
    code += `HttpClient client = HttpClient.newHttpClient();\n`;
    code += `URI uri = URI.create("${url}");\n\n`;
    
    const headerObj = this.buildHeaders(headers);
    let requestBuilder = `HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()\n`;
    requestBuilder += `  .uri(uri)\n`;
    requestBuilder += `  .${method.toUpperCase()}(`;
    
    if (body && body.type === 'json' && body.content) {
      requestBuilder += `BodyPublishers.ofString("${JSON.stringify(body.content).replace(/"/g, '\\"')}")`;
    } else {
      requestBuilder += `BodyPublishers.noBody()`;
    }
    requestBuilder += `);\n\n`;
    
    code += requestBuilder;
    
    if (Object.keys(headerObj).length > 0) {
      Object.entries(headerObj).forEach(([key, value]) => {
        code += `requestBuilder.header("${key}", "${value}");\n`;
      });
      code += '\n';
    }
    
    code += `HttpRequest request = requestBuilder.build();\n`;
    code += `HttpResponse<String> response = client.send(request, BodyHandlers.ofString());\n`;
    code += `System.out.println(response.body());`;
    
    return code;
  }

  generateGo(interfaceData, options) {
    const { method, path, basePath = '', query = [], headers = [], body = null } = interfaceData;
    const { environment, includeComments } = options;
    
    const url = this.buildUrl(basePath, path, query, environment);
    let code = '';
    
    if (includeComments) {
      code += `// ${interfaceData.name || 'API Request'}\n`;
      if (interfaceData.desc) {
        code += `// ${interfaceData.desc}\n`;
      }
      code += '\n';
    }
    
    code += `package main\n\n`;
    code += `import (\n`;
    code += `  "bytes"\n`;
    code += `  "encoding/json"\n`;
    code += `  "fmt"\n`;
    code += `  "net/http"\n`;
    code += `)\n\n`;
    
    code += `func main() {\n`;
    code += `  url := "${url}"\n\n`;
    
    if (body && body.type === 'json' && body.content) {
      code += `  jsonData, _ := json.Marshal(${this.goStruct(body.content)})\n`;
      code += `  req, _ := http.NewRequest("${method.toUpperCase()}", url, bytes.NewBuffer(jsonData))\n`;
      code += `  req.Header.Set("Content-Type", "application/json")\n`;
    } else {
      code += `  req, _ := http.NewRequest("${method.toUpperCase()}", url, nil)\n`;
    }
    
    const headerObj = this.buildHeaders(headers);
    Object.entries(headerObj).forEach(([key, value]) => {
      code += `  req.Header.Set("${key}", "${value}")\n`;
    });
    
    code += `\n  client := &http.Client{}\n`;
    code += `  resp, err := client.Do(req)\n`;
    code += `  if err != nil {\n`;
    code += `    panic(err)\n`;
    code += `  }\n`;
    code += `  defer resp.Body.Close()\n\n`;
    code += `  var result map[string]interface{}\n`;
    code += `  json.NewDecoder(resp.Body).Decode(&result)\n`;
    code += `  fmt.Println(result)\n`;
    code += `}`;
    
    return code;
  }

  generatePhp(interfaceData, options) {
    const { method, path, basePath = '', query = [], headers = [], body = null } = interfaceData;
    const { environment, includeComments } = options;
    
    const url = this.buildUrl(basePath, path, query, environment);
    let code = '';
    
    if (includeComments) {
      code += `<?php\n`;
      code += `// ${interfaceData.name || 'API Request'}\n`;
      if (interfaceData.desc) {
        code += `// ${interfaceData.desc}\n`;
      }
      code += '\n';
    } else {
      code += `<?php\n\n`;
    }
    
    code += `$url = '${url}';\n\n`;
    
    const headerObj = this.buildHeaders(headers);
    if (Object.keys(headerObj).length > 0 || body) {
      code += `$ch = curl_init($url);\n\n`;
      
      if (Object.keys(headerObj).length > 0) {
        code += `$headers = array(\n`;
        Object.entries(headerObj).forEach(([key, value]) => {
          code += `  '${key}: ${value}',\n`;
        });
        code += `);\n`;
        code += `curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);\n\n`;
      }
      
      if (body && body.type === 'json' && body.content) {
        code += `$data = json_encode(${this.phpArray(body.content)});\n`;
        code += `curl_setopt($ch, CURLOPT_POSTFIELDS, $data);\n\n`;
      }
      
      code += `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${method.toUpperCase()}');\n`;
      code += `curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n\n`;
      code += `$response = curl_exec($ch);\n`;
      code += `curl_close($ch);\n\n`;
      code += `$result = json_decode($response, true);\n`;
      code += `print_r($result);\n`;
    } else {
      code += `$response = file_get_contents($url);\n`;
      code += `$result = json_decode($response, true);\n`;
      code += `print_r($result);\n`;
    }
    
    return code;
  }

  generateRuby(interfaceData, options) {
    const { method, path, basePath = '', query = [], headers = [], body = null } = interfaceData;
    const { environment, includeComments } = options;
    
    const url = this.buildUrl(basePath, path, query, environment);
    let code = '';
    
    if (includeComments) {
      code += `# ${interfaceData.name || 'API Request'}\n`;
      if (interfaceData.desc) {
        code += `# ${interfaceData.desc}\n`;
      }
      code += '\n';
    }
    
    code += `require 'net/http'\n`;
    code += `require 'json'\n`;
    code += `require 'uri'\n\n`;
    
    code += `uri = URI('${url}')\n\n`;
    
    const headerObj = this.buildHeaders(headers);
    if (method.toUpperCase() === 'GET') {
      code += `http = Net::HTTP.new(uri.host, uri.port)\n`;
      code += `http.use_ssl = true if uri.scheme == 'https'\n\n`;
      code += `request = Net::HTTP::Get.new(uri)\n`;
    } else {
      code += `http = Net::HTTP.new(uri.host, uri.port)\n`;
      code += `http.use_ssl = true if uri.scheme == 'https'\n\n`;
      code += `request = Net::HTTP::${method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()}.new(uri)\n`;
    }
    
    if (Object.keys(headerObj).length > 0) {
      Object.entries(headerObj).forEach(([key, value]) => {
        code += `request['${key}'] = '${value}'\n`;
      });
    }
    
    if (body && body.type === 'json' && body.content) {
      code += `request.body = ${JSON.stringify(body.content)}.to_json\n`;
      code += `request['Content-Type'] = 'application/json'\n`;
    }
    
    code += `\nresponse = http.request(request)\n`;
    code += `puts JSON.parse(response.body)`;
    
    return code;
  }

  generateSwift(interfaceData, options) {
    const { method, path, basePath = '', query = [], headers = [], body = null } = interfaceData;
    const { environment, includeComments } = options;
    
    const url = this.buildUrl(basePath, path, query, environment);
    let code = '';
    
    if (includeComments) {
      code += `// ${interfaceData.name || 'API Request'}\n`;
      if (interfaceData.desc) {
        code += `// ${interfaceData.desc}\n`;
      }
      code += '\n';
    }
    
    code += `import Foundation\n\n`;
    code += `let url = URL(string: "${url}")!\n`;
    code += `var request = URLRequest(url: url)\n`;
    code += `request.httpMethod = "${method.toUpperCase()}"\n\n`;
    
    const headerObj = this.buildHeaders(headers);
    Object.entries(headerObj).forEach(([key, value]) => {
      code += `request.setValue("${value}", forHTTPHeaderField: "${key}")\n`;
    });
    
    if (body && body.type === 'json' && body.content) {
      code += `let jsonData = try? JSONSerialization.data(withJSONObject: ${this.swiftDict(body.content)})\n`;
      code += `request.httpBody = jsonData\n`;
      code += `request.setValue("application/json", forHTTPHeaderField: "Content-Type")\n`;
    }
    
    code += `\nlet task = URLSession.shared.dataTask(with: request) { data, response, error in\n`;
    code += `  if let data = data {\n`;
    code += `    let json = try? JSONSerialization.jsonObject(with: data, options: [])\n`;
    code += `    print(json ?? "No data")\n`;
    code += `  }\n`;
    code += `}\n`;
    code += `task.resume()`;
    
    return code;
  }

  buildUrl(basePath, path, query, environment) {
    let url = basePath + path;
    
    if (environment && environment.baseUrl) {
      url = environment.baseUrl + path;
    }
    
    if (query && query.length > 0) {
      const queryString = query
        .filter(q => q.name && q.value)
        .map(q => `${q.name}=${encodeURIComponent(q.value)}`)
        .join('&');
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    
    return url;
  }

  buildHeaders(headers) {
    const headerObj = {};
    headers.forEach(header => {
      if (header.name && header.value) {
        headerObj[header.name] = header.value;
      }
    });
    return headerObj;
  }

  pythonDict(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return JSON.stringify(obj);
    }
    const entries = Object.entries(obj)
      .map(([key, value]) => `'${key}': ${typeof value === 'string' ? `'${value}'` : JSON.stringify(value)}`)
      .join(', ');
    return `{${entries}}`;
  }

  phpArray(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return JSON.stringify(obj);
    }
    const entries = Object.entries(obj)
      .map(([key, value]) => `'${key}' => ${typeof value === 'string' ? `'${value}'` : JSON.stringify(value)}`)
      .join(', ');
    return `[${entries}]`;
  }

  goStruct(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return JSON.stringify(obj);
    }
    const entries = Object.entries(obj)
      .map(([key, value]) => `"${key}": ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`)
      .join(', ');
    return `map[string]interface{}{${entries}}`;
  }

  swiftDict(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return JSON.stringify(obj);
    }
    const entries = Object.entries(obj)
      .map(([key, value]) => `"${key}": ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`)
      .join(', ');
    return `[${entries}]`;
  }
}

export default CodeGeneratorService;

