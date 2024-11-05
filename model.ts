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
          [(0.5 * i) / segmentsX / 2, (0.5 * j) / segmentsX / 2] satisfies [
            number,
            number
          ]
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

const adjacencies = positions.reduce<{ [i: number]: number[] }>((acc, _, i) => {
  const edges = triangles
    .filter((_) => _.includes(i))
    .map<[number, number]>(([a, b, c]) =>
      a === i ? [b, c] : b === i ? [c, a] : [a, b]
    );
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

const count = workgroupSize * Math.ceil(positions.length / workgroupSize);

export const positionData = new Float32Array(count * 2);
positionData.set(new Float32Array(positions.flat()));

export const triangleData = new Uint32Array(triangles.flat());

export const adjacencyData = new Uint32Array(count * n * 2);
adjacencyData.fill(0xffff);
adjacencyData.set(
  positions.flatMap((_, i) => {
    const values = adjacencies[i] ?? [];
    return new Array(n)
      .fill(0)
      .flatMap((_, j) => [
        (j === 0 || values[j] !== values[0] ? values[j] : undefined) ?? 0xffff,
        values[j + 1] ?? 0xffff,
      ]);
  })
);
