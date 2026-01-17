import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import router from './api/routes/index.js';

const app = express();

app.use(cors());
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// HTML Landing Page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HYAPI | Hyperliquid Analytics</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; margin: 0; }
        .container { text-align: center; background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #1a1a1a; margin-bottom: 1rem; }
        p { color: #666; margin-bottom: 2rem; }
        .btn { display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; transition: background-color 0.2s; }
        .btn:hover { background-color: #0051a2; }
        .links { margin-top: 1.5rem; font-size: 0.9rem; }
        .links a { color: #666; text-decoration: none; margin: 0 10px; }
        .links a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>HYAPI</h1>
        <p>Advanced analytics and leaderboard services for Hyperliquid.</p>
        <a href="/api" class="btn">Go to API Root</a>
        <div class="links">
          <a href="/api-docs">Documentation</a>
          <a href="/v1/leaderboard?metric=pnl">Leaderboard Preview</a>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.use('/v1', router);
app.use('/api', router); // Alias for /v1 to satisfy user request

export default app;
