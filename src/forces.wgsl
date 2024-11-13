@group(0) @binding(0) var<uniform> selected: u32;
@group(0) @binding(1) var<uniform> anchor: vec2<f32>;
@group(0) @binding(2) var<storage, read> originals: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> positions: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read> velocities: array<vec2<f32>>;
@group(0) @binding(5) var<storage, read> adjacencies: array<array<u32, n>>;
@group(0) @binding(6) var<storage, read_write> forces: array<vec2<f32>>;

const n = 8u;
const k = 2000.0;
const damping = 000.0;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;

    let gravity = vec2(0, -1.0);

    var force = vec2<f32>(0, 0);

    force += gravity;
    force += spring_forces(i);

    if (i == selected) {
        force += 000.0 * (anchor - positions[i]);
    }

    forces[i] = force;
}

fn spring_forces(i: u32) -> vec2<f32> { 
    var force = vec2(0.0, 0.0);
    let adjacency = adjacencies[i];
    for (var z = 0u; z < n; z++) {
        let j = adjacency[z];
        if (j == 0xffffffff) { break; }
        force += spring_force(i, j);
    }
    return force;
}

fn spring_force(i: u32, j: u32) -> vec2<f32> {
    let adjacency = adjacencies[j];
    let center = center(j);
    let original_center = original_center(j);
    var a = 0.0;
    var b = 0.0;
    for (var z = 0u; z < n; z++) {
        let k = adjacency[z];
        if (k == 0xffffffff) { break; }
        let r = positions[k] - center;
        let q = originals[k] - original_center;
        a += dot(r, q);
        b += dot(perp(r), q);
    }
    const epsilon = 0.01;
    var angle = 0.0;
    //if (abs(a) > epsilon && abs(b) > epsilon) {
    //    angle = atan2(b, a);
    //}
    let rotation = mat2x2<f32>(cos(angle), -sin(angle), sin(angle), cos(angle));
    let ideal = center + rotation * (originals[i] - original_center);   
    let position = positions[i];

    let relative_velocity = velocities[i] - velocities[j];

    var damping_force = 0.0;
    let test = length(ideal - position);
    damping_force = max(0, damping / test / test * dot(relative_velocity, ideal - position));

    return k * (ideal - position);
}


fn center(i: u32) -> vec2<f32> {
    let adjacency = adjacencies[i];
    var center = vec2<f32>(0, 0);
    var z = 0u;
    for (z = 0u; z < n; z++) {
        let j = adjacency[z];
        if (j == 0xffffffff) { break; }
        center += positions[j];
    }
    center /= f32(z);
    return center;
}

fn original_center(i: u32) -> vec2<f32> {
    let adjacency = adjacencies[i];
    var center = vec2<f32>(0, 0);
    var z = 0u;
    for (z = 0u; z < n; z++) {
        let j = adjacency[z];
        if (j == 0xffffffff) { break; }
        center += originals[j];
    }
    center /= f32(z);
    return center;
}

fn perp(v: vec2<f32>) -> vec2<f32> {
    return vec2(-v.y, v.x);
}