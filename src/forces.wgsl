@group(0) @binding(0) var<uniform> delta: f32;
@group(0) @binding(1) var<storage, read> adjacencies: array<array<array<u32, 2>, n>>;
@group(0) @binding(2) var<storage, read> originals: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> positions: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read> previouses: array<vec2<f32>>;
@group(0) @binding(5) var<storage, read_write> forces: array<vec2<f32>>;

const stiffness = 1000.0;
const damping = 0.25;
const n = 16u;
const epsilon = 1e-6;
 
const identity = mat2x2<f32>(1.0, 0.0, 0.0, 1.0);
const invalid = mat2x2<f32>();

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;
    forces[i] = body_forces(i);;
}

fn body_forces(i: u32) -> vec2<f32> {
    var force = vec2<f32>(0, 0);
    let adjacency = adjacencies[i];

    for (var z = 0u; z < n; z++) {
        let j = adjacency[z][0];
        let k = adjacency[z][1];
        if (j == 0xffffffff) { break; }
        force += body_force(i, j, k);
    }

    return force;
}

fn body_force(i: u32, j: u32, k: u32) -> vec2<f32> {
    let p0 = positions[i];
    let p1 = positions[j];
    let p2 = positions[k];
    
    let q0 = previouses[i];
    let q1 = previouses[j];
    let q2 = previouses[k];

    let r0 = originals[i];
    let r1 = originals[j];
    let r2 = originals[k];

    let inverse_original = inverse(mat2x2(r1 - r0, r2 - r0));
    let deformation = mat2x2(p1 - p0, p2 - p0) * inverse_original;
    var scale_shear = mat2x2_sqrt(transpose(deformation) * deformation);
    if is_invalid(scale_shear) || is_invalid(inverse(scale_shear)) {
        return vec2<f32>();
    }
    var rotation = deformation * inverse(scale_shear);
    if determinant(rotation) < 0.0 {
        scale_shear *= mat2x2<f32>(-1.0, 0, 0, 1.0);
        rotation = deformation * inverse(scale_shear);
    }

    let strain = scale_shear - identity;
    var stress = stiffness * strain;

    let v0 = (p0 - q0) / delta;
    let v1 = (p1 - q1) / delta;
    let v2 = (p2 - q2) / delta;

    let strain_rate = mat2x2<f32>(v1 - v0, v2 - v0) * inverse_original;

    return (rotation * stress + damping * strain_rate) * (r1 + r2 - 2 * r0);
}

fn mat2x2_sqrt(m: mat2x2<f32>) -> mat2x2<f32> {
    let trace = m[0][0] + m[1][1];
    let det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    
    let discriminant = trace * trace - 4.0 * det;
    if discriminant < 0.0 { return invalid; }

    let lambda1 = 0.5 * (trace + sqrt(discriminant));
    let lambda2 = 0.5 * (trace - sqrt(discriminant));
    
    var v1 = vec2<f32>(m[0][0] - lambda2, m[0][1]);
    var v2 = vec2<f32>(m[0][1], m[1][1] - lambda1);

    if (length(v1) <= epsilon && length(v2) <= epsilon) {
        return invalid;
    }
    
    if (length(v1) > epsilon) {
        v1 = normalize(v1);
    } else {
        v1 = perp(normalize(v2));
    }
    
    if (length(v2) > epsilon) {
        v2 = normalize(v2);
    } else {
        v2 = perp(v1);
    }
    
    let v = mat2x2<f32>(v1, v2);
    let d_sqrt = mat2x2<f32>(sqrt(abs(lambda1))*sign(lambda1), 0.0, 0.0, sqrt(abs(lambda2))*sign(lambda2));
    let v_inv = mat2x2<f32>(v[1][1], -v[0][1], -v[1][0], v[0][0]) * (1.0 / (v[0][0] * v[1][1] - v[0][1] * v[1][0]));
    return v * d_sqrt * v_inv;
}

fn perp(v: vec2<f32>) -> vec2<f32> {
    return vec2(-v.y, v.x);
}

fn determinant(m: mat2x2<f32>) -> f32 {
    return m[0][0] * m[1][1] - m[0][1] * m[1][0];
}

fn inverse(m: mat2x2<f32>) -> mat2x2<f32> {
    let det = determinant(m);
    if det < epsilon { return invalid; }
    return mat2x2<f32>(
        m[1][1] / det, -m[0][1] / det,
       -m[1][0] / det,  m[0][0] / det
    );
}

fn is_invalid(m: mat2x2<f32>) -> bool {
    return invalid[0][0] == m[0][0] 
        && invalid[1][0] == m[1][0]
        && invalid[0][1] == m[0][1]
        && invalid[1][1] == m[1][1];
}