@group(0) @binding(0) var<uniform> aspect: f32;
@group(0) @binding(1) var<storage, read> positions: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> boundaries: array<vec3<f32>>;

struct VertexOutput {
    @builtin(position) clip: vec4<f32>,
    @location(0) position: vec2<f32>
};

@vertex
fn vertex(@builtin(vertex_index) i: u32) -> VertexOutput {
    let position = positions[i];
    var output = VertexOutput();
    output.clip = vec4<f32>(position, 0.0, 1.0);
    output.position = position / vec2(1.0, aspect);
    return output;
}

@fragment
fn fragment(@location(0) position: vec2<f32>) -> @location(0) vec4<f32> {
    for (var i = 0u; i < arrayLength(&boundaries); i++) {
        let normal = boundaries[i].xy;
        let offset = boundaries[i].z;
        let distance = dot(position, normal) - offset;

        if (distance < 0) {
            return vec4<f32>(0.2, 0.2, 0.2, 1.0);
        }
    }
    return vec4<f32>(0, 0, 0, 1.0);
}