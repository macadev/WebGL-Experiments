const vertexShaderCode = `
attribute vec3 aPos;
attribute vec2 aTexCoord;

varying highp vec2 TexCoord;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

void main()
{
    gl_Position = projection * view * model * vec4(aPos, 1.0);
    TexCoord = aTexCoord;
}`;

const fragmentShaderCode = `
varying highp vec2 TexCoord;

uniform sampler2D texture1;
  
void main()
{
    gl_FragColor = texture2D(texture1, TexCoord);
}`;

export { vertexShaderCode, fragmentShaderCode };
