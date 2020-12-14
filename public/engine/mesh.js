function createMesh(gl, shaderProgram, positions, normals, indices = []) {
  let vao;
  let vbo;
  let ebo;

  vao = gl.createVertexArray();
  vbo = gl.createBuffer();
  ebo = gl.createBuffer();

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

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

  if (indices.length !== 0) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(indices),
      gl.STATIC_DRAW
    );
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

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

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  function render() {
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

export { createMesh };
