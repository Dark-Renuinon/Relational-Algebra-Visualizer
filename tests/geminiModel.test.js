import { describe, expect, it } from 'vitest';
import { buildGeminiGenerateContentUrl, DEFAULT_GEMINI_MODEL, normalizeGeminiModelName } from '../supabase/functions/gemini-tutor/geminiModel.ts';

describe('Gemini model URL construction', () => {
  it('uses the current documented model by default and constructs the v1beta endpoint', () => {
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3.8-flash');
    expect(buildGeminiGenerateContentUrl()).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  });

  it('accepts a model resource prefix without duplicating models/', () => {
    expect(normalizeGeminiModelName('models/gemini-2.5-flash')).toBe('gemini-2.5-flash');
    expect(normalizeGeminiModelName('models/models/gemini-3.8-flash')).toBe('gemini-3.8-flash');
    expect(buildGeminiGenerateContentUrl('models/gemini-3.8-flash')).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  });

  it('rejects malformed model paths instead of sending an invalid upstream URL', () => {
    expect(() => buildGeminiGenerateContentUrl('models/gemini-3.8-flash:generateContent')).toThrow('Invalid GEMINI_MODEL configuration.');
  });
});
