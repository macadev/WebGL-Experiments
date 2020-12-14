const vertexShaderCode = `
attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

varying highp vec3 worldPosition;
varying highp vec3 worldNormal;

void main()
{
    worldPosition = vec3(model * vec4(aPosition, 1.0));
    worldNormal = vec3(model * vec4(aNormal, 0.0));
    gl_Position = projection * view * model * vec4(aPosition, 1.0);
}`;

const fragmentShaderCode = `
varying highp vec3 worldPosition;
varying highp vec3 worldNormal;

void main()
{
    highp vec3 lightPos = vec3(0.0, -5.0, 5.0);
    highp vec3 lightColor = vec3(0.73, 0.0, 0.0);

    highp vec3 lightDir = normalize(lightPos - worldPosition);
    highp vec3 diff = max(dot(lightDir, worldNormal), 0.0) * lightColor;

    gl_FragColor = vec4(diff, 1.0);
}`;

export { vertexShaderCode, fragmentShaderCode };
