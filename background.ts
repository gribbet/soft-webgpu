import { bindGroupFromBuffers, createBuffer } from "./device";

export const createBackgroundPipeline = async ({
  device,
  format,
  boundaryBuffer,
}: {
  device: GPUDevice;
  format: GPUTextureFormat;
  boundaryBuffer: GPUBuffer;
}) => {
  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] satisfies [number, number][];

  const positionBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    new Float32Array(corners.flat())
  );

  const aspectBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array([1.0])
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
  });

  const bindGroup = bindGroupFromBuffers(device, pipeline, [
    aspectBuffer,
    positionBuffer,
    boundaryBuffer,
  ]);

  const encode = (pass: GPURenderPassEncoder) => {
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(4);
  };

  return {
    set aspect(_: number) {
      device.queue.writeBuffer(aspectBuffer, 0, new Float32Array([_]));
    },
    encode,
  };
};
