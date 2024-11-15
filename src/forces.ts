import { workgroupSize } from "./configuration";
import { bindGroupFromBuffers } from "./device";

export const createForcesPipeline = async ({
  device,
  vertexCount,
  deltaBuffer,
  adjacencyBuffer,
  positionBuffer,
  previousBuffer,
  originalBuffer,
  forceBuffer,
}: {
  device: GPUDevice;
  vertexCount: number;
  deltaBuffer: GPUBuffer;
  adjacencyBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
  previousBuffer: GPUBuffer;
  originalBuffer: GPUBuffer;
  forceBuffer: GPUBuffer;
}) => {
  const module = device.createShaderModule({
    code: await (await fetch(new URL("./forces.wgsl", import.meta.url))).text(),
  });

  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module,
      entryPoint: "main",
    },
  });

  const bindGroup = bindGroupFromBuffers(device, pipeline, [
    deltaBuffer,
    adjacencyBuffer,
    originalBuffer,
    positionBuffer,
    previousBuffer,
    forceBuffer,
  ]);

  const encode = (encoder: GPUCommandEncoder) => {
    const pass = encoder.beginComputePass();

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);

    const workgroupCount = Math.ceil(vertexCount / workgroupSize);
    pass.dispatchWorkgroups(workgroupCount);

    pass.end();
  };

  return {
    encode,
  };
};
