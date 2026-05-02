import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

serve(
  {
    fetch: app.fetch,
    port: parseInt(process.env.HONO_PORT ?? '4100'),
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
