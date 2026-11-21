export async function onRequestGet({ env, params }) {
  if (!env.AEROBOY_MEDIA) return new Response('Armazenamento não configurado.', { status: 503 });
  const path = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if (!path || path.includes('..')) return new Response('Arquivo inválido.', { status: 400 });
  const object = await env.AEROBOY_MEDIA.get(path);
  if (!object) return new Response('Imagem não encontrada.', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
}
