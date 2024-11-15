import { bindGroupFromBuffers } from "./device";

export const createPickPipeline = async ({
  device,
  vertexCount,
  aspectBuffer,
  positionBuffer,
}: {
  device: GPUDevice;
  vertexCount: number;
  aspectBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
}) => {
  const module = device.createShaderModule({
    code: await (await fetch(new URL("./pick.wgsl", import.meta.url))).text(),
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
    pass.draw(6, vertexCount, 0, 0);
  };

  return {
    encode,
  };
};
