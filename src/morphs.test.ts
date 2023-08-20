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
    expect(mm.OLMGeneral({ delta: delta.intervalClass })).toEqual(1.25);
  })

  test('Generate intervals', () => {
    const m = new Morph([0, 2, 5, 4, 1]);
    const comb = m.generateIntervals({ form: 'combinatorial interval' });
    const combAns = [
      [0, 2], [0, 5], [0, 4], [0, 1], [2, 5], 
      [2, 4], [2, 1], [5, 4], [5, 1], [4, 1]
    ];
    expect(comb).toEqual(combAns);
    const adj1 = m.generateIntervals({ form: 'adjacency interval' });
    const adj1Ans = [[0, 2], [2, 5], [5, 4], [4, 1]];
    expect(adj1).toEqual(adj1Ans);
    const adj2 = m.generateIntervals({ 
      form: 'adjacency interval', 
      adjacencyInterval: 2 
    });
    const adj2Ans = [[0, 5], [2, 4], [5, 1]];
    expect(adj2).toEqual(adj2Ans);
    const fIdx = m.generateIntervals({ 
      form: 'fundamental index',
      fundamentalIndex: 2
    })
    const fIdxAns = [[0, 5], [2, 5], [5, 5], [4, 5], [1, 5]];
    expect(fIdx).toEqual(fIdxAns);
    const fVal = m.generateIntervals({
      form: 'fundamental value',
      fundamentalValue: 7
    });
    const fValAns = [[0, 7], [2, 7], [5, 7], [4, 7], [1, 7]];
    expect(fVal).toEqual(fValAns);
    const fMean = m.generateIntervals({
      form: 'mean fundamental value'
    });
    const fMeanAns = [[0, 2.4], [2, 2.4], [5, 2.4], [4, 2.4], [1, 2.4]];
    expect(fMean).toEqual(fMeanAns);
    const fMax = m.generateIntervals({ form: 'max fundamental value' });
    const fMaxAns = [[0, 5], [2, 5], [5, 5], [4, 5], [1, 5]];
    expect(fMax).toEqual(fMaxAns);
  })

  test('Direction Interval', () => {
    const m = new Morph([0, 2, 5, 4, 1]);
    const diAns = [-1, -1, 1, 1];
    expect(m.directionInterval).toEqual(diAns);
  })

  test('ULD', () => {
    const m = new Morph([5, 9, 3, 2]);
    const n = new Morph([2, 5, 6, 6]);
    const mm = new MorphologicalMetric([m, n]);
    expect(mm.ULD()).toEqual(2/3);
  })

  test('ULD vs OLD', () => {
    // Polansky, 1996, pg. 313
    const o = new Morph([5, 3, 6, 1, 4]);
    const p = new Morph([3, 6, 1, 4, 2]);
    const mm = new MorphologicalMetric([o, p]);
    expect(mm.OLD()).toEqual(1);
    expect(mm.ULD()).toEqual(0);
  })

  test('OCD', () => {
    const m = new Morph([5, 9, 3, 2]);
    const n = new Morph([2, 5, 6, 6]);
    const mm = new MorphologicalMetric([m, n]);
    expect(mm.OCD()).toBeCloseTo(5/6, 8);
    const o = new Morph([5, 3, 6, 1, 4]);
    const p = new Morph([3, 6, 1, 4, 2]);
    const mm2 = new MorphologicalMetric([o, p]);
    expect(mm2.OCD()).toEqual(0.8)
  })

  test('ccv', () => {
    // pg. 315
    const o = new Morph([5, 3, 6, 1, 4]);
    const p = new Morph([3, 6, 1, 4, 2]);
    expect(o.combinatorialContourVector).toEqual([4, 0, 6]);
    expect(p.combinatorialContourVector).toEqual([4, 0, 6]);
  })

  test('UCD + ccv', () => {
    // pg. 315
    const q = new Morph([5, 3, 7, 6]);
    const r = new Morph([2, 1, 2, 1]);
    const s = new Morph([8, 3, 5, 4]);
    expect(q.combinatorialContourVector).toEqual([4, 0, 2]);
    expect(r.combinatorialContourVector).toEqual([1, 2, 3]);
    expect(s.combinatorialContourVector).toEqual([2, 0, 4]);
    const mmQR = new MorphologicalMetric([q, r]);
    const mmRS = new MorphologicalMetric([r, s]);
    const mmQS = new MorphologicalMetric([q, s]);
    expect(mmQR.UCD()).toEqual(0.5);
    expect(mmRS.UCD()).toEqual(1/3);
    expect(mmQS.UCD()).toEqual(1/3);
  })

  test('ULD and UCD unequal length form', () => {
    const m = new Morph([5, 9, 3, 2]);
    const n = new Morph([2, 5, 6, 6]);
    const o = new Morph([5, 3, 6, 1, 4]);
    const p = new Morph([3, 6, 1, 4, 2]);
    const mm_mo = new MorphologicalMetric([m, o], false);
    const moAns = (0.5 - 1/3 + 2/3  - 1/2) / 2;
    expect(mm_mo.ULDUnequalLengthForm()).toBeCloseTo(moAns, 8);
    const mm_no = new MorphologicalMetric([n, o], false);
    expect(mm_no.ULDUnequalLengthForm()).toEqual(0.5);
    const mo_ans_ucd = ((.4 - 1/6) + (5/6 - 3/5))/2;
    expect(mm_mo.UCDUnequalLengthForm()).toBeCloseTo(mo_ans_ucd, 8);
    const no_ans_ucd = 0.6; // this diverges from the answer LP provides on page 
    // 316, but I think it's a typo. The answer should be 0.6, not 0.5.
    expect(mm_no.UCDUnequalLengthForm()).toBeCloseTo(no_ans_ucd, 8);
  })
  //   const mm = new MorphologicalMetric([m, n]);
  //   expect(mm.ULD()).toEqual(2/3);
  // })

  test('Morris Ranking', () => {
    const m = new Morph([1, 3, 7, 2, 5]);
    const n = new Morph([1, 3, 7, 12, 9]);
    const o = new Morph([5, 3, 6, 1, 4]);
    expect(m.morrisRanking).toEqual([1, 3, 5, 2, 4]);
    expect(n.morrisRanking).toEqual([1, 2, 3, 5, 4]);
    expect(o.morrisRanking).toEqual([4, 2, 5, 1, 3]);
  })

  test('CombinatorialMagnitudeMatrix', () => {
    const m  = new Morph([5, 3, 2, 6, 9]);
    const n = new Morph([5, 7, 8, 4, 1]);
    const cmm = [
      [2, 3, 1, 4], 
      [1, 3, 6], 
      [4, 7], 
      [3]
    ];
    expect(m.combinatorialMagnitudeMatrix).toEqual(cmm);
    expect(n.combinatorialMagnitudeMatrix).toEqual(cmm);
  })
})