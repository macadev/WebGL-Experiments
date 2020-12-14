// import { GLTFLoader } from 'https://unpkg.com/three@0.123.0/examples/jsm/loaders/GLTFLoader.js';

// const loader = new GLTFLoader();

// loader.load(
//   'skull/scene.gltf',
//   function (gltf) {
//     console.log(gltf);
//   },
//   undefined,
//   function (error) {
//     console.error(error);
//   }
// );

const COMPONENT_TYPE_MAP = {
  5120: {
    numBytes: 1,
    unsigned: false,
    dataViewRetrieverFunctionName: 'getInt8',
  },
  5121: {
    numBytes: 1,
    unsigned: true,
    dataViewRetrieverFunctionName: 'getUint8',
  },
  5122: {
    numBytes: 2,
    unsigned: false,
    dataViewRetrieverFunctionName: 'getInt16',
  },
  5123: {
    numBytes: 2,
    unsigned: true,
    dataViewRetrieverFunctionName: 'getUint16',
  },
  5125: {
    numBytes: 4,
    unsigned: true,
    dataViewRetrieverFunctionName: 'getUint32',
  },
  5126: {
    numBytes: 4,
    unsigned: false,
    dataViewRetrieverFunctionName: 'getFloat32',
  },
};

const ACCESSOR_TYPE_COMPONENT_COUNT = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

class ModelLoader {
  #modelURI = undefined;
  #binaryDataBasePath = undefined;
  #binaryDataCache = {};

  constructor(modelURI, binaryDataBasePath) {
    this.#modelURI = modelURI;
    // Remove trailing slash if present
    this.#binaryDataBasePath = binaryDataBasePath.replace(/\/$/, '');
  }

  async getSceneMeshData() {
    let model = await this.#fetchModelJSON();
    let dataOfMeshes = [];
    for (let node of model.nodes) {
      if (node.mesh !== undefined) {
        let meshIndex = node.mesh;
        let meshData = await this.#loadMesh(model, meshIndex);
        dataOfMeshes.push(meshData);
      }
    }

    return dataOfMeshes;
  }

  async #fetchModelJSON() {
    let response = await fetch(this.#modelURI);
    let text = await response.text();
    return JSON.parse(text);
  }

  async #loadMesh(model, meshIndex) {
    let mesh = model.meshes[meshIndex];
    for (let primitive of mesh.primitives) {
      // Can only render triangles
      if (primitive.mode !== 4) {
        continue;
      }

      let indices = [];
      if (primitive.indices !== undefined) {
        indices = await this.#loadDataFromAccessor(model, primitive.indices);
      }

      let positions = [];
      let normals = [];
      if (primitive.attributes !== undefined) {
        for (const attributeName in primitive.attributes) {
          if (attributeName === 'POSITION') {
            positions = await this.#loadDataFromAccessor(
              model,
              primitive.attributes[attributeName]
            );
          }
          if (attributeName === 'NORMAL') {
            normals = await this.#loadDataFromAccessor(
              model,
              primitive.attributes[attributeName]
            );
          }
        }
      }

      return {
        positions,
        normals,
        indices,
      };
    }
  }

  async #loadDataFromAccessor(model, accessorIndex) {
    let accessor = model.accessors[accessorIndex];
    let bufferViewIndex = accessor.bufferView;
    let {
      bufferData,
      byteStride,
      bvByteLength,
      bvByteOffset,
    } = await this.#loadBufferView(model, bufferViewIndex);

    let accessorByteOffset = accessor.byteOffset || 0;

    // Little bit of magic to create the data view of just the bytes specified by the accessor
    let dataView = new DataView(
      bufferData,
      bvByteOffset + accessorByteOffset,
      bvByteLength - accessorByteOffset
    );

    let componentType = COMPONENT_TYPE_MAP[accessor.componentType];
    if (componentType === undefined) {
      throw 'Unexpected component type';
    }

    let numComponents = ACCESSOR_TYPE_COMPONENT_COUNT[accessor.type];
    if (numComponents === undefined) {
      throw 'Unexpected componentType';
    }

    let byteOffset = 0;
    let data = [];

    let componentReadCount = 0;

    let numBytesToSkipForStride =
      byteStride - numComponents * componentType.numBytes;
    let totalNumsToRead = numComponents * accessor.count;

    while (data.length < totalNumsToRead) {
      // Binary data is little endian. This is in the GLTF spec. That's what the true boolean is for.
      let component = dataView[componentType.dataViewRetrieverFunctionName](
        byteOffset,
        true
      );
      data.push(component);
      byteOffset += componentType.numBytes;
      componentReadCount++;

      if (byteStride !== 0 && componentReadCount === numComponents) {
        componentReadCount = 0;
        byteOffset += numBytesToSkipForStride;
      }
    }

    return data;
  }

  async #loadBufferView(model, bufferViewIndex) {
    let bufferView = model.bufferViews[bufferViewIndex];
    let bufferIndex = bufferView.buffer;
    let bufferData = await this.#loadBuffer(model, bufferIndex);

    return {
      bufferData: bufferData,
      byteStride: bufferView.byteStride || 0,
      bvByteLength: bufferView.byteLength || 0,
      bvByteOffset: bufferView.byteOffset || 0,
    };
  }

  async #loadBuffer(model, bufferIndex) {
    let buffer = model.buffers[bufferIndex];
    let bufferData = await this.#readModelBinaryFile(buffer.uri);
    if (bufferData.byteLength !== buffer.byteLength) {
      throw 'Expected buffer byte length is incorrect';
    }
    return bufferData;
  }

  async #readModelBinaryFile(path) {
    let pathToBinaryFile = `${this.#binaryDataBasePath}/${path}`;
    // Don't fetch the data again from the server if it's been fetched before.
    if (this.#binaryDataCache[pathToBinaryFile] !== undefined) {
      return this.#binaryDataCache[pathToBinaryFile];
    }

    let response = await fetch(pathToBinaryFile);
    let arrayBuffer = await response.arrayBuffer();
    this.#binaryDataCache[pathToBinaryFile] = arrayBuffer;
    return arrayBuffer;
  }
}

export { ModelLoader };
