import { Morph } from './morphs';

describe('Morph', () => {
  test('Creates a morph from 1d data input', () => {
    const m = new Morph([1, 2, 3]);
    expect(m.dimensions).toBe(1);
    expect(m.data).toEqual([[1, 2, 3]])
  });

  test('Creates a morph from 2d data input', () => {
    const m = new Morph([[1, 2, 3], [4, 5, 6]]);
    expect(m.dimensions).toBe(2);
    expect(m.data).toEqual([[1, 2, 3], [4, 5, 6]])
  });
})