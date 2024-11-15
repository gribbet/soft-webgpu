import { workgroupSize } from "./configuration";
import { bindGroupFromBuffers } from "./device";

export const createIntegratePipeline = async ({
  device,
  vertexCount,
  deltaBuffer,
  selectedBuffer,
  anchorBuffer,
  positionBuffer,
  previousBuffer,
  forceBuffer,
}: {
  device: GPUDevice;
  vertexCount: number;
  deltaBuffer: GPUBuffer;
  selectedBuffer: GPUBuffer;
  anchorBuffer: GPUBuffer;
  positionBuffer: GPUBuffer;
  previousBuffer: GPUBuffer;
  forceBuffer: GPUBuffer;
}) => {
  const module = device.createShaderModule({
    code: await (
      await fetch(new URL("./integrate.wgsl", import.meta.url))
    ).text(),
  });

  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module,
      entryPoint: "main",
    },
  });

  const bindGroup = bindGroupFromBuffers(device, pipeline, [
    deltaBuffer,
    selectedBuffer,
    anchorBuffer,
    positionBuffer,
    previousBuffer,
    forceBuffer,
  ]);

  const encode = (encoder: GPUCommandEncoder) => {
    const pass = encoder.beginComputePass();

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);

    const workgroupCount = Math.ceil(vertexCount / workgroupSize);
    pass.dispatchWorkgroups(workgroupCount);

    pass.end();
  };

  return {
    encode,
  };
};
