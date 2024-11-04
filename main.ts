import { createBuffer } from "./device";
import { createIntegratePipeline } from "./integrate";
import { positionData } from "./model";
import { createRenderPipeline } from "./render";
import { createSpringPipeline } from "./spring";

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

  const positionBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData
  );

  const forceBuffer = device.createBuffer({
    size: positionBuffer.size,
    usage: GPUBufferUsage.STORAGE,
  });

  const spring = await createSpringPipeline({
    device,
    positionBuffer,
    forceBuffer,
  });
  const integrate = await createIntegratePipeline({
    device,
    positionBuffer,
    forceBuffer,
  });
  const render = await createRenderPipeline({
    device,
    context,
    positionBuffer,
  });

  new ResizeObserver(([entry]) => {
    const { width = 0, height = 0 } = entry?.contentRect ?? {};
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    render.aspect = width / height;
  }).observe(canvas);

  let last: DOMHighResTimeStamp | undefined;
  const frame = (time: number) => {
    requestAnimationFrame(frame);

    const encoder = device.createCommandEncoder();

    const interval = last !== undefined ? (time - last) / 1000 : 0;
    last = time;

    const steps = 10;
    for (let i = 0; i < steps; i++) {
      spring.encode(encoder);
      integrate.encode(encoder, interval / steps);
    }
    render.encode(encoder);
    queue.submit([encoder.finish()]);
  };

  requestAnimationFrame(frame);
}

init();
