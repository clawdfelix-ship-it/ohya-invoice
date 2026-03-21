import { NextApiResponse } from 'next';

type ApiResponse = NextApiResponse & {
  jsonUtf8: (data: unknown) => NextApiResponse;
};

export function jsonUtf8<T>(res: NextApiResponse, data: T): NextApiResponse {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(data));
}

export function jsonError(res: NextApiResponse, status: number, message: string): NextApiResponse {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).end(JSON.stringify({ error: message }));
}
