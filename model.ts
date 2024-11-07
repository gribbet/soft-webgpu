import { n, workgroupSize } from "./configuration";

const segmentsX = 20;
const segmentsY = 20;

export const positions = new Array(segmentsY + 1)
  .fill(0)
  .flatMap((_, j) =>
    new Array(segmentsX + 1)
      .fill(0)
      .map(
        (_, i) =>
          [
            0.25 * (i / segmentsX - 0.5),
            0.25 * (j / segmentsX - 0.5),
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
