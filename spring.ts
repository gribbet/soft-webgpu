import { edges, positions } from "./model";

const workgroupSize = 64;

export const createSpringPipeline = async ({
  device,
  positionBuffer,
  forceBuffer,
}: {
  device: GPUDevice;
  positionBuffer: GPUBuffer;
  forceBuffer: GPUBuffer;
}) => {
  const edgeData = new Uint32Array(edges.flat());
  const edgeBuffer = device.createBuffer({
    size: edgeData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint32Array(edgeBuffer.getMappedRange()).set(edgeData);
  edgeBuffer.unmap();

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
      { binding: 3, resource: { buffer: edgeBuffer } },
    ],
  });

  const encode = (encoder: GPUCommandEncoder) => {
    const pass = encoder.beginComputePass();

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);

    const workgroupCount = Math.ceil(edges.length / workgroupSize);
    pass.dispatchWorkgroups(workgroupCount);

    pass.end();
  };

  return { encode };
};
