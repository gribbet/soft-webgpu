@group(0) @binding(0) var<storage, read> original: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> positions: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> forces: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> edges: array<vec2<u32>>;

const k = 1000;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;

    let edge = edges[i];
    let v = positions[edge.y] - positions[edge.x];
    let current_length = length(v);
    let original_length = length(original[edge.y] - original[edge.x]);
    let force = k * v * (current_length - original_length) / current_length;
    
    forces[edge.x] += force;
    forces[edge.y] -= force;
}
