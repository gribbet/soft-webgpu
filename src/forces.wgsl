@group(0) @binding(0) var<uniform> selected: u32;
@group(0) @binding(1) var<uniform> anchor: vec2<f32>;
@group(0) @binding(2) var<storage, read> adjacencies: array<array<array<u32, 2>, n>>;
@group(0) @binding(3) var<storage, read> originals: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read> positions: array<vec2<f32>>;
@group(0) @binding(5) var<storage, read_write> forces: array<vec2<f32>>;

const n = 8u;
const stiffness = 300000.0;
 
const identity = mat2x2<f32>(1.0, 0.0, 0.0, 1.0);

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;

    var force = vec2<f32>(0, -10.0);

    force += body_forces(i);

    if (i == selected) {
        force += 20000.0 * (anchor - positions[i]);
    }

    forces[i] = force;
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

    let r0 = originals[i];
    let r1 = originals[j];
    let r2 = originals[k];

    let deformation = mat2x2(p1 - p0, p2 - p0) * inverse(mat2x2(r1 - r0, r2 - r0));
    let scale_shear = mat2x2_sqrt(transpose(deformation) * deformation);
    let rotation = deformation * inverse(scale_shear);
    let strain = scale_shear - identity;
    let stress = stiffness * strain;
    return rotation * stress * (r1 + r2 - 2 * r0);
}

fn inverse(m: mat2x2<f32>) -> mat2x2<f32> {
    let determinant = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    if (determinant < 1e-5) {
        return identity;
    }
    return mat2x2<f32>(
        m[1][1] / determinant, -m[0][1] / determinant,
       -m[1][0] / determinant,  m[0][0] / determinant
    );
}

fn mat2x2_sqrt(m: mat2x2<f32>) -> mat2x2<f32> {
    let trace = m[0][0] + m[1][1];
    let det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    
    let discriminant = trace * trace - 4.0 * det;
    if (discriminant < 0.0) { 
        return identity;
    }

    let lambda1 = 0.5 * (trace + sqrt(discriminant));
    let lambda2 = 0.5 * (trace - sqrt(discriminant));
    
    var v1 = vec2<f32>(m[0][0] - lambda2, m[0][1]);
    var v2 = vec2<f32>(m[0][1], m[1][1] - lambda1);
    
    if (length(v1) > 1e-5) {
        v1 = normalize(v1);
    } else {
        v1 = vec2<f32>(1.0, 0.0);
    }
    
    if (length(v2) > 1e-5) {
        v2 = normalize(v2);
    } else {
        v2 = vec2<f32>(0.0, 1.0);
    }
    
    let v = mat2x2<f32>(v1, v2);
    let d_sqrt = mat2x2<f32>(sqrt(lambda1), 0.0, 0.0, sqrt(lambda2));
    let v_inv = mat2x2<f32>(v[1][1], -v[0][1], -v[1][0], v[0][0]) * (1.0 / (v[0][0] * v[1][1] - v[0][1] * v[1][0]));
    return v * d_sqrt * v_inv;
}