import { n, workgroupSize } from "./configuration";
import { positions, triangles } from "./model";

const count = workgroupSize * Math.ceil(positions.length / workgroupSize);

export const positionData = new Float32Array(count * 2);
positionData.set(new Float32Array(positions.flat()));

export const triangleData = new Uint32Array(triangles.flat());

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

export const boundaryData = (time: number) =>
  new Float32Array(
    [0, 1, 2, 3, 4]
      .map((i) => {
        const a = time / 10000 + (2 * (i * Math.PI)) / 5;
        return {
          normal: [Math.cos(a), Math.sin(a)],
          offset: -0.5,
        };
      })
      .flatMap(({ normal: [nx = 0, ny = 0], offset }) => [nx, ny, offset, 0])
  );
