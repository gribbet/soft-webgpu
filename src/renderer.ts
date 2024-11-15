import { createBackgroundPipeline } from "./background";
import { createRenderPipeline } from "./render";

export const createRenderer = async ({
  device,
  context,
  format,
  aspectBuffer,
  boundaryBuffer,
  positionBuffer,
  triangleBuffer,
}: {
  device: GPUDevice;
  format: GPUTextureFormat;
  context: GPUCanvasContext;
  aspectBuffer: GPUBuffer;
  boundaryBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
  triangleBuffer: GPUBuffer;
}) => {
  const backgroundPipeline = await createBackgroundPipeline({
    device,
    format,
    aspectBuffer,
    boundaryBuffer,
  });
  const renderPipeline = await createRenderPipeline({
    device,
    format,
    aspectBuffer,
    positionBuffer,
    triangleBuffer,
  });

  const usage = GPUTextureUsage.RENDER_ATTACHMENT;
  const sampleCount = 4;
  let texture = device.createTexture({
    size: [1, 1],
    sampleCount,
    format,
    usage,
  });

  const resize = ([width, height]: [number, number]) => {
    texture.destroy();
    texture = device.createTexture({
      size: [width * devicePixelRatio, height * devicePixelRatio],
      sampleCount,
      format,
      usage,
    });
  };

  const render = () => {
    const encoder = device.createCommandEncoder();

    const view = texture.createView();
    const resolveTarget = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view, resolveTarget, loadOp: "clear", storeOp: "discard" },
      ],
    });
    backgroundPipeline.encode(pass);
    renderPipeline.encode(pass);
    pass.end();

    device.queue.submit([encoder.finish()]);
  };

  return { resize, render };
};
