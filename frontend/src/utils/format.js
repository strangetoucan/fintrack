export const fmt = (n) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e7) return sign + '₹' + (abs / 1e7).toFixed(2) + 'Cr';
  if (abs >= 1e5) return sign + '₹' + (abs / 1e5).toFixed(2) + 'L';
  // Round to 2 decimal places to eliminate floating-point drift (e.g. -24670.329999999958)
  const rounded  = Math.round(abs * 100) / 100;
  const intPart  = Math.floor(rounded);
  const decPart  = Math.round((rounded - intPart) * 100);
  const s = intPart.toString();
  let res = s.slice(-3);
  let rem = s.slice(0, -3);
  while (rem.length > 0) { res = rem.slice(-2) + ',' + res; rem = rem.slice(0, -2); }
  const dec = decPart > 0 ? '.' + String(decPart).padStart(2, '0') : '';
  return (n < 0 ? '-₹' : '₹') + res + dec;
};

export const fmtK = (n) =>
  n >= 1e5 ? '₹' + (n / 1e5).toFixed(1) + 'L' :
  n >= 1000 ? '₹' + (n / 1000).toFixed(0) + 'K' :
  '₹' + n;
