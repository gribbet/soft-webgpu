import { n, workgroupSize } from "./configuration";
import { boundary, positions, triangles } from "./model";

const count = workgroupSize * Math.ceil(positions.length / workgroupSize);

export const positionData = new Float32Array(count * 2);
positionData.set(new Float32Array(positions.flat()));

export const triangleData = new Uint32Array(triangles.flat());

const adjacencies = positions.reduce<{ [i: number]: number[] }>((acc, _, i) => {
  const edges = triangles
    .filter(_ => _.includes(i))
    .map<
      [number, number]
    >(([a, b, c]) => (a === i ? [b, c] : b === i ? [c, a] : [a, b]));
  const result: number[] = [];
  for (;;) {
    const next = edges.pop();
    if (!next) break;
    const [a, b] = next;
    if (result.length === 0) result.push(a, b);
    else if (result[0] === b) result.splice(0, 0, a);
    else if (result[result.length - 1] === a) result.push(b);
    else edges.unshift(next);
  }
  acc[i] = result;
  return acc;
}, {});

export const adjacencyData = new Uint32Array(count * n);
adjacencyData.set(
  positions.flatMap((_, i) => {
    const values = adjacencies[i] ?? [];
    return new Array(n).fill(0).map((_, j) => values[j] ?? 0xffffffff);
  }),
);

export const boundaryData = (time: number) =>
  new Float32Array(
    boundary(time).flatMap(({ normal: [nx = 0, ny = 0], offset }) => [
      nx,
      ny,
      offset,
      0,
    ]),
  );
