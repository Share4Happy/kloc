import { api } from '@/lib/axios';

/**
 * Parse a Blob error response body from Axios into a human-readable string.
 * When responseType is 'blob', Axios wraps non-2xx bodies as Blob instead of JSON.
 */
async function parseBlobError(err: unknown): Promise<string> {
  const response = (err as { response?: { data?: unknown; status?: number } }).response;
  if (!response) return 'Lỗi kết nối.';

  const data = response.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text) as { detail?: string };
      if (json.detail) return json.detail;
    } catch {
      // not JSON, fall through
    }
  }

  if (typeof data === 'object' && data !== null && 'detail' in data) {
    return String((data as { detail: unknown }).detail);
  }

  return `Lỗi ${response.status ?? 'không xác định'}.`;
}

/**
 * Trigger generation of a contract DOCX from an existing order.
 * The backend saves the file and returns it as a download stream.
 * We request `responseType: 'blob'` so Axios keeps binary data intact.
 */
export async function generateContractFromOrder(orderId: string): Promise<Blob> {
  try {
    const response = await api.post<Blob>(
      `/contracts/orders/${orderId}/generate`,
      null,
      { responseType: 'blob' },
    );
    return response.data;
  } catch (err) {
    const message = await parseBlobError(err);
    throw new Error(message);
  }
}

/**
 * Download the already-generated contract file for an order.
 */
export async function downloadContractFile(orderId: string): Promise<Blob> {
  try {
    const response = await api.get<Blob>(
      `/contracts/orders/${orderId}/file`,
      { responseType: 'blob' },
    );
    return response.data;
  } catch (err) {
    const message = await parseBlobError(err);
    throw new Error(message);
  }
}

/**
 * Trigger a browser download from a Blob.
 * @param blob    The file content
 * @param filename  Suggested filename (e.g. "hop-dong-order-xxx.docx")
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
