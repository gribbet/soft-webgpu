@group(0) @binding(0) var<uniform> delta: f32;
@group(0) @binding(1) var<uniform> selected: u32;
@group(0) @binding(2) var<uniform> anchor: vec2<f32>;
@group(0) @binding(3) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read_write> previouses: array<vec2<f32>>;
@group(0) @binding(5) var<storage, read> forces: array<vec2<f32>>;


const damping = 0.0;
const gravity = vec2(0, -10.0);
const size = 0.04;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;

    var current = positions[i];
    let previous = previouses[i];
    let mass = size * size;
    let force = forces[i] + gravity * mass;
    var position = current + exp(-damping * delta) * (current - previous) + force / mass * delta * delta;

    if i == selected {
        position = anchor;
        current = anchor;
    }

    previouses[i] = current;
    positions[i] = position;
}
