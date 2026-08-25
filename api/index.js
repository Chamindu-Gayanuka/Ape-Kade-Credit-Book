let app;
let connectDB;

async function ensure() {
  if (!app) {
    const mApp = await import('../server/dist/app.js');
    app = mApp.default || mApp;
    const mDb = await import('../server/dist/config/db.js');
    connectDB = mDb.connectDB || mDb.default?.connectDB;
  }
}

export default async function handler(req, res) {
  try {
    await ensure();
    if (typeof connectDB === 'function') await connectDB();
    // Express app can handle the request directly
    return app(req, res);
  } catch (err) {
    console.error('Serverless handler error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({message: 'Internal server error'}));
  }
}
