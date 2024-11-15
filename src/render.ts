import { bindGroupFromBuffers } from "./device";

export const createRenderPipeline = async ({
  device,
  format,
  triangleCount,
  aspectBuffer,
  positionBuffer,
  triangleBuffer,
}: {
  device: GPUDevice;
  format: GPUTextureFormat;
  triangleCount: number;
  aspectBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
  triangleBuffer: GPUBuffer;
}) => {
  const module = device.createShaderModule({
    code: await (await fetch(new URL("./render.wgsl", import.meta.url))).text(),
  });

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
    multisample: {
      count: 4,
    },
  });

  const bindGroup = bindGroupFromBuffers(device, pipeline, [
    aspectBuffer,
    positionBuffer,
    triangleBuffer,
  ]);

  const encode = (pass: GPURenderPassEncoder) => {
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3, triangleCount, 0, 0);
  };

  return {
    encode,
  };
};
