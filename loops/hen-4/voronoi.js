const hv1 = new Vector3(127.1, 311.7, 74.7);
const hv2 = new Vector3(269.5, 183.3, 246.1);
const hv3 = new Vector3(113.5, 271.9, 124.6);
const hv = new Vector3();
const hr = new Vector3();

function fract(f) {
  return f % 1;
}

function hash(v) {
  hv.x = v.dot(hv1);
  hv.y = v.dot(hv2);
  hv.z = v.dot(hv3);

  hr.x = fract(Math.sin(v.x) * 43758.5453123);
  hr.y = fract(Math.sin(v.y) * 43758.5453123);
  hr.z = fract(Math.sin(v.z) * 43758.5453123);

  return hr;
}

const vp = new Vector3();
const vf = new Vector3();
const res = new Vector2();
const vb = new Vector3();
const vr = new Vector3();
const vt = new Vector3();
const vres = new Vector3();

function voronoi(v) {
  vp.x = Math.floor(v.x);
  vp.y = Math.floor(v.y);
  vp.z = Math.floor(v.z);

  vf.x = fract(v.x);
  vf.y = fract(v.y);
  vf.z = fract(v.z);

  let id = 0.0;
  res.set(100, 100);
  for (let k = -1; k <= 1; k++) {
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        vb.set(i, j, k);
        vt.copy(vp).add(vb);
        const t = hash(vt);
        vr.x = vb.x - -vf.x + t;
        vr.y = vb.y - -vf.y + t;
        vr.z = vb.z - -vf.z + t;

        const d = vr.dot(vr);
        if (d < res.x) {
          res.set(d, res.x);
        } else if (d < res.y) {
          res.y = d;
        }
      }
    }
  }

  vres.x = Math.sqrt(res.x);
  vres.y = Math.sqrt(res.y);
  vres.z = 0;

  return vres;
}
