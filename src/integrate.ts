import { workgroupSize } from "./configuration";
import { bindGroupFromBuffers, createBuffer } from "./device";
import { positions } from "./model";

export const createIntegratePipeline = async ({
  device,
  timeBuffer,
  positionBuffer,
  velocityBuffer,
  boundaryBuffer,
  forceBuffer,
}: {
  device: GPUDevice;
  timeBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
  velocityBuffer: GPUBuffer;
  boundaryBuffer: GPUBuffer;
  forceBuffer: GPUBuffer;
}) => {
  const selectedBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Uint32Array([0]),
  );
  const anchorBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array(positions[0] ?? [0, 0]),
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
    timeBuffer,
    selectedBuffer,
    anchorBuffer,
    boundaryBuffer,
    positionBuffer,
    velocityBuffer,
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
    set anchor(_: [number, number]) {
      device.queue.writeBuffer(anchorBuffer, 0, new Float32Array(_));
    },
    encode,
  };
};
