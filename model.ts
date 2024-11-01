export const positions = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
] satisfies [number, number][];

export const triangles = [
  [0, 1, 2],
  [1, 3, 2],
] satisfies [number, number, number][];

export const edges = Object.values(
  triangles.reduce<{
    [key: string]: [a: number, b: number];
  }>(
    (acc, [a, b, c]) =>
      [
        [a, b],
        [b, c],
        [c, a],
      ]
        .map((_) => _.sort())
        .reduce((acc, [a = 0, b = 0]) => {
          acc[`${a},${b}`] = [a, b];
          return acc;
        }, acc),
    {}
  )
);

export const edgeLengths = edges.map(([a, b]) =>
  norm(sub(positions[a] ?? [0, 0], positions[b] ?? [0, 0]))
);

export const sub = ([x1, y1]: [number, number], [x2, y2]: [number, number]) =>
  [x1 - x2, y1 - y2] satisfies [number, number];

export const norm = ([x, y]: [number, number]) => Math.sqrt(x * x + y * y);
