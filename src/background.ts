import { bindGroupFromBuffers, createBuffer } from "./device";

const corners = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] satisfies [number, number][];

export const createBackgroundPipeline = async ({
  device,
  format,
  aspectBuffer,
  boundaryBuffer,
}: {
  device: GPUDevice;
  format: GPUTextureFormat;
  aspectBuffer: GPUBuffer;
  boundaryBuffer: GPUBuffer;
}) => {
  const cornerBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    new Float32Array(corners.flat()),
  );

  const module = device.createShaderModule({
    code: await (await fetch("background.wgsl")).text(),
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
    primitive: {
      topology: "triangle-strip",
    },
    multisample: {
      count: 4,
    },
  });

  const bindGroup = bindGroupFromBuffers(device, pipeline, [
    aspectBuffer,
    cornerBuffer,
    boundaryBuffer,
  ]);

  const encode = (pass: GPURenderPassEncoder) => {
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(4);
  };

  return {
    encode,
  };
};
