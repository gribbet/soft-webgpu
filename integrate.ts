import { workgroupSize } from "./configuration";
import { bindGroupFromBuffers, createBuffer } from "./device";
import { positionData, positions } from "./model";

export const createIntegratePipeline = async ({
  device,
  positionBuffer,
  forceBuffer,
}: {
  device: GPUDevice;
  positionBuffer: GPUBuffer;
  forceBuffer: GPUBuffer;
}) => {
  const previousBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    positionData
  );

  const timeBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    new Float32Array([0])
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
    positionBuffer,
    previousBuffer,
    forceBuffer,
    timeBuffer,
  ]);

  const encode = (encoder: GPUCommandEncoder, time: number) => {
    device.queue.writeBuffer(timeBuffer, 0, new Float32Array([time]));

    const pass = encoder.beginComputePass();

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);

    const workgroupCount = Math.ceil(positions.length / workgroupSize);
    pass.dispatchWorkgroups(workgroupCount);

    pass.end();
  };

  return { encode };
};
