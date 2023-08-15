import { Morph, MorphologicalMetric, delta } from './morphs';

const morphGen = (n: number) => {
  return new Morph([...Array(n)].map(() => {
    return Math.floor(12 * Math.random())
  }))
};

describe('Morph', () => {
  test('Creates a morph', () => {
    const m = new Morph([1, 2, 3]);
    expect(m.data).toEqual([1, 2, 3]);

  });

  test('Tries to create a morph with only one point', () => {
    expect(() => new Morph([1])).toThrow();
  })

  test('Calculates Absolute Intervals, 1d', () => {
    const m = new Morph([0, 2, 4, 1, 0]);
    const n = new Morph([2, 3, 0, 4, 1]);
    expect(m.firstOrderAbsoluteInterval).toEqual([2, 2, 3, 1]);
    expect(n.firstOrderAbsoluteInterval).toEqual([1, 3, 4, 3]);
    expect(m.secondOrderAbsoluteInterval).toEqual([0, 1, 2]);
    expect(n.secondOrderAbsoluteInterval).toEqual([2, 1, 1]);
  })

  test('Calculates Derivatives', () => {
    const m = new Morph([0, 2, 4, 1, 0]);
    expect(m.derivate(1)).toEqual([2, 2, -3, -1]);
    expect(m.derivate(2)).toEqual([0, -5, 2]);
    expect(m.derivate(3)).toEqual([-5, 7]); 
  })

  test('Calculates Linear Contour Vectors, 1d', () => {
    const m = new Morph([2, 3, 4, 5]);
    expect(m.linearContourVector).toEqual([3, 0, 0]);
    const n = new Morph([5, 4, 3, 2]);
    expect(n.linearContourVector).toEqual([0, 0, 3]);
    const o = new Morph([5, 9, 3, 2]);
    expect(o.linearContourVector).toEqual([1, 0, 2]);
    const p = new Morph([2, 5, 6, 6]);
    expect(p.linearContourVector).toEqual([2, 1, 0]);
  })

  test('Tries out Magnitude Metric', () => {
    const m = new Morph([0, 2, 5, 2, 1]);
    const n = new Morph([4, 4, 1, 6, 2]);
    const mm = new MorphologicalMetric([m, n]);
    expect(mm.MagnitudeMetric()).toEqual(7/4);
    expect(mm.MagnitudeMetric({ normalized: false })).toEqual(7);
    expect(mm.MagnitudeMetric({ absolute: false })).toEqual(3/4);
  })

  test('Sobalev OLM', () => {
    const m = new Morph([0, 2, 5, 2, 1]);
    const n = new Morph([4, 4, 1, 6, 2]);
    const mm = new MorphologicalMetric([m, n]);
    const ans = (3 + 7/8 + 5/9) / (1 + 1/2 + 1/3);
    expect(mm.SobalevOLM({ weights: [1, 1/2, 1/3] })).toEqual(ans)
    const ans2 = (7/8 + 5/9) / (1/2 + 1/3);
    expect(mm.SobalevOLM({ minOrder: 1, weights: [1/2, 1/3] })).toEqual(ans2)
  })

  test('Tries out OLM', () => {
    const m = new Morph([0, 2, 4, 1, 0]);
    const n = new Morph([2, 3, 0, 4, 1]);
    const mm = new MorphologicalMetric([m, n]);
    expect(mm.OLM({ squared: false, order: 1 })).toEqual(1.25);
    expect(mm.OLM({ squared: false, order: 2 })).toEqual(1);
    const ans = (3 ** 0.5 + 5 ** 0.5 + 7 ** 0.5 + 8 ** 0.5) / 4;
    expect(mm.OLM({ squared: true, order: 1 })).toEqual(ans); // ~2.360
    const ans2 = (4 ** 0.5 + 3 ** 0.5) / 3;
    expect(mm.OLM({ squared: true, order: 2 })).toEqual(ans2); // ~1.244
  })

  test('OLMGeneral', () => {
    const m = morphGen(10);
    const n = morphGen(10);
    const mm = new MorphologicalMetric([m, n]);
    expect(mm.OLM({ squared: false, order: 1 })).toEqual(mm.OLMGeneral());
  })

  test('OLMGeneral interval class', () => {
    const m = new Morph([0, 2, 5, 4, 1]);
    const n = new Morph([4, 5, 4, 3, 2]);
    const mm = new MorphologicalMetric([m, n]);
  })

})