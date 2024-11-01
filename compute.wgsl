@group(0) @binding(0) var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> forces: array<vec2<f32>>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;

    // Parameters
    let dt = 0.016; // Time step (e.g., 16 ms per frame)

    // Retrieve current values
    var position = positions[index];
    var velocity = velocities[index];
    var force = forces[index];

    force += -position;

    // Integrate force to update velocity
    velocity += force * dt;

    // Integrate velocity to update position
    position += velocity * dt;

    // Write back updated values
    velocities[index] = velocity;
    positions[index] = position;

    // Reset force for the next frame
    forces[index] = vec2<f32>(0.0, 0.0);
}
