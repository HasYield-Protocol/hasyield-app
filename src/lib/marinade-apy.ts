let cachedApy: number | null = null;
let cacheTime = 0;

export async function getMarinadeApy(): Promise<number> {
  if (cachedApy && Date.now() - cacheTime < 5 * 60 * 1000) return cachedApy;
  try {
    const res = await fetch("https://api.marinade.finance/msol/apy/30d");
    const apy = await res.json();
    cachedApy = typeof apy === "number" ? apy : 0.05;
    cacheTime = Date.now();
    return cachedApy;
  } catch {
    return 0.05;
  }
}
