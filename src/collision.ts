import { bindGroupFromBuffers } from "./device";
import { positions, triangles } from "./model";

export const createCollisionPipeline = async ({
  device,
  positionBuffer,
  triangleBuffer,
}: {
  device: GPUDevice;
  positionBuffer: GPUBuffer;
  triangleBuffer: GPUBuffer;
}) => {
  const module = device.createShaderModule({
    code: await (
      await fetch(new URL("./collision.wgsl", import.meta.url))
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
    positionBuffer,
    triangleBuffer,
  ]);

  const encode = (encoder: GPUCommandEncoder) => {
    const pass = encoder.beginComputePass();

    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);

    const workgroupCount1 = Math.ceil(positions.length / 16);
    const workgroupCount2 = Math.ceil(triangles.length / 16);
    pass.dispatchWorkgroups(workgroupCount1, workgroupCount2);

    pass.end();
  };

  return { encode };
};
