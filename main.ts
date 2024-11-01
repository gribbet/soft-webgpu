const positions = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
] satisfies [number, number][];

const triangles = [
  [0, 1, 2],
  [1, 3, 2],
] satisfies [number, number, number][];

const edges = Object.values(
  triangles.reduce<{
    [key: string]: [a: number, b: number];
  }>(
    (acc, [a, b, c]) =>
      [
        [a, b],
        [b, c],
        [c, a],
      ]
        .map((_) => _.sort())
        .reduce((acc, [a = 0, b = 0]) => {
          acc[`${a},${b}`] = [a, b];
          return acc;
        }, acc),
    {}
  )
);

const sub = ([x1, y1]: [number, number], [x2, y2]: [number, number]) =>
  [x1 - x2, y1 - y2] satisfies [number, number];

const norm = ([x, y]: [number, number]) => Math.sqrt(x * x + y * y);

const edgeLengths = edges.map(([a, b]) =>
  norm(sub(positions[a] ?? [0, 0], positions[b] ?? [0, 0]))
);

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

  let last: DOMHighResTimeStamp | undefined;
  const frame = (time: number) => {
    requestAnimationFrame(frame);

    const encoder = device.createCommandEncoder();

    const interval = last !== undefined ? (time - last) / 1000 : 0;
    last = time;

    compute.encode(encoder, interval);
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
