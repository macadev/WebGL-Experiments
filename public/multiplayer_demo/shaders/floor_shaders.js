const vertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

out vec3 worldPosition;
out vec3 worldNormal;
out vec3 vLighting;

void main()
{
    worldPosition = vec3(model * vec4(aPosition, 1.0));
    worldNormal = normalize(vec3(model * vec4(aNormal, 0.0)));
    gl_Position = projection * view * model * vec4(aPosition, 1.0);

    vec3 ambientLight = vec3(0.1, 0.1, 0.1);
    vec3 directionalLightColor = vec3(1, 1, 1);
    vec3 directionalVector = normalize(vec3(3, 10, 3));

    float directional = max(dot(aNormal.xyz, directionalVector), 0.0);
    vLighting = ambientLight + (directionalLightColor * directional);
}`;

const fragmentShaderCode = `#version 300 es
precision highp float;

in vec3 worldPosition;
in vec3 worldNormal;
in vec3 vLighting;

out vec4 outputColor;

void main()
{
    vec4 texelColor = vec4(0.0, 0.7, 0.0, 1.0);
    outputColor = vec4(texelColor.rgb * vLighting, texelColor.a);
}`;

export default { vertexShaderCode, fragmentShaderCode };
