import { workgroupSize } from "./configuration";
import { adjacencyData, positionData } from "./data";
import { bindGroupFromBuffers, createBuffer } from "./device";
import { positions } from "./model";

export const createForcesPipeline = async ({
  device,
  positionBuffer,
  velocityBuffer,
  forceBuffer,
}: {
  device: GPUDevice;
  positionBuffer: GPUBuffer;
  velocityBuffer: GPUBuffer;
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
  const originalBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData,
  );
  const adjacencyBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    adjacencyData,
  );

  const module = device.createShaderModule({
    code: await (await fetch("forces.wgsl")).text(),
  });

  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module,
      entryPoint: "main",
    },
  });

  const bindGroup = bindGroupFromBuffers(device, pipeline, [
    selectedBuffer,
    anchorBuffer,
    originalBuffer,
    positionBuffer,
    velocityBuffer,
    adjacencyBuffer,
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
