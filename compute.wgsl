@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> previouses: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> forces: array<vec2<f32>>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;

    let dt = 0.016; // Time step (e.g., 16 ms per frame)

    var current = positions[index];
    var previous = previouses[index];
    var force = forces[index];

    force -= current;

    let position = 2 * current - previous + force * dt * dt;

    previouses[index] = current;
    positions[index] = position;

    forces[index] = vec2<f32>(0.0, 0.0);
}
