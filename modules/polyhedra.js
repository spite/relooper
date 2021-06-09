import {
  Group,
  Mesh,
  BufferGeometry,
  Vector3,
  IcosahedronBufferGeometry,
  Vector2,
} from "../third_party/three.module.js";

const EPSILON = 0.0001;
const MAXSTEPS = 100;
const MAXDIST = 100;

function sdSphere(p, s) {
  return p.length() - s;
}

Vector3.prototype.abs = function () {
  return new Vector3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
};

Vector3.prototype.max = function (v) {
  return new Vector3(
    Math.max(this.x, v.x),
    Math.max(this.y, v.y),
    Math.max(this.z, v.z)
  );
};

const zero = new Vector3(0, 0, 0);

function sdRoundBox(p, b, r) {
  const q = p.clone().abs().sub(b);
  const l =
    q.max(zero).length() + Math.min(Math.max(q.x, Math.max(q.y, q.z)), 0.0) - r;

  return l;
}

function sdTorus(p, t) {
  const q = new Vector2(new Vector2(p.x, p.z).length() - t.x, p.y);
  return q.length() - t.y;
}

class Util {
  constructor(p, r, e) {
    this.p = p;
    this.d = 0;
    this.r = r;
    this.e = e;

    const PI = Math.PI;
    const PHI = 1.618033988749895;
    const TAU = 2 * Math.PI;
    this.Vector3 = new Vector3(1, 1, 1).normalize();
    this.Vector4 = new Vector3(-1, 1, 1).normalize();
    this.Vector5 = new Vector3(1, -1, 1).normalize();
    this.Vector6 = new Vector3(1, 1, -1).normalize();
    this.Vector7 = new Vector3(0, 1, PHI + 1).normalize();
    this.Vector8 = new Vector3(0, -1, PHI + 1).normalize();
    this.Vector9 = new Vector3(PHI + 1, 0, 1).normalize();
    this.Vector10 = new Vector3(-PHI - 1, 0, 1).normalize();
    this.Vector11 = new Vector3(1, PHI + 1, 0).normalize();
    this.Vector12 = new Vector3(-1, PHI + 1, 0).normalize();
    this.Vector13 = new Vector3(0, PHI, 1).normalize();
    this.Vector14 = new Vector3(0, -PHI, 1).normalize();
    this.Vector15 = new Vector3(1, 0, PHI).normalize();
    this.Vector16 = new Vector3(-1, 0, PHI).normalize();
    this.Vector17 = new Vector3(PHI, 1, 0).normalize();
    this.Vector18 = new Vector3(-PHI, 1, 0).normalize();
  }

  begin() {
    this.d = 0;
  }

  add(v) {
    if (this.e) {
      this.d += Math.pow(Math.abs(p.dot(v)), this.e);
    } else {
      this.d = Math.max(this.d, Math.abs(this.p.dot(v)));
    }
  }

  end() {
    if (this.e) {
      return Math.pow(this.d, 1 / this.e) - this.r;
    } else {
      return this.d - this.r;
    }
  }
}

function fIcosahedron(p, r, e) {
  const u = new Util(p, r, e);
  u.begin();
  u.add(u.Vector3);
  u.add(u.Vector4);
  u.add(u.Vector5);
  u.add(u.Vector6);
  u.add(u.Vector7);
  u.add(u.Vector8);
  u.add(u.Vector9);
  u.add(u.Vector10);
  u.add(u.Vector11);
  u.add(u.Vector12);
  return u.end();
}

function fDodecahedron(p, r, e) {
  const u = new Util(p, r, e);
  u.begin();
  u.add(u.Vector13);
  u.add(u.Vector14);
  u.add(u.Vector15);
  u.add(u.Vector16);
  u.add(u.Vector17);
  u.add(u.Vector18);
  return u.end();
}

function clamp(v, minVal, maxVal) {
  return Math.min(maxVal, Math.max(minVal, v));
}

function sdOctahedron(p, s) {
  p = p.abs();
  const m = p.x + p.y + p.z - s;
  const q = new Vector3();
  if (3.0 * p.x < m) q.set(p.x, p.y, p.z);
  else if (3.0 * p.y < m) q.set(p.y, p.z, p.x);
  else if (3.0 * p.z < m) q.set(p.z, p.x, p.y);
  else return m * 0.57735027;

  const k = clamp(0.5 * (q.z - q.y + s), 0.0, s);
  return new Vector3(q.x, q.y - s + k, q.z - k).length();
}

function opTwistY(p, k) {
  const c = Math.cos(k * p.y);
  const s = Math.sin(k * p.y);
  const r = new Vector2(p.x * c - p.z * s, p.x * s + p.z * c);
  const q = new Vector3(r.x, p.y, r.y);
  return q;
}

function map(p) {
  //const q = opTwistY(p, 1);
  // let cube = sdRoundBox(p, new Vector3(1, 1, 1), 0.1);
  // let sphere = sdSphere(p, 5);
  // let torus = sdTorus(p, new Vector2(1, 0.5));
  const icosahedron = fIcosahedron(p, 1, 50);
  // const octahedron = sdOctahedron(p, 1) - 0.1;
  // const dodecahedron = fDodecahedron(p, 1, 100);
  return icosahedron;
}

const p = new Vector3();

function march(ro, rd, time) {
  let d = EPSILON;
  let t = 0.0;
  for (let i = 0; i < MAXSTEPS; ++i) {
    p.copy(rd).multiplyScalar(d).add(ro);
    t = map(p);
    if (t < EPSILON || d >= MAXDIST) break;
    d += t;
  }
  return d;
}

const dir = new Vector3();

function pos(v, p) {
  dir.copy(v).normalize().multiplyScalar(-1);
  const d = march(v, dir);
  dir.multiplyScalar(d);
  p.copy(v).add(dir);
  return d;
}

const p0 = new Vector3();
const p1 = new Vector3();
const p2 = new Vector3();
const tmp = new Vector3();
const n = new Vector3();
const up = new Vector3(0, 1, 0);
const e = 0.00001;
const v1 = new Vector3();
const v2 = new Vector3();

function generateGeometry() {
  const geo = new IcosahedronBufferGeometry(4, 50);

  const v = new Vector3();
  const vertices = geo.attributes.position.array;
  const normals = geo.attributes.normal.array;
  for (let j = 0; j < vertices.length; j += 3) {
    v.set(vertices[j], vertices[j + 1], vertices[j + 2]);

    pos(v, p0);

    v1.crossVectors(v, up);
    v2.crossVectors(v, v1);

    v1.multiplyScalar(e);
    tmp.copy(v).add(v1);
    pos(tmp, p1);

    v2.multiplyScalar(e);
    tmp.copy(v).add(v2);
    pos(tmp, p2);

    p1.sub(p0);
    p2.sub(p0);
    n.crossVectors(p1, p2).normalize();

    const s = 1.75;
    vertices[j] = p0.x * s;
    vertices[j + 1] = p0.y * s;
    vertices[j + 2] = p0.z * s;

    normals[j] = n.x;
    normals[j + 1] = n.y;
    normals[j + 2] = n.z;
  }
  // geo.computeVertexNormals();
  // geo.computeFaceNormals();

  return geo;
}

export { generateGeometry };
