import { adjacencies, positions } from "./model";

const workgroupSize = 1;

export const createSpringPipeline = async ({
  device,
  positionBuffer,
  forceBuffer,
}: {
  device: GPUDevice;
  positionBuffer: GPUBuffer;
  forceBuffer: GPUBuffer;
}) => {
  const adjacencyData = new Uint32Array(
    positions.flatMap((_, i) =>
      new Array(8).fill(0).flatMap((_, j) => adjacencies[i]?.[j] ?? 0xffff)
    )
  );
  const adjacencyBuffer = device.createBuffer({
    size: adjacencyData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint32Array(adjacencyBuffer.getMappedRange()).set(adjacencyData);
  adjacencyBuffer.unmap();

  const positionData = new Float32Array(positions.flat());
  const originalBuffer = device.createBuffer({
    size: positionData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(originalBuffer.getMappedRange()).set(positionData);
  originalBuffer.unmap();

  const module = device.createShaderModule({
    code: await (await fetch("spring.wgsl")).text(),
  });

  const layout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
    ],
  });

  const pipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [layout],
    }),
    compute: {
      module,
      entryPoint: "main",
    },
  });

  const bindGroup = device.createBindGroup({
    layout,
    entries: [
      { binding: 0, resource: { buffer: originalBuffer } },
      { binding: 1, resource: { buffer: positionBuffer } },
      { binding: 2, resource: { buffer: forceBuffer } },
      { binding: 3, resource: { buffer: adjacencyBuffer } },
    ],
  });

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
