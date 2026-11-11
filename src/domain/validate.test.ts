import { describe, expect, it } from 'vitest';
import { DataFormatError } from '../errors';
import { makeData, makeItem } from './testData';
import { emptyData, parseDiaryData } from './validate';

describe('parseDiaryData', () => {
  it('正しい data.json を読める', () => {
    const d = makeData([makeItem()]);
    expect(parseDiaryData(JSON.stringify(d))).toEqual(d);
  });
  it.each(['{', '{"version":2,"items":[]}', '{"version":1}', 'null'])('壊れた data.json %s は DataFormatError', (t) => {
    expect(() => parseDiaryData(t)).toThrow(DataFormatError);
  });
  it('emptyData', () => {
    expect(emptyData()).toEqual({ version: 1, items: [] });
  });
});
