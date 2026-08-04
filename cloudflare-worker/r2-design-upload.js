const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const headers = { ...CORS, 'Content-Type': 'application/json' };

    try {
      if (request.method === 'POST' && (url.pathname === '/upload' || url.pathname === '/')) {
        const form = await request.formData();
        const file = form.get('file');
        const path = String(form.get('path') || '').trim();
        if (!(file instanceof File) || !path) {
          return Response.json({ error: 'file and path required' }, { status: 400, headers });
        }
        await env.BUCKET.put(path, file.stream(), {
          httpMetadata: { contentType: file.type || 'application/octet-stream' },
        });
        const base = (env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
        const publicUrl = base ? base + '/' + path : '';
        return Response.json({ url: publicUrl, storagePath: path, provider: 'r2' }, { headers });
      }

      if (request.method === 'DELETE') {
        const path = url.searchParams.get('path');
        if (!path) {
          return Response.json({ error: 'path required' }, { status: 400, headers });
        }
        await env.BUCKET.delete(path);
        return Response.json({ ok: true }, { headers });
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers });
    } catch (e) {
      return Response.json({ error: e.message || String(e) }, { status: 500, headers });
    }
  },
};
