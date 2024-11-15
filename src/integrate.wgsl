@group(0) @binding(0) var<uniform> size: f32;
@group(0) @binding(1) var<uniform> time: f32;
@group(0) @binding(2) var<uniform> selected: u32;
@group(0) @binding(3) var<uniform> anchor: vec2<f32>;
@group(0) @binding(4) var<storage, read> boundaries: array<Boundary>; 
@group(0) @binding(5) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(6) var<storage, read_write> previouses: array<vec2<f32>>;
@group(0) @binding(7) var<storage, read> forces: array<vec2<f32>>;

struct Boundary {
    normal: vec2<f32>,
    offset: f32
};

const damping = 0.0;
const gravity = vec2(0, -10.0);

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;

    var current = positions[i];
    let previous = previouses[i];
    let mass = size * size;
    var force = forces[i] + gravity * mass;

    var position = current + exp(-damping * time) * (current - previous) + force / mass * time * time;

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

    if i == selected {
        position = anchor;
        current = anchor;
    }

    previouses[i] = current;
    positions[i] = position;
}
