import { triangles } from "./model";

export const createRenderPipeline = async ({
  device,
  context,
  positionBuffer,
}: {
  device: GPUDevice;
  context: GPUCanvasContext;
  positionBuffer: GPUBuffer;
}) => {
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

  const layout = device.createBindGroupLayout({
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
      bindGroupLayouts: [layout],
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
    layout,
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
