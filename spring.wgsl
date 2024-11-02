@group(0) @binding(0) var<storage, read> original: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> positions: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> forces: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> adjacencies: array<u32>;

const n = 8u;
const k = 2000.0;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;
    var force = vec2(0.0, -1.0);

    for (var z = 0u; z < n; z++) {
        let j = adjacencies[i*n + z];
        if (j == 0xffff) { 
            break;
        }
        let a = positions[i];
        let b = positions[j];
        let v = a - b;
        let current_length = length(v);
        let original_length = length(original[i] - original[j]);
        force -= k * v * (current_length - original_length) / current_length;
    }

    forces[i] = force;
}
