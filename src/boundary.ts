import { workgroupSize } from "./configuration";
import { bindGroupFromBuffers } from "./device";
import { positions } from "./model";

export const createBoundaryPipeline = async ({
  device,
  positionBuffer,
  previousBuffer,
  boundaryBuffer,
}: {
  device: GPUDevice;
  positionBuffer: GPUBuffer;
  previousBuffer: GPUBuffer;
  boundaryBuffer: GPUBuffer;
}) => {
  const module = device.createShaderModule({
    code: await (
      await fetch(new URL("./boundary.wgsl", import.meta.url))
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
    boundaryBuffer,
    positionBuffer,
    previousBuffer,
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
