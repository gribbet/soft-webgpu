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

export const edges = Object.values(
  triangles.reduce<{
    [key: string]: [a: number, b: number];
  }>(
    (acc, [a, b, c]) =>
      [
        [a, b],
        [b, c],
        [c, a],
      ].reduce((acc, [a = 0, b = 0]) => {
        acc[`${a},${b}`] = [a, b];
        return acc;
      }, acc),
    {}
  )
);
