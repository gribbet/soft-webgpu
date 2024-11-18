import { createBoundaryPipeline } from "./boundary";
import { createBuffer } from "./device";
import { createForcesPipeline } from "./forces";
import { createIntegratePipeline } from "./integrate";

const steps = 128;

export const createComputer = async ({
  device,
  vertexCount,
  selectedBuffer,
  anchorBuffer,
  adjacencyBuffer,
  positionBuffer,
  previousBuffer,
  originalBuffer,
  forceBuffer,
  boundaryBuffer,
}: {
  device: GPUDevice;
  vertexCount: number;
  selectedBuffer: GPUBuffer;
  anchorBuffer: GPUBuffer;
  adjacencyBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
  previousBuffer: GPUBuffer;
  originalBuffer: GPUBuffer;
  forceBuffer: GPUBuffer;
  boundaryBuffer: GPUBuffer;
}) => {
  const deltaBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array([0]),
  );

  const setDelta = (_: number) =>
    device.queue.writeBuffer(deltaBuffer, 0, new Float32Array([_]));

  const forcesPipeline = await createForcesPipeline({
    device,
    vertexCount,
    deltaBuffer,
    adjacencyBuffer,
    positionBuffer,
    previousBuffer,
    originalBuffer,
    forceBuffer,
  });
  const integratePipeline = await createIntegratePipeline({
    device,
    vertexCount,
    deltaBuffer,
    selectedBuffer,
    anchorBuffer,
    positionBuffer,
    previousBuffer,
    forceBuffer,
  });
  const boundaryPipeline = await createBoundaryPipeline({
    device,
    vertexCount,
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
