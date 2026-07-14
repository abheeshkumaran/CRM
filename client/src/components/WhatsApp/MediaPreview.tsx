import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface MediaPreviewProps {
  mediaId: string;
  type: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
  filename?: string;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({ mediaId, type, caption, filename }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMedia = async () => {
      try {
        const response = await api.get(`/whatsapp/messages/media/${mediaId}`, {
          responseType: 'blob'
        });
        if (isMounted) {
          const blobUrl = URL.createObjectURL(response.data);
          setUrl(blobUrl);
        }
      } catch (err) {
        console.error('Failed to load media:', err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMedia();

    return () => {
      isMounted = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [mediaId, url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-muted/50 rounded animate-pulse w-48 h-32">
        <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-destructive/10 text-destructive text-xs rounded border border-destructive/20 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        Failed to load media
      </div>
    );
  }

  if (!url) return null;

  switch (type) {
    case 'image':
      return (
        <div className="space-y-1">
          <img src={url} alt={caption || 'WhatsApp Image'} className="rounded max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity" onClick={() => window.open(url, '_blank')} />
          {caption && <p className="text-xs text-muted-foreground italic">{caption}</p>}
        </div>
      );
    case 'video':
      return (
        <div className="space-y-1">
          <video src={url} controls className="rounded max-w-full h-auto" />
          {caption && <p className="text-xs text-muted-foreground italic">{caption}</p>}
        </div>
      );
    case 'audio':
      return <audio src={url} controls className="max-w-full h-10 scale-90 -ml-2" />;
    case 'document':
      return (
        <a
          href={url}
          download={filename || 'document'}
          className="flex items-center gap-3 p-3 bg-card rounded border border-border hover:bg-accent/50 transition-colors"
        >
          <div className="bg-primary/10 p-2 rounded text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{filename || 'Document'}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Download</p>
          </div>
        </a>
      );
    default:
      return <div className="text-xs italic text-muted-foreground">Unsupported media type</div>;
  }
};

export default MediaPreview;
