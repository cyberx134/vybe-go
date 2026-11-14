import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isUuid, parseChatText, parseMatchMessage, parseQueueFilters, parseReport } from './validators.js';

const ID = '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c';

describe('parseQueueFilters', () => {
  it('accepts valid filters', () => {
    const f = parseQueueFilters({ selfGender: 'girl', selfCountry: 'India', wantGender: 'any', wantCountry: 'Global' });
    assert.deepEqual(f, { selfGender: 'girl', selfCountry: 'India', wantGender: 'any', wantCountry: 'Global' });
  });
  it('rejects unknown values and non-objects', () => {
    assert.equal(parseQueueFilters(null), null);
    assert.equal(parseQueueFilters({ selfGender: 'x', selfCountry: 'India', wantGender: 'any', wantCountry: 'Global' }), null);
    assert.equal(parseQueueFilters({ selfGender: 'boy', selfCountry: 'Global', wantGender: 'any', wantCountry: 'Global' }), null);
    assert.equal(parseQueueFilters({ selfGender: 'boy', selfCountry: 'India', wantGender: 'any', wantCountry: 'Narnia' }), null);
  });
});

describe('parseChatText', () => {
  it('trims and strips control / bidi characters', () => {
    assert.equal(parseChatText('  hello\u202E world \u0000'), 'hello world');
  });
  it('rejects empty and over-long text', () => {
    assert.equal(parseChatText('   '), null);
    assert.equal(parseChatText('a'.repeat(181)), null);
    assert.equal(parseChatText(42), null);
  });
  it('keeps Bengali text intact', () => {
    assert.equal(parseChatText('কেমন আছো?'), 'কেমন আছো?');
  });
});

describe('parseMatchMessage', () => {
  it('accepts every message type', () => {
    assert.deepEqual(parseMatchMessage({ t: 'hello' }), { t: 'hello' });
    assert.deepEqual(parseMatchMessage({ t: 'leave' }), { t: 'leave' });
    assert.equal(parseMatchMessage({ t: 'offer', sdp: 'v=0' })?.t, 'offer');
    assert.equal(parseMatchMessage({ t: 'answer', sdp: 'v=0' })?.t, 'answer');
    const c = parseMatchMessage({ t: 'candidate', candidate: { candidate: 'candidate:1 1 udp 1 1.2.3.4 1 typ host', sdpMid: '0', sdpMLineIndex: 0 } });
    assert.equal(c?.t, 'candidate');
    assert.equal(parseMatchMessage({ t: 'chat', text: ' hi ', ts: 5 })?.t, 'chat');
  });
  it('sanitises chat and rejects bad payloads', () => {
    const chat = parseMatchMessage({ t: 'chat', text: ' hi\u0000 ', ts: 5 });
    assert.equal(chat?.t === 'chat' && chat.text, 'hi');
    assert.equal(parseMatchMessage({ t: 'chat', text: '   ' }), null);
    assert.equal(parseMatchMessage({ t: 'offer', sdp: 'x'.repeat(30_000) }), null);
    assert.equal(parseMatchMessage({ t: 'bogus' }), null);
    assert.equal(parseMatchMessage('nope'), null);
    assert.equal(parseMatchMessage(null), null);
  });
});

describe('parseReport', () => {
  it('accepts a valid report and trims evidence to the last 10 lines', () => {
    const evidence = Array.from({ length: 15 }, (_, i) => `line ${i}`);
    const r = parseReport({ matchId: ID, reason: 'nudity', details: ' bad ', evidence });
    assert.equal(r?.details, 'bad');
    assert.equal(r?.evidence?.length, 10);
    assert.equal(r?.evidence?.[0], 'line 5');
  });
  it('rejects unknown reasons and bad ids', () => {
    assert.equal(parseReport({ matchId: ID, reason: 'because' }), null);
    assert.equal(parseReport({ matchId: 'x', reason: 'spam' }), null);
  });
});

describe('isUuid', () => {
  it('validates UUIDs only', () => {
    assert.equal(isUuid(ID), true);
    assert.equal(isUuid('abc'), false);
    assert.equal(isUuid(undefined), false);
  });
});
