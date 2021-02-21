const vertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

out vec3 worldPosition;
out vec3 worldNormal;
out vec2 texCoord;

void main()
{
    worldPosition = vec3(model * vec4(aPosition, 1.0));
    worldNormal = normalize(vec3(model * vec4(aNormal, 0.0)));
    texCoord = aTexCoord;
    gl_Position = projection * view * model * vec4(aPosition, 1.0);
}`;

const fragmentShaderCode = `#version 300 es
precision highp float;

in vec3 worldPosition;
in vec3 worldNormal;
in vec2 texCoord;

uniform sampler2D texture1;
uniform int shouldSampleTexture;
uniform vec3 playerColour;

out vec4 outputColor;

void main()
{
    vec3 lightPos = vec3(0.0, 10.0, 0.0);
    vec3 lightColor = vec3(1.0, 1.0, 1.0);
    vec3 lightDir = normalize(lightPos - worldPosition);

    vec3 diff = ((max(dot(lightDir, worldNormal), 0.0)) + vec3(0.3, 0.3, 0.3)) * playerColour;
    outputColor = vec4(diff, 1.0);
}`;

export default { vertexShaderCode, fragmentShaderCode };
