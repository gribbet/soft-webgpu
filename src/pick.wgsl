@group(0) @binding(0) var<uniform> aspect: f32;
@group(0) @binding(1) var<storage, read> positions: array<vec2<f32>>;

struct Output {
    @builtin(position) position: vec4<f32>,
    @location(0) @interpolate(flat) index: u32,
}

const vertices = array(
    vec2<f32>(-1, -1), vec2<f32>(1, -1), vec2<f32>(-1, 1), 
    vec2<f32>(-1, 1), vec2<f32>(1, -1), vec2<f32>(1, 1)
);

@vertex
fn vertex(
    @builtin(vertex_index) v: u32,
    @builtin(instance_index) i: u32
) -> Output {
    let position = (positions[i] + vertices[v] * 0.02) * vec2(1.0, aspect);
    return Output(vec4(position, 0, 1.0), i);
}

@fragment
fn fragment(@location(0) @interpolate(flat) index: u32) -> @location(0) u32 {
    return index + 1;
}