import { adjacencies, positions } from "./model";

const workgroupSize = 64;

export const createComputePipeline = async ({
  device,
  positionBuffer,
}: {
  device: GPUDevice;
  positionBuffer: GPUBuffer;
}) => {
  const positionData = new Float32Array(positions.flat());
  const previousBuffer = device.createBuffer({
    size: positionData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(previousBuffer.getMappedRange()).set(positionData);
  previousBuffer.unmap();

  const originalBuffer = device.createBuffer({
    size: positionData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(originalBuffer.getMappedRange()).set(positionData);
  originalBuffer.unmap();

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

  const uniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const module = device.createShaderModule({
    code: await (await fetch("compute.wgsl")).text(),
  });

  const layout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
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
      { binding: 0, resource: { buffer: positionBuffer } },
      { binding: 1, resource: { buffer: previousBuffer } },
      { binding: 2, resource: { buffer: originalBuffer } },
      { binding: 3, resource: { buffer: adjacencyBuffer } },
      { binding: 4, resource: { buffer: uniformBuffer } },
    ],
  });

  const encode = (encoder: GPUCommandEncoder, time: number) => {
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([time]));

    const pass = encoder.beginComputePass();

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);

    const workgroupCount = Math.ceil(positions.length / workgroupSize);
    pass.dispatchWorkgroups(workgroupCount);

    pass.end();
  };

  return { encode };
};
