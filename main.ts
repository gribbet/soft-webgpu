import { positions } from "./model";
import { createRenderPipeline } from "./render";
import { createIntegratePipeline } from "./integrate";
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

  new ResizeObserver(([entry]) => {
    const { width = 0, height = 0 } = entry?.contentRect ?? {};
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
  }).observe(canvas);

  const context = canvas.getContext("webgpu");
  if (!context) throw new Error();

  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  const positionData = new Float32Array(positions.flat());
  const positionBuffer = device.createBuffer({
    size: positionData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(positionBuffer.getMappedRange()).set(positionData);
  positionBuffer.unmap();

  const forceBuffer = device.createBuffer({
    size: positionData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
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

  let last: DOMHighResTimeStamp | undefined;
  const frame = (time: number) => {
    requestAnimationFrame(frame);

    const encoder = device.createCommandEncoder();

    const interval = last !== undefined ? (time - last) / 1000 : 0;
    last = time;

    spring.encode(encoder);
    integrate.encode(encoder, interval);
    render.encode(encoder);

    queue.submit([encoder.finish()]);
  };

  requestAnimationFrame(frame);
}

init();
