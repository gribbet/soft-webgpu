@group(0) @binding(0) var<storage, read> originals: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> positions: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> adjacencies: array<u32>;
@group(0) @binding(3) var<storage, read_write> forces: array<vec2<f32>>;

const n = 8u;
const q = 10000.0;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;

    var force = vec2(0.0, -10.0);

    for (var z = 0u; z < n; z++) {
        let q = i * 2 * n + 2 * z;
        let j = adjacencies[q];
        let k = adjacencies[q + 1];
        if (j == 0xffffffff) { break; }
        force += spring_force(i, j);
        if (k == 0xffffffff) { continue; }
        force += pressure_force(i, j, k);
    }

    forces[i] = force;
}

fn spring_force(i: u32, j: u32) -> vec2<f32> {
    let v = positions[i] - positions[j];
    let current_length = length(v);
    let original_length = length(originals[i] - originals[j]);
    return -q * v * (current_length - original_length) / current_length;
}

fn pressure_force(i: u32, j: u32, k: u32) -> vec2<f32> {
    let a = positions[i];
    let b = positions[j];
    let c = positions[k];
    let current_area = area(a, b, c);
    let original_area = area(originals[i], originals[j], originals[k]);
    let pressure = original_area / current_area - 1.0;
    return 100000.0 * pressure * 0.5 * perp(c - b);
}

fn perp(v: vec2<f32>) -> vec2<f32> {
    return vec2(-v.y, v.x);
}

fn area(a: vec2<f32>, b: vec2<f32>, c: vec2<f32>) -> f32 {
    return -0.5 * (dot(a, perp(b)) + dot(b, perp(c)) + dot(c, perp(a)));
}