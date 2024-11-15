import { n, workgroupSize } from "./configuration";
import type { Boundary } from "./model";
import { positions, triangles } from "./model";

const count = workgroupSize * Math.ceil(positions.length / workgroupSize);

export const positionData = new Float32Array(count * 2);
positionData.set(new Float32Array(positions.flat()));

export const triangleData = new Uint32Array(triangles.flat());

const adjacencies = positions.reduce<{ [i: number]: [number, number][] }>(
  (acc, _, i) => {
    acc[i] = triangles
      .filter(_ => _.includes(i))
      .map<
        [number, number]
      >(([a, b, c]) => (a === i ? [b, c] : b === i ? [c, a] : [a, b]));
    return acc;
  },
  {},
);

export const adjacencyData = new Uint32Array(count * n * 2);
adjacencyData.fill(0xffffffff);
adjacencyData.set(
  positions.flatMap((_, i) =>
    new Array(n)
      .fill(0)
      .flatMap((_, j) => (adjacencies[i] ?? [])[j] ?? [0xffffffff, 0xffffffff]),
  ),
);

export const boundaryData = (boundaries: Boundary[]) =>
  new Float32Array(
    boundaries.flatMap(({ normal: [nx = 0, ny = 0], offset }) => [
      nx,
      ny,
      offset,
      0,
    ]),
  );
