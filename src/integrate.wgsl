@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<storage, read> boundaries: array<Boundary>; 
@group(0) @binding(2) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read_write> velocities: array<vec2<f32>>;
@group(0) @binding(4) var<storage, read> forces: array<vec2<f32>>;

struct Boundary {
    normal: vec2<f32>,
    offset: f32
};

const damping = 4.0;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;

    
    let force = forces[i] - velocities[i] * damping;
    velocities[i] += force * time;
    var position = positions[i] + velocities[i] * time;

    for (var j = 0u; j < arrayLength(&boundaries); j++) {
        let boundary = boundaries[j];
        let normal = boundary.normal;
        let offset = boundary.offset;

        let distance = dot(position, normal) - offset;
        if (distance < 0) {
            position -= distance * normal;
        }
    }

    positions[i] = position;
}
