/** Parse a courier API response as JSON, with a clear error on non-JSON
 *  bodies (auth/HTML error pages) so the admin sees a useful message. */
export async function courierJson<T>(label: string, res: Response): Promise<T> {
  const text = await res.text();
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new Error(`${label} returned a non-JSON response (HTTP ${res.status}). Check the credentials and mode.`);
  }
}
