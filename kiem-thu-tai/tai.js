import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Counter } from 'k6/metrics';
const GOC = __ENV.GOC || 'http://localhost:3100';
const API = `${GOC}/api/v1`;
const KB = __ENV.KB || 'thuong-ngay';
const VUS = Number(__ENV.VUS || 100);
const THOI_GIAN = __ENV.THOI_GIAN || (KB === 'nguong' ? '2m' : '3m');
const SV_DANG_O = 800;
const SINH_VIEN = [
  ['toi', '/auth/me'],
  ['cho-o-hien-tai', '/contracts/me/current'],
  ['hoa-don-cua-toi', '/invoices/me'],
  ['bang-tin', '/announcements/me'],
];
const QUAN_LY = [
  ['ds-toa', '/buildings?limit=20'],
  ['ds-phong', '/buildings/:toa/rooms?limit=20'],
  ['ds-don', '/registrations?limit=20'],
  ['ds-hop-dong', '/contracts?limit=20'],
  ['ds-hoa-don', '/invoices?limit=20'],
  ['ds-sua-chua', '/maintenance-requests?limit=20'],
  ['tong-quan', '/reports/overview'],
  ['lap-day', '/reports/occupancy'],
];
const luotSinhVien = { executor: 'constant-vus', exec: 'sinhVien', vus: VUS, duration: THOI_GIAN };
const KICH_BAN = {
  'thuong-ngay': {
    scenarios: {
      sinh_vien: luotSinhVien,
      quan_ly: { executor: 'constant-vus', exec: 'quanLy', vus: 10, duration: THOI_GIAN },
    },
    api: [...SINH_VIEN, ...QUAN_LY].map(([ten]) => ten),
  },
  'mo-dot': {
    scenarios: {
      nop_don: {
        executor: 'ramping-arrival-rate',
        exec: 'nopDon',
        startRate: 0,
        timeUnit: '1s',
        preAllocatedVUs: 100,
        maxVUs: 300,
        stages: [
          { target: 25, duration: '10s' },
          { target: 25, duration: '20s' },
          { target: 0, duration: '10s' },
        ],
      },
    },
    api: ['dot-hien-tai', 'nop-don', 'don-cua-toi'],
  },
  nguong: { scenarios: { sinh_vien: luotSinhVien }, api: SINH_VIEN.map(([ten]) => ten) },
}[KB];
const TEN = ['csrf', 'dang-nhap', ...KICH_BAN.api];
const xungDot = new Counter('nop_don_xung_dot');
const loiMayChu = new Counter('nop_don_loi_may_chu');
export const options = {
  scenarios: KICH_BAN.scenarios,
  discardResponseBodies: true,
  noCookiesReset: true,
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
  thresholds: Object.fromEntries(
    TEN.flatMap((ten) => [
      [`http_req_duration{ten:${ten}}`, [ten === 'dang-nhap' ? 'max>=0' : 'p(95)<500']],
      [`http_req_failed{ten:${ten}}`, ['rate<0.01']],
    ]),
  ),
};
const sv = (i) => `sv${String(i).padStart(4, '0')}@ktx.edu.vn`;
function goi(ten, duong, params = {}) {
  const r = http.get(API + duong, { ...params, tags: { ten } });
  check(r, { [ten]: (x) => x.status === 200 });
  return r;
}
function dangNhap(email) {
  const csrfToken = http.get(`${GOC}/auth/csrf`, { responseType: 'text', tags: { ten: 'csrf' } }).json('csrfToken');
  const r = http.post(
    `${GOC}/auth/callback/credentials`,
    { csrfToken, email, password: '123456' },
    { redirects: 0, tags: { ten: 'dang-nhap' } },
  );
  check(r, { 'dang-nhap': (x) => x.status === 302 && !String(x.headers.Location).includes('error=') });
}
let daVao = false;
export function sinhVien() {
  if (!daVao) {
    sleep(Math.random() * Math.max(5, VUS / 20));
    dangNhap(sv(((exec.vu.idInTest - 1) % SV_DANG_O) + 1));
    daVao = true;
  }
  for (const [ten, duong] of SINH_VIEN) goi(ten, duong);
  sleep(1 + Math.random() * 2);
}
let toa = null;
export function quanLy() {
  if (!toa) {
    const i = exec.vu.idInTest % 5;
    dangNhap(i ? `ql${i}@ktx.edu.vn` : 'admin@ktx.edu.vn');
    toa = goi('toi', '/auth/me', { responseType: 'text' }).json('data.buildingId');
    toa = toa || goi('ds-toa', '/buildings?limit=20', { responseType: 'text' }).json('data.0.id');
  }
  for (const [ten, duong] of QUAN_LY) {
    goi(ten, duong.replace(':toa', toa));
    sleep(0.5 + Math.random());
  }
}
export function nopDon() {
  http.cookieJar().clear(GOC);
  dangNhap(sv(SV_DANG_O + exec.scenario.iterationInTest + 1));
  goi('dot-hien-tai', '/registration-periods/current');
  sleep(1 + Math.random() * 4);
  const r = http.post(`${API}/registrations`, '{}', {
    headers: { 'Content-Type': 'application/json' },
    responseType: 'text',
    tags: { ten: 'nop-don' },
  });
  check(r, { 'nop-don': (x) => x.status === 201 });
  if (r.status === 409 && r.json('error.code') === 'CONCURRENT_UPDATE') xungDot.add(1);
  if (r.status >= 500) loiMayChu.add(1);
  goi('don-cua-toi', '/registrations/me');
}
export function handleSummary(data) {
  const m = data.metrics;
  const so = (x) => (x ?? 0).toFixed(1);
  const dat = (ten) =>
    [`http_req_duration{ten:${ten}}`, `http_req_failed{ten:${ten}}`].every((k) =>
      Object.entries(m[k].thresholds ?? {}).every(([b, r]) => b === 'max>=0' || r.ok),
    );
  const bang = [
    ['API', 'Số yêu cầu', 'Lỗi %', 'TB', 'Trung vị', 'P90', 'P95', 'Lớn nhất', 'Ngưỡng'],
    ...TEN.filter((ten) => m[`http_req_failed{ten:${ten}}`]).map((ten) => {
      const d = m[`http_req_duration{ten:${ten}}`].values;
      const f = m[`http_req_failed{ten:${ten}}`].values;
      return [
        ten,
        f.passes + f.fails,
        (f.rate * 100).toFixed(2),
        so(d.avg),
        so(d.med),
        so(d['p(90)']),
        so(d['p(95)']),
        so(d.max),
        dat(ten) ? 'đạt' : 'KHÔNG ĐẠT',
      ];
    }),
  ];
  const ten = KB === 'nguong' ? `nguong-${VUS}` : KB;
  const text = [
    `Kịch bản ${ten} · ${new Date().toISOString()} · ${GOC}`,
    `Chạy ${(data.state.testRunDurationMs / 1000).toFixed(0)} giây, tối đa ${m.vus_max.values.max} người dùng ảo, ` +
      `${m.http_reqs.values.count} yêu cầu (${m.http_reqs.values.rate.toFixed(1)}/giây), ${m.iterations.values.count} lượt`,
    `Kiểm tra đạt ${(m.checks.values.rate * 100).toFixed(2)}%` +
      (KB === 'mo-dot'
        ? `; nộp đơn bị báo "vui lòng thử lại": ${m.nop_don_xung_dot?.values.count ?? 0}` +
          `, bị lỗi máy chủ: ${m.nop_don_loi_may_chu?.values.count ?? 0}`
        : ''),
    'Thời gian tính bằng ms. Ngưỡng: P95 dưới 500 ms (trừ dang-nhap) và lỗi dưới 1%',
    ...bang.map((r) => r.map((c, i) => (i ? String(c).padStart(11) : String(c).padEnd(16))).join('')),
  ].join('\n');
  return {
    stdout: `${text}\n`,
    [`bang-chung/5-kiem-thu-tai/${ten}.txt`]: text,
    [`bang-chung/5-kiem-thu-tai/${ten}.json`]: JSON.stringify(data, null, 1),
  };
}
