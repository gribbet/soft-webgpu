export const positions = [
  [0, 0.5],
  [0, 1],
  [0.5, 0.5],
  [0.5, 1.0],
] satisfies [number, number][];

export const triangles = [
  [0, 2, 1],
  [1, 2, 3],
] satisfies [number, number, number][];

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
