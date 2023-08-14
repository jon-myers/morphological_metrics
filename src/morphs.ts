
const isNestedArray = (data: number[][] | number[]): boolean => {
  if (data.length === 0) return false;
  return Array.isArray(data[0]);
}

class Morph {
  dimensions: number;
  data: number[][];

  constructor(data: number[][] | number[]) {
    if (isNestedArray(data)) {
      this.dimensions = data.length;
      this.data = data as number[][];
    } else {
      this.dimensions = 1;
      this.data = [data as number[]];
    }
  }
}

export { Morph }