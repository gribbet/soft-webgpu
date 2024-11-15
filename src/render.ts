import { bindGroupFromBuffers } from "./device";
import { triangles } from "./model";

export const createRenderPipeline = async ({
  device,
  format,
  aspectBuffer,
  positionBuffer,
  triangleBuffer,
}: {
  device: GPUDevice;
  format: GPUTextureFormat;
  aspectBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
  triangleBuffer: GPUBuffer;
}) => {
  const module = device.createShaderModule({
    code: await (await fetch("render.wgsl")).text(),
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
    pass.draw(3, triangles.length, 0, 0);
  };

  return {
    encode,
  };
};
