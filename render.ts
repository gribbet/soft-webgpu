import { bindGroupFromBuffers, createBuffer } from "./device";
import { triangleData, triangles } from "./model";

export const createRenderPipeline = async ({
  device,
  context,
  positionBuffer,
}: {
  device: GPUDevice;
  context: GPUCanvasContext;
  positionBuffer: GPUBuffer;
}) => {
  const triangleBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    triangleData
  );

  const module = device.createShaderModule({
    code: await (await fetch("render.wgsl")).text(),
  });

  const { format } = context.getCurrentTexture();

  const pipeline = device.createRenderPipeline({
    layout: "auto",
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

  const bindGroup = bindGroupFromBuffers(device, pipeline, [
    positionBuffer,
    triangleBuffer,
  ]);

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
