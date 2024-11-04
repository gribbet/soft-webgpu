import { workgroupSize } from "./configuration";
import { bindGroupFromBuffers, createBuffer } from "./device";
import { adjacencies, adjacencyData, positionData, positions } from "./model";

export const createSpringPipeline = async ({
  device,
  positionBuffer,
  forceBuffer,
}: {
  device: GPUDevice;
  positionBuffer: GPUBuffer;
  forceBuffer: GPUBuffer;
}) => {
  const adjacencyBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    adjacencyData
  );

  const originalBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    positionData
  );

  const module = device.createShaderModule({
    code: await (await fetch("spring.wgsl")).text(),
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
    forceBuffer,
    adjacencyBuffer,
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
