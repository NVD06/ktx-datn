/** Mã giường sinh sẵn khi tạo phòng: G1..Gn. */
export function bedCodes(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `G${i + 1}`);
}

/** Mã trống nhỏ nhất: phòng đang có G1, G3 thì giường mới là G2. */
export function nextBedCode(existing: string[]): string {
  const used = new Set(existing.map((code) => code.toUpperCase()));
  for (let i = 1; ; i++) {
    const code = `G${i}`;
    if (!used.has(code)) return code;
  }
}

/** Sắp xếp theo số: G2 đứng trước G10 (so chuỗi thường thì ngược lại). */
export function compareBedCode(a: { code: string }, b: { code: string }): number {
  return a.code.localeCompare(b.code, undefined, { numeric: true });
}
