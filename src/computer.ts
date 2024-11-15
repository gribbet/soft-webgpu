import { createBoundaryPipeline } from "./boundary";
import { adjacencyData, positionData } from "./data";
import { createBuffer } from "./device";
import { createForcesPipeline } from "./forces";
import { createIntegratePipeline } from "./integrate";

const steps = 64;

export const createComputer = async ({
  device,
  selectedBuffer,
  anchorBuffer,
  positionBuffer,
  boundaryBuffer,
}: {
  device: GPUDevice;
  selectedBuffer: GPUBuffer;
  anchorBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
  boundaryBuffer: GPUBuffer;
}) => {
  const deltaBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array([0]),
  );
  const adjacencyBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    adjacencyData,
  );
  const previousBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData,
  );
  const forceBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData.map(() => 0),
  );

  const setDelta = (_: number) =>
    device.queue.writeBuffer(deltaBuffer, 0, new Float32Array([_]));

  const forcesPipeline = await createForcesPipeline({
    device,
    deltaBuffer,
    adjacencyBuffer,
    positionBuffer,
    previousBuffer,
    forceBuffer,
  });
  const integratePipeline = await createIntegratePipeline({
    device,
    deltaBuffer,
    selectedBuffer,
    anchorBuffer,
    positionBuffer,
    previousBuffer,
    forceBuffer,
  });
  const boundaryPipeline = await createBoundaryPipeline({
    device,
    positionBuffer,
    previousBuffer,
    boundaryBuffer,
  });

  const compute = (delta: number) => {
    setDelta(delta / steps);

    const encoder = device.createCommandEncoder();

    for (let i = 0; i < steps; i++) {
      forcesPipeline.encode(encoder);
      integratePipeline.encode(encoder);
      boundaryPipeline.encode(encoder);
    }

    device.queue.submit([encoder.finish()]);
  };

  return { compute };
};
