import { workgroupSize } from "./configuration";
import { bindGroupFromBuffers, createBuffer } from "./device";
import { positions, size } from "./model";

export const createIntegratePipeline = async ({
  device,
  timeBuffer,
  positionBuffer,
  previousBuffer,
  boundaryBuffer,
  forceBuffer,
}: {
  device: GPUDevice;
  timeBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
  previousBuffer: GPUBuffer;
  boundaryBuffer: GPUBuffer;
  forceBuffer: GPUBuffer;
}) => {
  const sizeBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array([size]),
  );
  const module = device.createShaderModule({
    code: await (await fetch("integrate.wgsl")).text(),
  });

  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module,
      entryPoint: "main",
    },
  });

  const bindGroup = bindGroupFromBuffers(device, pipeline, [
    sizeBuffer,
    timeBuffer,
    boundaryBuffer,
    positionBuffer,
    previousBuffer,
    forceBuffer,
  ]);

  const encode = (encoder: GPUCommandEncoder) => {
    const pass = encoder.beginComputePass();

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);

    const workgroupCount = Math.ceil(positions.length / workgroupSize);
    pass.dispatchWorkgroups(workgroupCount);

    pass.end();
  };

  return {
    encode,
  };
};
