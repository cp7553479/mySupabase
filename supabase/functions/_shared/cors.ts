// CORS 工具模块
// 提供可重用的 CORS 头部和响应工具

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// 通用JSON响应
export function jsonResponse(body: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Connection": "keep-alive",
      ...corsHeaders,
      ...init.headers,
    },
    ...init
  });
}

// CORS 预检请求处理
export function corsResponse() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}