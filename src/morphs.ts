
const isNestedArray = (data: number[][] | number[]): boolean => {
  if (data.length === 0) return false;
  return Array.isArray(data[0]);
}

const mod = (n: number, m: number) => {
  return ((n % m) + m) % m;
}

type LinearContourVector = [number, number, number];

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

  get linearContourVector() {
    const lcv: LinearContourVector = [0, 0, 0];
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
}

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
    order = 1
  }: {
    squared?: boolean,
    order?: number
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
    const out = m.derivate(order, true).map((mDelta, i) => {
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
    delta?: (a: number | PitchClassType, b: number | PitchClassType) => number,
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
}

type PitchClassType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type IntervalClassType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const delta = {
  intervalClass: (a: PitchClassType, b: PitchClassType): IntervalClassType => {
    return Math.min(mod(a - b, 12), mod(b - a, 12)) as IntervalClassType;
  }
}




// class Delta {
//   comparands: [number, number];
//   type: (
//     'absolute value' | 
//     'ratio' | 
//     'max of function' | 
//     'squared difference' | 
//     'root of squared difference'
//   );
// }

// const m = new Morph([0, 2, 4, 1, 0]);
// const n = new Morph([2, 3, 0, 4, 1]);

// const ai = m.firstOrderAbsoluteInterval;
// console.log(ai)





export { Morph, MorphologicalMetric, delta }