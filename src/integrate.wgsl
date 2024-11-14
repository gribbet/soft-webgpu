@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<storage, read> boundaries: array<Boundary>; 
@group(0) @binding(2) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> previouses: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read> forces: array<vec2<f32>>;

struct Boundary {
    normal: vec2<f32>,
    offset: f32
};

const damping = 1.0;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;

    var current = positions[i];
    let previous = previouses[i];
    var force = forces[i];

    var position = current + exp(-damping * time) * (current - previous) + force * time * time;

    for (var j = 0u; j < arrayLength(&boundaries); j++) {
        let boundary = boundaries[j];
        let normal = boundary.normal;
        let offset = boundary.offset;

        let distance = dot(position, normal) - offset;
        if (distance < 0) {
            position -= distance * normal;
        }

        let distance2 = dot(current, normal) - offset;
        if (distance < 0) {
            current -= distance2 * normal;
        }
    }

    previouses[i] = current;
    positions[i] = position;
}
