import { Router } from '@tsndr/cloudflare-worker-router';
import google from 'googleapis';

export interface Env {
  HAND_IN_HAND_STORAGE: KVNamespace;
  GOOGLE_SHEET_ID: string;
  GOOGLE_API_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Headers': 'Content-Type',
};

//const baseUrlStudioResources = 'http://localhost:8082/api';

// Request Extension
export type ExtReq = {
  userId?: number;
};

// Context Extension
export type ExtCtx = {
  //sentry?: Toucan
};

export type SessionContext = {
  openAIEphermalUserId: string;
  openAIConversationId: string;
  openAIGPTId: string;
  realIP: string;
  datadogTraceId: string;
  dataDogParentId: string;
  userAgent: string;
  datadogSampingPriority: string;
  forwardedProto: string;
  traceparent: string;
  tracestate: string;
};

const router = new Router<Env, ExtCtx, ExtReq>();

// Enabling build in CORS support
router.cors();

router.get('/health', async ({ req }) => {
  const body = JSON.stringify({
    ok: true,
  });
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': body.length.toString(),
    },
  });
});

type GSheetResponse = {
  range: string;
  majorDimension: string;
  values: string[][];
};

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]; // Eine Kopie des ursprünglichen Arrays erstellen
  for (let i = newArray.length - 1; i > 0; i--) {
    // Zufälligen Index zwischen 0 und i (einschließlich) auswählen
    const j = Math.floor(Math.random() * (i + 1));
    // Die Elemente an den Indizes i und j tauschen
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

router.get('/supporters', async ({ req, env }) => {
  const limit = req.query.limit ? Number(req.query.limit) : 1000;
  if (typeof limit !== 'number' || isNaN(limit)) {
    return new Response(
      JSON.stringify({
        error: 'limit must be a number',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/A1:A${limit}?key=${env.GOOGLE_API_KEY}`);
  const result = (await response.json()) as GSheetResponse;

  const body = JSON.stringify({
    ok: true,
    supporters: result.values.map((row) => {
      return row[0];
    }),
  });
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': body.length.toString(),
    },
  });
});

router.get('/ppDownloadsCount', async ({ req, env }) => {
  const count = await env.HAND_IN_HAND_STORAGE.get('ppDownloadsCount', 'text');
  const body = JSON.stringify({
    ok: true,
    count: Number(count) || 0,
  });
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': body.length.toString(),
    },
  });
});
router.put('/ppDownloadsCount', async ({ req, env }) => {
  const count = await env.HAND_IN_HAND_STORAGE.get('ppDownloadsCount', 'text');
  const newCount = Number(count) + 1;
  await env.HAND_IN_HAND_STORAGE.put('ppDownloadsCount', newCount.toString());
  const body = JSON.stringify({
    ok: true,
    count: newCount,
  });
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': body.length.toString(),
    },
  });
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(request, env, ctx);
  },
};
