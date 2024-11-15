@group(0) @binding(0) var<storage, read> boundaries: array<Boundary>; 
@group(0) @binding(1) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> previouses: array<vec2<f32>>;

const friction = 0.5;

struct Boundary {
    normal: vec2<f32>,
    offset: f32
};

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = global_id.x;

    var position = positions[i];
    var previous = previouses[i];

    for (var j = 0u; j < arrayLength(&boundaries); j++) {
        let boundary = boundaries[j];
        let normal = boundary.normal;
        let offset = boundary.offset;

        let distance = dot(position, normal) - offset;
        if distance < 0 {
            position -= distance * normal;
            let velocity = position - previous;
            let normal_velocity = dot(velocity, normal) * normal;
            let tangential_velocity = velocity - normal_velocity;
            let new_velocity = -normal_velocity + tangential_velocity * (1.0 - friction);
            previous = position - new_velocity;
        }
    }

    positions[i] = position;
    previouses[i] = previous;
}
