import { createBackgroundPipeline } from "./background";
import { createCollisionPipeline } from "./collision";
import {
  adjacencyData,
  boundaryData,
  positionData,
  triangleData,
} from "./data";
import { createBuffer } from "./device";
import { createForcesPipeline } from "./forces";
import { createIntegratePipeline } from "./integrate";
import { createRenderPipeline } from "./render";

/*
 interactivity
 Penalty collision
 Divergence
 Deployment
 Proper damping
 Even mesh
 */

const steps = 50;

const init = async () => {
  const { gpu } = navigator;
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

  const timeBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array([0]),
  );
  const selectedBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Uint32Array([-1]),
  );
  const anchorBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array([0, 0]),
  );
  const aspectBuffer = createBuffer(
    device,
    GPUBufferUsage.UNIFORM,
    new Float32Array([1.0]),
  );
  const adjacencyBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    adjacencyData,
  );
  const positionBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData,
  );
  const velocityBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    new Float32Array(positionData.length).fill(0),
  );
  const triangleBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    triangleData,
  );
  const boundaryBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    boundaryData(0),
  );
  const forceBuffer = createBuffer(
    device,
    GPUBufferUsage.STORAGE,
    positionData.map(() => 0),
  );

  const forces = await createForcesPipeline({
    device,
    selectedBuffer,
    anchorBuffer,
    adjacencyBuffer,
    positionBuffer,
    forceBuffer,
  });
  const integrate = await createIntegratePipeline({
    device,
    timeBuffer,
    positionBuffer,
    velocityBuffer,
    boundaryBuffer,
    forceBuffer,
  });
  const collision = await createCollisionPipeline({
    device,
    positionBuffer,
    triangleBuffer,
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
    triangleBuffer,
  });

  let texture = device.createTexture({
    size: [canvas.width, canvas.height],
    sampleCount: 4,
    format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  new ResizeObserver(([entry]) => {
    const { width = 0, height = 0 } = entry?.contentRect ?? {};
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    const aspect = width / height;
    texture.destroy();
    texture = device.createTexture({
      size: [width * devicePixelRatio, height * devicePixelRatio],
      sampleCount: 4,
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.writeBuffer(aspectBuffer, 0, new Float32Array([aspect]));
  }).observe(canvas);

  canvas.addEventListener("mousemove", event => {
    if (event.buttons === 0) return;
    const { width, height } = canvas;
    const aspect = width / height;
    const x = 2 * (event.x / (width / devicePixelRatio)) - 1;
    const y = (1 - 2 * (event.y / (height / devicePixelRatio))) / aspect;
    queue.writeBuffer(anchorBuffer, 0, new Float32Array([x, y]));
  });

  canvas.addEventListener("mousedown", () =>
    queue.writeBuffer(selectedBuffer, 0, new Float32Array([0])),
  );

  canvas.addEventListener("mouseup", () =>
    queue.writeBuffer(selectedBuffer, 0, new Float32Array([-1])),
  );

  let last: number | undefined;
  const frame = (time: number) => {
    requestAnimationFrame(frame);

    const interval = (time - (last ?? time)) / 1000;
    last = time;

    if (interval === 0) return;

    queue.writeBuffer(timeBuffer, 0, new Float32Array([interval / steps]));
    queue.writeBuffer(boundaryBuffer, 0, boundaryData(0));

    const encoder = device.createCommandEncoder();

    for (let i = 0; i < steps; i++) {
      forces.encode(encoder);
      integrate.encode(encoder);
      collision.encode(encoder);
    }

    const view = texture.createView();
    const resolveTarget = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view, resolveTarget, loadOp: "clear", storeOp: "discard" },
      ],
    });
    background.encode(pass);
    render.encode(pass);
    pass.end();

    queue.submit([encoder.finish()]);
  };

  requestAnimationFrame(frame);
};

void init();
