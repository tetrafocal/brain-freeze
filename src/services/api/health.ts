export async function getApiVersion(endpoint: string): Promise<string> {
  try {
    const url = new URL("/health", endpoint);
    return await fetch(url, {
      signal: AbortSignal.timeout(500),
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => {return response.json()})
    .then((data) => { return data.version ? data.version : "1.0"; });
  } catch (e) {
    console.log(e)
    return "-1";
  }
};

export function minApiVersion(version: string, minVersion: string): boolean {
  const parseVersion = (v: string) => v.split(".").map(Number);
  const [major, minor, patch] = parseVersion(version);
  const [minMajor, minMinor, minPatch] = parseVersion(minVersion);
  if (major < minMajor) return false;
  if (major === minMajor && minor < minMinor) return false;
  if (major === minMajor && minor === minMinor && patch < minPatch) return false;
  return true;
}