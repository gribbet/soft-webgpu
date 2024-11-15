import { load } from "@loaders.gl/core";
import { PLYLoader } from "@loaders.gl/ply";

import { n, workgroupSize } from "./configuration";
import type { Boundary } from "./model";

export const loadData = async () => {
  const data = await load(
    new URL("./abc.ply", import.meta.url).toString(),
    PLYLoader,
  );
  const rawPositionData =
    data.attributes["POSITION"]?.value ?? new Float32Array([]);
  const triangleData = data.indices?.value ?? new Uint32Array([]);

  const vertexCount = rawPositionData.length / 2;

  const count = workgroupSize * Math.ceil(vertexCount / workgroupSize);

  const positionData = new Float32Array(
    new Array(count).fill(0).flatMap((_, i) => {
      const [x = 0, y = 0] = rawPositionData.slice(i * 3, i * 3 + 2);
      return [x, y];
    }),
  );

  const triangles = new Array(triangleData.length / 3).fill(0).map((_, i) => {
    const [a = 0, b = 0, c = 0] = triangleData.slice(i * 3, i * 3 + 3);
    return [a, b, c] as const;
  });
  const triangleCount = triangles.length;
  const adjacencies = new Array(count)
    .fill(0)
    .reduce<{ [i: number]: [number, number][] }>((acc, _, i) => {
      acc[i] = triangles
        .filter(_ => _.includes(i))
        .map<
          [number, number]
        >(([a, b, c]) => (a === i ? [b, c] : b === i ? [c, a] : [a, b]));
      return acc;
    }, {});

  const adjacencyData = new Uint32Array(count * n * 2);
  adjacencyData.fill(0xffffffff);
  adjacencyData.set(
    new Array(count)
      .fill(0)
      .flatMap((_, i) =>
        new Array(n)
          .fill(0)
          .flatMap(
            (_, j) => (adjacencies[i] ?? [])[j] ?? [0xffffffff, 0xffffffff],
          ),
      ),
  );

  return {
    vertexCount,
    triangleCount,
    positionData,
    triangleData,
    adjacencyData,
  };
};

export const boundaryData = (boundaries: Boundary[]) =>
  new Float32Array(
    boundaries.flatMap(({ normal: [nx = 0, ny = 0], offset }) => [
      nx,
      ny,
      offset,
      0,
    ]),
  );
