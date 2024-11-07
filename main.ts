import { createBackgroundPipeline } from "./background";
import { boundaryData, positionData } from "./data";
import { createBuffer } from "./device";
import { createForcesPipeline } from "./forces";
import { createIntegratePipeline } from "./integrate";
import { createRenderPipeline } from "./render";

/*
 Collision detection
 */

async function init() {
  const { gpu } = navigator;
  if (!gpu) throw new Error();

  const adapter = await gpu.requestAdapter();
  if (!adapter) throw new Error();
  const device = await adapter.requestDevice();

  const { queue } = device;

  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);

  const context = canvas.getContext("webgpu");
  if (!context) throw new Error();

  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  const aspectBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array([1.0])
  );
  const positionBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData
  );
  const boundaryBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    boundaryData(0)
  );
  const forceBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData.map((_) => 0)
  );

  const forces = await createForcesPipeline({
    device,
    positionBuffer,
    forceBuffer,
  });
  const integrate = await createIntegratePipeline({
    device,
    positionBuffer,
    boundaryBuffer,
    forceBuffer,
  });
  const background = await createBackgroundPipeline({
    device,
    format,
    aspectBuffer,
    boundaryBuffer,
  });
  const render = await createRenderPipeline({
    device,
    format,
    aspectBuffer,
    positionBuffer,
  });

  new ResizeObserver(([entry]) => {
    const { width = 0, height = 0 } = entry?.contentRect ?? {};
    canvas.width = width * devicePixelRatio * 2;
    canvas.height = height * devicePixelRatio * 2;
    const aspect = width / height;
    device.queue.writeBuffer(aspectBuffer, 0, new Float32Array([aspect]));
  }).observe(canvas);

  let last: number | undefined;
  const frame = (time: number) => {
    requestAnimationFrame(frame);

    const interval = last !== undefined ? (time - last) / 1000 : 0;
    last = time;

    queue.writeBuffer(boundaryBuffer, 0, boundaryData(time));

    const encoder = device.createCommandEncoder();

    const steps = 64;
    for (let i = 0; i < steps; i++) {
      forces.encode(encoder);
      integrate.encode(encoder, interval / steps);
    }

    const view = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    background.encode(pass);
    render.encode(pass);
    pass.end();

    queue.submit([encoder.finish()]);
  };

  requestAnimationFrame(frame);
}

init();
