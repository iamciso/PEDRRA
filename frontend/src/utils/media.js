/**
 * Media utilities for PEDRRA Training Platform
 */

/**
 * Convert YouTube watch/share URLs to embed format.
 * Passes non-YouTube URLs through unchanged.
 *
 * Supported input formats:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtube.com/watch?v=VIDEO_ID&t=120
 *   https://youtu.be/VIDEO_ID
 *   https://youtu.be/VIDEO_ID?si=XXXXX
 *   https://www.youtube.com/embed/VIDEO_ID  (already correct)
 */
export function toEmbedUrl(url) {
  if (!url || typeof url !== 'string') return url;

  // Already an embed URL — pass through
  if (url.includes('youtube.com/embed/')) return url;

  let videoId = null;

  // Match youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }

  // Match youtube.com/watch?v=VIDEO_ID
  if (!videoId) {
    const longMatch = url.match(/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/);
    if (longMatch) {
      videoId = longMatch[1];
    }
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return url;
}

/**
 * Check if a URL is a YouTube URL (any format).
 */
export function isYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /youtu\.?be/.test(url);
}

/**
 * Check if a URL points to a locally uploaded video file (MP4/WebM).
 * These should be rendered with <video> instead of <iframe>.
 */
export function isLocalVideo(url) {
  if (!url || typeof url !== 'string') return false;
  if (isYouTubeUrl(url)) return false;
  // Matches /uploads/xxx.mp4 or /uploads/xxx.webm, or full http URLs to those
  return /\.(mp4|webm)(\?.*)?$/i.test(url);
}
