@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> previouses: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> forces: array<vec2<f32>>;

const damping = 1.0;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;

    var current = positions[i];
    var previous = previouses[i];
    var force = forces[i];

    var position = current + damping * (current - previous) + force * time * time;

    if (position.y < 0) {
        position.y = 0;
    } 

    previouses[i] = current;
    positions[i] = position;
}
