import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('text/html')) {
    return response;
  }

  const html = await response.text();
  const updatedHtml = html.replace(
    'human potential.</h1>',
    'human potential!</h1>',
  );

  return new Response(updatedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
});
