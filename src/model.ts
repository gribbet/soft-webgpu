const width = 0.1;
const height = 0.5;
const size = 0.025;

const segmentsX = Math.floor(width / size);
const segmentsY = Math.floor(height / size);

const positions1 = new Array(segmentsY + 1)
  .fill(0)
  .flatMap((_, j) =>
    new Array(segmentsX + 1)
      .fill(0)
      .map(
        (_, i) =>
          [
            size * i - (j * size) / 2 - width * 0.5,
            (size * j * Math.sqrt(3)) / 2 - height * 0.5,
          ] satisfies [number, number],
      ),
  );

export const positions = [
  ...positions1,
  ...positions1.map(([x, y]) => [x + 0.25, y] satisfies [number, number]),
];

const triangles1 = new Array(segmentsX).fill(0).flatMap((_, i) =>
  new Array(segmentsY).fill(0).flatMap(
    (_, j) =>
      [
        [
          j * (segmentsX + 1) + i,
          j * (segmentsX + 1) + i + 1,
          (j + 1) * (segmentsX + 1) + i + 1,
        ],
        [
          j * (segmentsX + 1) + i,
          (j + 1) * (segmentsX + 1) + i + 1,
          (j + 1) * (segmentsX + 1) + i,
        ],
      ] satisfies [number, number, number][],
  ),
);

const n = positions1.length;
export const triangles = [
  ...triangles1,
  ...triangles1.map(
    ([a, b, c]) => [a + n, b + n, c + n] satisfies [number, number, number],
  ),
];

export const boundary = (time: number) =>
  new Array(4).fill(0).map((_, i, { length }) => {
    const a = time / 2000 + (2 * (i * Math.PI)) / length;
    return {
      normal: [Math.cos(a), Math.sin(a)],
      offset: -0.5,
    };
  });
