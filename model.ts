const width = 0.25;
const height = 0.5;
const size = 0.025;

const segmentsX = Math.floor(width / size);
const segmentsY = Math.floor(height / size);

export const positions = new Array(segmentsY + 1)
  .fill(0)
  .flatMap((_, j) =>
    new Array(segmentsX + 1)
      .fill(0)
      .map(
        (_, i) =>
          [
            width * (i / segmentsX - 0.5),
            height * (j / segmentsY - 0.5),
          ] satisfies [number, number]
      )
  );

export const triangles = new Array(segmentsX).fill(0).flatMap((_, i) =>
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
      ] satisfies [number, number, number][]
  )
);
