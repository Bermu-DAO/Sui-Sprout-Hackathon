import { NextRequest } from "next/server";

const API_PROXY_TARGET = process.env.COHORTVAULT_API_PROXY_TARGET?.replace(/\/$/, "");
const HOP_BY_HOP_HEADERS = new Set([
  "accept-encoding",
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function buildTargetUrl(path: string[], request: NextRequest) {
  if (!API_PROXY_TARGET) {
    throw new Error("COHORTVAULT_API_PROXY_TARGET is not configured.");
  }

  const url = new URL(`${API_PROXY_TARGET}/${path.join("/")}`);
  url.search = request.nextUrl.search;
  return url;
}

function filterRequestHeaders(request: NextRequest) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

function filterResponseHeaders(source: Headers) {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;

  try {
    const targetUrl = buildTargetUrl(path, request);
    const requestBody =
      request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: filterRequestHeaders(request),
      body: requestBody,
      redirect: "manual",
      cache: "no-store",
    });

    const payload = request.method === "HEAD" ? null : await response.arrayBuffer();

    return new Response(payload, {
      status: response.status,
      statusText: response.statusText,
      headers: filterResponseHeaders(response.headers),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proxy error";
    return Response.json({ detail: `Backend proxy failed: ${message}` }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
