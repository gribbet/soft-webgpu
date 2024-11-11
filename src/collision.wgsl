@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> triangles: array<array<u32, 3>>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;
    let j = global_id.y;

    let triangle = triangles[j];
    if (i == triangle[0] || i == triangle[1] || i == triangle[2]) {
        return;
    }

    let v = positions[i];

    let a = positions[triangle[0]];
    let b = positions[triangle[1]];
    let c = positions[triangle[2]];

    let n1 = normalize(perp(a - b));
    let n2 = normalize(perp(b - c));
    let n3 = normalize(perp(c - a));

    let d1 = dot(v - b, n1);
    let d2 = dot(v - c, n2);
    let d3 = dot(v - a, n3);

    if (d1 >= 0 || d2 >= 0 || d3 >= 0) {
        return;
    }

    if (abs(d1) < abs(d2) && abs(d1) < abs(d3)) { 
        positions[i] -= (d1 + 0.0) * n1;
    } else if (abs(d2) < abs(d1) && abs(d2) < abs(d3)) {
        positions[i] -= (d2 + 0.0) * n2;
    } else if (abs(d3) < abs(d1) && abs(d3) < abs(d2)) {
        positions[i] -= (d3 + 0.0) * n3;
    }
}

fn perp(v: vec2<f32>) -> vec2<f32> {
    return vec2(-v.y, v.x);
}
