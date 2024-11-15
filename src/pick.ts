import { bindGroupFromBuffers } from "./device";
import { positions } from "./model";

export const createPickPipeline = async ({
  device,
  aspectBuffer,
  positionBuffer,
}: {
  device: GPUDevice;
  aspectBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
}) => {
  const module = device.createShaderModule({
    code: await (await fetch("pick.wgsl")).text(),
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
      targets: [{ format: "r32uint" }],
    },
  });

  const bindGroup = bindGroupFromBuffers(device, pipeline, [
    aspectBuffer,
    positionBuffer,
  ]);

  const encode = (pass: GPURenderPassEncoder) => {
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6, positions.length, 0, 0);
  };

  return {
    encode,
  };
};
