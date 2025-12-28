import axios from 'axios';

const API_BASE = '/api/plugin/code-generator';

export interface GenerateCodeParams {
  interfaceData: any;
  language?: string;
  environment?: any;
  includeComments?: boolean;
}

export interface GenerateCodeResponse {
  success: boolean;
  data?: {
    code: string;
    language: string;
  };
  message?: string;
}

export async function generateCode(
  params: GenerateCodeParams
): Promise<GenerateCodeResponse> {
  const response = await axios.post(`${API_BASE}/generate`, params);
  return response.data;
}

