const positions = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
] as const;

const triangles = [
  [0, 1, 2],
  [1, 3, 2],
] as const;

async function init() {
  const { gpu } = navigator;
  if (!gpu) throw new Error();

  const adapter = await gpu.requestAdapter();
  if (!adapter) throw new Error();
  const device = await adapter.requestDevice();

  const { queue } = device;

  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);

  new ResizeObserver(([entry]) => {
    const { width = 0, height = 0 } = entry?.contentRect ?? {};
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
  }).observe(canvas);

  const context = canvas.getContext("webgpu");
  if (!context) throw new Error();

  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  const positionData = new Float32Array(positions.flat());
  const positionBuffer = device.createBuffer({
    size: positionData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(positionBuffer.getMappedRange()).set(positionData);
  positionBuffer.unmap();

  const render = await createRenderPipeline(device, context, positionBuffer);
  const compute = await createComputePipeline(device, positionBuffer);

  const frame = () => {
    requestAnimationFrame(frame);

    const encoder = device.createCommandEncoder();

    compute.encode(encoder);
    render.encode(encoder);

    queue.submit([encoder.finish()]);
  };

  requestAnimationFrame(frame);
}

init();

const createRenderPipeline = async (
  device: GPUDevice,
  context: GPUCanvasContext,
  positionBuffer: GPUBuffer
) => {
  const triangleData = new Uint32Array(triangles.flat());
  const triangleBuffer = device.createBuffer({
    size: triangleData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint32Array(triangleBuffer.getMappedRange()).set(triangleData);
  triangleBuffer.unmap();

  const module = device.createShaderModule({
    code: await (await fetch("render.wgsl")).text(),
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
    ],
  });

  const { format } = context.getCurrentTexture();

  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: {
      module,
      entryPoint: "vertex",
    },
    fragment: {
      module,
      entryPoint: "fragment",
      targets: [{ format }],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "none",
    },
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: positionBuffer },
      },
      {
        binding: 1,
        resource: { buffer: triangleBuffer },
      },
    ],
  });

  const encode = (encoder: GPUCommandEncoder) => {
    const view = context.getCurrentTexture().createView();

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          loadOp: "clear",
          storeOp: "store",
          clearValue: [0.2, 0.2, 0.2, 0],
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3, triangles.length, 0, 0);
    pass.end();
  };

  return { encode };
};

const createComputePipeline = async (
  device: GPUDevice,
  positionBuffer: GPUBuffer
) => {
  const { size } = positionBuffer;
  const count = size / (Float32Array.BYTES_PER_ELEMENT * 3);
  const velocityBuffer = device.createBuffer({
    size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const forceBuffer = device.createBuffer({
    size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
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
      { binding: 1, resource: { buffer: velocityBuffer } },
      { binding: 2, resource: { buffer: forceBuffer } },
    ],
  });

  const encode = (encoder: GPUCommandEncoder) => {
    const pass = encoder.beginComputePass();

    pass.setPipeline(computePipeline);
    pass.setBindGroup(0, bindGroup);

    const workgroupCount = Math.ceil(count / 64);
    pass.dispatchWorkgroups(workgroupCount);

    pass.end();
  };

  return { encode };
};
