@group(0) @binding(0) var<uniform> aspect: f32;
@group(0) @binding(1) var<storage, read> positions: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> triangles: array<array<u32, 3>>;

@vertex
fn vertex(
    @builtin(vertex_index) v: u32,
    @builtin(instance_index) i: u32
) -> @builtin(position) vec4<f32> {
    return vec4<f32>(positions[triangles[i][v]] * vec2(1.0, aspect), 0.0, 1.0);
}

@fragment
fn fragment() -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 1.0, 1.0, 1.0);
}