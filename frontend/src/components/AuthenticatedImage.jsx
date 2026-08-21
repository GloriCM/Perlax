import { useEffect, useState } from 'react';
import { Image } from '@mantine/core';
import { fetchAuthenticatedUploadBlob } from '../utils/authenticatedUpload';

export default function AuthenticatedImage({
    publicPath,
    alt = '',
    fallbackSrc,
    ...imageProps
}) {
    const [blobUrl, setBlobUrl] = useState('');
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!publicPath) {
            setBlobUrl('');
            setFailed(false);
            return undefined;
        }

        let cancelled = false;
        let objectUrl = '';

        setFailed(false);
        setBlobUrl('');

        fetchAuthenticatedUploadBlob(publicPath)
            .then((url) => {
                if (cancelled) {
                    URL.revokeObjectURL(url);
                    return;
                }
                objectUrl = url;
                setBlobUrl(url);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [publicPath]);

    return (
        <Image
            src={failed ? fallbackSrc : blobUrl || undefined}
            alt={alt}
            fallbackSrc={fallbackSrc}
            {...imageProps}
        />
    );
}