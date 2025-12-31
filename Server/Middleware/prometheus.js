import client from 'prom-client';

client.collectDefaultMetrics({
  prefix: 'apiadmin_',
});

export const httpRequestDuration = new client.Histogram({
  name: 'apiadmin_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new client.Counter({
  name: 'apiadmin_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestSize = new client.Histogram({
  name: 'apiadmin_http_request_size_bytes',
  help: 'HTTP request size in bytes',
  labelNames: ['method', 'route'],
});

export const httpResponseSize = new client.Histogram({
  name: 'apiadmin_http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route'],
});

export const databaseOperationDuration = new client.Histogram({
  name: 'apiadmin_database_operation_duration_seconds',
  help: 'Database operation duration in seconds',
  labelNames: ['operation', 'collection'],
});

export const prometheusMiddleware = async (ctx, next) => {
  const start = Date.now();
  const route = ctx._matchedRoute || ctx.path;

  try {
    await next();

    const duration = (Date.now() - start) / 1000;
    const status = ctx.status;

    httpRequestDuration.observe(
      { method: ctx.method, route, status },
      duration
    );
    httpRequestTotal.inc({ method: ctx.method, route, status });

    if (ctx.request.length) {
      httpRequestSize.observe(
        { method: ctx.method, route },
        ctx.request.length
      );
    }

    if (ctx.response.length) {
      httpResponseSize.observe(
        { method: ctx.method, route },
        ctx.response.length
      );
    }
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    const status = ctx.status || 500;

    httpRequestDuration.observe(
      { method: ctx.method, route, status },
      duration
    );
    httpRequestTotal.inc({ method: ctx.method, route, status });

    throw error;
  }
};


