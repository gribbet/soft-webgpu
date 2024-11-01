import { positions } from "./model";

export const createComputePipeline = async (
  device: GPUDevice,
  positionBuffer: GPUBuffer
) => {
  const { size } = positionBuffer;
  const count = size / (Float32Array.BYTES_PER_ELEMENT * 3);

  const positionData = new Float32Array(positions.flat());
  const previousBuffer = device.createBuffer({
    size: positionData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(previousBuffer.getMappedRange()).set(positionData);
  previousBuffer.unmap();

  const forceBuffer = device.createBuffer({
    size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

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
        buffer: { type: "storage" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
    ],
  });

  const computePipeline = device.createComputePipeline({
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
      { binding: 2, resource: { buffer: forceBuffer } },
      { binding: 3, resource: { buffer: uniformBuffer } },
    ],
  });

  const encode = (encoder: GPUCommandEncoder, time: number) => {
    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([time]));

    const pass = encoder.beginComputePass();

    pass.setPipeline(computePipeline);
    pass.setBindGroup(0, bindGroup);

    const workgroupCount = Math.ceil(count / 64);
    pass.dispatchWorkgroups(workgroupCount);

    pass.end();
  };

  return { encode };
};
