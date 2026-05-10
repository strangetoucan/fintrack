export const fmt = (n) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e7) return sign + '₹' + (abs / 1e7).toFixed(2) + 'Cr';
  if (abs >= 1e5) return sign + '₹' + (abs / 1e5).toFixed(2) + 'L';
  const s = Math.abs(Math.round(n)).toString();
  let res = s.slice(-3);
  let rem = s.slice(0, -3);
  while (rem.length > 0) { res = rem.slice(-2) + ',' + res; rem = rem.slice(0, -2); }
  return (n < 0 ? '-₹' : '₹') + res;
};

export const fmtK = (n) =>
  n >= 1e5 ? '₹' + (n / 1e5).toFixed(1) + 'L' :
  n >= 1000 ? '₹' + (n / 1000).toFixed(0) + 'K' :
  '₹' + n;
