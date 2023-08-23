
const isNestedArray = (data: number[][] | number[]): boolean => {
  if (data.length === 0) return false;
  return Array.isArray(data[0]);
}

const mod = (n: number, m: number) => {
  return ((n % m) + m) % m;
}

// Polansky, 1996, pg. 307
const Lm = (l: number) => { // number of pairwise relationships
  return (l ** 2 - l) / 2;
}

// Polanksy, 1996, pg. 307 - 308
const degOfComb = (numIntervals: number, morphLen: number) => {
  return numIntervals / Lm(morphLen);
} 

type ContourVector = [number, number, number];

class Morph {
  data: number[];

  constructor(data: number[]) {
    this.data = data;
    if (this.data.length < 2) {
      throw new Error('Arrays must have at least 2 elements');
    }
  }

  derivate(order=1, absolute=false) { // gets the nth order difference of the data
    let out: number[];
    if (this.data.length - order < 1) {
      throw new Error('Order must be less than the length of the array');
    }
    if (order < 0) {
      throw new Error('Order must be greater than 0');
    } else if (order === 0) {
      out = this.data;
    } else if (order === 1) {
      out = this.data.slice(1).map((_, i) => {
        return this.data[i + 1] - this.data[i];
      })
    } else {
      const data: number[] = this.derivate(order - 1, absolute);
      out = data.slice(1).map((_, i) => {
        return data[i + 1] - data[i];
      })
    }
    if (absolute) {
      out = out.map(n => Math.abs(n));
    }
    return out
  }

  get firstOrderAbsoluteInterval() {
    return this.derivate(1, true)
  }

  get secondOrderAbsoluteInterval() {
    return this.derivate(2, true)
  }

  // Polansky, 1996, pg. 312
  get directionInterval(): (-1 | 0 | 1)[] {
    return this.data.slice(1).map((d, i) => delta.sgn(this.data[i], d))
  }

  get linearContourVector() { // also sometimes called "direction vector": see 
    // Polansky, 1996, pg. 312
    const lcv: ContourVector = [0, 0, 0];
    this.derivate(1).forEach(ai => {
      if (ai > 0) {
        lcv[0] += 1;
      } else if (ai === 0) {
        lcv[1] += 1;
      } else {
        lcv[2] += 1;
      }
    })
    return lcv;
  }

  get combinatorialContourVector() {
    const ccv: ContourVector = [0, 0, 0];
    const ints = this.generateIntervals({ form: 'combinatorial interval' });
    ints.forEach(([a, b]) => {
      const delta = b - a;
      if (delta > 0) {
        ccv[0] += 1;
      } else if (delta === 0) {
        ccv[1] += 1;
      } else {
        ccv[2] += 1;
      }
    });
    return ccv;
  }

  intervalVariance({
    delta = (a: number, b: number) => Math.abs(a - b),
  }: {
    delta?: (a: number, b: number) => number
  } = {}) {
    // Polansky, 1996, pg. 329
    const ints = this.generateIntervals();
    const mean = ints.reduce((a, b) => a + delta(b[0], b[1]), 0) / ints.length;
    // console.log(ints, mean)
    let diffs = ints.map(([a, b]) => (delta(a, b) - mean) ** 2);
    // const diffs = this.data.map(val => {
    //   return delta(val, mean) ** 2 / (this.data.length - 1);
    // })
    // console.log(diffs)
    diffs = diffs.map(diff => diff / (this.data.length - 1));
    const sum = diffs.reduce((a, b) => a + b, 0);
    return sum
  }

  // Polansky 1996, pg. 304
  generateIntervals({
    form = 'adjacency interval',
    adjacencyInterval = 1,
    fundamentalValue = undefined,
    fundamentalIndex = undefined,
  }: {
    form?: IntervalIndexForm,
    adjacencyInterval?: number,
    fundamentalValue?: number,
    fundamentalIndex?: number
  } = {}) {
    let out: [number, number][] = [];
    if (form === 'adjacency interval') {
      for (let i = 0; i < this.data.length - adjacencyInterval; i++) {
        out.push([this.data[i], this.data[i + adjacencyInterval]]);
      }
    } else if (form === 'fundamental index') {
      if (fundamentalIndex === undefined) {
        throw new Error('Fundamental index must be defined');
      }
      if (fundamentalIndex > this.data.length - 1) {
        throw new Error('Fundamental index must be less than the array length');
      }
      out = this.data.map(n => [n, this.data[fundamentalIndex]])
    } else if (form === 'fundamental value') {
      if (fundamentalValue === undefined) {
        throw new Error('Fundamental value must be defined');
      }
      out = this.data.map(n => [n, fundamentalValue])
    } else if (form === 'mean fundamental value') {
      const mean = this.data.reduce((a, b) => a + b, 0) / this.data.length;
      out = this.data.map(n => [n, mean])
    } else if (form === 'max fundamental value') {
      const max = Math.max(...this.data);
      out = this.data.map(n => [n, max])
    } else if (form === 'combinatorial interval') {
      // Polansky, pg. 305 general combinatorial form
      for (let i = 0; i < this.data.length - 1; i++) {
        for (let j = i + 1; j < this.data.length; j++) {
          out.push([this.data[i], this.data[j]])
        }
      }
    }
    return out;
  }

  get morrisRanking() {
    // Polansky, note 55, pg. 362
    // An equivalent notation for the contour of these three morphologies, 
    // using Morris' "ranking" method, is A/= {2143}, N= {2121} and O = {4132}. 
    // In this method, each element in the morphology is represented in order by 
    // the ranking vector by a number representing its "rank" from least to 
    // greatest. If all values are equal, the vector consists of 1s. In a 
    // strictly monotonically increasing morphology, the vector goes from 1 to 
    // L.
    const sorted = this.data.slice().sort((a, b) => a - b);
    return this.data.map((n) => sorted.indexOf(n) + 1);
  }

  get combinatorialMagnitudeMatrix() {
    // Polansky, 1996 pg 318
    const magMatrix: number[][] = [];
    for (let i = 0; i < this.data.length - 1; i++) {
      const row = [];
      for (let j = i + 1; j < this.data.length; j++) {
        const [a, b] = [this.data[i], this.data[j]];
        row.push(Math.abs(a - b));
      }
      magMatrix.push(row);
    }
    return magMatrix;
  }
}

type IntervalIndexForm = (
  'adjacency interval' | 
  'fundamental index' |
  'fundamental value' |
  'mean fundamental value' |
  'max fundamental value' |
  'combinatorial interval'
)

class MorphologicalMetric {
  morphs: [Morph, Morph];
  ordered: boolean;

  constructor(morphs: [Morph, Morph], ordered: boolean = true) {
    if (ordered && morphs[0].data.length !== morphs[1].data.length) {
      throw new Error('Ordered mms must have the same number of points');
    }

    this.morphs = morphs;
    this.ordered = ordered;
  };

  // Polansky, 1996, pg. 300 - 301
  // Note: LP's equation as written out, for the squared form of OLM is 
  // incorrect. The `(m_i - m_i+1)^2 - (n_i - n_i+1)^2` must be wrapped in
  // an absolute value function, otherwise the result is sometimes imaginary.
  // Also, the example of the OLM sqaured form (pg 301), 2nd order is incorrect: 
  // it should be `OLM, no delta^2 (2nd order) = (4 ^ 0.5 + 3 ^ 0.5) / 3 = ~1.244`
  OLMOriginal({
    squared = false,
    order = 1,
    verbose = false
  }: {
    squared?: boolean,
    order?: number,
    verbose?: boolean
  } = {}) { // ordered linear magnitude
    if (!this.ordered) {
      throw new Error('Morphs must be ordered for OLM');
    }
    if (order < 1) {
      throw new Error('Order must be greater than 0');
    }
    const [m, n] = this.morphs;
    const diff = (m: number, n: number) => {
      if (squared) {
        return Math.abs(m ** 2 - n ** 2) ** 0.5;
      } else {
        return Math.abs(Math.abs(m) - Math.abs(n));
      }
    };
    const mDeriv = m.derivate(order, true);
    const out = mDeriv.map((mDelta, i) => {
      const nDelta = n.derivate(order, true)[i];
      const difference = diff(mDelta, nDelta);
      return difference
    }).reduce((a, b) => a + b, 0);
    return out / (m.data.length - order);
  }

  // Polansky, 1996, pg. 300
  SobalevOLM({
    maxOrder = 2, // inclusive
    minOrder = 0,
    weights = undefined
  }: {
    maxOrder?: number,
    minOrder?: number,
    weights?: number[]
  } = {}) {
    if (!this.ordered) {
      throw new Error('Morphs must be ordered for SobalevOLM');
    }
    if (maxOrder - minOrder < 1) { 
      throw new Error('Max order must be greater than min order');
    }
    if (weights === undefined) {
      weights = Array(maxOrder - minOrder).fill(1) as number[];
    } else if (weights.length !== maxOrder - minOrder + 1) {
      throw new Error('Weights must be the same length as the number of orders');
    }
    const [m, n] = this.morphs;
    const normedSums = [];
    for (let i = minOrder; i <= maxOrder; i++) {
      const mDeriv = m.derivate(i, true);
      const nDeriv = n.derivate(i, true);
      let sum = 0;
      for (let j = 0; j < mDeriv.length; j++) {
        sum += Math.abs(mDeriv[j] - nDeriv[j]);
      }
      normedSums.push(sum / mDeriv.length);
    }
    const weightedSums = normedSums.map((sum, i) => sum * weights![i]);
    const summedWeights = weights.reduce((a, b) => a + b, 0);
    return weightedSums.reduce((a, b) => a + b, 0) / summedWeights;
  }

  // Polansky, 1996, pg. 299
  MagnitudeMetric({
    absolute = true, 
    normalized = true
  }: {
    absolute?: boolean,
    normalized?: boolean
  } = {}) { 
    const [m, n] = this.morphs;
    const mDeriv = m.derivate(1, absolute);
    const nDeriv = n.derivate(1, absolute);
    let out = mDeriv.map((_, i) => {
      if (absolute) {
        return Math.abs(mDeriv[i] - nDeriv[i]);
      } else {
        return mDeriv[i] - nDeriv[i];
      }
    }).reduce((a, b) => a + b, 0);
    if (normalized) {
      out /= mDeriv.length;
    }
    return out
  }

  // Polansky, 1996, pg. 302
  OLMGeneral({
    delta = (a: number, b: number) => Math.abs(a - b),
    order = 1
  }: {
    delta?: (a: number, b: number) => number,
    order?: number
  } = {}) {
    const [m, n] = this.morphs;
    const mDeriv = m.derivate(order, true);
    const nDeriv = n.derivate(order, true);
    let out = mDeriv.map((_, i) => {
      return delta(mDeriv[i], nDeriv[i]);
    }).reduce((a, b) => a + b, 0);
    return out / mDeriv.length;
  }

  // Polansky, 1996. 303 - 304 (needs to be tested)
  OLMMetaInterval({ // ordered linear magnitude metric, meta-interval form
    psi = (a: number, b: number): number => Math.abs(a - b),
    delta = (a: number, b: number): number => Math.abs(a - b),
  }: {
    psi?: (a: number, b: number) => number,
    delta?: (a: number, b: number) => number
  }={}) {
    const [m, n] = this.morphs;
    const mDeriv = m.derivate(1, true);
    const nDeriv = n.derivate(1, true);
    let maxInt = 0;
    let out = mDeriv.map((_, i) => {
      const mDelta = delta(mDeriv[i], mDeriv[i+1]);
      const nDelta = delta(nDeriv[i], nDeriv[i + 1]);
      maxInt = Math.max(maxInt, mDelta, nDelta);
      return psi(mDelta, nDelta);
    })
    return out.reduce((a, b) => a + b, 0) / (out.length * maxInt);
  }

  // Polansky, 1996, pg. 304, needs to be tested
  ULMMetaInterval({ // unordered linear magnitude metric, meta-interval form
    psi = (a: number, b: number): number => Math.abs(a - b),
    delta = (a: number, b: number): number => Math.abs(a - b),
  }: {
    psi?: (a: number, b: number) => number,
    delta?: (a: number, b: number) => number
  } = {}) {
    const [m, n] = this.morphs;
    const mDeriv = m.data.slice(1).map((x, i) => delta(x, m.data[i]));
    const mSum = mDeriv.reduce((a, b) => a + b, 0);
    const mNormed = mSum / mDeriv.length;
    const nDeriv = n.data.slice(1).map((x, i) => delta(x, n.data[i]));
    const nSum = nDeriv.reduce((a, b) => a + b, 0);
    const nNormed = nSum / nDeriv.length;
    return psi(mNormed, nNormed);
  }


  // Polansky, 1996, pg. 305
  OLMGeneralizedInterval({
    delta = (a: number, b: number) => Math.abs(a - b),
    psi = (a: number, b: number) => Math.abs(a - b),
    mIntervalForm = 'adjacency interval',
    mAdjacencyInterval = 1,
    mFundamentalValue = undefined,
    mFundamentalIndex = undefined,
    nIntervalForm = 'adjacency interval',
    nAdjacencyInterval = 1,
    nFundamentalValue = undefined,
    nFundamentalIndex = undefined
  }: {
    delta?: (a: number, b: number) => number,
    psi?: (a: number, b: number) => number,
    mIntervalForm?: IntervalIndexForm,
    mAdjacencyInterval?: number,
    mFundamentalValue?: number,
    mFundamentalIndex?: number,
    nIntervalForm?: IntervalIndexForm,
    nAdjacencyInterval?: number,
    nFundamentalValue?: number,
    nFundamentalIndex?: number
  } = {}) {
    const [m, n] = this.morphs;
    let maxInt = 0;
    const mIntervals = m.generateIntervals({
      form: mIntervalForm,
      adjacencyInterval: mAdjacencyInterval,
      fundamentalValue: mFundamentalValue,
      fundamentalIndex: mFundamentalIndex
    });
    const nIntervals = n.generateIntervals({
      form: nIntervalForm,
      adjacencyInterval: nAdjacencyInterval,
      fundamentalValue: nFundamentalValue,
      fundamentalIndex: nFundamentalIndex
    });
    if (mIntervals.length !== nIntervals.length) {
      throw new Error('Intervals must be of equal length');
    }
    mIntervals.forEach(mInt => {
      maxInt = Math.max(maxInt, mInt[0], mInt[1])
    });
    nIntervals.forEach(nInt => {
      maxInt = Math.max(maxInt, nInt[0], nInt[1])
    });
    const psiVals = mIntervals.map((mInt, i) => {
      const nInt = nIntervals[i];
      const mDelta = delta(mInt[0], mInt[1]);
      const nDelta = delta(nInt[0], nInt[1]);
      return psi(mDelta, nDelta);
    });
    return psiVals.reduce((a, b) => a + b, 0) / (psiVals.length * maxInt);
  }

  // unordered linear direction
  // Polansky, 1996, pg. 311 - 312
  ULD({ verbose = false }: { verbose?: boolean } = {}) {
    const [m, n] = this.morphs;
    const mDirVec = m.linearContourVector;
    const nDirVec = n.linearContourVector;
    const diffs = mDirVec.map((mDir, i) => Math.abs(mDir - nDirVec[i]))
    const sum = diffs.reduce((a, b) => a + b, 0);
    const grain = 1 / ((m.data.length - 1)* 2);
    if (verbose) {
      return {
        value: sum * grain,
        grain
      }
    }
    return sum * grain;
  }

  // Ordered Linear Direction
  // Polansky, 1996, pg. 312 - 313
  // "The OLD measures the percentage of different contour values between 
  // corresponding linear intervals."

  OLD({ verbose = false }: { verbose?: boolean } = {}) {
    const [m, n] = this.morphs;
    const mDI = m.directionInterval;
    const nDI = n.directionInterval;

    const diffs = mDI.map((mDir, i) => delta.diff(mDir, nDI[i]));
    const sum = diffs.reduce((a, b) => a + b, 0);
    const grain = 1 / (m.data.length - 1);
    if (verbose) {
      return { value: sum * grain, grain }
    } else {
      return sum * grain;
    }
  }

  // Ordered Combinatorial Direction
  // Polansky, 1996, pg. 313 - 314
  OCD({ verbose = false }: { verbose?: boolean } = {}) {
    const [m, n] = this.morphs;
    const mInts = m.generateIntervals({ form: 'combinatorial interval' });
    const nInts = n.generateIntervals({ form: 'combinatorial interval' });
    const mSgns = mInts.map(mInt => delta.sgn(mInt[0], mInt[1]));
    const nSgns = nInts.map(nInt => delta.sgn(nInt[0], nInt[1]));
    const diffs = mSgns.map((mSgn, i) => delta.diff(mSgn, nSgns[i]));
    const sum = diffs.reduce((a, b) => a + b, 0);
    const grain = 1 / Lm(m.data.length);
    if (verbose) {
      return { value: sum * grain, grain }
    } else {
      return sum * grain;
    }
  }

  // Unordered Combinatorial Direction
  // Polansky, 1996, pg. 314 - 315
  UCD({ verbose = false }: { verbose?: boolean } = {}) {
    const [m, n] = this.morphs;
    const mVec = m.combinatorialContourVector;
    const nVec = n.combinatorialContourVector;
    const diffs = mVec.map((mVal, i) => Math.abs(mVal - nVec[i]));
    const sum = diffs.reduce((a, b) => a + b, 0);
    const grain = 1 / (Lm(m.data.length) * 2);
    if (verbose) {
      return { value: sum * grain, grain }
    } else {
      return sum * grain;
    }
  }

  // Unordered Linear Direction, Unequal Length Form
  // Polansky, 1996, pg. 315 - 316
  ULDUnequalLengthForm() {
    const [m, n] = this.morphs;
    const mDirVec = m.linearContourVector;
    const nDirVec = n.linearContourVector;
    const mNormed = mDirVec.map(mDir => mDir / (m.data.length - 1));
    const nNormed = nDirVec.map(nDir => nDir / (n.data.length - 1));
    const diffs = mNormed.map((mDir, i) => Math.abs(mDir - nNormed[i]))
    const sum = diffs.reduce((a, b) => a + b, 0);
    return sum / 2;
  }

  // Unordered Combinatorial Direction, Unequal Length Form
  // Polansky, 1996, pg. 315 - 316
  UCDUnequalLengthForm() {
    const [m, n] = this.morphs;
    const mVec = m.combinatorialContourVector;
    const nVec = n.combinatorialContourVector;
    const mNormed = mVec.map(mVal => mVal / Lm(m.data.length));
    const nNormed = nVec.map(nVal => nVal / Lm(n.data.length));
    const diffs = mNormed.map((mVal, i) => Math.abs(mVal - nNormed[i]))
    const sum = diffs.reduce((a, b) => a + b, 0);
    return sum / 2;
  }

  // Polansky, 1996, pg. 318 - 319 (eventually, this should just replace
  // the normal OLM above ... not sure why LP repeated himself)
  OLMCanonical({
    delta = (a: number, b: number) => Math.abs(a - b),
  }: {
    delta?: (a: number, b: number) => number
  } = {}) {
    const [m, n] = this.morphs;
    const mDeltas = m.data.slice(1).map((x, i) => delta(m.data[i], x));
    const nDeltas = n.data.slice(1).map((x, i) => delta(n.data[i], x));
    const diffs = mDeltas.map((mDelta, i) => Math.abs(mDelta - nDeltas[i]));
    const sum = diffs.reduce((a, b) => a + b, 0);
    return sum / (m.data.length - 1);
  }


  // Polansky, 1996, pg. 319
  OLMScaled({
    delta = (a: number, b: number) => Math.abs(a - b),
  }: {
    delta?: (a: number, b: number) => number
  } = {}) {
    const [m, n] = this.morphs;
    let maxInt = 0;
    const mDeltas = m.data.slice(1).map((x, i) => {
      const out = delta(m.data[i], x);
      maxInt = Math.max(maxInt, out);
      return out
    });
    const nDeltas = n.data.slice(1).map((x, i) => {
      const out = delta(n.data[i], x);
      maxInt = Math.max(maxInt, out);
      return out
    });
    const diffs = mDeltas.map((mDelta, i) => Math.abs(mDelta - nDeltas[i]));
    const sum = diffs.reduce((a, b) => a + b, 0);
    return sum / ((m.data.length - 1) * maxInt);
  }

  // Polansky, 1996, pg. 320
  ULM({
    delta = (a: number, b: number) => Math.abs(a - b),
    scaling = 'none'
  }: {
    delta?: (a: number, b: number) => number,
    scaling?: 'none' | 'absolute' | 'relative'
  } = {}) {

    if (scaling === 'none') {
      const [m, n] = this.morphs;
      const mDeltas = m.data.slice(1).map((x, i) => delta(m.data[i], x));
      const mSum = mDeltas.reduce((a, b) => a + b, 0);
      const mNormed = mSum / mDeltas.length;
      const nDeltas = n.data.slice(1).map((x, i) => delta(n.data[i], x));
      const nSum = nDeltas.reduce((a, b) => a + b, 0);
      const nNormed = nSum / nDeltas.length;
      return Math.abs(mNormed - nNormed);
    } else if (scaling === 'relative') {
      return this.ULMRelativeScaling({ delta });
    } else if (scaling === 'absolute') {
      return this.ULMAbsoluteScaling({ delta });
    }
    
  }

  // Polansky, 1996, pg. 321

  ULMAbsoluteScaling({
    delta = (a: number, b: number) => Math.abs(a - b),
  }: {
    delta?: (a: number, b: number) => number
  } = {}) {
    const [m, n] = this.morphs;
    let maxInt = 0;
    const mDeltas = m.data.slice(1).map((x, i) => {
      const out = delta(m.data[i], x);
      maxInt = Math.max(maxInt, out);
      return out
    });
    const nDeltas = n.data.slice(1).map((x, i) => {
      const out = delta(n.data[i], x);
      maxInt = Math.max(maxInt, out);
      return out
    });
    const mSum = mDeltas.reduce((a, b) => a + b, 0);
    const mNormed = mSum / mDeltas.length;
    const nSum = nDeltas.reduce((a, b) => a + b, 0);
    const nNormed = nSum / nDeltas.length;
    const preScaled = Math.abs(mNormed - nNormed);
    return preScaled / maxInt;
  }

  // Polansky, 1996, pg. 321 - 322
  ULMRelativeScaling({
    delta = (a: number, b: number) => Math.abs(a - b),
  }: {
    delta?: (a: number, b: number) => number
  } = {}) {
    const [m, n] = this.morphs;
    let mMaxint = 0;
    const mDeltas = m.data.slice(1).map((x, i) => {
      const out = delta(m.data[i], x);
      mMaxint = Math.max(mMaxint, out);
      return out
    });
    const mSum = mDeltas.reduce((a, b) => a + b, 0);
    const mNormed = mSum / (mDeltas.length * mMaxint);
    let nMaxint = 0;
    const nDeltas = n.data.slice(1).map((x, i) => {
      const out = delta(n.data[i], x);
      nMaxint = Math.max(nMaxint, out);
      return out
    });
    const nSum = nDeltas.reduce((a, b) => a + b, 0);
    const nNormed = nSum / (nDeltas.length * nMaxint);
    return Math.abs(mNormed - nNormed);
  }

  // Polansky, 1996, pg. 322
  OLMRelativeScaling({
    delta = (a: number, b: number) => Math.abs(a - b),
  }: {
    delta?: (a: number, b: number) => number
  } = {}) {
    const [m, n] = this.morphs;
    let mMaxInt = 0;
    const mDeltas = m.data.slice(1).map((x, i) => {
      const out = delta(m.data[i], x);
      mMaxInt = Math.max(mMaxInt, out);
      return out
    })
    const normedMDeltas = mDeltas.map(mDelta => mDelta / mMaxInt);
    let nMaxInt = 0;
    const nDeltas = n.data.slice(1).map((x, i) => {
      const out = delta(n.data[i], x);
      nMaxInt = Math.max(nMaxInt, out);
      return out
    });
    const normedNDeltas = nDeltas.map(nDelta => nDelta / nMaxInt);
    const diffs = normedMDeltas.map((mDelta, i) => Math.abs(mDelta - normedNDeltas[i]));
    const sum = diffs.reduce((a, b) => a + b, 0);
    return sum / mDeltas.length;
  }

  OLM({
    scaling = 'none',
    delta = (a: number, b: number) => Math.abs(a - b),
  }: {
    scaling?: 'none' | 'absolute' | 'relative',
    delta?: (a: number, b: number) => number
  } = {}) {
    if (scaling === 'none') {
      return this.OLMCanonical({ delta });
    } else if (scaling === 'relative') {
      return this.OLMRelativeScaling({ delta });
    } else if (scaling === 'absolute') {
      return this.OLMScaled({ delta });
    }
  }


  // Polansky, 1996, pg. 323
  // Ordered combinatorial magnitude metric
  // the squared form, at least as written out in the paper, is the exact same
  // as the absolute scaled ... not sure if this is a typo or what
  OCM({
    delta = (a: number, b: number) => Math.abs(a - b),
    scaling = 'none',
    
  }: {
    delta?: (a: number, b: number) => number,
    scaling?: 'none' | 'absolute' | 'relative',
  } = {}) {
    const [m, n] = this.morphs;
    const mInts = m.generateIntervals({ form: 'combinatorial interval' });
    const nInts = n.generateIntervals({ form: 'combinatorial interval' });
    let maxInt = 0, mMaxInt = 0, nMaxInt = 0;
    const mDeltas = mInts.map(mInt => {
      const out = delta(mInt[0], mInt[1]);
      if (scaling === 'absolute') {
        maxInt = Math.max(maxInt, out);
      } else if (scaling === 'relative') {
        mMaxInt = Math.max(mMaxInt, out);
      }
      return out
    });
    const nDeltas = nInts.map(nInt => {
      const out = delta(nInt[0], nInt[1]);
      if (scaling === 'absolute') {
        maxInt = Math.max(maxInt, out);
      } else if (scaling === 'relative') {
        nMaxInt = Math.max(nMaxInt, out);
      }
      return out
    });
    const diffs = mDeltas.map((mDelta, i) => {
      let mDelt, nDelt;
      if (scaling === 'relative') {
        mDelt = mDelta / mMaxInt;
        nDelt = nDeltas[i] / nMaxInt;
      } else {
        mDelt = mDelta;
        nDelt = nDeltas[i];
      }

      return Math.abs(mDelt - nDelt);
    });
    const sum = diffs.reduce((a, b) => a + b, 0);
    const out = sum / Lm(m.data.length);
    if (scaling === 'absolute') {
      return out / maxInt;
    } else {
      return out
    }
  }


  // Polansky, 1996, pg. 325
  UCM({ 
    delta = (a: number, b: number) => Math.abs(a - b),
    scaling = 'none',
  }: {
    delta?: (a: number, b: number) => number,
    scaling?: 'none' | 'absolute' | 'relative',
  } = {}) {
    const [m, n] = this.morphs;
    const mInts = m.generateIntervals({ form: 'combinatorial interval' });
    const nInts = n.generateIntervals({ form: 'combinatorial interval' });
    let maxInt = 0, mMaxInt = 0, nMaxInt = 0;
    let mSum = mInts.map(mInt => {
      const out = delta(mInt[0], mInt[1]);
      if (scaling === 'absolute') {
        maxInt = Math.max(maxInt, out);
      } else if (scaling === 'relative') {
        mMaxInt = Math.max(mMaxInt, out);
      }
      return out
    }).reduce((a, b) => a + b, 0);
    let nSum = nInts.map(nInt => {
      const out = delta(nInt[0], nInt[1]);
      if (scaling === 'absolute') {
        maxInt = Math.max(maxInt, out);
      } else if (scaling === 'relative') {
        nMaxInt = Math.max(nMaxInt, out);
      }
      return out
    }).reduce((a, b) => a + b, 0);
    if (scaling === 'relative') {
      mSum /= mMaxInt;
      nSum /= nMaxInt;
    }
    const out = Math.abs(mSum / mInts.length - nSum / nInts.length);
    if (scaling === 'absolute') {
      return out / maxInt;
    } else {
      return out
    }
  }

  // Polansky, 1996, pg. 327
  maxULM({
    delta = (a: number, b: number) => Math.abs(a - b),
  }: {
    delta?: (a: number, b: number) => number
  } = {}) {
    const [m, n] = this.morphs;
    const mDeltas = m.data.slice(1).map((x, i) => delta(m.data[i], x));
    const mMax = Math.max(...mDeltas);
    const nDeltas = n.data.slice(1).map((x, i) => delta(n.data[i], x));
    const nMax = Math.max(...nDeltas);
    return Math.abs(mMax - nMax);
  }

  // Polansky, 1996, pg. 327
  maxOLM({
    delta = (a: number, b: number) => Math.abs(a - b),
  }: {
    delta?: (a: number, b: number) => number
  } = {}) {
    const [m, n] = this.morphs;
    const mDeltas = m.data.slice(1).map((x, i) => delta(m.data[i], x));
    const nDeltas = n.data.slice(1).map((x, i) => delta(n.data[i], x));
    const diffs = mDeltas.map((mDelta, i) => Math.abs(mDelta - nDeltas[i]));
    return Math.max(...diffs);
  }

  // Polansky, 1996, pg. 328
  maxOCM({
    delta = (a: number, b: number) => Math.abs(a - b),
  }: {
    delta?: (a: number, b: number) => number
  } = {}) {
    const [m, n] = this.morphs;
    const mInts = m.generateIntervals({ form: 'combinatorial interval' });
    const nInts = n.generateIntervals({ form: 'combinatorial interval' });
    const mDeltas = mInts.map(mInt => delta(mInt[0], mInt[1]));
    const nDeltas = nInts.map(nInt => delta(nInt[0], nInt[1]));
    const diffs = mDeltas.map((mDelta, i) => Math.abs(mDelta - nDeltas[i]));
    return Math.max(...diffs);
  }


  // Polansky, 1996, pg. 328
  maxUCM({
    delta = (a: number, b: number) => Math.abs(a - b),
  }: {
    delta?: (a: number, b: number) => number
  } = {}) {
    const [m, n] = this.morphs;
    const mInts = m.generateIntervals({ form: 'combinatorial interval' });
    const mDeltas = mInts.map(mInt => delta(mInt[0], mInt[1]));
    const maxM = Math.max(...mDeltas);
    const nInts = n.generateIntervals({ form: 'combinatorial interval' });
    const nDeltas = nInts.map(nInt => delta(nInt[0], nInt[1]));
    const maxN = Math.max(...nDeltas);
    return Math.abs(maxM - maxN);
  }

  sigmaULM() {
    const [m, n] = this.morphs;
    return Math.abs(m.intervalVariance() ** 0.5 - n.intervalVariance() ** 0.5);

  }
}


// Polansky, 1996, pg. 326
// correlation coefficient
// not a metric, since it ranges from -1 to 1

const cc = (x: number[], y: number[]) => {
  if (x.length !== y.length) {
    throw new Error('x and y must be the same length');
  }
  const xMean = x.reduce((a, b) => a + b, 0) / x.length;
  const yMean = y.reduce((a, b) => a + b, 0) / y.length;
  const numeratorAdds = x.map((xVal, i) => (xVal - xMean) * (y[i] - yMean));
  const numerator = numeratorAdds.reduce((a, b) => a + b, 0);
  const xDenom = x.map(xVal => (xVal - xMean) ** 2).reduce((a, b) => a + b, 0);
  const yDenom = y.map(yVal => (yVal - yMean) ** 2).reduce((a, b) => a + b, 0);
  const denom = (xDenom * yDenom) ** 0.5;
  return numerator / denom;  

}

const delta = {
  intervalClass: (a: number, b: number): number => {
    return Math.min(mod(a - b, 12), mod(b - a, 12));
  },
  absoluteValue: (a: number, b: number): number => {
    return Math.abs(a - b);
  },
  ratio: (a: number, b: number): number => {
    return a / b;
  },
  squaredDiff: (a: number, b: number): number => {
    return (a - b) ** 2;
  },
  // Polansky, 1996, pg. 311
  sgn: (a: number, b: number): -1 | 0 | 1 => {
    if (a > b) { // goes down
      return 1
    } else if (a === b) { // stays the same
      return 0
    } else { // goes up
      return -1
    }
  },

  diff: (a: -1 | 0 | 1, b: -1 | 0 | 1): number => {
    return Number(a !== b);
  }
}




export { Morph, MorphologicalMetric, delta }

// not implemented
// maxint squared form (pg. 322 - 323)