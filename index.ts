const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Default to admin.html for root
    if (path === '/') {
      path = '/admin.html';
    }

    const file = Bun.file(`./public${path}`);

    // Check if file exists
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);