import { createPickPipeline } from "./pick";

export const createPicker = async ({
  device,
  aspectBuffer,
  positionBuffer,
}: {
  device: GPUDevice;
  aspectBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
}) => {
  const pipeline = await createPickPipeline({
    device,
    aspectBuffer,
    positionBuffer,
  });

  const format = "r32uint";
  const usage =
    GPUTextureUsage.RENDER_ATTACHMENT |
    GPUTextureUsage.STORAGE_BINDING |
    GPUTextureUsage.COPY_SRC;

  let texture = device.createTexture({
    size: [1, 1],
    format,
    usage,
  });

  const resize = (size: [number, number]) => {
    texture.destroy();
    texture = device.createTexture({
      size,
      format,
      usage,
    });
  };

  const pick = async ([x, y]: [number, number]) => {
    const buffer = device.createBuffer({
      size: Uint32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const encoder = device.createCommandEncoder();
    const view = texture.createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view, loadOp: "clear", storeOp: "store" }],
    });
    pipeline.encode(pass);
    pass.end();
    encoder.copyTextureToBuffer(
      { texture, origin: { x, y } },
      { buffer },
      { width: 1, height: 1, depthOrArrayLayers: 1 },
    );
    device.queue.submit([encoder.finish()]);
    await buffer.mapAsync(GPUMapMode.READ);
    const [index = 0] = new Uint32Array(buffer.getMappedRange());
    buffer.destroy();
    return index - 1;
  };

  return { pick, resize };
};
