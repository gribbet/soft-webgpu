import { workgroupSize } from "./configuration";

const segments = 10;

export const positions = new Array(segments + 1).fill(0).flatMap(
  (_, i) =>
    [
      [(0.5 * i) / segments, 0],
      [(0.5 * i) / segments, 0.1],
    ] satisfies [number, number][]
);

export const triangles = new Array(segments).fill(0).flatMap(
  (_, i) =>
    [
      [i * 2, (i + 1) * 2, (i + 1) * 2 + 1],
      [i * 2, (i + 1) * 2 + 1, i * 2 + 1],
    ] satisfies [number, number, number][]
);

export const adjacencies = Object.fromEntries(
  Object.entries(
    triangles.reduce<{ [i: number]: Set<number> }>(
      (acc, [a, b, c]) =>
        [
          [a, b],
          [b, c],
          [c, a],
        ].reduce((acc, [a = 0, b = 0]) => {
          acc[a] = acc[a] ?? new Set<number>();
          acc[a].add(b);
          acc[b] = acc[b] ?? new Set<number>();
          acc[b].add(a);
          return acc;
        }, acc),
      {}
    )
  ).map(([i, adjacencies]) => [i, [...adjacencies].sort()])
);

const count = workgroupSize * 2 * Math.ceil(positions.length / workgroupSize);

export const positionData = new Float32Array(count);
positionData.set(new Float32Array(positions.flat()));

export const adjacencyData = new Uint32Array(count * 8);
adjacencyData.set(
  positions.flatMap((_, i) =>
    new Array(8).fill(0).flatMap((_, j) => adjacencies[i]?.[j] ?? 0xffff)
  )
);

export const triangleData = new Uint32Array(triangles.flat());
