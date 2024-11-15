import { adjacencyData, positionData } from "./data";
import { createBuffer } from "./device";
import { createForcesPipeline } from "./forces";
import { createIntegratePipeline } from "./integrate";

const steps = 64;

export const createComputer = async ({
  device,
  timeBuffer,
  selectedBuffer,
  anchorBuffer,
  positionBuffer,
  boundaryBuffer,
}: {
  device: GPUDevice;
  timeBuffer: GPUBuffer;
  selectedBuffer: GPUBuffer;
  anchorBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
  boundaryBuffer: GPUBuffer;
}) => {
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

  const forcesPipeline = await createForcesPipeline({
    device,
    timeBuffer,
    adjacencyBuffer,
    positionBuffer,
    previousBuffer,
    forceBuffer,
  });
  const integratePipeline = await createIntegratePipeline({
    device,
    timeBuffer,
    selectedBuffer,
    anchorBuffer,
    positionBuffer,
    previousBuffer,
    boundaryBuffer,
    forceBuffer,
  });

  const compute = () => {
    const encoder = device.createCommandEncoder();

    for (let i = 0; i < steps; i++) {
      forcesPipeline.encode(encoder);
      integratePipeline.encode(encoder);
    }

    device.queue.submit([encoder.finish()]);
  };

  return { compute };
};
