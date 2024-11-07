export const createBuffer = (
  device: GPUDevice,
  usage: GPUBufferUsageFlags,
  data: ArrayLike<number> & ArrayBuffer,
) => {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: usage | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  const Array = data instanceof Uint32Array ? Uint32Array : Float32Array;
  new Array(buffer.getMappedRange()).set(data);
  buffer.unmap();
  return buffer;
};

export const bindGroupFromBuffers = (
  device: GPUDevice,
  pipeline: GPUPipelineBase,
  buffers: GPUBuffer[],
) =>
  device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: buffers.map((buffer, binding) => ({
      binding,
      resource: { buffer },
    })),
  });
