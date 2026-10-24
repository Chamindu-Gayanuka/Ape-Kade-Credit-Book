interface AndroidMessageEvent {
    data: string;
}

interface AndroidDownloadsBridge {
    postMessage(message: string): void;

    onmessage:
        | ((event: AndroidMessageEvent) => void)
        | null;
}

declare global {
    interface Window {
        AndroidDownloads?: AndroidDownloadsBridge;
    }
}

interface BridgeResponse {
    id: string;
    ok: boolean;
    error?: string;
}

const CHUNK_SIZE = 48 * 1024;

const TIMEOUT_MS = 30000;

let messageCounter = 0;

let transferQueue: Promise<void> =
    Promise.resolve();

function browserDownload(
    blob: Blob,
    filename: string
): void {

    const url = URL.createObjectURL(blob);

    const anchor =
        document.createElement('a');

    anchor.href = url;

    anchor.download = filename;

    anchor.style.display = 'none';

    document.body.appendChild(anchor);

    anchor.click();

    anchor.remove();

    window.setTimeout(() => {

        URL.revokeObjectURL(url);

    }, 1000);
}

function encodeBase64(
    bytes: Uint8Array
): string {

    let binary = '';

    for (let i = 0; i < bytes.length; i++) {

        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}

function sendMessage(
    bridge: AndroidDownloadsBridge,
    payload: Record<string, unknown>
): Promise<void> {

    return new Promise((resolve, reject) => {

        const id =
            `${Date.now()}-${++messageCounter}`;

        const previousHandler =
            bridge.onmessage;

        let settled = false;

        const cleanup = () => {

            bridge.onmessage = previousHandler;

            window.clearTimeout(timeout);
        };

        const timeout = window.setTimeout(() => {

            if (settled) return;

            settled = true;

            cleanup();

            reject(
                new Error(
                    'Android download timed out.'
                )
            );

        }, TIMEOUT_MS);

        bridge.onmessage = event => {

            let response: BridgeResponse;

            try {

                response = JSON.parse(event.data);

            } catch {

                return;
            }

            if (response.id !== id) {
                return;
            }

            if (settled) return;

            settled = true;

            cleanup();

            if (response.ok) {

                resolve();

            } else {

                reject(
                    new Error(
                        response.error ||
                        'Android download failed.'
                    )
                );
            }
        };

        try {

            bridge.postMessage(
                JSON.stringify({
                    ...payload,
                    id
                })
            );

        } catch (error) {

            if (!settled) {

                settled = true;

                cleanup();

                reject(error);
            }
        }
    });
}

async function sendFileToAndroid(
    bridge: AndroidDownloadsBridge,
    blob: Blob,
    filename: string
): Promise<void> {

    if (blob.size === 0) {

        throw new Error(
            'Cannot download an empty report.'
        );
    }

    if (blob.size > 25 * 1024 * 1024) {

        throw new Error(
            'Report exceeds the 25 MB limit.'
        );
    }

    await sendMessage(bridge, {
        action: 'start',
        filename,
        size: blob.size
    });

    try {

        for (
            let offset = 0;
            offset < blob.size;
            offset += CHUNK_SIZE
        ) {

            const chunk = blob.slice(
                offset,
                offset + CHUNK_SIZE
            );

            const buffer =
                await chunk.arrayBuffer();

            const base64 = encodeBase64(
                new Uint8Array(buffer)
            );

            await sendMessage(bridge, {
                action: 'chunk',
                data: base64
            });
        }

        await sendMessage(bridge, {
            action: 'finish'
        });

    } catch (error) {

        try {

            await sendMessage(bridge, {
                action: 'cancel'
            });

        } catch {
            // Preserve the original error.
        }

        throw error;
    }
}

export async function downloadFile(
    blob: Blob,
    filename: string
): Promise<void> {

    const bridge =
        window.AndroidDownloads;

    if (!bridge) {

        browserDownload(
            blob,
            filename
        );

        return;
    }

    // Only one file transfer may use the native
    // bridge at a time.
    const transfer = transferQueue
        .catch(() => undefined)
        .then(() =>
            sendFileToAndroid(
                bridge,
                blob,
                filename
            )
        );

    transferQueue = transfer;

    await transfer;
}