
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
  }) {
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
  OLM({
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

