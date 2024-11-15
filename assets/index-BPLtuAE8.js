(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))t(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const c of a.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&t(c)}).observe(document,{childList:!0,subtree:!0});function r(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function t(n){if(n.ep)return;n.ep=!0;const a=r(n);fetch(n.href,a)}})();const x=64,k=8,y=(e,o,r)=>{const t=e.createBuffer({size:r.byteLength,usage:o|GPUBufferUsage.COPY_DST,mappedAtCreation:!0}),n=r instanceof Uint32Array?Uint32Array:Float32Array;return new n(t.getMappedRange()).set(r),t.unmap(),t},M=(e,o,r)=>e.createBindGroup({layout:o.getBindGroupLayout(0),entries:r.map((t,n)=>({binding:n,resource:{buffer:t}}))}),L=.1,q=.75,R=.0125,A=Math.floor(L/R),I=Math.floor(q/R),U=new Array(I+1).fill(0).flatMap((e,o)=>new Array(A+1).fill(0).map((r,t)=>[R*t-o*R/2-L*.5,R*o*Math.sqrt(3)/2-q*.5])),T=new Array(A).fill(0).flatMap((e,o)=>new Array(I).fill(0).flatMap((r,t)=>[[t*(A+1)+o,t*(A+1)+o+1,(t+1)*(A+1)+o+1],[t*(A+1)+o,(t+1)*(A+1)+o+1,(t+1)*(A+1)+o]])),z=e=>new Array(4).fill(0).map((o,r,{length:t})=>{const n=e/2e3+2*(r*Math.PI)/t;return{normal:[Math.cos(n),Math.sin(n)],offset:-.5}}),W=async({device:e,positionBuffer:o,previousBuffer:r,boundaryBuffer:t})=>{const n=e.createShaderModule({code:await(await fetch("boundary.wgsl")).text()}),a=e.createComputePipeline({layout:"auto",compute:{module:n,entryPoint:"main"}}),c=M(e,a,[t,o,r]);return{encode:l=>{const s=l.beginComputePass();s.setPipeline(a),s.setBindGroup(0,c);const d=Math.ceil(U.length/x);s.dispatchWorkgroups(d),s.end()}}},Y=x*Math.ceil(U.length/x),E=new Float32Array(Y*2);E.set(new Float32Array(U.flat()));const H=new Uint32Array(T.flat()),K=U.reduce((e,o,r)=>(e[r]=T.filter(t=>t.includes(r)).map(([t,n,a])=>t===r?[n,a]:n===r?[a,t]:[t,n]),e),{}),b=new Uint32Array(Y*k*2);b.fill(4294967295);b.set(U.flatMap((e,o)=>new Array(k).fill(0).flatMap((r,t)=>(K[o]??[])[t]??[4294967295,4294967295])));const N=e=>new Float32Array(e.flatMap(({normal:[o=0,r=0],offset:t})=>[o,r,t,0])),X=async({device:e,deltaBuffer:o,adjacencyBuffer:r,positionBuffer:t,previousBuffer:n,forceBuffer:a})=>{const c=y(e,GPUBufferUsage.STORAGE,E),i=e.createShaderModule({code:await(await fetch("forces.wgsl")).text()}),l=e.createComputePipeline({layout:"auto",compute:{module:i,entryPoint:"main"}}),s=M(e,l,[o,r,c,t,n,a]);return{encode:f=>{const g=f.beginComputePass();g.setPipeline(l),g.setBindGroup(0,s);const m=Math.ceil(U.length/x);g.dispatchWorkgroups(m),g.end()}}},J=async({device:e,deltaBuffer:o,selectedBuffer:r,anchorBuffer:t,positionBuffer:n,previousBuffer:a,forceBuffer:c})=>{const i=y(e,GPUBufferUsage.UNIFORM,new Float32Array([R])),l=e.createShaderModule({code:await(await fetch("integrate.wgsl")).text()}),s=e.createComputePipeline({layout:"auto",compute:{module:l,entryPoint:"main"}}),d=M(e,s,[i,o,r,t,n,a,c]);return{encode:g=>{const m=g.beginComputePass();m.setPipeline(s),m.setBindGroup(0,d);const p=Math.ceil(U.length/x);m.dispatchWorkgroups(p),m.end()}}},D=64,Q=async({device:e,selectedBuffer:o,anchorBuffer:r,positionBuffer:t,boundaryBuffer:n})=>{const a=y(e,GPUBufferUsage.UNIFORM,new Float32Array([0])),c=y(e,GPUBufferUsage.STORAGE,b),i=y(e,GPUBufferUsage.STORAGE,E),l=y(e,GPUBufferUsage.STORAGE,E.map(()=>0)),s=p=>e.queue.writeBuffer(a,0,new Float32Array([p])),d=await X({device:e,deltaBuffer:a,adjacencyBuffer:c,positionBuffer:t,previousBuffer:i,forceBuffer:l}),f=await J({device:e,deltaBuffer:a,selectedBuffer:o,anchorBuffer:r,positionBuffer:t,previousBuffer:i,forceBuffer:l}),g=await W({device:e,positionBuffer:t,previousBuffer:i,boundaryBuffer:n});return{compute:p=>{s(p/D);const P=e.createCommandEncoder();for(let B=0;B<D;B++)d.encode(P),f.encode(P),g.encode(P);e.queue.submit([P.finish()])}}},Z=async({device:e,aspectBuffer:o,positionBuffer:r})=>{const t=e.createShaderModule({code:await(await fetch("pick.wgsl")).text()}),n=e.createRenderPipeline({layout:"auto",vertex:{module:t,entryPoint:"vertex"},fragment:{module:t,entryPoint:"fragment",targets:[{format:"r32uint"}]}}),a=M(e,n,[o,r]);return{encode:i=>{i.setPipeline(n),i.setBindGroup(0,a),i.draw(6,U.length,0,0)}}},$=async({device:e,aspectBuffer:o,positionBuffer:r})=>{const t=await Z({device:e,aspectBuffer:o,positionBuffer:r}),n="r32uint",a=GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_SRC;let c=e.createTexture({size:[1,1],format:n,usage:a});return{pick:async([s,d])=>{const f=e.createBuffer({size:Uint32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),g=e.createCommandEncoder(),m=c.createView(),p=g.beginRenderPass({colorAttachments:[{view:m,loadOp:"clear",storeOp:"store"}]});t.encode(p),p.end(),g.copyTextureToBuffer({texture:c,origin:{x:s,y:d}},{buffer:f},{width:1,height:1,depthOrArrayLayers:1}),e.queue.submit([g.finish()]),await f.mapAsync(GPUMapMode.READ);const[P=0]=new Uint32Array(f.getMappedRange());return f.destroy(),P-1},resize:s=>{c.destroy(),c=e.createTexture({size:s,format:n,usage:a})}}},j=[[-1,-1],[1,-1],[-1,1],[1,1]],v=async({device:e,format:o,aspectBuffer:r,boundaryBuffer:t})=>{const n=y(e,GPUBufferUsage.STORAGE,new Float32Array(j.flat())),a=e.createShaderModule({code:await(await fetch("background.wgsl")).text()}),c=e.createRenderPipeline({layout:"auto",vertex:{module:a,entryPoint:"vertex"},fragment:{module:a,entryPoint:"fragment",targets:[{format:o}]},primitive:{topology:"triangle-strip"},multisample:{count:4}}),i=M(e,c,[r,n,t]);return{encode:s=>{s.setPipeline(c),s.setBindGroup(0,i),s.draw(4)}}},ee=async({device:e,format:o,aspectBuffer:r,positionBuffer:t,triangleBuffer:n})=>{const a=e.createShaderModule({code:await(await fetch("render.wgsl")).text()}),c=e.createRenderPipeline({layout:"auto",vertex:{module:a,entryPoint:"vertex"},fragment:{module:a,entryPoint:"fragment",targets:[{format:o}]},multisample:{count:4}}),i=M(e,c,[r,t,n]);return{encode:s=>{s.setPipeline(c),s.setBindGroup(0,i),s.draw(3,T.length,0,0)}}},te=async({device:e,context:o,format:r,aspectBuffer:t,boundaryBuffer:n,positionBuffer:a})=>{const c=y(e,GPUBufferUsage.STORAGE,H),i=await v({device:e,format:r,aspectBuffer:t,boundaryBuffer:n}),l=await ee({device:e,format:r,aspectBuffer:t,positionBuffer:a,triangleBuffer:c}),s=GPUTextureUsage.RENDER_ATTACHMENT,d=4;let f=e.createTexture({size:[1,1],sampleCount:d,format:r,usage:s});return{resize:([p,P])=>{f.destroy(),f=e.createTexture({size:[p*devicePixelRatio,P*devicePixelRatio],sampleCount:d,format:r,usage:s})},render:()=>{const p=e.createCommandEncoder(),P=f.createView(),B=o.getCurrentTexture().createView(),G=p.beginRenderPass({colorAttachments:[{view:P,resolveTarget:B,loadOp:"clear",storeOp:"discard"}]});i.encode(G),l.encode(G),G.end(),e.queue.submit([p.finish()])}}},ne=async()=>{const{gpu:e}=navigator,o=await e.requestAdapter();if(!o)throw new Error;const r=await o.requestDevice(),{queue:t}=r,n=document.createElement("canvas");document.body.appendChild(n);const a=n.getContext("webgpu");if(!a)throw new Error;const c=e.getPreferredCanvasFormat();a.configure({device:r,format:c});const i=y(r,GPUBufferUsage.UNIFORM,new Float32Array([1])),l=y(r,GPUBufferUsage.UNIFORM,new Uint32Array([-1])),s=y(r,GPUBufferUsage.UNIFORM,new Float32Array([0,0])),d=y(r,GPUBufferUsage.STORAGE,E),f=y(r,GPUBufferUsage.STORAGE,N(z(0))),g=u=>t.writeBuffer(i,0,new Float32Array([u])),m=u=>t.writeBuffer(l,0,new Uint32Array([u])),p=u=>t.writeBuffer(s,0,new Float32Array(u)),P=u=>t.writeBuffer(f,0,N(u)),B=await Q({device:r,selectedBuffer:l,anchorBuffer:s,positionBuffer:d,boundaryBuffer:f}),G=await te({device:r,context:a,format:c,aspectBuffer:i,boundaryBuffer:f,positionBuffer:d}),O=await $({device:r,aspectBuffer:i,positionBuffer:d});new ResizeObserver(([u])=>{const{width:w=0,height:h=0}=(u==null?void 0:u.contentRect)??{};n.width=w*devicePixelRatio,n.height=h*devicePixelRatio,G.resize([w,h]),O.resize([w,h]),g(w/h)}).observe(n);const C=([u,w])=>{const{width:h,height:_}=n,V=h/_;return[2*(u/(h/devicePixelRatio))-1,(1-2*(w/(_/devicePixelRatio)))/V]};n.addEventListener("mousedown",async({x:u,y:w})=>{const h=await O.pick([u,w]);m(h),p(C([u,w]))}),n.addEventListener("mousemove",({x:u,y:w,buttons:h})=>{h!==0&&p(C([u,w]))}),n.addEventListener("mouseup",()=>m(-1));let F;const S=u=>{requestAnimationFrame(S);const w=(u-(F??u))/1e3;F=u,w!==0&&(P(z(u)),B.compute(w),G.render())};requestAnimationFrame(S)};ne();