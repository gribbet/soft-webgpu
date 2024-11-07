import { workgroupSize } from "./configuration";
import { adjacencyData, positionData } from "./data";
import { bindGroupFromBuffers, createBuffer } from "./device";
import { positions } from "./model";

export const createForcesPipeline = async ({
  device,
  positionBuffer,
  forceBuffer,
}: {
  device: GPUDevice;
  positionBuffer: GPUBuffer;
  forceBuffer: GPUBuffer;
}) => {
  const originalBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData,
  );
  const adjacencyBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    adjacencyData,
  );

  const module = device.createShaderModule({
    code: await (await fetch("forces.wgsl")).text(),
  });

  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module,
      entryPoint: "main",
    },
  });

  const bindGroup = bindGroupFromBuffers(device, pipeline, [
    originalBuffer,
    positionBuffer,
    adjacencyBuffer,
    forceBuffer,
  ]);

  const encode = (encoder: GPUCommandEncoder) => {
    const pass = encoder.beginComputePass();

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);

    const workgroupCount = Math.ceil(positions.length / workgroupSize);
    pass.dispatchWorkgroups(workgroupCount);

    pass.end();
  };

  return { encode };
};
