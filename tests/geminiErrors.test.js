import { describe, expect, it } from 'vitest';
import { classifyGeminiUpstreamFailure, isGeminiNetworkError } from '../supabase/functions/gemini-tutor/geminiErrors.ts';

describe('Gemini upstream failure diagnostics', () => {
  it('classifies 503 service and model capacity failures separately', () => {
    expect(classifyGeminiUpstreamFailure(503, { error: { status: 'UNAVAILABLE', message: 'The service is overloaded and out of capacity.' } })).toMatchObject({
      status: 503, classification: 'model_capacity', providerCode: 'UNAVAILABLE', providerMessage: 'Gemini reports temporary model capacity pressure.',
    });
    expect(classifyGeminiUpstreamFailure(503, { error: { status: 'UNAVAILABLE', message: 'Service temporarily unavailable.' } }).classification).toBe('service_unavailable');
  });

  it('distinguishes API-key, project-access, quota, and rate-limit errors', () => {
    expect(classifyGeminiUpstreamFailure(400, { error: { status: 'INVALID_ARGUMENT', message: 'API key not valid.', details: [{ reason: 'API_KEY_INVALID' }] } }).classification).toBe('api_key_problem');
    expect(classifyGeminiUpstreamFailure(403, { error: { status: 'PERMISSION_DENIED', message: 'Access denied.' } }).classification).toBe('project_access');
    expect(classifyGeminiUpstreamFailure(402, { error: { status: 'RESOURCE_EXHAUSTED', message: 'Billing is required.' } }).classification).toBe('billing_prerequisite');
    expect(classifyGeminiUpstreamFailure(429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'Daily quota exceeded.', details: [{ reason: 'QUOTA_EXCEEDED' }] } }).classification).toBe('quota_exceeded');
    expect(classifyGeminiUpstreamFailure(429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'Rate limit exceeded.' } }).classification).toBe('rate_limited');
    expect(classifyGeminiUpstreamFailure(404, { error: { status: 'NOT_FOUND', message: 'Model not found.' } }).classification).toBe('model_or_resource_not_found');
    expect(classifyGeminiUpstreamFailure(400, { error: { status: 'INVALID_ARGUMENT', message: 'Unsupported request parameter.' } }).classification).toBe('invalid_request');
  });

  it('never returns provider message text, prompt text, or key-like content in diagnostics', () => {
    const diagnostic = classifyGeminiUpstreamFailure(503, { error: { status: 'UNAVAILABLE', message: 'AIzaSyExampleSecret: student prompt contained private text.' } });
    expect(JSON.stringify(diagnostic)).not.toContain('AIzaSyExampleSecret');
    expect(JSON.stringify(diagnostic)).not.toContain('student prompt');
    expect(diagnostic.providerMessage).toBe('Gemini reports temporary service unavailability.');
  });

  it('identifies network errors only at the Gemini fetch stage', () => {
    expect(isGeminiNetworkError('gemini_upstream_request', new TypeError('fetch failed'))).toBe(true);
    expect(isGeminiNetworkError('gemini_response_parsing', new TypeError('bad response'))).toBe(false);
    expect(isGeminiNetworkError('gemini_upstream_request', new Error('other failure'))).toBe(false);
  });
});
