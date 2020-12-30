const POSITION_SHADER_ATTRIBUTE = 'aPosition';
const NORMAL_SHADER_ATTRIBUTE = 'aNormal';
const TEXTURE_COORDINATE_SHADER_ATTRIBUTE = 'aTexCoord';

const TEXTURE_SAMPLER_NAME = 'texture1';

class Mesh {
  #gl;
  #shaderProgram;

  #vao;
  #ebo;
  #positionsAndNormalsVBO;
  #textureCoordinatesVBO;

  #indices;
  #positions;

  #texture;

  constructor({
    gl,
    shaderProgram,
    positions,
    normals,
    indices = [],
    textureData,
  }) {
    this.#gl = gl;
    this.#shaderProgram = shaderProgram;

    this.#vao = gl.createVertexArray();
    this.#positionsAndNormalsVBO = gl.createBuffer();

    this.#positions = positions;

    if (textureData !== undefined) {
      this.#textureCoordinatesVBO = gl.createBuffer();
      this.#texture = this.#loadTextureImageToGPU(textureData);
    }

    if (indices.length !== 0) {
      this.#ebo = gl.createBuffer();
      this.#indices = indices;
    }

    gl.bindVertexArray(this.#vao);
    this.#initializePositionsAndNormalsVBO(positions, normals);

    if (indices.length !== 0) {
      this.#initializeIndicesEBO(indices);
    }

    if (textureData !== undefined) {
      this.#initializeTextureCoordinatesVBO(textureData.textureCoordinateData);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  render() {
    let shouldSampleTexture = 0;
    if (this.#textureCoordinatesVBO !== undefined) {
      this.#gl.activeTexture(this.#gl.TEXTURE0);
      // Bind the texture to texture unit 0
      this.#gl.bindTexture(this.#gl.TEXTURE_2D, this.#texture);
      // Tell the shader we bound the texture to texture unit 0
      this.#gl.uniform1i(
        this.#gl.getUniformLocation(this.#shaderProgram, TEXTURE_SAMPLER_NAME),
        0
      );
      shouldSampleTexture = 1;
    }

    this.#gl.uniform1i(
      this.#gl.getUniformLocation(this.#shaderProgram, 'shouldSampleTexture'),
      shouldSampleTexture
    );

    this.#gl.bindVertexArray(this.#vao);
    if (this.#indices !== undefined) {
      this.#gl.drawElements(
        this.#gl.TRIANGLES,
        this.#indices.length,
        this.#gl.UNSIGNED_INT,
        0
      );
    } else {
      this.#gl.drawArrays(this.#gl.TRIANGLES, 0, this.#positions.length);
    }
    this.#gl.bindVertexArray(null);
  }

  #loadTextureImageToGPU(textureData) {
    const texture = this.#gl.createTexture();

    let textureInternalFormat;
    switch (textureData.imageChannelCount) {
      case 3:
        textureInternalFormat = this.#gl.RGB;
        break;
      case 4:
        textureInternalFormat = this.#gl.RGBA;
        break;
      default:
        throw `Unexpected texture channel count of [${textureData.imageChannelCount}]`;
    }

    this.#gl.bindTexture(this.#gl.TEXTURE_2D, texture);
    this.#gl.texImage2D(
      this.#gl.TEXTURE_2D,
      0,
      textureInternalFormat,
      textureData.htmlImage.width,
      textureData.htmlImage.height,
      0,
      textureInternalFormat,
      this.#gl.UNSIGNED_BYTE,
      textureData.htmlImage
    );

    const samplerConfig = textureData.textureSamplerConfiguration;
    samplerConfig.wrapS &&
      this.#gl.texParameteri(
        this.#gl.TEXTURE_2D,
        this.#gl.TEXTURE_WRAP_S,
        samplerConfig.wrapS
      );
    samplerConfig.wrapT &&
      this.#gl.texParameteri(
        this.#gl.TEXTURE_2D,
        this.#gl.TEXTURE_WRAP_T,
        samplerConfig.wrapT
      );
    samplerConfig.magFilter &&
      this.#gl.texParameteri(
        this.#gl.TEXTURE_2D,
        this.#gl.TEXTURE_MAG_FILTER,
        samplerConfig.magFilter
      );
    samplerConfig.minFilter &&
      this.#gl.texParameteri(
        this.#gl.TEXTURE_2D,
        this.#gl.TEXTURE_MIN_FILTER,
        samplerConfig.minFilter
      );
    this.#gl.generateMipmap(this.#gl.TEXTURE_2D);

    return texture;
  }

  #initializePositionsAndNormalsVBO(positions, normals) {
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#positionsAndNormalsVBO);
    this.#gl.bufferData(
      this.#gl.ARRAY_BUFFER,
      (positions.length + normals.length) * 4,
      this.#gl.STATIC_DRAW
    );
    this.#gl.bufferSubData(
      this.#gl.ARRAY_BUFFER,
      0,
      new Float32Array(positions)
    );
    this.#gl.bufferSubData(
      this.#gl.ARRAY_BUFFER,
      positions.length * 4,
      new Float32Array(normals)
    );

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#positionsAndNormalsVBO);
    const positionAttribLocation = this.#gl.getAttribLocation(
      this.#shaderProgram,
      POSITION_SHADER_ATTRIBUTE
    );
    this.#gl.vertexAttribPointer(
      positionAttribLocation,
      3,
      this.#gl.FLOAT,
      false,
      0,
      0
    );
    this.#gl.enableVertexAttribArray(positionAttribLocation);

    const normalAttribLocation = this.#gl.getAttribLocation(
      this.#shaderProgram,
      NORMAL_SHADER_ATTRIBUTE
    );
    this.#gl.vertexAttribPointer(
      normalAttribLocation,
      3,
      this.#gl.FLOAT,
      false,
      0,
      positions.length * 4
    );
    this.#gl.enableVertexAttribArray(normalAttribLocation);
  }

  #initializeIndicesEBO(indices) {
    this.#gl.bindBuffer(this.#gl.ELEMENT_ARRAY_BUFFER, this.#ebo);
    this.#gl.bufferData(
      this.#gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(indices),
      this.#gl.STATIC_DRAW
    );
  }

  #initializeTextureCoordinatesVBO(textureCoordinates) {
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#textureCoordinatesVBO);
    this.#gl.bufferData(
      this.#gl.ARRAY_BUFFER,
      new Float32Array(textureCoordinates),
      this.#gl.STATIC_DRAW
    );

    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#textureCoordinatesVBO);
    const textureCoordAttribLocation = this.#gl.getAttribLocation(
      this.#shaderProgram,
      TEXTURE_COORDINATE_SHADER_ATTRIBUTE
    );
    this.#gl.vertexAttribPointer(
      textureCoordAttribLocation,
      2,
      this.#gl.FLOAT, // Is this valid?
      false,
      0,
      0
    );
    this.#gl.enableVertexAttribArray(textureCoordAttribLocation);
  }
}

function createMesh({
  gl,
  shaderProgram,
  positions,
  normals,
  indices = [],
  textureData = {},
}) {
  const vao = gl.createVertexArray();
  const positionsAndNormalsVBO = gl.createBuffer();
  const textureCoordinatesVBO = gl.createBuffer();
  const ebo = gl.createBuffer();
  const texture = gl.createTexture();

  /***********************************/
  /************* TEXTURE *************/
  /***********************************/

  let textureInternalFormat;
  switch (textureData.imageChannelCount) {
    case 3:
      textureInternalFormat = gl.RGB;
      break;
    case 4:
      textureInternalFormat = gl.RGBA;
      break;
    default:
      throw `Unexpected texture channel count of [${textureData.imageChannelCount}]`;
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    textureInternalFormat,
    textureData.htmlImage.width,
    textureData.htmlImage.height,
    0,
    textureInternalFormat,
    gl.UNSIGNED_BYTE,
    textureData.htmlImage
  );

  const samplerConfig = textureData.textureSamplerConfiguration;
  samplerConfig.wrapS &&
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, samplerConfig.wrapS);
  samplerConfig.wrapT &&
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, samplerConfig.wrapT);
  samplerConfig.magFilter &&
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      samplerConfig.magFilter
    );
  samplerConfig.minFilter &&
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      samplerConfig.minFilter
    );
  gl.generateMipmap(gl.TEXTURE_2D);

  /********************************************************/
  /****** POS, NORMAL, INDEX, TEXTURE COORDINATES *********/
  /********************************************************/
  gl.bindVertexArray(vao);

  // Tex Coords
  if (textureData.textureCoordinateData !== undefined) {
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordinatesVBO);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(textureData.textureCoordinateData),
      gl.STATIC_DRAW
    );
  }

  // Positions and Normals
  gl.bindBuffer(gl.ARRAY_BUFFER, positionsAndNormalsVBO);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    (positions.length + normals.length) * 4,
    gl.STATIC_DRAW
  );
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(positions));
  gl.bufferSubData(
    gl.ARRAY_BUFFER,
    positions.length * 4,
    new Float32Array(normals)
  );

  // Indices
  if (indices.length !== 0) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(indices),
      gl.STATIC_DRAW
    );
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, positionsAndNormalsVBO);
  const positionAttribLocation = gl.getAttribLocation(
    shaderProgram,
    'aPosition'
  );
  gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionAttribLocation);

  const normalAttribLocation = gl.getAttribLocation(shaderProgram, 'aNormal');
  gl.vertexAttribPointer(
    normalAttribLocation,
    3,
    gl.FLOAT,
    false,
    0,
    positions.length * 4
  );
  gl.enableVertexAttribArray(normalAttribLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordinatesVBO);
  const textureCoordAttribLocation = gl.getAttribLocation(
    shaderProgram,
    'aTexCoord'
  );
  gl.vertexAttribPointer(
    textureCoordAttribLocation,
    2,
    gl.FLOAT, // Is this valid?
    false,
    0,
    0
  );
  gl.enableVertexAttribArray(textureCoordAttribLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  function render() {
    gl.activeTexture(gl.TEXTURE0);
    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'texture1'), 0);

    gl.bindVertexArray(vao);
    if (indices.length !== 0) {
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, positions.length);
    }
    gl.bindVertexArray(null);
  }

  return {
    render,
  };
}

export { Mesh };
