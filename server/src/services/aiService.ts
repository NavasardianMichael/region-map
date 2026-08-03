import { GoogleGenAI } from '@google/genai';
import { BADGE_DETAILS, ErrorCode, HttpStatus } from '@regionify/shared';

import { env, isDev } from '@/config/env.js';
import { redis } from '@/lib/redis.js';
import { AppError } from '@/middleware/errorHandler.js';
import { userRepository } from '@/repositories/userRepository.js';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_AI_PARSE_INPUT_CHARS = 50_000;
export const AI_PARSE_MAX_TOKENS = 16384;

// Sentinel value surfaced to clients in dev to indicate the daily cap is disabled.
const UNLIMITED_REMAINING = 9999;

// ─── Types ────────────────────────────────────────────────────────────────────

export type AiStreamEvent =
  | { type: 'remaining'; count: number }
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

// ─── Redis helpers ────────────────────────────────────────────────────────────

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function aiParseKey(userId: string): string {
  return `ai_parse:${userId}:${todayUtc()}`;
}

async function getAiParseCount(userId: string): Promise<number> {
  const val = await redis.get(aiParseKey(userId));
  return val ? Number(val) : 0;
}

async function incrementAiParseCount(userId: string): Promise<number> {
  const key = aiParseKey(userId);
  const count = await redis.incr(key);
  if (count === 1) {
    // First use today — set TTL so the key auto-expires after 24 h
    await redis.expire(key, 86400);
  }
  return count;
}

/** Looks up the caller's current daily AI request cap from their badge tier. 0 if the user no longer exists. */
async function getAiDailyLimit(userId: string): Promise<number> {
  const user = await userRepository.findById(userId);
  return user ? BADGE_DETAILS[user.badge].limits.aiParseRequestsPerDay : 0;
}

export async function getAiParseRemaining(userId: string): Promise<number> {
  if (isDev) return UNLIMITED_REMAINING;
  const [count, maxPerDay] = await Promise.all([getAiParseCount(userId), getAiDailyLimit(userId)]);
  return Math.max(0, maxPerDay - count);
}

// ─── System prompts ───────────────────────────────────────────────────────────

function buildRegionBlock(mapRegionIds: string[]): string {
  if (mapRegionIds.length === 0) return '';
  return `The target map has the following valid region IDs:\n<region_ids>\n${mapRegionIds.join('\n')}\n</region_ids>\n\n`;
}

function buildIdRule(mapRegionIds: string[]): string {
  return mapRegionIds.length > 0
    ? `- id: MUST be one of the valid region IDs listed above. Match each data point to the closest valid region ID using the region name, code, or any other contextual hint. This includes recognizing alternate names, local-language names, historical names, or common exonyms for the same region (e.g. input "Tuscany" should resolve to the valid ID for "Toscana" if that is how it appears in the list above) — the id must always be the canonical valid ID, never the raw input spelling. Omit rows you cannot confidently match.`
    : '- id: ISO region code (e.g. US-TX, DE, FR). Infer from region names when possible.';
}

function buildParserSystemPrompt(mapRegionIds: string[]): string {
  return `You are a data transformation tool. Convert the user's input into tab-delimited regional data.

${buildRegionBlock(mapRegionIds)}Output format (columns separated by a single tab character):
  Static data:   id<TAB>label<TAB>value
  Time-series:   id<TAB>label<TAB>value<TAB>time

Rules:
- Output ONLY the tab-delimited data. No explanations, no markdown, no code fences.
- Either first line is the header row (id, label, value; add time only if data has a time dimension) or you should guess yourself and return with that header row with those columns.
${buildIdRule(mapRegionIds)}
- label: human-readable region name as provided in the input (or inferred if not given).
- value: numeric (integer or decimal). Omit rows with no parseable numeric value.
- time: year or period label. Include only for time-series data.
- If the user input is incomplete or ambiguous, prefer omitting rows over fabricating values.`;
}

function buildCountryBlock(countryName?: string): string {
  if (!countryName) return '';
  return `The map represents subdivisions of <country>${countryName}</country>. The valid region IDs listed below are the subdivisions of this country.

`;
}

function buildCountryDefaultRule(countryName?: string): string {
  if (!countryName) {
    return '- If the user prompt does not specify a geographic context, generate data for the regions listed above.';
  }
  return `- If the user prompt does not specify a country or area, default to ${countryName} and generate data for its subdivisions listed above. If the user explicitly references a different country/area, follow the user's request and ignore this default.`;
}

function buildGeneratorSystemPrompt(mapRegionIds: string[], countryName?: string): string {
  return `You are a data generator for regional choropleth maps. Given a free-form user prompt describing what to produce (e.g. "population by region in 2023"), output a realistic, plausible dataset in tab-delimited regional format.

${buildCountryBlock(countryName)}${buildRegionBlock(mapRegionIds)}Output format (columns separated by a single tab character):
  Static data:   id<TAB>label<TAB>value
  Time-series:   id<TAB>label<TAB>value<TAB>time

Rules:
- Output ONLY the tab-delimited data. No explanations, no markdown, no code fences.
- First line is always the header row (id, label, value; add time only when the prompt asks for multiple periods or a time series).
${buildIdRule(mapRegionIds)}
- label: human-readable region name.
- value: realistic numeric estimate (integer or decimal) consistent with the prompt's domain. Use coherent units across the dataset.
- time: include only when the prompt requests a time dimension. Use plain year or period labels (e.g. 2020).
- Cover all relevant regions implied by the prompt; if the prompt is broad (e.g. "all regions"), include every region ID listed above.
${buildCountryDefaultRule(countryName)}
- Prefer realistic, well-known approximate values over arbitrary numbers. Round to a sensible precision for the domain.`;
}

// ─── Internal: rate-limit + Gemini stream ─────────────────────────────────────

async function* checkAiQuota(userId: string): AsyncGenerator<AiStreamEvent> {
  if (isDev) {
    yield { type: 'remaining', count: UNLIMITED_REMAINING };
    return;
  }
  const maxPerDay = await getAiDailyLimit(userId);
  const count = await incrementAiParseCount(userId);
  if (count > maxPerDay) {
    throw new AppError(
      HttpStatus.TOO_MANY_REQUESTS,
      ErrorCode.RATE_LIMITED,
      `Daily AI request limit of ${maxPerDay} reached. Resets in 24 hours.`,
    );
  }
  yield { type: 'remaining', count: maxPerDay - count };
}

async function* runGeminiStream(
  systemPrompt: string,
  userText: string,
  temperature: number,
): AsyncGenerator<AiStreamEvent> {
  if (!env.GEMINI_API_KEY) {
    throw new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      ErrorCode.INTERNAL_ERROR,
      'AI service is not configured on this server.',
    );
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const controller = new AbortController();

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: [
      { role: 'user', parts: [{ text: userText }] },
      // Model prefill: forces Gemini to continue with the correct header format
      { role: 'model', parts: [{ text: 'id\t' }] },
    ],
    config: {
      systemInstruction: systemPrompt,
      temperature,
      maxOutputTokens: AI_PARSE_MAX_TOKENS,
      stopSequences: ['\n\n\n'],
      thinkingConfig: { thinkingBudget: 0 },
      abortSignal: controller.signal,
    },
  });

  const timeoutId = setTimeout(() => controller.abort(), 60_000);
  try {
    for await (const chunk of stream) {
      const delta = chunk.text;
      if (delta) {
        yield { type: 'delta', text: delta };
      }
    }
    yield { type: 'done' };
  } finally {
    clearTimeout(timeoutId);
    // Ensure the underlying stream is cleaned up if the caller returns early
    controller.abort();
  }
}

// ─── Public streaming APIs ────────────────────────────────────────────────────

export async function* streamAiParse(
  text: string,
  mapRegionIds: string[],
  userId: string,
): AsyncGenerator<AiStreamEvent> {
  yield* checkAiQuota(userId);
  yield* runGeminiStream(buildParserSystemPrompt(mapRegionIds), text, 0);
}

export async function* streamAiGenerate(
  prompt: string,
  mapRegionIds: string[],
  countryName: string | undefined,
  userId: string,
): AsyncGenerator<AiStreamEvent> {
  yield* checkAiQuota(userId);
  yield* runGeminiStream(buildGeneratorSystemPrompt(mapRegionIds, countryName), prompt, 0.7);
}
